"""
Deepfake / Synthetic Audio Detection Engine
=============================================
Probabilistic anomaly scoring using signal-level heuristics.

IMPORTANT METHODOLOGICAL NOTE:
  The thresholds below (ZCR, rolloff, onset, embedding variance) are
  HEURISTIC DEFAULTS derived from general knowledge about synthetic speech
  artifacts. They have NOT been calibrated against a labeled dataset of
  real vs. deepfake audio.

  They exploit the observation that many TTS/vocoder systems produce:
    - Lower zero-crossing rate variance (smoother waveforms)
    - Lower spectral rolloff variance (more consistent spectral shape)
    - Lower onset strength variance (less natural attack dynamics)
    - Lower temporal embedding variance (more uniform feature sequences)

  These heuristics may produce false positives/negatives on:
    - Low-quality real recordings (noise can suppress natural variance)
    - High-quality modern neural vocoders (HiFi-GAN, BigVGAN) that mimic
      natural variance well
    - Studio-quality real recordings with processing (compression, EQ)

  This score should be treated as a forensic indicator only.
"""

import logging
import numpy as np
import librosa
from typing import Dict, Any
from .engine_embedding import embedding_engine

logger = logging.getLogger("forenlytics.audio.deepfake")

# ── Documented thresholds (change these — don't scatter magic numbers) ────────
ZCR_VAR_HIGH = 0.005          # Below this → synthetic (too smooth)
ZCR_VAR_MED = 0.01
ROLLOFF_VAR_HIGH = 500_000    # Below this → synthetic
ROLLOFF_VAR_MED = 1_000_000
ONSET_VAR_HIGH = 0.5          # Below this → synthetic
ONSET_VAR_MED = 1.0
EMB_VAR_HIGH = 0.005          # Below this → synthetic
EMB_VAR_MED = 0.015
# ──────────────────────────────────────────────────────────────────────────────


class DeepfakeEngine:
    def __init__(self, target_sr: int = 16_000):
        self.sr = target_sr

    def analyze(self, y: np.ndarray) -> Dict[str, float]:
        """
        Extract acoustic features used for synthetic speech detection.

        Returns a dict of metric names → values. Pass to compute_score().
        """
        import torch
        metrics: Dict[str, float] = {}

        try:
            # 1. Zero Crossing Rate variance
            zcr = librosa.feature.zero_crossing_rate(y=y)
            metrics["zcr_var"] = float(np.var(zcr))

            # 2. Spectral rolloff variance
            rolloff = librosa.feature.spectral_rolloff(y=y, sr=self.sr, roll_percent=0.85)
            metrics["rolloff_var"] = float(np.var(rolloff))

            # 3. Onset strength variance
            onset_env = librosa.onset.onset_strength(y=y, sr=self.sr)
            metrics["onset_var"] = float(np.var(onset_env))

            # 4. Temporal embedding variance (if secondary engine is already loaded)
            # NOTE: We intentionally avoid loading the embedding engine here to
            # prevent double-loading two large models in the comparison pipeline.
            # If it's already in memory from a prior call in the same request,
            # we use it; otherwise we use a conservative default (neutral score).
            temporal_var = 0.05  # neutral default → no deepfake signal from this metric
            if embedding_engine._sb_initialized or embedding_engine._w2v_initialized:
                try:
                    if embedding_engine._w2v_initialized and embedding_engine.model is not None:
                        inputs = embedding_engine.processor(
                            [y.tolist()],
                            sampling_rate=self.sr,
                            return_tensors="pt",
                            padding=True,
                        )
                        inputs = {k: v.to(embedding_engine.device) for k, v in inputs.items()}
                        with torch.no_grad():
                            outputs = embedding_engine.model(**inputs)
                            hidden = outputs.last_hidden_state
                        temporal_var = float(torch.var(hidden.squeeze(0), dim=0).mean().item())
                except Exception as te:
                    logger.debug(f"Temporal variance extraction skipped: {te}")

            metrics["temporal_embedding_var"] = temporal_var

        except Exception as e:
            logger.warning(f"Deepfake feature extraction partial failure: {e}")
            # Return conservative defaults — don't crash the whole pipeline
            metrics.setdefault("zcr_var", 0.01)
            metrics.setdefault("rolloff_var", 1_000_000.0)
            metrics.setdefault("onset_var", 1.0)
            metrics.setdefault("temporal_embedding_var", 0.05)

        return metrics

    def compute_score(self, metrics: Dict[str, float]) -> float:
        """
        Map extracted metrics to a 0–100 synthetic probability score.
        Higher score = higher probability of synthetic/deepfake origin.

        HEURISTIC: Scores from each metric are additive contributions.
        See module-level note on calibration limitations.
        """
        score = 0.0

        if metrics["zcr_var"] < ZCR_VAR_HIGH:
            score += 20.0
        elif metrics["zcr_var"] < ZCR_VAR_MED:
            score += 10.0

        if metrics["rolloff_var"] < ROLLOFF_VAR_HIGH:
            score += 20.0
        elif metrics["rolloff_var"] < ROLLOFF_VAR_MED:
            score += 10.0

        if metrics["onset_var"] < ONSET_VAR_HIGH:
            score += 20.0
        elif metrics["onset_var"] < ONSET_VAR_MED:
            score += 10.0

        if metrics["temporal_embedding_var"] < EMB_VAR_HIGH:
            score += 40.0
        elif metrics["temporal_embedding_var"] < EMB_VAR_MED:
            score += 20.0

        return min(max(score, 1.0), 99.0)

    def build_interpretation(self, score: float, label: str) -> str:
        """Generate a plain-language interpretation of the deepfake score."""
        if label == "DEEPFAKE":
            return (
                f"The acoustic signal exhibits significant synthetic artifacts "
                f"(anomaly index: {score:.0f}%). Multiple signal-level heuristics — "
                "zero-crossing rate smoothness, spectral rolloff regularity, and onset uniformity — "
                "are consistent with patterns observed in TTS/vocoder-generated speech. "
                "This is a forensic indicator; results should be corroborated by a qualified examiner."
            )
        elif label == "UNCERTAIN":
            return (
                f"The signal shows mixed characteristics (anomaly index: {score:.0f}%). "
                "Some acoustic properties are atypical for natural speech, but the evidence "
                "is insufficient to classify the recording as synthetic with confidence. "
                "Background noise, audio compression, or recording conditions may contribute. "
                "Further manual analysis is recommended."
            )
        else:  # REAL
            return (
                f"No significant synthetic speech artifacts detected (anomaly index: {score:.0f}%). "
                "Acoustic variance patterns — zero-crossing rate, spectral rolloff, and onset dynamics — "
                "are consistent with naturally produced human speech. "
                "Note: advanced neural vocoders (HiFi-GAN, BigVGAN) may evade heuristic detection."
            )


deepfake_engine = DeepfakeEngine()
