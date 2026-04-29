import logging
import numpy as np
import librosa
from typing import Dict, Any

logger = logging.getLogger("forenlytics.audio.signal")

class SignalForensicEngine:
    def __init__(self, target_sr: int = 16000):
        self.sr = target_sr

    def analyze_signal(self, y: np.ndarray) -> Dict[str, float]:
        """
        Analyzes the signal for forensic anomalies like artificial silence (zero noise floor),
        unnatural spectral contrast, or compression artifacts.
        """
        metrics = {}
        try:
            # 1. Noise Floor Estimation
            # A purely digital/synthetic file might have absolute silence (0.0) in gaps.
            # Real recordings always have a noise floor.
            metrics['noise_floor_db'] = float(np.mean(librosa.amplitude_to_db(np.abs(librosa.stft(y)))))
            
            # 2. Spectral Contrast
            # High spectral contrast means sharp peaks and deep valleys (music or synthetic tones).
            # Voice is usually somewhat smoother.
            contrast = librosa.feature.spectral_contrast(y=y, sr=self.sr)
            metrics['mean_spectral_contrast'] = float(np.mean(contrast))
            
            # 3. High-frequency roll-off anomaly
            # Sudden drop-offs in high frequencies can indicate heavy MP3/AAC compression or poor deepfakes.
            rolloff = librosa.feature.spectral_rolloff(y=y, sr=self.sr, roll_percent=0.95)
            metrics['rolloff_mean'] = float(np.mean(rolloff))
            metrics['rolloff_std'] = float(np.std(rolloff))
            
        except Exception as e:
            logger.warning(f"Failed to extract signal forensic metrics: {e}")
            metrics = {
                'noise_floor_db': -80.0,
                'mean_spectral_contrast': 0.0,
                'rolloff_mean': 0.0,
                'rolloff_std': 0.0
            }
            
        return metrics

    def compare(self, sig1: Dict[str, float], sig2: Dict[str, float]) -> float:
        """
        Compare signal environments. If two files claim to be from the same uninterrupted recording,
        their noise floor and spectral contrast should match closely.
        """
        score = 100.0
        
        # Noise floor difference
        nf_diff = abs(sig1['noise_floor_db'] - sig2['noise_floor_db'])
        score -= min(40.0, (nf_diff / 20.0) * 40.0)
        
        # Contrast difference
        c_diff = abs(sig1['mean_spectral_contrast'] - sig2['mean_spectral_contrast'])
        score -= min(30.0, (c_diff / 5.0) * 30.0)
        
        # Rolloff difference
        r_diff = abs(sig1['rolloff_mean'] - sig2['rolloff_mean'])
        score -= min(30.0, (r_diff / 2000.0) * 30.0)
        
        return max(0.0, score)

signal_engine = SignalForensicEngine()
