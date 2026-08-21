"""
WavLM Speaker Verification Engine
===================================
Uses microsoft/wavlm-base-plus-sv (WavLMForXVector) — the speaker-verification
fine-tuned checkpoint. This model produces x-vector style embeddings via
attention-based statistics pooling, making it state-of-the-art for
speaker ID from short utterances.

Windowed pooling for long audio
--------------------------------
WavLM-SV was trained on utterances of 2–10 seconds. Feeding it a full 30-second
clip in one shot causes OOM on CPU and degrades embedding quality because the
attention mechanism wasn't designed for that context length.

For audio > WINDOW_MAX_SEC seconds:
  - Split into WINDOW_SEC-second windows with WINDOW_STRIDE_SEC overlap
  - Extract one L2-normalized embedding per window
  - Mean-pool all per-window embeddings
  - Re-normalize the pool result

This gives a single fixed-size speaker embedding that represents the full
recording without truncation or OOM risk.
"""

import logging
import numpy as np
from .cache_utils import EmbeddingCache

logger = logging.getLogger("forenlytics.audio.wavlm")

# ── Tunable constants ─────────────────────────────────────────────────────────
MODEL_NAME = "microsoft/wavlm-base-plus-sv"
WINDOW_SEC = 6            # Seconds per embedding window
WINDOW_STRIDE_SEC = 2     # Overlap step (window - stride = 4s overlap)
WINDOW_MAX_SEC = 8        # Audio longer than this gets windowed; shorter is one-shot
# ──────────────────────────────────────────────────────────────────────────────


class WavLMEngine:
    def __init__(self, target_sr: int = 16_000):
        self.target_sr = target_sr
        self.device = "cpu"
        self.model_name = MODEL_NAME
        self.cache = EmbeddingCache(max_size=50)  # Reduced: embeddings are large tensors

        self.processor = None
        self.model = None
        self._initialized = False

    # ── Lifecycle ──────────────────────────────────────────────────────────

    def _ensure_loaded(self):
        """Lazy loader: only pulls the model into RAM when first needed."""
        if self._initialized:
            return

        import os
        import torch
        from transformers import Wav2Vec2FeatureExtractor, WavLMForXVector

        self.device = torch.device("cpu")
        local_only = os.environ.get("TRANSFORMERS_OFFLINE") == "1" or os.environ.get("HF_HUB_OFFLINE") == "1"
        logger.info(f"Loading {self.model_name} for speaker verification on {self.device} (offline_mode={local_only})...")
        try:
            self.processor = Wav2Vec2FeatureExtractor.from_pretrained(
                self.model_name,
                do_normalize=True,          # WavLM-SV expects normalized input
                local_files_only=local_only,
            )
            self.model = WavLMForXVector.from_pretrained(
                self.model_name,
                low_cpu_mem_usage=True,
                local_files_only=local_only,
            ).to(self.device)
            self.model.eval()
            self._initialized = True
            logger.info(f"WavLM ({self.model_name}) loaded successfully.")
        except Exception as e:
            if local_only:
                # If local_only failed, try standard load as fallback before giving up
                try:
                    logger.warning(f"Local-only load failed for WavLM ({e}), attempting online fallback...")
                    self.processor = Wav2Vec2FeatureExtractor.from_pretrained(
                        self.model_name,
                        do_normalize=True,
                    )
                    self.model = WavLMForXVector.from_pretrained(
                        self.model_name,
                        low_cpu_mem_usage=True,
                    ).to(self.device)
                    self.model.eval()
                    self._initialized = True
                    logger.info(f"WavLM ({self.model_name}) loaded via fallback.")
                    return
                except Exception as fallback_err:
                    logger.error(f"Fallback load also failed for WavLM: {fallback_err}")
            logger.error(f"Failed to load WavLM: {e}")
            raise RuntimeError(f"WavLM forensic engine could not be initialized: {e}") from e

    def unload(self):
        """Free model RAM. Called after every request on RAM-constrained deployments."""
        if not self._initialized:
            return
        self.model = None
        self.processor = None
        self._initialized = False
        import gc
        gc.collect()
        logger.info("WavLM unloaded from memory.")

    # ── Core API ───────────────────────────────────────────────────────────

    def get_embedding(self, audio_bytes: bytes, y: np.ndarray):
        """
        Extract a single L2-normalized speaker embedding from audio.

        For short audio (< WINDOW_MAX_SEC): one forward pass.
        For long audio: windowed extraction + mean pooling.

        Parameters
        ----------
        audio_bytes : bytes
            Raw file bytes — used as cache key only (not decoded here).
        y : np.ndarray
            Pre-processed 16 kHz mono float32 array from the preprocessor.

        Returns
        -------
        torch.Tensor of shape (1, embedding_dim)
        """
        if y is None or len(y) == 0:
            raise ValueError("Cannot extract embedding: empty audio array.")

        self._ensure_loaded()
        import torch
        import torch.nn.functional as F

        # Cache check (keyed on raw bytes for exact identity)
        cached = self.cache.get(audio_bytes)
        if cached is not None:
            return cached

        num_samples = len(y)
        window_samples = WINDOW_SEC * self.target_sr

        if num_samples <= WINDOW_MAX_SEC * self.target_sr:
            # Short audio — single forward pass
            embedding = self._forward_single(y)
        else:
            # Long audio — windowed mean pool
            embedding = self._forward_windowed(y, window_samples)

        # Final L2 normalization
        embedding = F.normalize(embedding, dim=-1)

        self.cache.set(audio_bytes, embedding)
        return embedding

    def compare_embeddings(self, emb1, emb2) -> float:
        """Cosine similarity between two L2-normalized embeddings. Range: [-1, 1]."""
        import torch.nn.functional as F
        return F.cosine_similarity(emb1, emb2).item()

    # ── Internal helpers ───────────────────────────────────────────────────

    def _forward_single(self, y: np.ndarray):
        """Run one forward pass on the full (short) audio array."""
        import torch
        inputs = self.processor(
            [y.tolist()],
            sampling_rate=self.target_sr,
            return_tensors="pt",
            padding=True,
        )
        inputs = {k: v.to(self.device) for k, v in inputs.items()}
        with torch.no_grad():
            outputs = self.model(**inputs)
        return outputs.embeddings  # shape: (1, 512)

    def _forward_windowed(self, y: np.ndarray, window_samples: int):
        """
        Segment long audio into overlapping windows and mean-pool embeddings.

        Windows advance by WINDOW_STRIDE_SEC seconds. The last window is
        anchored to the end of the array to avoid missing tail content.
        """
        import torch
        stride_samples = WINDOW_STRIDE_SEC * self.target_sr
        embeddings = []

        start = 0
        while start < len(y):
            end = min(start + window_samples, len(y))
            chunk = y[start:end]

            # Skip chunks shorter than 0.5s (too short for WavLM)
            if len(chunk) >= 0.5 * self.target_sr:
                emb = self._forward_single(chunk)
                embeddings.append(emb)

            if end == len(y):
                break
            start += stride_samples

        if not embeddings:
            raise ValueError("Windowed embedding extraction produced no valid windows.")

        # Stack and mean-pool across window dimension
        stacked = torch.cat(embeddings, dim=0)  # (N, 512)
        pooled = stacked.mean(dim=0, keepdim=True)  # (1, 512)
        logger.info(f"Windowed WavLM: {len(embeddings)} windows mean-pooled")
        return pooled


# Singleton — lazy-loaded on first request
wavlm_engine = WavLMEngine()
