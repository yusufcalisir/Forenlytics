import time
import logging
from typing import Dict, Any

from .preprocessor import preprocessor
from .engine_wavlm import wavlm_engine
from .engine_embedding import embedding_engine
from .engine_biometric import biometric_engine
from .engine_signal import signal_engine
from .engine_deepfake import deepfake_engine
from .fusion_engine import fusion_engine

logger = logging.getLogger("forenlytics.audio.facade")

class AudioForensicFacade:
    def analyze_pair(self, file1_bytes: bytes, file2_bytes: bytes) -> Dict[str, Any]:
        """
        Full multi-engine forensic pipeline for speaker comparison.
        """
        start = time.time()
        try:
            # 1. Preprocessing
            y1, env1 = preprocessor.preprocess(file1_bytes)
            y2, env2 = preprocessor.preprocess(file2_bytes)
            
            # 2. Microsoft WavLM Engine
            try:
                wlm_emb1 = wavlm_engine.get_embedding(file1_bytes, y1)
                wlm_emb2 = wavlm_engine.get_embedding(file2_bytes, y2)
                wlm_sim_raw = wavlm_engine.compare_embeddings(wlm_emb1, wlm_emb2)
                # WavLM uses normalized embeddings: cosine sim is [0, 1]
                wlm_sim = max(0.0, min(100.0, wlm_sim_raw * 100))
            except Exception as e:
                logger.warning(f"WavLM skipped: {e}")
                wlm_sim = None  # Use None to indicate engine is offline

            # 3. Wav2Vec2 Engine
            emb1 = embedding_engine.get_embedding(file1_bytes, y1)
            emb2 = embedding_engine.get_embedding(file2_bytes, y2)
            emb_sim_raw = embedding_engine.compare_embeddings(emb1, emb2)
            emb_sim = max(0.0, min(100.0, (emb_sim_raw + 1) * 50))
            
            # 3. Biometric Engine
            bio1 = biometric_engine.extract_features(y1)
            bio2 = biometric_engine.extract_features(y2)
            bio_sim = biometric_engine.compare(bio1, bio2)
            
            # 4. Signal Engine
            sig1 = signal_engine.analyze_signal(y1)
            sig2 = signal_engine.analyze_signal(y2)
            sig_sim = signal_engine.compare(sig1, sig2)
            
            # 6. Deepfake Engine
            df1_metrics = deepfake_engine.analyze(y1)
            df2_metrics = deepfake_engine.analyze(y2)
            df1_prob = deepfake_engine.compute_score(df1_metrics)
            df2_prob = deepfake_engine.compute_score(df2_metrics)
            
            # 7. Fusion Engine
            fusion_result = fusion_engine.fuse_pair_analysis(
                wlm_sim, emb_sim, bio_sim, sig_sim, df1_prob, df2_prob
            )
            
            elapsed = round(time.time() - start, 3)
            logger.info(f"Audio Pair Analysis completed in {elapsed}s | Similarity: {fusion_result['overall_similarity']}%")
            
            return {
                "similarity_score": fusion_result["overall_similarity"],
                "confidence_level": fusion_result["confidence"],
                "breakdown": fusion_result["breakdown"],
                "engine_scores": fusion_result["engine_scores"],
                "waveforms": {
                    "audio_1": env1,
                    "audio_2": env2
                },
                "biometrics": {
                    "audio_1": bio1,
                    "audio_2": bio2
                },
                "signal": {
                    "audio_1": sig1,
                    "audio_2": sig2
                },
                "processing_time": elapsed
            }

        except Exception as e:
            logger.exception("Audio Pair Analysis failed")
            return {"error": str(e)}

    def detect_deepfake(self, file_bytes: bytes) -> Dict[str, Any]:
        """
        Standalone deepfake detection pipeline.
        """
        start = time.time()
        try:
            y, env = preprocessor.preprocess(file_bytes)
            
            metrics = deepfake_engine.analyze(y)
            df_prob = deepfake_engine.compute_score(metrics)
            
            label = "REAL"
            confidence = "HIGH"
            if df_prob > 70:
                label = "DEEPFAKE"
                confidence = "HIGH" if df_prob > 85 else "MEDIUM"
            elif df_prob > 40:
                label = "UNCERTAIN"
                confidence = "MEDIUM"
            elif df_prob > 20:
                label = "REAL"
                confidence = "MEDIUM"
                
            elapsed = round(time.time() - start, 3)
            logger.info(f"Deepfake scan done in {elapsed}s | Score: {df_prob:.2f}")
            
            return {
                "deepfake_score": round(df_prob, 1),
                "label": label,
                "confidence": confidence,
                "metrics": {
                    "zcr_variance": round(metrics.get("zcr_var", 0), 4),
                    "rolloff_variance": round(metrics.get("rolloff_var", 0), 1),
                    "embedding_variance": round(metrics.get("temporal_embedding_var", 0), 4)
                },
                "processing_time": elapsed
            }

        except Exception as e:
            logger.exception("Deepfake Diagnostic failed")
            return {"error": str(e)}

audio_facade = AudioForensicFacade()
