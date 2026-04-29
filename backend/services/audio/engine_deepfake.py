import logging
import numpy as np
import librosa
from typing import Dict, Any
from .engine_embedding import embedding_engine

logger = logging.getLogger("forenlytics.audio.deepfake")

class DeepfakeEngine:
    def __init__(self, target_sr: int = 16000):
        self.sr = target_sr

    def analyze(self, y: np.ndarray) -> Dict[str, float]:
        import torch
        metrics = {}
        try:
            # 1. Zero Crossing Rate Variance
            zcr = librosa.feature.zero_crossing_rate(y=y)
            zcr_var = np.var(zcr)
            metrics['zcr_var'] = float(zcr_var)
            
            # 2. Spectral Rolloff Variance
            rolloff = librosa.feature.spectral_rolloff(y=y, sr=self.sr, roll_percent=0.85)
            rolloff_var = np.var(rolloff)
            metrics['rolloff_var'] = float(rolloff_var)
            
            # 3. Onset Strength Variance
            onset_env = librosa.onset.onset_strength(y=y, sr=self.sr)
            onset_var = np.var(onset_env)
            metrics['onset_var'] = float(onset_var)
            
            # 4. Temporal Embedding Variance
            temporal_var = 0.05
            if embedding_engine.model is not None and embedding_engine.processor is not None:
                inputs = embedding_engine.processor(y, sampling_rate=self.sr, return_tensors="pt", padding=True)
                inputs = {k: v.to(embedding_engine.device) for k, v in inputs.items()}
                with torch.no_grad():
                    outputs = embedding_engine.model(**inputs)
                    hidden_states = outputs.last_hidden_state
                seq = hidden_states.squeeze(0)
                temporal_var = float(torch.var(seq, dim=0).mean().item())
                
            metrics['temporal_embedding_var'] = temporal_var

        except Exception as e:
            logger.warning(f"Failed to extract deepfake metrics: {e}")
            metrics = {
                'zcr_var': 0.01,
                'rolloff_var': 1000000.0,
                'onset_var': 1.0,
                'temporal_embedding_var': 0.02
            }
            
        return metrics

    def compute_score(self, metrics: Dict[str, float]) -> float:
        """
        Compute deepfake probability score (0-100) from metrics.
        High score = High probability of deepfake.
        """
        score = 0.0
        
        # Heuristics based on variance (synthetic voices are typically smoother)
        if metrics['zcr_var'] < 0.005: score += 20.0
        elif metrics['zcr_var'] < 0.01: score += 10.0
            
        if metrics['rolloff_var'] < 500000: score += 20.0
        elif metrics['rolloff_var'] < 1000000: score += 10.0
            
        if metrics['onset_var'] < 0.5: score += 20.0
        elif metrics['onset_var'] < 1.0: score += 10.0
            
        if metrics['temporal_embedding_var'] < 0.005: score += 40.0
        elif metrics['temporal_embedding_var'] < 0.015: score += 20.0
            
        return min(max(score, 1.0), 99.0)

deepfake_engine = DeepfakeEngine()
