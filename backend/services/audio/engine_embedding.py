"""
Secondary Speaker Embedding Engine
=====================================
Provides a secondary speaker embedding using ECAPA-TDNN via SpeechBrain
(speechbrain/spkrec-ecapa-voxceleb), which is a speaker-verification model
trained on VoxCeleb — the correct model class for this task.

Fallback chain
--------------
1. SpeechBrain ECAPA-TDNN (preferred — proper speaker verification)
2. facebook/wav2vec2-base mean pooling (last resort — weak speaker signal)

The fallback is retained so the system degrades gracefully in environments
where SpeechBrain can't be installed (e.g. Render free tier with strict RAM).
The WavLM engine (weight 0.40) is always the dominant signal; this engine
(weight 0.30) is secondary.

NOTE on facebook/wav2vec2-base:
  This is a SPEECH RECOGNITION pre-training model. Its mean-pooled hidden
  states carry some speaker identity but are NOT trained for speaker verification.
  Only used as a last-resort fallback. When used, a warning is logged.
"""

import logging
import numpy as np
from . import speechbrain_compat
from .cache_utils import EmbeddingCache

logger = logging.getLogger("forenlytics.audio.embedding")

MODEL_SPEECHBRAIN = "speechbrain/spkrec-ecapa-voxceleb"
MODEL_WAV2VEC2_FALLBACK = "facebook/wav2vec2-base"


class SpeakerEmbeddingEngine:
    def __init__(self, target_sr: int = 16_000):
        self.target_sr = target_sr
        self.device = "cpu"
        self.cache = EmbeddingCache(max_size=50)

        # SpeechBrain
        self._sb_classifier = None
        self._sb_initialized = False

        # Wav2Vec2 fallback
        self.processor = None
        self.model = None
        self._w2v_initialized = False

    # ── Lifecycle ──────────────────────────────────────────────────────────

    def _ensure_loaded(self):
        if self._sb_initialized or self._w2v_initialized:
            return

        # Try SpeechBrain ECAPA-TDNN first
        try:
            self._load_speechbrain()
            return
        except Exception as e:
            logger.warning(f"SpeechBrain ECAPA unavailable ({e}). Falling back to Wav2Vec2.")

        # Fallback: Wav2Vec2 mean pooling
        try:
            self._load_wav2vec2_fallback()
        except Exception as e:
            raise RuntimeError(
                f"Both speaker embedding backends failed. Last error: {e}"
            ) from e

    def _load_speechbrain(self):
        import os
        import torch
        import importlib

        encoder_cls = None
        for mod_name in ["speechbrain.inference.speaker", "speechbrain.pretrained"]:
            try:
                mod = importlib.import_module(mod_name)
                if hasattr(mod, "EncoderClassifier"):
                    encoder_cls = getattr(mod, "EncoderClassifier")
                    break
            except (ImportError, ModuleNotFoundError):
                continue

        if encoder_cls is None:
            raise ImportError("SpeechBrain is not installed or EncoderClassifier was not found.")

        logger.info(f"Loading SpeechBrain ECAPA-TDNN ({MODEL_SPEECHBRAIN})...")
        strategy = None
        try:
            fetch_mod = importlib.import_module("speechbrain.utils.fetching")
            if hasattr(fetch_mod, "LocalStrategy"):
                strategy = getattr(fetch_mod.LocalStrategy, "COPY", None)
        except Exception:
            strategy = None

        # Determine best local cache directory candidates
        model_subname = MODEL_SPEECHBRAIN.replace("/", "_")
        raw_name = MODEL_SPEECHBRAIN.split("/")[-1]
        env_cache = os.environ.get("SPEECHBRAIN_CACHE_DIR")

        candidate_dirs = []
        if env_cache:
            candidate_dirs.extend([
                env_cache,
                os.path.join(env_cache, model_subname),
                os.path.join(env_cache, raw_name),
            ])

        base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
        candidate_dirs.extend([
            os.path.join(base_dir, "speechbrain_cache", model_subname),
            os.path.join(base_dir, "speechbrain_cache", raw_name),
            os.path.join(base_dir, "models", "speechbrain", model_subname),
            os.path.join(base_dir, "models", "speechbrain"),
            f"speechbrain_cache/{model_subname}",
            f"speechbrain_cache/{raw_name}",
        ])

        target_dir = None
        for c in candidate_dirs:
            if os.path.isdir(c) and os.path.exists(os.path.join(c, "hyperparams.yaml")):
                target_dir = os.path.abspath(c)
                break

        if target_dir:
            logger.info(f"Found offline SpeechBrain local cache at: {target_dir}")
            kwargs = {
                "source": target_dir,
                "savedir": target_dir,
                "run_opts": {"device": "cpu"},
            }
        else:
            default_save = env_cache or f"speechbrain_cache/{model_subname}"
            kwargs = {
                "source": MODEL_SPEECHBRAIN,
                "savedir": default_save,
                "run_opts": {"device": "cpu"},
            }

        if strategy is not None:
            kwargs["local_strategy"] = strategy

        self._sb_classifier = encoder_cls.from_hparams(**kwargs)
        self._sb_classifier.eval()
        self._sb_initialized = True
        self.device = torch.device("cpu")
        logger.info("SpeechBrain ECAPA-TDNN loaded successfully.")


    def _load_wav2vec2_fallback(self):
        import torch
        from transformers import Wav2Vec2FeatureExtractor, Wav2Vec2Model

        self.device = torch.device("cpu")
        logger.warning(
            f"Using {MODEL_WAV2VEC2_FALLBACK} as secondary speaker embedding (NOT optimized for speaker verification). "
            "Install speechbrain for better results."
        )
        self.processor = Wav2Vec2FeatureExtractor.from_pretrained(MODEL_WAV2VEC2_FALLBACK)
        self.model = Wav2Vec2Model.from_pretrained(
            MODEL_WAV2VEC2_FALLBACK,
            low_cpu_mem_usage=True,
        ).to(self.device)
        self.model.eval()
        self._w2v_initialized = True
        logger.info("Wav2Vec2 fallback loaded.")

    def unload(self):
        if self._sb_initialized:
            self._sb_classifier = None
            self._sb_initialized = False
        if self._w2v_initialized:
            self.model = None
            self.processor = None
            self._w2v_initialized = False
        import gc
        gc.collect()
        logger.info("Secondary embedding engine unloaded.")

    # ── Core API ───────────────────────────────────────────────────────────

    def get_embedding(self, audio_bytes: bytes, y: np.ndarray):
        if y is None or len(y) == 0:
            raise ValueError("Cannot extract embedding: empty audio array.")

        self._ensure_loaded()

        cached = self.cache.get(audio_bytes)
        if cached is not None:
            return cached

        if self._sb_initialized:
            embedding = self._embed_speechbrain(y)
        else:
            embedding = self._embed_wav2vec2(y)

        self.cache.set(audio_bytes, embedding)
        return embedding

    def compare_embeddings(self, emb1, emb2) -> float:
        import torch.nn.functional as F
        return F.cosine_similarity(emb1, emb2).item()

    # ── Internal helpers ───────────────────────────────────────────────────

    def _embed_speechbrain(self, y: np.ndarray):
        import torch
        import torch.nn.functional as F

        wav = torch.tensor(y, dtype=torch.float32).unsqueeze(0)  # (1, samples)
        with torch.no_grad():
            embedding = self._sb_classifier.encode_batch(wav)  # (1, 1, 192)
            embedding = embedding.squeeze(1)                    # (1, 192)
            embedding = F.normalize(embedding, dim=-1)
        return embedding

    def _embed_wav2vec2(self, y: np.ndarray):
        import torch
        import torch.nn.functional as F

        inputs = self.processor(
            [y.tolist()],
            sampling_rate=self.target_sr,
            return_tensors="pt",
            padding=True,
        )
        inputs = {k: v.to(self.device) for k, v in inputs.items()}
        with torch.no_grad():
            outputs = self.model(**inputs)
            hidden = outputs.last_hidden_state        # (1, T, 768)
            embedding = hidden.mean(dim=1)            # (1, 768)
            embedding = F.normalize(embedding, dim=-1)
        return embedding


# Singleton — lazy-loaded on first request
embedding_engine = SpeakerEmbeddingEngine()
