"""
Audio Forensic Facade v2
=========================
Top-level orchestrator for all audio forensic pipelines.
Wires preprocessor, embedding engines, pitch/formant/rhythm/biometric/signal
analyzers, multi-signal deepfake detector, and fusion engine into cohesive end-to-end flows.
"""

import hashlib
import time
import logging
from typing import Dict, Any

from . import speechbrain_compat
from .preprocessor import preprocessor, AudioPreprocessingError
from .engine_wavlm import wavlm_engine
from .engine_embedding import embedding_engine
from .engine_biometric import biometric_engine
from .engine_signal import signal_engine
from .engine_deepfake import deepfake_engine
from .engine_pitch import pitch_engine
from .engine_formants import formant_engine
from .engine_rhythm import rhythm_engine
from .fusion_engine import fusion_engine, FORENSIC_CAVEAT

logger = logging.getLogger("forenlytics.audio.facade")


class AudioForensicFacade:

    # ── Speaker Comparison ─────────────────────────────────────────────────

    def analyze_pair(self, file1_bytes: bytes, file2_bytes: bytes, progress_cb: Any = None) -> Dict[str, Any]:
        """
        Full multi-dimensional forensic pipeline for speaker comparison.
        Returns structured result dict suitable for direct JSON serialization.
        """
        t_start = time.time()
        TOTAL_STEPS = 10

        # ── Step 1: Preprocessing ──────────────────────────────────────────
        logger.info(f"Step 1/{TOTAL_STEPS} — Preprocessing audio pair")
        if progress_cb:
            progress_cb(0, 7, "Adaptive Ingestion & Voice Activity Detection", "vad", "VAD Filter (16kHz)", 10, "[0.12s] ENGAGING: VAD Filter (16kHz) -> Preprocessing and isolating voiced speech intervals...")
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
        logger.info(f"Step 2/{TOTAL_STEPS} — WavLM speaker embedding extraction")
        if progress_cb:
            progress_cb(1, 7, "WavLM & ECAPA Neural Latent Projections", "neural", "WavLM-Base+ Transformer", 25, f"[{time.time()-t_start:.2f}s] ENGAGING: WavLM-Base+ & ECAPA -> Extracting 512-D speaker identity vectors...")
        wlm_sim = None
        try:
            t = time.time()
            wlm_emb1 = wavlm_engine.get_embedding(file1_bytes, y1)
            wlm_emb2 = wavlm_engine.get_embedding(file2_bytes, y2)
            wlm_sim_raw = wavlm_engine.compare_embeddings(wlm_emb1, wlm_emb2)
            wlm_sim = max(0.0, min(100.0, (wlm_sim_raw + 1.0) * 50.0))
            logger.info(f"  WavLM cosine={wlm_sim_raw:.4f} -> {wlm_sim:.1f}% | {time.time()-t:.2f}s")
        except Exception as e:
            logger.warning(f"WavLM engine failed (will proceed without): {e}")

        # ── Step 3: Secondary Embedding ────────────────────────────────────
        logger.info(f"Step 3/{TOTAL_STEPS} — Secondary speaker embedding (ECAPA-TDNN / Wav2Vec2)")
        emb_sim = 0.0
        try:
            t = time.time()
            emb1 = embedding_engine.get_embedding(file1_bytes, y1)
            emb2 = embedding_engine.get_embedding(file2_bytes, y2)
            emb_sim_raw = embedding_engine.compare_embeddings(emb1, emb2)
            emb_sim = max(0.0, min(100.0, (emb_sim_raw + 1.0) * 50.0))
            logger.info(f"  Secondary cosine={emb_sim_raw:.4f} -> {emb_sim:.1f}% | {time.time()-t:.2f}s")
        except Exception as e:
            logger.warning(f"Secondary embedding failed: {e}")

        # ── Step 4: Pitch (F0) Extraction ──────────────────────────────────
        logger.info(f"Step 4/{TOTAL_STEPS} — Pitch (F0) contour extraction")
        if progress_cb:
            progress_cb(3, 7, "Probabilistic Pitch (F0) Intonation Tracking", "pitch", "pYIN Micro-Jitter (60-500Hz)", 55, f"[{time.time()-t_start:.2f}s] ENGAGING: pYIN Algorithm -> Tracking F0 contour and intonation correlation...")
        t = time.time()
        pitch_feat1 = pitch_engine.extract(y1)
        pitch_feat2 = pitch_engine.extract(y2)
        pitch_cmp = pitch_engine.compare(pitch_feat1, pitch_feat2)
        pitch_cmp["feat1"] = pitch_feat1
        pitch_cmp["feat2"] = pitch_feat2

        # ── Step 5: Formant Analysis ────────────────────────────────────────
        logger.info(f"Step 5/{TOTAL_STEPS} — Vocal tract formant analysis (LPC F1-F4)")
        if progress_cb:
            progress_cb(2, 7, "Vocal Tract Linear Predictive Resonances", "formants", "LPC Root Solver (F1-F4)", 40, f"[{time.time()-t_start:.2f}s] ENGAGING: LPC Root Solver -> Calculating F1-F4 formants and vocal tract dispersion...")
        t = time.time()
        formant_feat1 = formant_engine.extract(y1)
        formant_feat2 = formant_engine.extract(y2)
        formant_cmp = formant_engine.compare(formant_feat1, formant_feat2)
        formant_cmp["feat1"] = formant_feat1
        formant_cmp["feat2"] = formant_feat2

        # ── Step 6: Rhythm & Tempo ──────────────────────────────────────────
        logger.info(f"Step 6/{TOTAL_STEPS} — Speaking rate & rhythm analysis")
        if progress_cb:
            progress_cb(5, 7, "Temporal Rhythm & Syllable Onset Cadence", "rhythm", "Speech-to-Pause Analyzer", 85, f"[{time.time()-t_start:.2f}s] ENGAGING: Rhythm Analyzer -> Computing syllable onset rate & articulation tempo...")
        t = time.time()
        rhythm_feat1 = rhythm_engine.extract(y1)
        rhythm_feat2 = rhythm_engine.extract(y2)
        rhythm_cmp = rhythm_engine.compare(rhythm_feat1, rhythm_feat2)
        rhythm_cmp["feat1"] = rhythm_feat1
        rhythm_cmp["feat2"] = rhythm_feat2

        # ── Step 7: Biometric / Spectral / MFCC ────────────────────────────
        logger.info(f"Step 7/{TOTAL_STEPS} — Spectral & MFCC fingerprint extraction")
        if progress_cb:
            progress_cb(4, 7, "13-Band Mel-Frequency Spectral Dynamics", "mfcc", "MFCC & Centroid Extractor", 70, f"[{time.time()-t_start:.2f}s] ENGAGING: MFCC Extractor -> Computing 13 cepstral coefficients & spectral centroid...")
        t = time.time()
        bio1 = biometric_engine.extract_features(y1)
        bio2 = biometric_engine.extract_features(y2)
        bio_sim = biometric_engine.compare(bio1, bio2)
        spectral_cmp = biometric_engine.compare_detailed(bio1, bio2)

        # ── Step 8: Signal Environment ─────────────────────────────────────
        logger.info(f"Step 8/{TOTAL_STEPS} — Signal environment analysis")
        t = time.time()
        sig1 = signal_engine.analyze_signal(y1)
        sig2 = signal_engine.analyze_signal(y2)
        sig_sim = signal_engine.compare(sig1, sig2)

        # ── Step 9: Deepfake Scan ──────────────────────────────────────────
        logger.info(f"Step 9/{TOTAL_STEPS} — Synthetic speech artifact analysis")
        t = time.time()
        df1_res = deepfake_engine.analyze_full_deepfake(y1)
        df2_res = deepfake_engine.analyze_full_deepfake(y2)
        df1_prob = df1_res["deepfake_score"]
        df2_prob = df2_res["deepfake_score"]
        logger.info(f"  Deepfake scores: file1={df1_prob:.1f}%, file2={df2_prob:.1f}% | {time.time()-t:.2f}s")

        # ── Step 10: Fusion ─────────────────────────────────────────────────
        logger.info(f"Step 10/{TOTAL_STEPS} — Multi-dimensional forensic fusion")
        if progress_cb:
            progress_cb(6, 7, "Bayesian 6-Dimensional Fusion & Synthesis", "fusion", "Contradiction Engine", 95, f"[{time.time()-t_start:.2f}s] ENGAGING: Contradiction Engine -> Synthesizing 6D biometric score & detecting disagreements...")
        t = time.time()
        fusion_result = fusion_engine.fuse_pair_analysis(
            wlm_sim=wlm_sim,
            emb_sim=emb_sim,
            bio_sim=bio_sim,
            sig_sim=sig_sim,
            df1_prob=df1_prob,
            df2_prob=df2_prob,
            pitch_result=pitch_cmp,
            formant_result=formant_cmp,
            rhythm_result=rhythm_cmp,
            spectral_detailed=spectral_cmp,
        )

        elapsed = round(time.time() - t_start, 3)

        all_preprocessing_steps = (
            [f"[File 1] {s}" for s in meta1["preprocessing_steps"]]
            + [f"[File 2] {s}" for s in meta2["preprocessing_steps"]]
        )

        return {
            # ── Core results ───────────────────────────────────────────────
            "similarity_score":   fusion_result["overall_similarity"],
            "verdict":            fusion_result["verdict"],
            "verdict_color":      fusion_result["verdict_color"],
            "confidence_level":   fusion_result["confidence"],
            "no_speech_detected": fusion_result.get("no_speech_detected", False),
            "breakdown":          fusion_result["breakdown"],
            "engine_scores":      fusion_result["engine_scores"],
            # ── Multi-dimensional results ──────────────────────────────────
            "dimension_scores":     fusion_result["dimension_scores"],
            "radar_data":           fusion_result["radar_data"],
            "disagreements":        fusion_result["disagreements"],
            "dimension_telemetry":  fusion_result["dimension_telemetry"],
            # ── Time-series charting data ──────────────────────────────────
            "pitch_contours": {
                "audio_1": pitch_feat1.get("contour_60pt", []),
                "audio_2": pitch_feat2.get("contour_60pt", []),
                "feat1":   {
                    "mean_f0": pitch_feat1.get("mean_f0"),
                    "median_f0": pitch_feat1.get("median_f0"),
                    "range_semitones": pitch_feat1.get("range_semitones"),
                    "jitter_pct": pitch_feat1.get("jitter_pct"),
                    "voiced_fraction": pitch_feat1.get("voiced_fraction"),
                    "available": pitch_feat1.get("available"),
                },
                "feat2":   {
                    "mean_f0": pitch_feat2.get("mean_f0"),
                    "median_f0": pitch_feat2.get("median_f0"),
                    "range_semitones": pitch_feat2.get("range_semitones"),
                    "jitter_pct": pitch_feat2.get("jitter_pct"),
                    "voiced_fraction": pitch_feat2.get("voiced_fraction"),
                    "available": pitch_feat2.get("available"),
                },
                "comparison": {
                    k: v for k, v in pitch_cmp.items()
                    if k not in ("feat1", "feat2", "contour_60pt")
                },
            },
            "formant_data": {
                "feat1": formant_feat1,
                "feat2": formant_feat2,
                "comparison": {
                    k: v for k, v in formant_cmp.items()
                    if k not in ("feat1", "feat2")
                },
            },
            "rhythm_data": {
                "feat1": {
                    "onset_rate_per_sec": rhythm_feat1.get("onset_rate_per_sec"),
                    "articulation_rate_per_sec": rhythm_feat1.get("articulation_rate_per_sec"),
                    "speech_ratio": rhythm_feat1.get("speech_ratio"),
                    "mean_pause_sec": rhythm_feat1.get("mean_pause_sec"),
                    "tempo_bpm": rhythm_feat1.get("tempo_bpm"),
                },
                "feat2": {
                    "onset_rate_per_sec": rhythm_feat2.get("onset_rate_per_sec"),
                    "articulation_rate_per_sec": rhythm_feat2.get("articulation_rate_per_sec"),
                    "speech_ratio": rhythm_feat2.get("speech_ratio"),
                    "mean_pause_sec": rhythm_feat2.get("mean_pause_sec"),
                    "tempo_bpm": rhythm_feat2.get("tempo_bpm"),
                },
                "comparison": {
                    k: v for k, v in rhythm_cmp.items()
                    if k not in ("feat1", "feat2", "energy_60pt")
                },
                "energy_1_60pt": rhythm_feat1.get("energy_60pt", []),
                "energy_2_60pt": rhythm_feat2.get("energy_60pt", []),
            },
            "spectral_data": {
                "mfcc_comparison": spectral_cmp.get("mfcc_comparison", []),
                "feat1": {
                    "mfcc_mean": bio1.get("mfcc_mean", []),
                    "spectral_centroid_mean": bio1.get("spectral_centroid_mean"),
                    "spectral_bandwidth_mean": bio1.get("spectral_bandwidth_mean"),
                    "spectral_rolloff_mean": bio1.get("spectral_rolloff_mean"),
                    "rms_mean_db": bio1.get("rms_mean_db"),
                    "dynamic_range_db": bio1.get("dynamic_range_db"),
                    "crest_factor_db": bio1.get("crest_factor_db"),
                },
                "feat2": {
                    "mfcc_mean": bio2.get("mfcc_mean", []),
                    "spectral_centroid_mean": bio2.get("spectral_centroid_mean"),
                    "spectral_bandwidth_mean": bio2.get("spectral_bandwidth_mean"),
                    "spectral_rolloff_mean": bio2.get("spectral_rolloff_mean"),
                    "rms_mean_db": bio2.get("rms_mean_db"),
                    "dynamic_range_db": bio2.get("dynamic_range_db"),
                    "crest_factor_db": bio2.get("crest_factor_db"),
                },
                "sub_score": spectral_cmp.get("sub_score"),
                "interpretation": spectral_cmp.get("interpretation", ""),
                "delta_centroid_hz": spectral_cmp.get("delta_centroid_hz"),
                "energy_1_60pt": bio1.get("energy_60pt", []),
                "energy_2_60pt": bio2.get("energy_60pt", []),
            },
            # ── File metadata ──────────────────────────────────────────────
            "file_metadata": {
                "audio_1": {
                    "sha256":              meta1["sha256"],
                    "raw_duration_sec":    meta1["raw_duration_sec"],
                    "speech_duration_sec": meta1["speech_duration_sec"],
                    "sample_rate":         meta1["sample_rate"],
                },
                "audio_2": {
                    "sha256":              meta2["sha256"],
                    "raw_duration_sec":    meta2["raw_duration_sec"],
                    "speech_duration_sec": meta2["speech_duration_sec"],
                    "sample_rate":         meta2["sample_rate"],
                },
            },
            # ── UI waveforms ───────────────────────────────────────────────
            "waveforms": {"audio_1": env1, "audio_2": env2},
            # ── Legacy fields ──────────────────────────────────────────────
            "biometrics": {"audio_1": bio1, "audio_2": bio2},
            "signal":     {"audio_1": sig1, "audio_2": sig2},
            # ── Methodology ────────────────────────────────────────────────
            "preprocessing_steps": all_preprocessing_steps,
            "forensic_caveat":     FORENSIC_CAVEAT,
            "threshold_note":      fusion_result.get("threshold_note", ""),
            "processing_time":     elapsed,
        }

    # ── Deepfake Detection (Standalone Multi-Signal Pipeline) ─────────────

    def detect_deepfake(self, file_bytes: bytes, progress_cb: Any = None) -> Dict[str, Any]:
        """
        Standalone multi-signal SOTA deepfake & synthetic speech detection pipeline.
        Returns full diagnostic breakdown with 4 independent signals, sliding-window
        suspicion timeline, manipulation category, and suspect time intervals.
        """
        t_start = time.time()

        try:
            y, env, meta = preprocessor.preprocess(file_bytes)
        except AudioPreprocessingError as e:
            logger.warning(f"Deepfake preprocessing rejected: {e}")
            return {"error": str(e), "error_type": "preprocessing"}
        except Exception as e:
            logger.exception("Unexpected preprocessing failure in deepfake scan")
            return {"error": f"Audio preprocessing failed: {e}", "error_type": "preprocessing"}

        # Run the full multi-signal detection suite with progress callback
        res = deepfake_engine.analyze_full_deepfake(y, progress_cb=progress_cb)

        elapsed = round(time.time() - t_start, 3)
        logger.info(
            f"Multi-Signal Deepfake scan complete in {elapsed}s | "
            f"Score: {res['deepfake_score']:.1f}% | "
            f"Verdict: {res['label']} | Category: {res['manipulation_category']}"
        )

        return {
            # ── Core Verdict & Category ────────────────────────────────────
            "deepfake_score":        res["deepfake_score"],
            "label":                 res["label"],
            "confidence":            res["confidence"],
            "manipulation_category": res["manipulation_category"],
            "category_label":        res["category_label"],
            "interpretation":        res["interpretation"],
            # ── 4 Diagnostic Signals ───────────────────────────────────────
            "signals":               res["signals"],
            # ── Temporal Localization & Suspicion Timeline ─────────────────
            "suspicion_timeline":    res["suspicion_timeline"],
            "suspect_intervals":     res["suspect_intervals"],
            "boundary_timestamps":   res.get("boundary_timestamps", []),
            "disagreements":         res["disagreements"],
            # ── UI Waveform & File Metadata ────────────────────────────────
            "waveform":              env,
            "file_metadata": {
                "sha256":              meta["sha256"],
                "raw_duration_sec":    meta["raw_duration_sec"],
                "speech_duration_sec": meta["speech_duration_sec"],
                "sample_rate":         meta["sample_rate"],
            },
            # ── Legacy metrics object for backward-compat ──────────────────
            "metrics":               res["metrics"],
            "preprocessing_steps":   meta["preprocessing_steps"],
            "forensic_caveat":       FORENSIC_CAVEAT,
            "processing_time":       elapsed,
        }


audio_facade = AudioForensicFacade()
