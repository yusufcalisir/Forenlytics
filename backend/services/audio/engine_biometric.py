"""
Biometric / Spectral Engine
=============================
Extracts a comprehensive acoustic fingerprint:
  - 13-coefficient MFCC mean + variance vectors for spectral shape comparison
  - Spectral centroid (timbre brightness), bandwidth, and rolloff
  - Energy dynamics: RMS distribution, dynamic range, crest factor
  - Legacy: pitch mean, jitter, shimmer (kept for backward-compat fusion)

All arrays are pre-downsampled and JSON-serializable.
"""

import logging
import numpy as np
import librosa
from typing import Dict, Any, List, Optional

logger = logging.getLogger("forenlytics.audio.biometric")

N_MFCC = 13


class BiometricEngine:
    def __init__(self, target_sr: int = 16000, n_chart_points: int = 60):
        self.sr = target_sr
        self.n_chart = n_chart_points

    # ── Feature extraction ────────────────────────────────────────────────────

    def extract_features(self, y: np.ndarray) -> Dict[str, Any]:
        features: Dict[str, Any] = {}

        try:
            hop = 256

            # ── 1. 13-coeff MFCC mean + variance ────────────────────────────
            mfccs = librosa.feature.mfcc(y=y, sr=self.sr, n_mfcc=N_MFCC, hop_length=hop)
            # mfccs shape: (N_MFCC, T)
            mfcc_mean = mfccs.mean(axis=1).tolist()   # [float x 13]
            mfcc_var = mfccs.var(axis=1).tolist()     # [float x 13]
            features["mfcc_mean"] = [round(v, 4) for v in mfcc_mean]
            features["mfcc_var"] = [round(v, 4) for v in mfcc_var]
            # Legacy scalar aliases for backward-compat
            features["mfcc_mean_0"] = mfcc_mean[0]
            features["mfcc_mean_1"] = mfcc_mean[1]

            # ── 2. Spectral features ──────────────────────────────────────────
            centroid = librosa.feature.spectral_centroid(y=y, sr=self.sr, hop_length=hop)[0]
            bandwidth = librosa.feature.spectral_bandwidth(y=y, sr=self.sr, hop_length=hop)[0]
            rolloff = librosa.feature.spectral_rolloff(y=y, sr=self.sr, hop_length=hop)[0]
            contrast = librosa.feature.spectral_contrast(y=y, sr=self.sr, hop_length=hop)

            features["spectral_centroid_mean"] = round(float(np.mean(centroid)), 2)
            features["spectral_bandwidth_mean"] = round(float(np.mean(bandwidth)), 2)
            features["spectral_rolloff_mean"] = round(float(np.mean(rolloff)), 2)
            features["spectral_contrast_mean"] = round(float(np.mean(contrast)), 4)

            # ── 3. Energy dynamics ────────────────────────────────────────────
            rms = librosa.feature.rms(y=y, frame_length=512, hop_length=hop)[0]
            rms_db = librosa.amplitude_to_db(rms, ref=np.max(rms) + 1e-9)
            features["rms_mean_db"] = round(float(np.mean(rms_db)), 2)
            features["rms_std_db"] = round(float(np.std(rms_db)), 2)
            # Dynamic range: 95th - 5th percentile of RMS in dB
            features["dynamic_range_db"] = round(
                float(np.percentile(rms_db, 95) - np.percentile(rms_db, 5)), 2
            )
            # Crest factor (peak / RMS) in dB
            peak = np.max(np.abs(y)) + 1e-9
            rms_full = np.sqrt(np.mean(y ** 2)) + 1e-9
            features["crest_factor_db"] = round(
                float(20.0 * np.log10(peak / rms_full)), 2
            )

            # 60-point energy envelope for charting
            features["energy_60pt"] = self._downsample(rms, self.n_chart)

            # ── 4. Legacy pitch / jitter / shimmer ────────────────────────────
            f0 = librosa.yin(y, fmin=50, fmax=500, sr=self.sr)
            f0_valid = f0[f0 > 0]
            if len(f0_valid) > 0:
                features["mean_pitch"] = round(float(np.mean(f0_valid)), 2)
                f0_diff = np.abs(np.diff(f0_valid))
                jitter = (
                    float(np.mean(f0_diff) / np.mean(f0_valid)) * 100.0
                    if np.mean(f0_valid) > 0
                    else 0.0
                )
                features["jitter"] = round(jitter, 3)
            else:
                features["mean_pitch"] = 0.0
                features["jitter"] = 0.0

            env = np.abs(librosa.onset.onset_strength(y=y, sr=self.sr))
            env_diff = np.abs(np.diff(env))
            shimmer = (
                float(np.mean(env_diff) / np.mean(env)) * 100.0
                if np.mean(env) > 0
                else 0.0
            )
            features["shimmer"] = round(shimmer, 3)

        except Exception as e:
            logger.warning(f"BiometricEngine extraction failed: {e}")
            features = {
                "mfcc_mean": [0.0] * N_MFCC,
                "mfcc_var": [0.0] * N_MFCC,
                "mfcc_mean_0": 0.0,
                "mfcc_mean_1": 0.0,
                "spectral_centroid_mean": 0.0,
                "spectral_bandwidth_mean": 0.0,
                "spectral_rolloff_mean": 0.0,
                "spectral_contrast_mean": 0.0,
                "rms_mean_db": -60.0,
                "rms_std_db": 0.0,
                "dynamic_range_db": 0.0,
                "crest_factor_db": 0.0,
                "energy_60pt": [0.0] * self.n_chart,
                "mean_pitch": 0.0,
                "jitter": 0.0,
                "shimmer": 0.0,
            }

        return features

    def _downsample(self, arr: np.ndarray, n: int) -> List[float]:
        if len(arr) == 0:
            return [0.0] * n
        indices = np.linspace(0, len(arr) - 1, n, dtype=int)
        vals = arr[indices].astype(float)
        max_val = np.max(vals)
        if max_val > 0:
            vals = vals / max_val
        return [round(float(v), 4) for v in vals]

    # ── Comparison ───────────────────────────────────────────────────────────

    def compare(self, feat1: Dict[str, Any], feat2: Dict[str, Any]) -> float:
        """
        Returns overall biometric similarity score 0–100
        for backward-compat with fusion_engine.
        """
        try:
            return self._spectral_mfcc_score(feat1, feat2)
        except Exception as e:
            logger.warning(f"BiometricEngine compare failed: {e}")
            return 50.0

    def compare_detailed(self, feat1: Dict[str, Any], feat2: Dict[str, Any]) -> Dict[str, Any]:
        """
        Returns full spectral/MFCC comparison with per-coefficient breakdown.
        """
        try:
            score = self._spectral_mfcc_score(feat1, feat2)

            # Per-coefficient MFCC deltas for the chart
            m1 = feat1.get("mfcc_mean", [0.0] * N_MFCC)
            m2 = feat2.get("mfcc_mean", [0.0] * N_MFCC)
            mfcc_deltas = [
                {
                    "coeff": i + 1,
                    "val_1": round(m1[i], 3),
                    "val_2": round(m2[i], 3),
                    "delta": round(abs(m1[i] - m2[i]), 3),
                }
                for i in range(min(len(m1), len(m2), N_MFCC))
            ]

            # Spectral deltas
            centroid_diff = abs(
                feat1.get("spectral_centroid_mean", 0)
                - feat2.get("spectral_centroid_mean", 0)
            )
            bandwidth_diff = abs(
                feat1.get("spectral_bandwidth_mean", 0)
                - feat2.get("spectral_bandwidth_mean", 0)
            )
            rolloff_diff = abs(
                feat1.get("spectral_rolloff_mean", 0)
                - feat2.get("spectral_rolloff_mean", 0)
            )

            # Energy dynamics deltas
            rms_diff = abs(
                feat1.get("rms_mean_db", 0) - feat2.get("rms_mean_db", 0)
            )
            dr_diff = abs(
                feat1.get("dynamic_range_db", 0) - feat2.get("dynamic_range_db", 0)
            )

            interp = self._interpret(centroid_diff, rolloff_diff, mfcc_deltas, score)

            return {
                "sub_score": round(score, 1),
                "available": True,
                "mfcc_comparison": mfcc_deltas,
                "delta_centroid_hz": round(centroid_diff, 1),
                "delta_bandwidth_hz": round(bandwidth_diff, 1),
                "delta_rolloff_hz": round(rolloff_diff, 1),
                "delta_rms_db": round(rms_diff, 2),
                "delta_dynamic_range_db": round(dr_diff, 2),
                "interpretation": interp,
            }
        except Exception as e:
            logger.warning(f"BiometricEngine compare_detailed failed: {e}")
            return {"sub_score": 50.0, "available": False, "reason": str(e)}

    def _spectral_mfcc_score(self, feat1: Dict, feat2: Dict) -> float:
        # MFCC cosine similarity (mean vectors)
        m1 = np.array(feat1.get("mfcc_mean", [0.0] * N_MFCC))
        m2 = np.array(feat2.get("mfcc_mean", [0.0] * N_MFCC))
        norm1 = np.linalg.norm(m1)
        norm2 = np.linalg.norm(m2)
        if norm1 > 0 and norm2 > 0:
            mfcc_cos = float(np.dot(m1, m2) / (norm1 * norm2))
            mfcc_score = (mfcc_cos + 1.0) / 2.0  # → [0,1]
        else:
            mfcc_score = 0.5

        # Spectral centroid similarity
        c1 = feat1.get("spectral_centroid_mean", 0)
        c2 = feat2.get("spectral_centroid_mean", 0)
        centroid_diff = abs(c1 - c2)
        centroid_score = max(0.0, 1.0 - centroid_diff / 2000.0)

        # Rolloff similarity
        r1 = feat1.get("spectral_rolloff_mean", 0)
        r2 = feat2.get("spectral_rolloff_mean", 0)
        rolloff_diff = abs(r1 - r2)
        rolloff_score = max(0.0, 1.0 - rolloff_diff / 3000.0)

        # Pitch + jitter (legacy) — lower weight
        pitch_diff = abs(feat1.get("mean_pitch", 0) - feat2.get("mean_pitch", 0))
        pitch_score = max(0.0, 1.0 - pitch_diff / 80.0)

        return round(
            (mfcc_score * 0.50 + centroid_score * 0.20 + rolloff_score * 0.15 + pitch_score * 0.15) * 100.0,
            1,
        )

    def _interpret(
        self,
        centroid_diff: float,
        rolloff_diff: float,
        mfcc_deltas: List[Dict],
        score: float,
    ) -> str:
        mean_mfcc_delta = (
            np.mean([d["delta"] for d in mfcc_deltas]) if mfcc_deltas else 0.0
        )
        parts = []
        if score >= 75:
            parts.append(
                "Spectral and MFCC fingerprints are closely matched, "
                "suggesting similar vocal timbre and resonance characteristics."
            )
        elif score >= 50:
            parts.append(
                f"Moderate spectral divergence (MFCC mean delta={mean_mfcc_delta:.2f}; "
                f"centroid delta={centroid_diff:.0f} Hz). "
                "Could reflect different microphone responses or speaking styles."
            )
        else:
            parts.append(
                f"Spectral profiles differ substantially (MFCC mean delta={mean_mfcc_delta:.2f}; "
                f"centroid delta={centroid_diff:.0f} Hz), "
                "indicating different acoustic characteristics between samples."
            )
        return " ".join(parts)


biometric_engine = BiometricEngine()
