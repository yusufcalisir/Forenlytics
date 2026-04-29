import logging
from typing import Dict, Any

logger = logging.getLogger("forenlytics.audio.fusion")

class FusionEngine:
    def __init__(self):
        # Fusion weights for overall similarity calculation
        self.weights = {
            "wavlm": 0.40,        # Microsoft WavLM-Base-Plus-SV
            "embedding": 0.30,    # Wav2Vec2 contextual features
            "biometric": 0.20,
            "signal": 0.10
        }

    def fuse_pair_analysis(
        self,
        wlm_sim: float | None,
        emb_sim: float,
        bio_sim: float,
        sig_sim: float,
        df1_prob: float,
        df2_prob: float
    ) -> Dict[str, Any]:
        """
        Combines engine outputs into a definitive forensic score for a speaker comparison.
        """
        # Calculate base similarity with weight normalization for offline engines
        active_engines = {
            "embedding": emb_sim,
            "biometric": bio_sim,
            "signal": sig_sim
        }
        
        # Calculate total weight of active engines
        total_active_weight = self.weights["embedding"] + self.weights["biometric"] + self.weights["signal"]
        
        # Add WavLM if available
        current_wlm_sim = 0.0
        if wlm_sim is not None:
            active_engines["wavlm"] = wlm_sim
            total_active_weight += self.weights["wavlm"]
            current_wlm_sim = wlm_sim
        
        # Weighted average across active engines
        base_sim = sum(active_engines[k] * self.weights[k] for k in active_engines) / total_active_weight
        
        # Deepfake penalty: If either audio is likely synthetic, we heavily penalize the match
        # because you can't confidently match a deepfake to a real voice.
        max_df = max(df1_prob, df2_prob)
        df_penalty = 0.0
        if max_df > 60:
            df_penalty = (max_df - 60) * 1.5 # Scale penalty
            
        final_sim = max(0.0, base_sim - df_penalty)
        
        # Confidence logic
        confidence = "LOW"
        if final_sim >= 80 and max_df < 30:
            confidence = "HIGH"
        elif final_sim >= 60 and max_df < 50:
            confidence = "MEDIUM"
            
        # Explanations
        sb_text = f"Microsoft WavLM Similarity: {current_wlm_sim:.1f}%" if wlm_sim is not None else "Microsoft WavLM: Offline (Module Error)"
        breakdown = [
            sb_text,
            f"Wav2Vec2 Neural Embedding Similarity: {emb_sim:.1f}%",
            f"Vocal Tract Biometric Similarity (Pitch, MFCC): {bio_sim:.1f}%",
            f"Signal Environment Match: {sig_sim:.1f}%"
        ]
        
        if max_df > 60:
            breakdown.append(f"CRITICAL WARNING: Deepfake probability detected at {max_df:.1f}%. Similarity score severely penalized.")
            
        return {
            "overall_similarity": round(final_sim, 1),
            "confidence": confidence,
            "breakdown": breakdown,
            "engine_scores": {
                "wavlm": round(current_wlm_sim, 1),
                "embedding": round(emb_sim, 1),
                "biometric": round(bio_sim, 1),
                "signal": round(sig_sim, 1),
                "deepfake_1": round(df1_prob, 1),
                "deepfake_2": round(df2_prob, 1)
            }
        }

fusion_engine = FusionEngine()
