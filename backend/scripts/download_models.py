#!/usr/bin/env python3
"""
Forenlytics Air-Gapped Model Pre-Downloader & Validator
======================================================
Pre-downloads all required neural model weights for SpeechBrain, WavLM,
and Wav2Vec2 Deepfake classification, placing them in local cache directories
so the entire system can operate in a 100% offline, air-gapped environment.

Models downloaded:
1. speechbrain/spkrec-ecapa-voxceleb (ECAPA-TDNN Speaker Verification)
2. microsoft/wavlm-base-plus-sv (WavLM-SV Neural Speaker Embedding Backbone)
3. garystafford/wav2vec2-deepfake-voice-detector (SOTA Deepfake Classifier)
4. facebook/wav2vec2-base (Fallback Audio Feature Extractor)

Usage:
    python download_models.py [--output-dir ./models] [--verify-only]
"""

import os
import sys
import shutil
import argparse
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S"
)
logger = logging.getLogger("forenlytics.airgap_downloader")


def download_speechbrain_model(target_dir: str):
    """Download SpeechBrain ECAPA-TDNN model to target directory."""
    logger.info("=" * 60)
    logger.info("1/4: Downloading SpeechBrain ECAPA-TDNN (speechbrain/spkrec-ecapa-voxceleb)...")
    logger.info("=" * 60)

    model_name = "speechbrain/spkrec-ecapa-voxceleb"
    subfolder = model_name.replace("/", "_")
    sb_target = os.path.join(target_dir, "speechbrain", subfolder)
    os.makedirs(sb_target, exist_ok=True)

    try:
        from speechbrain.inference.speaker import EncoderClassifier
        import torch

        classifier = EncoderClassifier.from_hparams(
            source=model_name,
            savedir=sb_target,
            run_opts={"device": "cpu"}
        )
        logger.info(f"✓ SpeechBrain ECAPA-TDNN downloaded and verified at: {sb_target}")

        # Also populate backend/speechbrain_cache for local dev consistency
        dev_sb_cache = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "speechbrain_cache", subfolder))
        os.makedirs(dev_sb_cache, exist_ok=True)
        for item in os.listdir(sb_target):
            s_file = os.path.join(sb_target, item)
            d_file = os.path.join(dev_sb_cache, item)
            if os.path.isfile(s_file) and not os.path.exists(d_file):
                shutil.copy2(s_file, d_file)
        logger.info(f"✓ Mirrored to local dev cache: {dev_sb_cache}")
        return True
    except Exception as e:
        logger.error(f"✗ Failed to download SpeechBrain model: {e}")
        return False


def download_huggingface_models(hf_home_dir: str):
    """Download WavLM, Deepfake detector, and Wav2Vec2 base models."""
    os.environ["HF_HOME"] = hf_home_dir
    os.environ["TRANSFORMERS_CACHE"] = os.path.join(hf_home_dir, "hub")
    os.makedirs(hf_home_dir, exist_ok=True)

    models_to_download = [
        {
            "id": "microsoft/wavlm-base-plus-sv",
            "desc": "2/4: WavLM Speaker Verification (microsoft/wavlm-base-plus-sv)",
            "loader": _load_wavlm,
        },
        {
            "id": "garystafford/wav2vec2-deepfake-voice-detector",
            "desc": "3/4: SOTA Deepfake Classifier (garystafford/wav2vec2-deepfake-voice-detector)",
            "loader": _load_deepfake_detector,
        },
        {
            "id": "facebook/wav2vec2-base",
            "desc": "4/4: Fallback Feature Extractor (facebook/wav2vec2-base)",
            "loader": _load_wav2vec2_base,
        },
    ]

    all_ok = True
    for item in models_to_download:
        logger.info("=" * 60)
        logger.info(item["desc"])
        logger.info("=" * 60)
        try:
            item["loader"](item["id"])
            logger.info(f"✓ Successfully cached: {item['id']}")
        except Exception as e:
            logger.error(f"✗ Failed to download {item['id']}: {e}")
            all_ok = False

    return all_ok


def _load_wavlm(model_id: str):
    from transformers import Wav2Vec2FeatureExtractor, WavLMForXVector
    logger.info(f"Fetching feature extractor for {model_id}...")
    Wav2Vec2FeatureExtractor.from_pretrained(model_id, do_normalize=True)
    logger.info(f"Fetching model weights for {model_id}...")
    WavLMForXVector.from_pretrained(model_id, low_cpu_mem_usage=True)


def _load_deepfake_detector(model_id: str):
    from transformers import AutoFeatureExtractor, AutoModelForAudioClassification
    logger.info(f"Fetching feature extractor for {model_id}...")
    AutoFeatureExtractor.from_pretrained(model_id)
    logger.info(f"Fetching classifier weights for {model_id}...")
    AutoModelForAudioClassification.from_pretrained(model_id)


def _load_wav2vec2_base(model_id: str):
    from transformers import Wav2Vec2Processor, Wav2Vec2Model
    logger.info(f"Fetching processor for {model_id}...")
    Wav2Vec2Processor.from_pretrained(model_id)
    logger.info(f"Fetching model weights for {model_id}...")
    Wav2Vec2Model.from_pretrained(model_id, low_cpu_mem_usage=True)


def verify_offline_loading(target_dir: str):
    """Verifies that all models can be loaded strictly from local cache with NO internet access."""
    logger.info("\n" + "=" * 60)
    logger.info("VERIFYING STRICT OFFLINE (AIR-GAPPED) LOADING...")
    logger.info("=" * 60)

    os.environ["HF_HUB_OFFLINE"] = "1"
    os.environ["TRANSFORMERS_OFFLINE"] = "1"
    hf_home = os.path.join(target_dir, "huggingface")
    os.environ["HF_HOME"] = hf_home
    os.environ["TRANSFORMERS_CACHE"] = os.path.join(hf_home, "hub")
    os.environ["SPEECHBRAIN_CACHE_DIR"] = os.path.join(target_dir, "speechbrain")

    success = True

    # 1. Test WavLM offline
    try:
        from transformers import Wav2Vec2FeatureExtractor, WavLMForXVector
        Wav2Vec2FeatureExtractor.from_pretrained("microsoft/wavlm-base-plus-sv", local_files_only=True)
        WavLMForXVector.from_pretrained("microsoft/wavlm-base-plus-sv", local_files_only=True)
        logger.info("✓ [OFFLINE PASS] microsoft/wavlm-base-plus-sv")
    except Exception as e:
        logger.error(f"✗ [OFFLINE FAIL] microsoft/wavlm-base-plus-sv: {e}")
        success = False

    # 2. Test Deepfake Classifier offline
    try:
        from transformers import AutoFeatureExtractor, AutoModelForAudioClassification
        AutoFeatureExtractor.from_pretrained("garystafford/wav2vec2-deepfake-voice-detector", local_files_only=True)
        AutoModelForAudioClassification.from_pretrained("garystafford/wav2vec2-deepfake-voice-detector", local_files_only=True)
        logger.info("✓ [OFFLINE PASS] garystafford/wav2vec2-deepfake-voice-detector")
    except Exception as e:
        logger.error(f"✗ [OFFLINE FAIL] garystafford/wav2vec2-deepfake-voice-detector: {e}")
        success = False

    # 3. Test Wav2Vec2 fallback offline
    try:
        from transformers import Wav2Vec2Processor, Wav2Vec2Model
        Wav2Vec2Processor.from_pretrained("facebook/wav2vec2-base", local_files_only=True)
        Wav2Vec2Model.from_pretrained("facebook/wav2vec2-base", local_files_only=True)
        logger.info("✓ [OFFLINE PASS] facebook/wav2vec2-base")
    except Exception as e:
        logger.error(f"✗ [OFFLINE FAIL] facebook/wav2vec2-base: {e}")
        success = False

    # 4. Test SpeechBrain offline
    try:
        from speechbrain.inference.speaker import EncoderClassifier
        sb_dir = os.path.join(target_dir, "speechbrain", "speechbrain_spkrec-ecapa-voxceleb")
        if not os.path.exists(sb_dir):
            sb_dir = os.path.join(target_dir, "speechbrain")
        EncoderClassifier.from_hparams(source=sb_dir, savedir=sb_dir, run_opts={"device": "cpu"})
        logger.info("✓ [OFFLINE PASS] speechbrain/spkrec-ecapa-voxceleb")
    except Exception as e:
        logger.error(f"✗ [OFFLINE FAIL] speechbrain/spkrec-ecapa-voxceleb: {e}")
        success = False

    return success


def main():
    parser = argparse.ArgumentParser(description="Forenlytics Air-Gapped Model Pre-Downloader")
    parser.add_argument(
        "--output-dir",
        default=os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "models")),
        help="Root directory to save models (default: ../../models)"
    )
    parser.add_argument(
        "--verify-only",
        action="store_true",
        help="Only run offline verification without re-downloading"
    )
    args = parser.parse_args()

    output_dir = os.path.abspath(args.output_dir)
    logger.info(f"Target Models Directory: {output_dir}")

    hf_dir = os.path.join(output_dir, "huggingface")
    os.makedirs(hf_dir, exist_ok=True)
    os.makedirs(os.path.join(output_dir, "speechbrain"), exist_ok=True)

    if not args.verify_only:
        sb_ok = download_speechbrain_model(output_dir)
        hf_ok = download_huggingface_models(hf_dir)

        if not (sb_ok and hf_ok):
            logger.warning("One or more models failed to download completely. Checking offline validity...")

    verify_ok = verify_offline_loading(output_dir)

    if verify_ok:
        logger.info("\n" + "=" * 60)
        logger.info("★ ALL MODELS DOWNLOADED & AIR-GAP OFFLINE VERIFIED SUCCESSFULLY!")
        logger.info(f"★ Package is ready at: {output_dir}")
        logger.info("=" * 60)
        sys.exit(0)
    else:
        logger.error("\n" + "=" * 60)
        logger.error("⚠ Offline verification failed. Please check network connection and retry.")
        logger.error("=" * 60)
        sys.exit(1)


if __name__ == "__main__":
    main()
