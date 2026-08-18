"""
Rhythm Engine
==============
Estimates speaking rate and articulatory rhythm using librosa's onset detection.
Provides syllable pulse rate (onsets/sec), speech-to-pause ratio, articulation
rate (onsets per second of active speech), and mean pause duration — all useful
forensic markers that persist across recording conditions.
"""

import logging
import numpy as np
import librosa
from typing import Dict, Any

logger = logging.getLogger("forenlytics.audio.rhythm")


class RhythmEngine:
    """Estimates and compares speech rate and rhythm between two audio samples."""

    def __init__(self, target_sr: int = 16000, n_chart_points: int = 60):
        self.sr = target_sr
        self.n_chart = n_chart_points

    # ── Feature extraction ───────────────────────────────────────────────────

    def extract(self, y: np.ndarray) -> Dict[str, Any]:
        """
        Extract rhythm/tempo features from one audio sample.
        Returns JSON-serializable dict.
        """
        result: Dict[str, Any] = {
            "available": False,
            "reason": None,
            "onset_rate_per_sec": None,     # onsets / total duration
            "articulation_rate_per_sec": None,  # onsets / active speech duration
            "speech_ratio": None,            # active speech / total
            "mean_pause_sec": None,
            "tempo_bpm": None,               # librosa beat tempo estimate
            "energy_60pt": [],               # downsampled RMS envelope for chart
        }

        try:
            duration_sec = len(y) / self.sr
            if duration_sec < 0.5:
                result["available"] = False
                result["reason"] = "Audio too short for rhythm analysis"
                return result

            # ── Onset detection ──────────────────────────────────────────────
            hop = 256
            onset_frames = librosa.onset.onset_detect(
                y=y, sr=self.sr, hop_length=hop, backtrack=True
            )
            onset_times = librosa.frames_to_time(onset_frames, sr=self.sr, hop_length=hop)
            onset_rate = len(onset_times) / duration_sec

            # ── RMS energy for speech activity detection ─────────────────────
            rms = librosa.feature.rms(y=y, frame_length=512, hop_length=hop)[0]
            rms_times = librosa.frames_to_time(np.arange(len(rms)), sr=self.sr, hop_length=hop)

            # Speech/silence split: frames above 15% of max RMS = speech
            thresh = np.max(rms) * 0.15
            speech_mask = rms > thresh
            n_speech_frames = int(np.sum(speech_mask))
            speech_sec = n_speech_frames * hop / self.sr
            speech_ratio = speech_sec / duration_sec if duration_sec > 0 else 0.0

            # Articulation rate: onsets per second of ACTIVE speech
            art_rate = len(onset_times) / speech_sec if speech_sec > 0.1 else 0.0

            # ── Pause analysis ───────────────────────────────────────────────
            # Find contiguous silent segments (runs of 0 in speech_mask)
            transitions = np.diff(speech_mask.astype(int))
            pause_starts = np.where(transitions == -1)[0] + 1
            pause_ends = np.where(transitions == 1)[0] + 1

            # Handle edge cases
            if len(pause_starts) > 0 and len(pause_ends) > 0:
                if pause_ends[0] < pause_starts[0]:
                    pause_ends = pause_ends[1:]
                n_pairs = min(len(pause_starts), len(pause_ends))
                pause_durations = [
                    (pause_ends[i] - pause_starts[i]) * hop / self.sr
                    for i in range(n_pairs)
                    if (pause_ends[i] - pause_starts[i]) * hop / self.sr > 0.05
                ]
                mean_pause = float(np.mean(pause_durations)) if pause_durations else 0.0
            else:
                mean_pause = 0.0

            # ── Beat tempo ───────────────────────────────────────────────────
            try:
                tempo, _ = librosa.beat.beat_track(y=y, sr=self.sr, hop_length=hop)
                tempo_bpm = float(tempo) if np.isscalar(tempo) else float(tempo[0])
            except Exception:
                tempo_bpm = 0.0

            # ── 60-point RMS energy envelope for chart ───────────────────────
            rms_chart = self._downsample(rms, self.n_chart)

            result.update({
                "available": True,
                "onset_rate_per_sec": round(onset_rate, 3),
                "articulation_rate_per_sec": round(art_rate, 3),
                "speech_ratio": round(speech_ratio, 3),
                "mean_pause_sec": round(mean_pause, 3),
                "tempo_bpm": round(tempo_bpm, 1),
                "energy_60pt": rms_chart,
            })

        except Exception as e:
            logger.warning(f"RhythmEngine extraction failed: {e}")
            result["available"] = False
            result["reason"] = f"Extraction error: {e}"

        return result

    def _downsample(self, arr: np.ndarray, n: int) -> list:
        """Downsample to n evenly-spaced points, normalize 0–1."""
        if len(arr) == 0:
            return []
        indices = np.linspace(0, len(arr) - 1, n, dtype=int)
        vals = arr[indices].astype(float)
        max_val = np.max(vals)
        if max_val > 0:
            vals = vals / max_val
        return [round(float(v), 4) for v in vals]

    # ── Comparison ───────────────────────────────────────────────────────────

    def compare(self, feat1: Dict[str, Any], feat2: Dict[str, Any]) -> Dict[str, Any]:
        """
        Compare rhythm profiles.
        Returns sub_score (0–100) and interpretation.
        """
        if not feat1.get("available") or not feat2.get("available"):
            return {
                "sub_score": None,
                "available": False,
                "reason": (
                    feat1.get("reason") or feat2.get("reason")
                    or "Rhythm analysis unavailable"
                ),
            }

        # Onset rate similarity
        r1 = feat1["onset_rate_per_sec"] or 0.0
        r2 = feat2["onset_rate_per_sec"] or 0.0
        rate_diff = abs(r1 - r2)
        rate_score = max(0.0, 1.0 - rate_diff / 5.0)  # 5 onsets/sec apart → 0

        # Articulation rate similarity
        a1 = feat1["articulation_rate_per_sec"] or 0.0
        a2 = feat2["articulation_rate_per_sec"] or 0.0
        art_diff = abs(a1 - a2)
        art_score = max(0.0, 1.0 - art_diff / 6.0)

        # Speech ratio similarity
        sr1 = feat1["speech_ratio"] or 0.0
        sr2 = feat2["speech_ratio"] or 0.0
        sr_diff = abs(sr1 - sr2)
        sr_score = max(0.0, 1.0 - sr_diff / 0.5)  # 50% speech ratio diff → 0

        # Pause duration similarity
        p1 = feat1["mean_pause_sec"] or 0.0
        p2 = feat2["mean_pause_sec"] or 0.0
        pause_diff = abs(p1 - p2)
        pause_score = max(0.0, 1.0 - pause_diff / 1.0)  # 1 sec pause diff → 0

        sub_score = round(
            (rate_score * 0.35 + art_score * 0.35 + sr_score * 0.15 + pause_score * 0.15) * 100.0,
            1,
        )

        interp = self._interpret(rate_diff, art_diff, sr_diff, sub_score, r1, r2, a1, a2)

        return {
            "sub_score": sub_score,
            "available": True,
            "delta_onset_rate": round(rate_diff, 3),
            "delta_articulation_rate": round(art_diff, 3),
            "delta_speech_ratio": round(sr_diff, 3),
            "delta_pause_sec": round(pause_diff, 3),
            "interpretation": interp,
        }

    def _interpret(
        self,
        rate_diff: float,
        art_diff: float,
        sr_diff: float,
        score: float,
        r1: float,
        r2: float,
        a1: float,
        a2: float,
    ) -> str:
        parts = []
        if rate_diff < 1.0:
            parts.append(
                f"Syllable onset rates are closely matched "
                f"({r1:.2f} vs {r2:.2f} onsets/sec)."
            )
        elif rate_diff < 3.0:
            parts.append(
                f"Moderate difference in onset rate ({r1:.2f} vs {r2:.2f} onsets/sec). "
                "Could reflect different speaking styles or emotional states."
            )
        else:
            parts.append(
                f"Substantial onset rate divergence ({r1:.2f} vs {r2:.2f} onsets/sec), "
                "suggesting different speaking tempos."
            )
        if art_diff > 2.0:
            parts.append(
                f"Articulation rates differ meaningfully "
                f"({a1:.2f} vs {a2:.2f} syllables/sec of active speech)."
            )
        return " ".join(parts)


rhythm_engine = RhythmEngine()
