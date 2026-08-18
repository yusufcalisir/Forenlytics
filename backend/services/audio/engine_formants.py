"""
Formant Engine
===============
Estimates vocal tract resonance frequencies (F1–F4) via Linear Predictive Coding (LPC)
on pre-emphasized voiced frames. Formants are anatomical fingerprints of the vocal tract —
highly stable for the same speaker across sessions, and different between speakers.

LPC order follows the rule of thumb: sr/1000 + 2 (16 kHz → 18 poles).
"""

import logging
import numpy as np
import librosa
from typing import Dict, Any, List, Optional, Tuple

logger = logging.getLogger("forenlytics.audio.formants")


def _lpc_formants(
    frame: np.ndarray, sr: int, n_formants: int = 4
) -> Optional[List[float]]:
    """
    Estimate formant frequencies from a single windowed speech frame via LPC.
    Returns a sorted list of the lowest n_formants formants (Hz), or None on failure.
    """
    try:
        # Pre-emphasis filter to flatten spectral tilt
        frame = np.append(frame[0], frame[1:] - 0.97 * frame[:-1])
        # Hann-window
        frame *= np.hanning(len(frame))
        # LPC order = sr/1000 + 2 (typical speech analysis rule of thumb)
        order = int(sr / 1000) + 2
        # Autocorrelation LPC via numpy lstsq
        autocorr = np.correlate(frame, frame, mode="full")
        autocorr = autocorr[len(autocorr) // 2:]
        R = np.array([autocorr[i] for i in range(order + 1)])
        # Toeplitz matrix solve
        from scipy.linalg import solve_toeplitz
        if R[0] == 0:
            return None
        a = solve_toeplitz(R[:order], -R[1:order + 1])
        a = np.concatenate([[1.0], a])
        # Find roots of LPC polynomial
        roots = np.roots(a)
        # Keep roots inside unit circle with positive imaginary part
        roots = roots[np.abs(roots) < 1.0]
        roots = roots[np.imag(roots) > 0]
        if len(roots) == 0:
            return None
        # Convert angle to Hz
        angles = np.angle(roots)
        freqs = sorted(angles * (sr / (2.0 * np.pi)))
        freqs = [f for f in freqs if 50 < f < 5000]
        if len(freqs) < n_formants:
            return None
        return [round(f, 1) for f in freqs[:n_formants]]
    except Exception as e:
        logger.debug(f"LPC formant frame failed: {e}")
        return None


class FormantEngine:
    """Extract and compare vocal tract formants (F1–F4) via LPC analysis."""

    def __init__(self, target_sr: int = 16000, frame_ms: int = 50):
        self.sr = target_sr
        self.frame_len = int(frame_ms / 1000.0 * target_sr)  # samples per frame
        self.hop_len = self.frame_len // 2

    # ── Feature extraction ───────────────────────────────────────────────────

    def extract(self, y: np.ndarray) -> Dict[str, Any]:
        """
        Extract median F1–F4 formants from voiced frames of the signal.
        Returns JSON-serializable dict.
        """
        result: Dict[str, Any] = {
            "available": False,
            "reason": None,
            "f1_hz": None, "f2_hz": None, "f3_hz": None, "f4_hz": None,
            "formant_dispersion": None,   # (F4-F1)/3 — VTL proxy
            "n_frames_analyzed": 0,
        }

        try:
            # Use pyin-based voicing to restrict analysis to voiced frames
            _, voiced_flag, _ = librosa.pyin(
                y,
                fmin=60, fmax=500,
                sr=self.sr,
                frame_length=2048,
                hop_length=self.hop_len,
            )

            n_full_frames = (len(y) - self.frame_len) // self.hop_len + 1
            # Align voicing decisions to our frames
            n_use = min(len(voiced_flag), n_full_frames)

            all_formants: List[List[float]] = []

            for i in range(n_use):
                if not voiced_flag[i]:
                    continue
                start = i * self.hop_len
                end = start + self.frame_len
                if end > len(y):
                    break
                frame = y[start:end].copy()
                formants = _lpc_formants(frame, self.sr, n_formants=4)
                if formants is not None and len(formants) >= 4:
                    all_formants.append(formants)

            if len(all_formants) < 5:
                result["available"] = False
                result["reason"] = f"Too few voiced frames for formant analysis ({len(all_formants)})"
                return result

            arr = np.array(all_formants)  # shape: (n_frames, 4)
            f1 = float(np.median(arr[:, 0]))
            f2 = float(np.median(arr[:, 1]))
            f3 = float(np.median(arr[:, 2]))
            f4 = float(np.median(arr[:, 3]))

            dispersion = (f4 - f1) / 3.0  # vocal tract length proxy

            result.update({
                "available": True,
                "f1_hz": round(f1, 1),
                "f2_hz": round(f2, 1),
                "f3_hz": round(f3, 1),
                "f4_hz": round(f4, 1),
                "formant_dispersion": round(dispersion, 1),
                "n_frames_analyzed": len(all_formants),
            })

        except Exception as e:
            logger.warning(f"FormantEngine extraction failed: {e}")
            result["available"] = False
            result["reason"] = f"Extraction error: {e}"

        return result

    # ── Comparison ───────────────────────────────────────────────────────────

    def compare(self, feat1: Dict[str, Any], feat2: Dict[str, Any]) -> Dict[str, Any]:
        """
        Compare formant profiles.
        Returns sub_score (0–100) and detailed deltas.
        """
        if not feat1.get("available") or not feat2.get("available"):
            return {
                "sub_score": None,
                "available": False,
                "reason": (
                    feat1.get("reason") or feat2.get("reason")
                    or "Formant analysis unavailable in one or both samples"
                ),
            }

        # Per-formant absolute differences (Hz)
        d1 = abs(feat1["f1_hz"] - feat2["f1_hz"])
        d2 = abs(feat1["f2_hz"] - feat2["f2_hz"])
        d3 = abs(feat1["f3_hz"] - feat2["f3_hz"])
        d4 = abs(feat1["f4_hz"] - feat2["f4_hz"])

        # Tolerance radii (Hz) — based on formant measurement variability
        # F1 ± ~100 Hz typical same-speaker, F2 ± ~150 Hz, F3/F4 ± ~200 Hz
        s1 = max(0.0, 1.0 - d1 / 200.0)
        s2 = max(0.0, 1.0 - d2 / 300.0)
        s3 = max(0.0, 1.0 - d3 / 350.0)
        s4 = max(0.0, 1.0 - d4 / 400.0)

        # Formant dispersion difference
        disp_diff = abs(
            feat1["formant_dispersion"] - feat2["formant_dispersion"]
        )
        disp_score = max(0.0, 1.0 - disp_diff / 300.0)

        # Weighted: F1+F2 are most discriminative for speaker identity
        sub_score = round(
            (s1 * 0.25 + s2 * 0.30 + s3 * 0.20 + s4 * 0.10 + disp_score * 0.15) * 100.0,
            1,
        )

        interp = self._interpret(d1, d2, d3, d4, disp_diff, sub_score)

        return {
            "sub_score": sub_score,
            "available": True,
            "delta_f1_hz": round(d1, 1),
            "delta_f2_hz": round(d2, 1),
            "delta_f3_hz": round(d3, 1),
            "delta_f4_hz": round(d4, 1),
            "delta_dispersion_hz": round(disp_diff, 1),
            "interpretation": interp,
        }

    def _interpret(
        self,
        d1: float, d2: float, d3: float, d4: float,
        disp_diff: float, score: float,
    ) -> str:
        parts = []
        if d1 < 80 and d2 < 120:
            parts.append(
                f"First and second formants are closely matched "
                f"(F1 delta={d1:.0f} Hz, F2 delta={d2:.0f} Hz), "
                "consistent with similar vocal tract geometry."
            )
        elif d1 < 150 or d2 < 200:
            parts.append(
                f"Formant structure shows partial agreement "
                f"(F1 delta={d1:.0f} Hz, F2 delta={d2:.0f} Hz). "
                "Moderate divergence may reflect different phonetic context or recording conditions."
            )
        else:
            parts.append(
                f"Formant profiles diverge substantially "
                f"(F1 delta={d1:.0f} Hz, F2 delta={d2:.0f} Hz). "
                "This suggests different vocal tract anatomies, i.e. likely different speakers."
            )
        if disp_diff > 150:
            parts.append(
                f"Formant dispersion differs by {disp_diff:.0f} Hz, "
                "indicating a meaningful difference in estimated vocal tract length."
            )
        return " ".join(parts)


formant_engine = FormantEngine()
