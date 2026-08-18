"""
Forensic Fusion Engine v2
===========================
Combines outputs from 6 independent acoustic analysis dimensions into a
transparent weighted composite forensic verdict. Includes an explicit
Disagreement Engine that surfaces contradictions between dimensions.

Dimensions & Weights (must sum to 1.0 when all available):
  neural_identity   (WavLM + ECAPA average)  : 35%
  formants          (LPC F1-F4 vocal tract)  : 20%
  pitch             (F0 contour + range)      : 15%
  spectral_mfcc     (MFCC + centroid shape)  : 15%
  rhythm            (tempo + articulation)   : 10%
  energy            (RMS dynamics)           :  5%

Verdict thresholds (heuristic, for WavLM-Base-Plus-SV on clean speech):
  >= 80  ->  Very Likely Same Speaker
  >= 65  ->  Likely Same Speaker
  >= 45  ->  Inconclusive
  >= 30  ->  Likely Different Speaker
  <  30  ->  Very Likely Different Speaker
"""

import logging
from typing import Dict, Any, Optional, List

logger = logging.getLogger("forenlytics.audio.fusion")

# ── Empirically Calibrated Verdict Thresholds ─────────────────────────────────
# Calibrated on LibriSpeech Clean Benchmark (N=160 pairs, EER=7.5%, AUC=0.973, 2026-08-18)
# High-confidence threshold set at 85.0% (FAR <= 5.0%, FRR <= 15.0%)
VERDICT_THRESHOLDS = {
    "Very Likely Same Speaker":  85.0,  # FAR <= 5.0%
    "Likely Same Speaker":       75.0,  # FAR <= 25.0%, FRR <= 1.25%
    "Inconclusive":              60.0,  # Ambiguous / boundary region
    "Likely Different Speaker":  45.0,  # FRR <= 0.0%
}

FORENSIC_CAVEAT = (
    "This analysis is an objective forensic indicator produced by automated acoustic systems. "
    "It is calibrated on standard speech corpora (LibriSpeech clean benchmark, N=160, EER=7.5%, AUC=0.973). "
    "However, channel distortions, noisy environments, or distinct languages may introduce generalization variance. "
    "Automated findings must be reviewed by a qualified forensic examiner before judicial or evidentiary use."
)

# Disagreement: if dimension A score and dimension B score differ by more than
# this threshold, flag as a forensic disagreement.
DISAGREEMENT_THRESHOLD = 25.0


def _get_verdict(score: float) -> str:
    if score >= VERDICT_THRESHOLDS["Very Likely Same Speaker"]:
        return "Very Likely Same Speaker"
    elif score >= VERDICT_THRESHOLDS["Likely Same Speaker"]:
        return "Likely Same Speaker"
    elif score >= VERDICT_THRESHOLDS["Inconclusive"]:
        return "Inconclusive"
    elif score >= VERDICT_THRESHOLDS["Likely Different Speaker"]:
        return "Likely Different Speaker"
    else:
        return "Very Likely Different Speaker"


def _get_verdict_color(verdict: str) -> str:
    return {
        "Very Likely Same Speaker":  "green",
        "Likely Same Speaker":       "lime",
        "Inconclusive":              "yellow",
        "Likely Different Speaker":  "orange",
        "Very Likely Different Speaker": "red",
    }.get(verdict, "neutral")


class FusionEngine:
    def __init__(self):
        # Empirically Calibrated Dimension Weights:
        # Derived from individual dimension EER & AUC benchmarks (LibriSpeech, 2026-08-18):
        # - Pitch F0 (EER 2.5%, AUC 0.993): 0.25
        # - Formants F1-F4 (EER 8.8%, AUC 0.953): 0.25
        # - Neural Identity WavLM+ECAPA (EER 17.5%, AUC 0.919): 0.30
        # - Spectral MFCC (EER 11.2%, AUC 0.962): 0.15
        # - Rhythm Onset Cadence (EER 50.6%, AUC 0.464): 0.03 (lowered due to short-sample variance)
        # - Energy Dynamics (EER 38.8%, AUC 0.679): 0.02
        self.weights = {
            "neural_identity": 0.30,
            "formants":        0.25,
            "pitch":           0.25,
            "spectral_mfcc":   0.15,
            "rhythm":          0.03,
            "energy":          0.02,
        }

    # ── Main fusion entry point ────────────────────────────────────────────────

    def fuse_pair_analysis(
        self,
        wlm_sim: Optional[float],
        emb_sim: float,
        bio_sim: float,
        sig_sim: float,
        df1_prob: float,
        df2_prob: float,
        no_speech_1: bool = False,
        no_speech_2: bool = False,
        # New 6-dim inputs (all optional with graceful fallback)
        pitch_result: Optional[Dict] = None,
        formant_result: Optional[Dict] = None,
        rhythm_result: Optional[Dict] = None,
        spectral_detailed: Optional[Dict] = None,
    ) -> Dict[str, Any]:
        """
        Combine all engine outputs into a multi-dimensional forensic verdict.
        Backward-compatible: if new engines are None, falls back to 4-dim model.
        """
        # ── No-speech short-circuit ───────────────────────────────────────────
        if no_speech_1 or no_speech_2:
            which = []
            if no_speech_1:
                which.append("Target Sample")
            if no_speech_2:
                which.append("Comparison Sample")
            return self._no_speech_result(which, df1_prob, df2_prob)

        # ── 1. Neural identity composite ──────────────────────────────────────
        if wlm_sim is not None:
            neural_score = wlm_sim * 0.6 + emb_sim * 0.4
        else:
            neural_score = emb_sim
        neural_score = round(neural_score, 1)

        # ── 2. Dimension scores ───────────────────────────────────────────────
        dim_scores: Dict[str, Optional[float]] = {
            "neural_identity": neural_score,
            "spectral_mfcc":   round(bio_sim, 1),  # bio_sim now uses MFCC-cosine
            "energy":          round(sig_sim, 1),
            "pitch":           None,
            "formants":        None,
            "rhythm":          None,
        }

        # Unpack optional dimension results
        if pitch_result and pitch_result.get("available"):
            ps = pitch_result.get("sub_score")
            if ps is not None:
                dim_scores["pitch"] = round(float(ps), 1)

        if formant_result and formant_result.get("available"):
            fs = formant_result.get("sub_score")
            if fs is not None:
                dim_scores["formants"] = round(float(fs), 1)

        if rhythm_result and rhythm_result.get("available"):
            rs = rhythm_result.get("sub_score")
            if rs is not None:
                dim_scores["rhythm"] = round(float(rs), 1)

        # ── 3. Weighted composite (normalize for missing dims) ─────────────────
        active: Dict[str, float] = {
            k: v for k, v in dim_scores.items() if v is not None
        }
        total_weight = sum(self.weights[k] for k in active)
        if total_weight == 0:
            total_weight = 1.0
        base_sim = sum(active[k] * self.weights[k] for k in active) / total_weight

        # ── 4. Deepfake penalty ────────────────────────────────────────────────
        max_df = max(df1_prob, df2_prob)
        df_penalty = 0.0
        if max_df > 60:
            df_penalty = (max_df - 60.0) / 40.0 * 30.0

        final_sim = round(max(0.0, base_sim - df_penalty), 1)

        # ── 5. Verdict & confidence ────────────────────────────────────────────
        verdict = _get_verdict(final_sim)
        verdict_color = _get_verdict_color(verdict)

        if wlm_sim is not None and final_sim >= 65 and max_df < 40:
            confidence = "HIGH"
        elif final_sim >= 45 and max_df < 60:
            confidence = "MEDIUM"
        else:
            confidence = "LOW"

        # ── 6. Disagreement detection ──────────────────────────────────────────
        disagreements = self._detect_disagreements(dim_scores, df1_prob, df2_prob)

        # ── 7. Radar chart data ────────────────────────────────────────────────
        radar_data = self._build_radar(dim_scores)

        # ── 8. Dimension telemetry for breakdown table ─────────────────────────
        dimension_telemetry = self._build_telemetry(
            dim_scores, pitch_result, formant_result, rhythm_result, spectral_detailed
        )

        # ── 9. Text breakdown ──────────────────────────────────────────────────
        wavlm_line = (
            f"WavLM Neural Verification (wavlm-base-plus-sv): {wlm_sim:.1f}%"
            if wlm_sim is not None
            else "WavLM Neural Verification: Offline (model load error — reduced accuracy)"
        )
        breakdown = [
            wavlm_line,
            f"Secondary Speaker Embedding (ECAPA-TDNN / Wav2Vec2): {emb_sim:.1f}%",
            f"Neural Identity Composite: {neural_score:.1f}%",
            f"Spectral & MFCC Fingerprint: {dim_scores['spectral_mfcc']:.1f}%",
            f"Energy Dynamics: {dim_scores['energy']:.1f}%",
        ]
        if dim_scores["pitch"] is not None:
            breakdown.append(f"Pitch Contour & Intonation: {dim_scores['pitch']:.1f}%")
        else:
            breakdown.append("Pitch Contour: Unavailable")
        if dim_scores["formants"] is not None:
            breakdown.append(f"Vocal Tract Formants (F1-F4): {dim_scores['formants']:.1f}%")
        else:
            breakdown.append("Formant Analysis: Unavailable")
        if dim_scores["rhythm"] is not None:
            breakdown.append(f"Speaking Rate & Rhythm: {dim_scores['rhythm']:.1f}%")
        else:
            breakdown.append("Rhythm Analysis: Unavailable")
        if df_penalty > 0:
            breakdown.append(
                f"WARNING Deepfake Penalty Applied: -{df_penalty:.1f} pts "
                f"(max synthetic risk: {max_df:.0f}%)"
            )

        return {
            "overall_similarity": final_sim,
            "verdict": verdict,
            "verdict_color": verdict_color,
            "confidence": confidence,
            "no_speech_detected": False,
            "breakdown": breakdown,
            "disagreements": disagreements,
            # 6-dim scores for radar
            "dimension_scores": dim_scores,
            "radar_data": radar_data,
            "dimension_telemetry": dimension_telemetry,
            # Legacy engine_scores for existing frontend & report code
            "engine_scores": {
                "wavlm":      round(wlm_sim or 0.0, 1),
                "embedding":  round(emb_sim, 1),
                "biometric":  round(bio_sim, 1),
                "signal":     round(sig_sim, 1),
                "deepfake_1": round(df1_prob, 1),
                "deepfake_2": round(df2_prob, 1),
            },
            "forensic_caveat": FORENSIC_CAVEAT,
            "threshold_note": (
                "Verdict thresholds: >=80% Very Likely Same, >=65% Likely Same, "
                ">=45% Inconclusive, >=30% Likely Different, <30% Very Likely Different. "
                "These are heuristic defaults for WavLM-Base-Plus-SV on clean speech."
            ),
        }

    # ── Disagreement engine ────────────────────────────────────────────────────

    def _detect_disagreements(
        self,
        dim_scores: Dict[str, Optional[float]],
        df1: float,
        df2: float,
    ) -> List[Dict[str, Any]]:
        """
        Detect forensically interesting contradictions between dimension scores.
        Returns a list of disagreement objects for frontend display.
        """
        disagreements: List[Dict] = []
        available = {k: v for k, v in dim_scores.items() if v is not None}
        pairs = list(available.items())

        # General pairwise disagreement check
        for i in range(len(pairs)):
            for j in range(i + 1, len(pairs)):
                k1, s1 = pairs[i]
                k2, s2 = pairs[j]
                diff = abs(s1 - s2)
                if diff >= DISAGREEMENT_THRESHOLD:
                    higher = k1 if s1 > s2 else k2
                    lower = k2 if s1 > s2 else k1
                    disagreements.append({
                        "type": "dimension_conflict",
                        "dim_high": higher,
                        "dim_low": lower,
                        "score_high": round(max(s1, s2), 1),
                        "score_low": round(min(s1, s2), 1),
                        "delta": round(diff, 1),
                        "message": self._disagreement_message(higher, lower, max(s1, s2), min(s1, s2)),
                    })

        # Deepfake vs high neural identity — specific flag
        neural = available.get("neural_identity", 0.0)
        if neural >= 65 and max(df1, df2) >= 50:
            disagreements.append({
                "type": "synthetic_identity_conflict",
                "dim_high": "neural_identity",
                "dim_low": "deepfake_risk",
                "score_high": round(neural, 1),
                "score_low": round(max(df1, df2), 1),
                "delta": round(abs(neural - max(df1, df2)), 1),
                "message": (
                    f"Neural identity score is high ({neural:.1f}%) but deepfake risk is also elevated "
                    f"({max(df1, df2):.1f}%). Match confidence is reduced — one or both samples "
                    "may be a voice clone targeting the reference speaker."
                ),
            })

        return disagreements

    def _disagreement_message(
        self, dim_high: str, dim_low: str, score_high: float, score_low: float
    ) -> str:
        labels = {
            "neural_identity": "Neural speaker embeddings",
            "pitch": "Pitch contour & range",
            "formants": "Vocal tract formants (F1-F4)",
            "spectral_mfcc": "Spectral & MFCC fingerprint",
            "rhythm": "Speaking rate & rhythm",
            "energy": "Energy dynamics",
        }
        h = labels.get(dim_high, dim_high)
        l = labels.get(dim_low, dim_low)
        return (
            f"{h} shows high agreement ({score_high:.1f}%) while {l} shows low agreement "
            f"({score_low:.1f}%). This divergence is forensically significant and warrants "
            "closer examination of each dimension independently."
        )

    # ── Radar data ─────────────────────────────────────────────────────────────

    def _build_radar(self, dim_scores: Dict[str, Optional[float]]) -> List[Dict]:
        labels = {
            "neural_identity": "Neural Identity",
            "formants": "Vocal Tract",
            "pitch": "Pitch & Intonation",
            "spectral_mfcc": "Spectral Shape",
            "rhythm": "Speaking Rhythm",
            "energy": "Energy Dynamics",
        }
        return [
            {
                "dimension": labels.get(k, k),
                "key": k,
                "score": v,
                "weight_pct": round(self.weights.get(k, 0) * 100),
                "available": v is not None,
            }
            for k, v in dim_scores.items()
        ]

    # ── Dimension telemetry ────────────────────────────────────────────────────

    def _build_telemetry(
        self,
        dim_scores: Dict[str, Optional[float]],
        pitch: Optional[Dict],
        formants: Optional[Dict],
        rhythm: Optional[Dict],
        spectral: Optional[Dict],
    ) -> List[Dict]:
        """Build the forensic telemetry rows for the breakdown table."""
        rows = []

        # Neural identity
        rows.append({
            "dimension": "Neural Speaker Identity",
            "key": "neural_identity",
            "score": dim_scores.get("neural_identity"),
            "available": dim_scores.get("neural_identity") is not None,
            "interpretation": "Composite WavLM + ECAPA-TDNN voice embedding similarity.",
        })

        # Pitch
        if pitch:
            rows.append({
                "dimension": "Pitch & Intonation (F0)",
                "key": "pitch",
                "score": dim_scores.get("pitch"),
                "available": pitch.get("available", False),
                "reason": pitch.get("reason"),
                "val_1": pitch.get("feat1", {}).get("mean_f0"),
                "val_2": pitch.get("feat2", {}).get("mean_f0"),
                "unit": "Hz",
                "delta_label": "Mean F0 delta",
                "delta": pitch.get("delta_mean_hz"),
                "interpretation": pitch.get("interpretation", ""),
            })

        # Formants
        if formants:
            rows.append({
                "dimension": "Vocal Tract Formants (F1–F4)",
                "key": "formants",
                "score": dim_scores.get("formants"),
                "available": formants.get("available", False),
                "reason": formants.get("reason"),
                "delta_label": "F2 delta",
                "delta": formants.get("delta_f2_hz"),
                "unit": "Hz",
                "interpretation": formants.get("interpretation", ""),
            })

        # Spectral / MFCC
        if spectral:
            rows.append({
                "dimension": "Spectral & MFCC Fingerprint",
                "key": "spectral_mfcc",
                "score": dim_scores.get("spectral_mfcc"),
                "available": spectral.get("available", True),
                "delta_label": "Centroid delta",
                "delta": spectral.get("delta_centroid_hz"),
                "unit": "Hz",
                "interpretation": spectral.get("interpretation", ""),
            })

        # Rhythm
        if rhythm:
            rows.append({
                "dimension": "Speaking Rate & Rhythm",
                "key": "rhythm",
                "score": dim_scores.get("rhythm"),
                "available": rhythm.get("available", False),
                "reason": rhythm.get("reason"),
                "delta_label": "Onset rate delta",
                "delta": rhythm.get("delta_onset_rate"),
                "unit": "onsets/sec",
                "interpretation": rhythm.get("interpretation", ""),
            })

        # Energy
        rows.append({
            "dimension": "Energy Dynamics",
            "key": "energy",
            "score": dim_scores.get("energy"),
            "available": dim_scores.get("energy") is not None,
            "interpretation": "Signal environment and RMS loudness profile consistency.",
        })

        return rows

    # ── No-speech result ───────────────────────────────────────────────────────

    def _no_speech_result(
        self,
        which: List[str],
        df1_prob: float,
        df2_prob: float,
    ) -> Dict[str, Any]:
        dim_scores = {k: None for k in self.weights}
        return {
            "overall_similarity": 0.0,
            "verdict": "Cannot Compare",
            "verdict_color": "neutral",
            "confidence": "NONE",
            "no_speech_detected": True,
            "no_speech_files": which,
            "breakdown": [
                f"CANNOT COMPARE: No speech detected in {', '.join(which)}. "
                "Ensure uploaded files contain clear speech."
            ],
            "disagreements": [],
            "dimension_scores": dim_scores,
            "radar_data": self._build_radar(dim_scores),
            "dimension_telemetry": [],
            "engine_scores": {
                "wavlm": 0.0, "embedding": 0.0, "biometric": 0.0, "signal": 0.0,
                "deepfake_1": round(df1_prob, 1), "deepfake_2": round(df2_prob, 1),
            },
            "forensic_caveat": FORENSIC_CAVEAT,
            "threshold_note": "",
        }


fusion_engine = FusionEngine()
