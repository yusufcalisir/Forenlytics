"""
Audio Forensic Facade
======================
Top-level orchestrator for all audio forensic pipelines.
Wires the preprocessor, embedding engines, biometric/signal analyzers,
deepfake detector, and fusion engine into cohesive end-to-end flows.
"""

import hashlib
import time
import logging
from typing import Dict, Any

from .preprocessor import preprocessor, AudioPreprocessingError
from .engine_wavlm import wavlm_engine
from .engine_embedding import embedding_engine
from .engine_biometric import biometric_engine
from .engine_signal import signal_engine
from .engine_deepfake import deepfake_engine
from .fusion_engine import fusion_engine, FORENSIC_CAVEAT

logger = logging.getLogger("forenlytics.audio.facade")


class AudioForensicFacade:

    # ── Speaker Comparison ─────────────────────────────────────────────────

    def analyze_pair(self, file1_bytes: bytes, file2_bytes: bytes) -> Dict[str, Any]:
        """
        Full multi-engine forensic pipeline for speaker comparison.

        Returns a structured result dict suitable for direct JSON serialization.
        On AudioPreprocessingError, returns an {'error': str, 'error_type': 'preprocessing'} dict
        (job_manager will surface this as a failed job, not a 500).
        """
        t_start = time.time()

        # ── Step 1: Preprocessing ──────────────────────────────────────────
        logger.info("Step 1/7 — Preprocessing audio pair")
        try:
            t = time.time()
            y1, env1, meta1 = preprocessor.preprocess(file1_bytes)
            y2, env2, meta2 = preprocessor.preprocess(file2_bytes)
            logger.info(
                f"  Preprocessed | file1={meta1['speech_duration_sec']:.1f}s speech, "
                f"file2={meta2['speech_duration_sec']:.1f}s speech | {time.time()-t:.2f}s"
            )
        except AudioPreprocessingError as e:
            logger.warning(f"Preprocessing rejected: {e}")
            return {"error": str(e), "error_type": "preprocessing"}
        except Exception as e:
            logger.exception("Unexpected preprocessing failure")
            return {"error": f"Audio preprocessing failed: {e}", "error_type": "preprocessing"}

        # ── Step 2: WavLM Speaker Embeddings ──────────────────────────────
        logger.info("Step 2/7 — WavLM speaker embedding extraction")
        wlm_sim = None
        try:
            t = time.time()
            wlm_emb1 = wavlm_engine.get_embedding(file1_bytes, y1)
            wlm_emb2 = wavlm_engine.get_embedding(file2_bytes, y2)
            wlm_sim_raw = wavlm_engine.compare_embeddings(wlm_emb1, wlm_emb2)
            # WavLM-SV cosine similarity ∈ [-1, 1] — same-speaker pairs typically 0.6–0.95
            # Map [-1,1] → [0,100] for UI display, but keep raw score for debugging
            wlm_sim = max(0.0, min(100.0, (wlm_sim_raw + 1.0) * 50.0))
            logger.info(f"  WavLM cosine={wlm_sim_raw:.4f} → {wlm_sim:.1f}% | {time.time()-t:.2f}s")
        except Exception as e:
            logger.warning(f"WavLM engine failed (will proceed without): {e}")
        finally:
            wavlm_engine.unload()

        # ── Step 3: Secondary Embedding ────────────────────────────────────
        logger.info("Step 3/7 — Secondary speaker embedding (ECAPA-TDNN / Wav2Vec2)")
        emb_sim = 0.0
        try:
            t = time.time()
            emb1 = embedding_engine.get_embedding(file1_bytes, y1)
            emb2 = embedding_engine.get_embedding(file2_bytes, y2)
            emb_sim_raw = embedding_engine.compare_embeddings(emb1, emb2)
            # Map cosine ∈ [-1,1] → [0,100]
            emb_sim = max(0.0, min(100.0, (emb_sim_raw + 1.0) * 50.0))
            logger.info(f"  Secondary cosine={emb_sim_raw:.4f} → {emb_sim:.1f}% | {time.time()-t:.2f}s")
        except Exception as e:
            logger.warning(f"Secondary embedding failed: {e}")

        # ── Step 4: Biometric Features ─────────────────────────────────────
        logger.info("Step 4/7 — Vocal biometric feature extraction")
        t = time.time()
        bio1 = biometric_engine.extract_features(y1)
        bio2 = biometric_engine.extract_features(y2)
        bio_sim = biometric_engine.compare(bio1, bio2)
        logger.info(f"  Biometric similarity: {bio_sim:.1f}% | {time.time()-t:.2f}s")

        # ── Step 5: Signal Analysis ────────────────────────────────────────
        logger.info("Step 5/7 — Signal environment analysis")
        t = time.time()
        sig1 = signal_engine.analyze_signal(y1)
        sig2 = signal_engine.analyze_signal(y2)
        sig_sim = signal_engine.compare(sig1, sig2)
        logger.info(f"  Signal environment similarity: {sig_sim:.1f}% | {time.time()-t:.2f}s")

        # ── Step 6: Deepfake Scan ──────────────────────────────────────────
        logger.info("Step 6/7 — Synthetic speech artifact analysis")
        t = time.time()
        df1_metrics = deepfake_engine.analyze(y1)
        df2_metrics = deepfake_engine.analyze(y2)
        df1_prob = deepfake_engine.compute_score(df1_metrics)
        df2_prob = deepfake_engine.compute_score(df2_metrics)
        logger.info(f"  Deepfake scores: file1={df1_prob:.1f}%, file2={df2_prob:.1f}% | {time.time()-t:.2f}s")

        # Unload secondary embedding engine (frees RAM)
        try:
            embedding_engine.unload()
        except Exception:
            pass

        # ── Step 7: Fusion ─────────────────────────────────────────────────
        logger.info("Step 7/7 — Forensic fusion and verdict generation")
        t = time.time()
        fusion_result = fusion_engine.fuse_pair_analysis(
            wlm_sim, emb_sim, bio_sim, sig_sim, df1_prob, df2_prob
        )
        logger.info(
            f"  Verdict: {fusion_result['verdict']} | "
            f"Score: {fusion_result['overall_similarity']}% | {time.time()-t:.2f}s"
        )

        elapsed = round(time.time() - t_start, 3)
        logger.info(
            f"Audio Pair Analysis complete in {elapsed}s | "
            f"Similarity: {fusion_result['overall_similarity']}% | "
            f"Verdict: {fusion_result['verdict']}"
        )

        # Combine preprocessing steps from both files for the report
        all_preprocessing_steps = (
            [f"[File 1] {s}" for s in meta1["preprocessing_steps"]]
            + [f"[File 2] {s}" for s in meta2["preprocessing_steps"]]
        )

        return {
            # Core results
            "similarity_score":   fusion_result["overall_similarity"],
            "verdict":            fusion_result["verdict"],
            "verdict_color":      fusion_result["verdict_color"],
            "confidence_level":   fusion_result["confidence"],
            "no_speech_detected": fusion_result.get("no_speech_detected", False),
            "breakdown":          fusion_result["breakdown"],
            "engine_scores":      fusion_result["engine_scores"],
            # File metadata
            "file_metadata": {
                "audio_1": {
                    "sha256":             meta1["sha256"],
                    "raw_duration_sec":   meta1["raw_duration_sec"],
                    "speech_duration_sec": meta1["speech_duration_sec"],
                    "sample_rate":        meta1["sample_rate"],
                },
                "audio_2": {
                    "sha256":             meta2["sha256"],
                    "raw_duration_sec":   meta2["raw_duration_sec"],
                    "speech_duration_sec": meta2["speech_duration_sec"],
                    "sample_rate":        meta2["sample_rate"],
                },
            },
            # UI waveforms
            "waveforms": {"audio_1": env1, "audio_2": env2},
            # Biometric detail
            "biometrics": {"audio_1": bio1, "audio_2": bio2},
            "signal":     {"audio_1": sig1, "audio_2": sig2},
            # Methodology
            "preprocessing_steps": all_preprocessing_steps,
            "forensic_caveat":     FORENSIC_CAVEAT,
            "threshold_note":      fusion_result.get("threshold_note", ""),
            # Timing
            "processing_time": elapsed,
        }

    # ── Deepfake Detection (standalone) ───────────────────────────────────

    def detect_deepfake(self, file_bytes: bytes) -> Dict[str, Any]:
        """
        Standalone deepfake / synthetic speech detection pipeline.
        """
        t_start = time.time()

        # Preprocess
        try:
            y, env, meta = preprocessor.preprocess(file_bytes)
        except AudioPreprocessingError as e:
            logger.warning(f"Deepfake preprocessing rejected: {e}")
            return {"error": str(e), "error_type": "preprocessing"}
        except Exception as e:
            logger.exception("Unexpected preprocessing failure in deepfake scan")
            return {"error": f"Audio preprocessing failed: {e}", "error_type": "preprocessing"}

        # Extract metrics and score
        metrics = deepfake_engine.analyze(y)
        df_prob = deepfake_engine.compute_score(metrics)

        # Verdict
        if df_prob > 70:
            label = "DEEPFAKE"
            confidence = "HIGH" if df_prob > 85 else "MEDIUM"
        elif df_prob > 40:
            label = "UNCERTAIN"
            confidence = "MEDIUM"
        elif df_prob > 20:
            label = "REAL"
            confidence = "MEDIUM"
        else:
            label = "REAL"
            confidence = "HIGH"

        interpretation = deepfake_engine.build_interpretation(df_prob, label)

        elapsed = round(time.time() - t_start, 3)
        logger.info(f"Deepfake scan complete in {elapsed}s | Score: {df_prob:.1f}% | {label}")

        return {
            "deepfake_score":   round(df_prob, 1),
            "label":            label,
            "confidence":       confidence,
            "interpretation":   interpretation,
            "metrics": {
                "zcr_variance":         round(metrics.get("zcr_var", 0), 4),
                "rolloff_variance":     round(metrics.get("rolloff_var", 0), 1),
                "embedding_variance":   round(metrics.get("temporal_embedding_var", 0), 4),
            },
            "file_metadata": {
                "sha256":             meta["sha256"],
                "raw_duration_sec":   meta["raw_duration_sec"],
                "speech_duration_sec": meta["speech_duration_sec"],
                "sample_rate":        meta["sample_rate"],
            },
            "preprocessing_steps": meta["preprocessing_steps"],
            "forensic_caveat":     FORENSIC_CAVEAT,
            "processing_time":     elapsed,
        }


audio_facade = AudioForensicFacade()
