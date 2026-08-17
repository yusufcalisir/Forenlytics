"""
Forensic Fusion Engine
========================
Combines outputs from all analysis engines into a single forensic verdict
for speaker comparison.

Verdict thresholds
------------------
These thresholds map the composite similarity score (0–100) to a named verdict.
They are HEURISTIC DEFAULTS for the microsoft/wavlm-base-plus-sv model.

Typical score distributions (on clear, clean speech, same microphone):
  - Same speaker, same session:   85–95
  - Same speaker, different mic:  70–85
  - Different speakers:           20–55

These ranges shift under:
  - Noisy recordings: scores compress toward the middle
  - Cross-channel recordings: same-speaker scores drop ~5–10 points
  - Very short utterances (<3s): higher variance, less reliable

Calibrated thresholds (adjustable via VERDICT_THRESHOLDS):
  ≥ 80  → Very Likely Same Speaker
  ≥ 65  → Likely Same Speaker
  ≥ 45  → Inconclusive
  ≥ 30  → Likely Different Speaker
  < 30  → Very Likely Different Speaker
"""

import logging
from typing import Dict, Any, Optional

logger = logging.getLogger("forenlytics.audio.fusion")

# ── Verdict thresholds — change these, not inline comparisons ─────────────────
VERDICT_THRESHOLDS = {
    "Very Likely Same Speaker":       80.0,
    "Likely Same Speaker":            65.0,
    "Inconclusive":                   45.0,
    "Likely Different Speaker":       30.0,
    # Below 30 → "Very Likely Different Speaker"
}

FORENSIC_CAVEAT = (
    "This analysis is a forensic indicator produced by automated acoustic systems. "
    "It is not definitive proof of speaker identity and must be reviewed by a qualified "
    "forensic examiner before any legal, institutional, or evidentiary use. "
    "Score thresholds are heuristic defaults; no calibration dataset was used."
)
# ──────────────────────────────────────────────────────────────────────────────


def _get_verdict(score: float) -> str:
    """Map a composite similarity score to a named verdict string."""
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
    """Return a UI color hint for the verdict string."""
    mapping = {
        "Very Likely Same Speaker": "green",
        "Likely Same Speaker": "lime",
        "Inconclusive": "yellow",
        "Likely Different Speaker": "orange",
        "Very Likely Different Speaker": "red",
    }
    return mapping.get(verdict, "neutral")


class FusionEngine:
    def __init__(self):
        # Engine weights must sum to 1.0 when all engines are active.
        # WavLM dominates because it uses the purpose-built SV fine-tuned checkpoint.
        self.weights = {
            "wavlm":     0.45,  # Microsoft WavLM-Base-Plus-SV (x-vector, SV-fine-tuned)
            "embedding": 0.25,  # ECAPA-TDNN or Wav2Vec2 fallback
            "biometric": 0.20,  # Pitch, MFCC, jitter, shimmer
            "signal":    0.10,  # Noise floor, spectral contrast, rolloff
        }

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
    ) -> Dict[str, Any]:
        """
        Combine engine scores into a final forensic verdict.

        Parameters
        ----------
        wlm_sim       : WavLM cosine similarity scaled to 0–100 (None if offline)
        emb_sim       : Secondary embedding similarity scaled to 0–100
        bio_sim       : Biometric feature similarity 0–100
        sig_sim       : Signal environment similarity 0–100
        df1_prob      : Deepfake probability for audio 1 (0–100)
        df2_prob      : Deepfake probability for audio 2 (0–100)
        no_speech_1/2 : True if no speech was detected in that file
        """
        # Cannot compare case
        if no_speech_1 or no_speech_2:
            which = []
            if no_speech_1:
                which.append("Target Sample")
            if no_speech_2:
                which.append("Comparison Sample")
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
                "engine_scores": {
                    "wavlm": 0.0,
                    "embedding": 0.0,
                    "biometric": 0.0,
                    "signal": 0.0,
                    "deepfake_1": round(df1_prob, 1),
                    "deepfake_2": round(df2_prob, 1),
                },
                "forensic_caveat": FORENSIC_CAVEAT,
                "threshold_note": "Thresholds are heuristic defaults. No calibration dataset used.",
            }

        # Active engine weighted average (normalize for offline engines)
        active = {"embedding": emb_sim, "biometric": bio_sim, "signal": sig_sim}
        total_weight = self.weights["embedding"] + self.weights["biometric"] + self.weights["signal"]

        wavlm_score = 0.0
        if wlm_sim is not None:
            active["wavlm"] = wlm_sim
            total_weight += self.weights["wavlm"]
            wavlm_score = wlm_sim

        base_sim = sum(active[k] * self.weights[k] for k in active) / total_weight

        # Deepfake penalty: synthetic audio → penalize match confidence
        # because you cannot reliably match a deepfake voice to a real one.
        max_df = max(df1_prob, df2_prob)
        df_penalty = 0.0
        if max_df > 60:
            # Linear penalty: 0 at 60%, up to 30 points penalty at 100%
            df_penalty = (max_df - 60.0) / 40.0 * 30.0

        final_sim = round(max(0.0, base_sim - df_penalty), 1)

        # Named verdict
        verdict = _get_verdict(final_sim)
        verdict_color = _get_verdict_color(verdict)

        # Confidence level (HIGH/MEDIUM/LOW)
        if wlm_sim is not None and final_sim >= 65 and max_df < 40:
            confidence = "HIGH"
        elif final_sim >= 45 and max_df < 60:
            confidence = "MEDIUM"
        else:
            confidence = "LOW"

        # Breakdown lines for display
        wavlm_line = (
            f"WavLM Neural Verification (wavlm-base-plus-sv): {wavlm_score:.1f}%"
            if wlm_sim is not None
            else "WavLM Neural Verification: Offline (model load error — reduced accuracy)"
        )
        breakdown = [
            wavlm_line,
            f"Secondary Speaker Embedding (ECAPA-TDNN / Wav2Vec2): {emb_sim:.1f}%",
            f"Vocal Biometrics (Pitch, MFCC, Jitter, Shimmer): {bio_sim:.1f}%",
            f"Signal Environment Consistency: {sig_sim:.1f}%",
        ]
        if df_penalty > 0:
            breakdown.append(
                f"⚠ Deepfake Penalty Applied: {df_penalty:.1f} points deducted "
                f"(max synthetic risk: {max_df:.0f}%)"
            )

        return {
            "overall_similarity": final_sim,
            "verdict": verdict,
            "verdict_color": verdict_color,
            "confidence": confidence,
            "no_speech_detected": False,
            "breakdown": breakdown,
            "engine_scores": {
                "wavlm":      round(wavlm_score, 1),
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


fusion_engine = FusionEngine()
