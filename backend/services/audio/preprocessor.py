"""
Audio Forensic Preprocessor
============================
Handles format decoding, validation, VAD, normalization, and waveform extraction.

Decoding strategy (in priority order):
  1. torchaudio (supports WAV, MP3, FLAC, OGG, M4A via its backends)
  2. soundfile (WAV / FLAC fallback)
  3. Hard failure with specific error message (no silent fallback)

VAD strategy:
  Frame-energy based VAD. Splits audio into 20ms frames, marks frames whose
  RMS energy exceeds a threshold derived from the top-percentile energy
  of the recording. Active frames are concatenated. This removes leading,
  trailing, and mid-utterance silence/noise floors — not just the edges.
"""

import io
import logging
import hashlib
from typing import Tuple, List, Dict, Any

import numpy as np

logger = logging.getLogger("forenlytics.audio.preprocessor")

# Tunable constants
TARGET_SR: int = 16_000           # 16 kHz mono (WavLM / SpeechBrain requirement)
MIN_SPEECH_SEC: float = 0.8       # Reject files with < 0.8s of detected speech
VAD_FRAME_MS: int = 20            # Frame length for energy VAD (20ms is standard)
VAD_ENERGY_PERCENTILE: float = 2.0   # Use P2 as noise floor
VAD_ENERGY_MARGIN_DB: float = 6.0    # dB above noise floor -> active frame
VAD_UNIFORM_STD_DB: float = 3.0   # If energy std < this, signal is uniformly leveled
VAD_FALLBACK_RATIO: float = 0.80  # If frame-VAD removes >80%, fall back to librosa trim
MAX_DURATION_SEC: int = 120        # Hard cap - files > 2 min are truncated to 2 min
ENVELOPE_POINTS: int = 150         # Number of points in the returned UI waveform


class AudioPreprocessingError(ValueError):
    """Raised for user-correctable audio issues (bad format, too short, silent)."""
    pass


class AudioPreprocessor:
    def __init__(
        self,
        target_sr: int = TARGET_SR,
        min_speech_sec: float = MIN_SPEECH_SEC,
        max_duration_sec: int = MAX_DURATION_SEC,
    ):
        self.target_sr = target_sr
        self.min_speech_sec = min_speech_sec
        self.max_duration_sec = max_duration_sec

    # ── Public API ──────────────────────────────────────────────────────────

    def preprocess(
        self, file_content: bytes
    ) -> Tuple[np.ndarray, list, Dict[str, Any]]:
        """
        Full preprocessing pipeline.

        Returns
        -------
        y_speech : np.ndarray
            16 kHz mono float32 array containing only detected speech frames.
        envelope : list[float]
            Downsampled amplitude envelope for UI waveform rendering (150 points).
        meta : dict
            {
              "raw_duration_sec": float,   # total audio before VAD
              "speech_duration_sec": float, # active speech after VAD
              "sample_rate": int,
              "sha256": str,               # hex digest of raw file bytes
              "preprocessing_steps": list[str]
            }

        Raises
        ------
        AudioPreprocessingError
            For user-correctable problems (corrupt file, too short, no speech).
        """
        steps: List[str] = []
        sha256 = hashlib.sha256(file_content).hexdigest()

        # ── 1. Decode ──────────────────────────────────────────────────────
        y_raw, samplerate = self._decode(file_content, steps)

        # ── 2. Mono downmix ────────────────────────────────────────────────
        if y_raw.ndim > 1:
            y_raw = y_raw.mean(axis=0)
            steps.append("Stereo -> Mono downmix")

        raw_duration_sec = len(y_raw) / samplerate

        # ── 3. Hard cap on duration ────────────────────────────────────────
        max_samples = self.max_duration_sec * samplerate
        if len(y_raw) > max_samples:
            y_raw = y_raw[:max_samples]
            steps.append(f"Truncated to {self.max_duration_sec}s")

        # ── 4. Resample to 16 kHz ─────────────────────────────────────────
        if samplerate != self.target_sr:
            import librosa
            y_raw = librosa.resample(
                y_raw.astype(np.float32), orig_sr=samplerate, target_sr=self.target_sr
            )
            steps.append(f"Resampled {samplerate} Hz -> {self.target_sr} Hz")
        else:
            y_raw = y_raw.astype(np.float32)

        # ── 5. Validate non-empty ─────────────────────────────────────────
        if len(y_raw) == 0 or np.all(y_raw == 0):
            raise AudioPreprocessingError(
                "Uploaded file contains no audio signal (completely silent or empty)."
            )

        # ── 6. Energy-based VAD ───────────────────────────────────────────
        y_speech = self._apply_vad(y_raw, steps)

        speech_duration_sec = len(y_speech) / self.target_sr

        if speech_duration_sec < self.min_speech_sec:
            raise AudioPreprocessingError(
                f"Insufficient speech detected: only {speech_duration_sec:.2f}s of active audio "
                f"found (minimum required: {self.min_speech_sec}s). "
                "Ensure the file contains clear speech, not just silence or background noise."
            )

        # ── 7. RMS normalization ──────────────────────────────────────────
        rms = np.sqrt(np.mean(y_speech ** 2))
        if rms > 1e-8:
            target_rms = 0.1  # -20 dBFS target — enough headroom, consistent level
            y_norm = y_speech * (target_rms / rms)
            # Clip to [-1, 1] in case of loud transients
            y_norm = np.clip(y_norm, -1.0, 1.0)
            steps.append(f"RMS normalization (source RMS: {rms:.4f} -> target: {target_rms})")
        else:
            y_norm = y_speech
            steps.append("Skipped RMS normalization (near-silent signal)")

        # ── 8. UI envelope extraction ─────────────────────────────────────
        envelope = self._extract_envelope(y_norm, ENVELOPE_POINTS)

        meta = {
            "raw_duration_sec": round(raw_duration_sec, 3),
            "speech_duration_sec": round(speech_duration_sec, 3),
            "sample_rate": self.target_sr,
            "sha256": sha256,
            "preprocessing_steps": steps,
        }

        logger.info(
            f"Preprocessed OK | raw={raw_duration_sec:.1f}s "
            f"speech={speech_duration_sec:.1f}s | steps={len(steps)}"
        )
        return y_norm, envelope, meta

    # ── Internal helpers ────────────────────────────────────────────────────

    def _decode(self, file_content: bytes, steps: List[str]) -> Tuple[np.ndarray, int]:
        """
        Decode audio bytes to a numpy array.

        IMPORTANT — output convention:
          Always returns shape (channels, samples), float32.
          The preprocess() mono-downmix uses mean(axis=0) to produce (samples,).
          - torchaudio: already (channels, samples) — use as-is, no transpose.
          - soundfile mono:  (samples,)            → unsqueeze → (1, samples)
          - soundfile stereo: (samples, channels)  → .T        → (channels, samples)
        """

        # Attempt 1: torchaudio (handles WAV, MP3, FLAC, OGG, M4A)
        try:
            import torchaudio
            buf = io.BytesIO(file_content)
            waveform, sr = torchaudio.load(buf)  # → (channels, samples) float32 tensor
            y = waveform.numpy()                  # keep shape as-is
            if y.ndim == 1:
                y = y[np.newaxis, :]              # (samples,) mono → (1, samples)
            # y is now (channels, samples) ✓
            steps.append("Decoded via torchaudio (format auto-detected, %d Hz)" % sr)
            return y, sr
        except Exception as ta_err:
            logger.debug(f"torchaudio decode failed: {ta_err}")

        # Attempt 2: soundfile (WAV / FLAC / OGG on most platforms)
        try:
            import soundfile as sf
            buf = io.BytesIO(file_content)
            y, sr = sf.read(buf, always_2d=False)
            if y.ndim == 1:
                y = y[np.newaxis, :]              # (samples,) mono → (1, samples)
            else:
                y = y.T                           # (samples, channels) → (channels, samples)
            steps.append("Decoded via soundfile (%d Hz)" % sr)
            return y, sr
        except Exception as sf_err:
            logger.debug(f"soundfile decode failed: {sf_err}")

        # Both failed — give user a specific error
        raise AudioPreprocessingError(
            "Could not decode the uploaded audio file. "
            "Supported formats: WAV, MP3, FLAC, OGG. "
            "If your file is an unsupported format or is corrupted, please convert it to WAV first."
        )

    def _apply_vad(self, y: np.ndarray, steps: List[str]) -> np.ndarray:
        """
        3-Tier Voice Activity Detection.

        Tier 1 - Low-Variance Bypass:
          If frame energy std < VAD_UNIFORM_STD_DB (3dB), the recording is
          uniformly leveled (phone call, compressed/pre-normalized speech).
          Frame-energy gating cannot distinguish speech from silence in this
          case. Use full signal after a lightweight librosa edge-trim.

        Tier 2 - Frame-Energy Gating:
          For recordings with clear silence gaps (lectures, interviews).
          Keeps frames whose energy > noise_floor + VAD_ENERGY_MARGIN_DB.

        Tier 3 - Librosa Edge-Trim Fallback:
          Frame gating was too aggressive. Edge-trim only.

        Failure: Only if global RMS < -60 dBFS (digital silence).
        """
        frame_len = int(self.target_sr * VAD_FRAME_MS / 1000)
        num_frames = len(y) // frame_len

        if num_frames == 0:
            steps.append("VAD skipped: audio too short to frame")
            return y

        frames = y[: num_frames * frame_len].reshape(num_frames, frame_len)
        frame_rms = np.sqrt(np.mean(frames ** 2, axis=1))
        frame_rms_db = 20 * np.log10(np.maximum(frame_rms, 1e-10))

        global_rms = float(np.sqrt(np.mean(y ** 2)))
        global_rms_db = 20 * np.log10(max(global_rms, 1e-10))

        # Global silence check - only truly digital-silence files fail here
        if global_rms_db < -60.0:
            raise AudioPreprocessingError(
                "No speech detected in the uploaded file. "
                "The audio appears to be silence or background noise. "
                "Please upload a file that contains clear speech."
            )

        energy_std_db = float(np.std(frame_rms_db))
        noise_floor_db = float(np.percentile(frame_rms_db, VAD_ENERGY_PERCENTILE))
        threshold_db = noise_floor_db + VAD_ENERGY_MARGIN_DB

        logger.debug(
            "VAD: global_rms=%.1fdB, energy_std=%.1fdB, noise_floor=%.1fdB, threshold=%.1fdB",
            global_rms_db, energy_std_db, noise_floor_db, threshold_db
        )

        # Tier 1: Low-variance bypass (uniformly-leveled / pre-normalized audio)
        if energy_std_db < VAD_UNIFORM_STD_DB:
            try:
                import librosa
                y_trimmed, _ = librosa.effects.trim(y, top_db=40)
                if len(y_trimmed) >= int(self.target_sr * 0.1):
                    steps.append(
                        "VAD tier1 (uniform-energy bypass): edge-trim applied. "
                        "%.2fs retained (energy_std=%.1fdB < %.1fdB, frame gating skipped)" %
                        (len(y_trimmed) / self.target_sr, energy_std_db, VAD_UNIFORM_STD_DB)
                    )
                    return y_trimmed
            except Exception as e:
                logger.debug("librosa trim in uniform bypass failed: %s", e)
            steps.append(
                "VAD tier1 (uniform-energy bypass): full signal retained "
                "(energy_std=%.1fdB)" % energy_std_db
            )
            return y

        # Tier 2: Frame-energy gating
        active_mask = frame_rms_db >= threshold_db
        active_ratio = float(active_mask.mean())

        if active_ratio >= (1.0 - VAD_FALLBACK_RATIO):
            active_frames = frames[active_mask]
            y_vad = active_frames.flatten()
            remainder = y[num_frames * frame_len :]
            if len(remainder) > 0 and len(active_mask) > 0 and active_mask[-1]:
                y_vad = np.concatenate([y_vad, remainder])
            steps.append(
                "VAD tier2 (frame-energy): %d/%d frames active (%.0f%% retained, "
                "threshold: %.1fdB + %.1fdB)" %
                (active_mask.sum(), num_frames, active_ratio * 100,
                 noise_floor_db, VAD_ENERGY_MARGIN_DB)
            )
            return y_vad

        # Tier 3: Librosa edge-trim fallback
        logger.warning(
            "VAD tier2 removed %.0f%% of signal - falling back to librosa edge-trim",
            (1 - active_ratio) * 100
        )
        try:
            import librosa
            y_trimmed, _ = librosa.effects.trim(y, top_db=30)
            if len(y_trimmed) >= int(self.target_sr * 0.1):
                steps.append(
                    "VAD tier3 (librosa fallback): edge-trim top_db=30 - %.2fs retained" %
                    (len(y_trimmed) / self.target_sr)
                )
                return y_trimmed
        except Exception as e:
            logger.warning("librosa trim fallback failed: %s", e)

        raise AudioPreprocessingError(
            "No speech detected in the uploaded file. "
            "The audio appears to be silence or background noise. "
            "Please upload a file that contains clear speech."
        )

    def _extract_envelope(self, y: np.ndarray, num_points: int = ENVELOPE_POINTS) -> list:
        """Compute a downsampled amplitude envelope for UI waveform rendering."""
        if len(y) == 0:
            return [0.0] * num_points
        chunk_size = max(1, len(y) // num_points)
        truncated_len = chunk_size * num_points
        y_t = y[:truncated_len]
        chunks = y_t.reshape(num_points, chunk_size)
        envelope = np.max(np.abs(chunks), axis=1)
        max_val = np.max(envelope)
        if max_val > 0:
            envelope = envelope / max_val
        return [round(float(v), 3) for v in envelope]


preprocessor = AudioPreprocessor()
