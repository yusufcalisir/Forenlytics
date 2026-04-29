import logging
import numpy as np
import librosa
from typing import Dict, Any

logger = logging.getLogger("forenlytics.audio.biometric")

class BiometricEngine:
    def __init__(self, target_sr: int = 16000):
        self.sr = target_sr

    def extract_features(self, y: np.ndarray) -> Dict[str, float]:
        features = {}
        try:
            # 1. Pitch (F0) using librosa.yin
            # Limit pitch to reasonable human vocal range (50Hz - 500Hz)
            f0 = librosa.yin(y, fmin=50, fmax=500, sr=self.sr)
            f0_valid = f0[f0 > 0]
            
            if len(f0_valid) > 0:
                features['mean_pitch'] = float(np.mean(f0_valid))
                
                # 2. Jitter: cycle-to-cycle variation of fundamental frequency
                # Approx calculation using successive differences
                f0_diff = np.abs(np.diff(f0_valid))
                jitter = np.mean(f0_diff) / np.mean(f0_valid) if np.mean(f0_valid) > 0 else 0
                features['jitter'] = float(jitter * 100) # percentage
                
                # 3. Shimmer: cycle-to-cycle variation of amplitude
                # We approximate by finding peak amplitudes around f0 cycles
                # A simpler approximation is amplitude envelope variation 
                env = np.abs(librosa.onset.onset_strength(y=y, sr=self.sr))
                env_diff = np.abs(np.diff(env))
                shimmer = np.mean(env_diff) / np.mean(env) if np.mean(env) > 0 else 0
                features['shimmer'] = float(shimmer * 100) # percentage
            else:
                features['mean_pitch'] = 0.0
                features['jitter'] = 0.0
                features['shimmer'] = 0.0

            # 4. MFCC (Mel-frequency cepstral coefficients) to capture vocal tract
            mfccs = librosa.feature.mfcc(y=y, sr=self.sr, n_mfcc=13)
            # Use the mean of the first 13 MFCCs as a simplistic footprint
            features['mfcc_mean_0'] = float(np.mean(mfccs[0]))
            features['mfcc_mean_1'] = float(np.mean(mfccs[1]))

        except Exception as e:
            logger.warning(f"Failed to extract biometric features: {e}")
            features = {
                'mean_pitch': 0.0,
                'jitter': 0.0,
                'shimmer': 0.0,
                'mfcc_mean_0': 0.0,
                'mfcc_mean_1': 0.0,
            }
            
        return features

    def compare(self, feat1: Dict[str, float], feat2: Dict[str, float]) -> float:
        """
        Compare two biometric feature sets.
        Returns a similarity score between 0 and 100.
        """
        score = 100.0
        
        # Pitch difference
        pitch_diff = abs(feat1['mean_pitch'] - feat2['mean_pitch'])
        # A 50Hz difference is considered quite large for the same speaker in similar conditions
        score -= min(30.0, (pitch_diff / 50.0) * 30.0)
        
        # MFCC distance (Euclidean approx)
        m1 = np.array([feat1['mfcc_mean_0'], feat1['mfcc_mean_1']])
        m2 = np.array([feat2['mfcc_mean_0'], feat2['mfcc_mean_1']])
        mfcc_dist = np.linalg.norm(m1 - m2)
        score -= min(40.0, (mfcc_dist / 100.0) * 40.0)
        
        # Jitter/Shimmer differences (useful for voice pathology or mic matching, 
        # but less stable across different recordings, so lower weight)
        jitter_diff = abs(feat1['jitter'] - feat2['jitter'])
        score -= min(15.0, (jitter_diff / 5.0) * 15.0)
        
        shimmer_diff = abs(feat1['shimmer'] - feat2['shimmer'])
        score -= min(15.0, (shimmer_diff / 10.0) * 15.0)
        
        return max(0.0, score)

biometric_engine = BiometricEngine()
