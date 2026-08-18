"""
Pitch (F0) Engine
==================
Extracts fundamental frequency (F0) trajectories using librosa.pyin for
high-quality voiced/unvoiced detection, then computes pitch statistics and
a normalized 60-point time-series for frontend visualization.
"""

import logging
import numpy as np
import librosa
from typing import Dict, Any, List, Optional, Tuple

logger = logging.getLogger("forenlytics.audio.pitch")

# Human vocal range boundaries
F0_MIN_HZ = 60.0   # below baritone bass
F0_MAX_HZ = 500.0  # above coloratura soprano


class PitchEngine:
    """Extracts and compares F0 (pitch) trajectories between two audio samples."""

    def __init__(self, target_sr: int = 16000, n_chart_points: int = 60):
        self.sr = target_sr
        self.n_chart = n_chart_points

    # ── Feature extraction ───────────────────────────────────────────────────

    def extract(self, y: np.ndarray) -> Dict[str, Any]:
        """
        Returns pitch statistics and a normalized time-series for one sample.
        All values are JSON-serializable floats/lists.
        """
        result: Dict[str, Any] = {
            "available": False,
            "reason": None,
            "mean_f0": None,
            "median_f0": None,
            "min_f0": None,
            "max_f0": None,
            "range_semitones": None,
            "jitter_pct": None,
            "voiced_fraction": None,
            "contour_60pt": [],  # [{t: 0..1, f0: Hz or null}]
        }

        try:
            # pyin gives probabilistic voicing + smooth F0 estimates
            f0, voiced_flag, voiced_probs = librosa.pyin(
                y,
                fmin=F0_MIN_HZ,
                fmax=F0_MAX_HZ,
                sr=self.sr,
                frame_length=2048,
                hop_length=256,
            )

            voiced_mask = voiced_flag & (f0 > 0)
            n_frames = len(f0)
            n_voiced = int(np.sum(voiced_mask))

            if n_voiced < 5:
                result["available"] = False
                result["reason"] = f"Insufficient voiced frames ({n_voiced})"
                # Still build a flat contour so frontend has an array
                result["contour_60pt"] = self._downsample_contour(
                    f0, voiced_flag, n_frames
                )
                return result

            f0_valid = f0[voiced_mask]

            # Basic statistics
            mean_f0 = float(np.mean(f0_valid))
            median_f0 = float(np.median(f0_valid))
            min_f0 = float(np.min(f0_valid))
            max_f0 = float(np.max(f0_valid))

            # Pitch range in semitones: 12 * log2(max/min)
            if min_f0 > 0:
                range_semitones = float(12.0 * np.log2(max_f0 / min_f0))
            else:
                range_semitones = 0.0

            # Local jitter: mean absolute successive difference / mean F0
            if len(f0_valid) > 1:
                diffs = np.abs(np.diff(f0_valid))
                jitter_pct = float(np.mean(diffs) / mean_f0 * 100.0) if mean_f0 > 0 else 0.0
            else:
                jitter_pct = 0.0

            voiced_fraction = float(n_voiced / n_frames)

            result.update({
                "available": True,
                "mean_f0": round(mean_f0, 2),
                "median_f0": round(median_f0, 2),
                "min_f0": round(min_f0, 2),
                "max_f0": round(max_f0, 2),
                "range_semitones": round(range_semitones, 2),
                "jitter_pct": round(jitter_pct, 3),
                "voiced_fraction": round(voiced_fraction, 3),
                "contour_60pt": self._downsample_contour(f0, voiced_flag, n_frames),
            })

        except Exception as e:
            logger.warning(f"PitchEngine extraction failed: {e}")
            result["available"] = False
            result["reason"] = f"Extraction error: {e}"

        return result

    def _downsample_contour(
        self,
        f0: np.ndarray,
        voiced: np.ndarray,
        n_frames: int,
    ) -> List[Dict]:
        """Produce self.n_chart time-indexed points with f0 or null for unvoiced."""
        if n_frames == 0:
            return []

        indices = np.linspace(0, n_frames - 1, self.n_chart, dtype=int)
        out = []
        for i, idx in enumerate(indices):
            t = round(i / (self.n_chart - 1), 4) if self.n_chart > 1 else 0.0
            f = float(f0[idx]) if voiced[idx] and f0[idx] > 0 else None
            if f is not None:
                f = round(f, 2)
            out.append({"t": t, "f0": f})
        return out

    # ── Comparison ───────────────────────────────────────────────────────────

    def compare(self, feat1: Dict[str, Any], feat2: Dict[str, Any]) -> Dict[str, Any]:
        """
        Compare two pitch feature sets.
        Returns sub_score (0–100), interpretation string, and raw deltas.
        """
        if not feat1.get("available") or not feat2.get("available"):
            return {
                "sub_score": None,
                "available": False,
                "reason": (
                    feat1.get("reason") or feat2.get("reason")
                    or "Pitch unavailable in one or both samples"
                ),
                "delta_mean_hz": None,
                "delta_range_semitones": None,
                "delta_jitter_pct": None,
            }

        # Mean F0 difference — same speaker within ~30 Hz typically
        mean_diff = abs(feat1["mean_f0"] - feat2["mean_f0"])
        mean_score = max(0.0, 1.0 - mean_diff / 80.0)  # 80 Hz → 0 pts

        # Range in semitones — same speaker within ~5 semitones typically
        range_diff = abs(feat1["range_semitones"] - feat2["range_semitones"])
        range_score = max(0.0, 1.0 - range_diff / 12.0)  # 12 semitones → 0 pts

        # Jitter similarity — similar vocal quality/physiology
        jitter_diff = abs(feat1["jitter_pct"] - feat2["jitter_pct"])
        jitter_score = max(0.0, 1.0 - jitter_diff / 10.0)  # 10% jitter diff → 0 pts

        # Weighted combination
        sub_score = round(
            (mean_score * 0.50 + range_score * 0.35 + jitter_score * 0.15) * 100.0,
            1,
        )

        # Plain-language interpretation
        interp = self._interpret(mean_diff, range_diff, jitter_diff, sub_score)

        return {
            "sub_score": sub_score,
            "available": True,
            "delta_mean_hz": round(mean_diff, 2),
            "delta_range_semitones": round(range_diff, 2),
            "delta_jitter_pct": round(jitter_diff, 3),
            "interpretation": interp,
        }

    def _interpret(
        self,
        mean_diff: float,
        range_diff: float,
        jitter_diff: float,
        score: float,
    ) -> str:
        parts = []

        if mean_diff < 15:
            parts.append(f"Mean pitch is closely matched ({mean_diff:.1f} Hz apart).")
        elif mean_diff < 40:
            parts.append(
                f"Mean pitch shows moderate divergence ({mean_diff:.1f} Hz), "
                "consistent with different recording conditions or emotional state."
            )
        else:
            parts.append(
                f"Mean pitch diverges significantly ({mean_diff:.1f} Hz), "
                "suggesting different physiological vocal registers."
            )

        if range_diff < 3:
            parts.append("Pitch range (expressivity) is similar.")
        elif range_diff < 8:
            parts.append(f"Pitch range differs by {range_diff:.1f} semitones; may reflect different speaking styles.")
        else:
            parts.append(
                f"Pitch range differs substantially ({range_diff:.1f} semitones); "
                "this level of divergence is unlikely for the same speaker."
            )

        return " ".join(parts)


pitch_engine = PitchEngine()
