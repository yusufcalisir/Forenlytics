import logging
import torch
import torch.nn.functional as F
from transformers import Wav2Vec2FeatureExtractor, WavLMForXVector
import numpy as np
from .cache_utils import EmbeddingCache

logger = logging.getLogger("forenlytics.audio.wavlm")

class WavLMEngine:
    def __init__(self, target_sr: int = 16000):
        self.target_sr = target_sr
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model_name = "microsoft/wavlm-base-plus-sv"
        
        logger.info(f"Loading Microsoft WavLM Speaker Verification framework on {self.device}...")
        self.cache = EmbeddingCache(max_size=100)
        
        try:
            self.processor = Wav2Vec2FeatureExtractor.from_pretrained(self.model_name)
            self.model = WavLMForXVector.from_pretrained(self.model_name).to(self.device)
            self.model.eval()
        except Exception as e:
            logger.error(f"Failed to load WavLM models: {e}")
            self.processor = None
            self.model = None

    def get_embedding(self, audio_bytes: bytes, y: np.ndarray) -> torch.Tensor:
        if self.model is None or self.processor is None:
            raise Exception("WavLM Machine Learning framework is offline.")
            
        cached = self.cache.get(audio_bytes)
        if cached is not None:
            return cached
            
        inputs = self.processor(y, sampling_rate=self.target_sr, return_tensors="pt", padding=True)
        inputs = {k: v.to(self.device) for k, v in inputs.items()}
        
        with torch.no_grad():
            # WavLMForXVector returns embeddings in .embeddings attribute
            outputs = self.model(**inputs)
            embedding = outputs.embeddings
            # Normalize embedding
            embedding = F.normalize(embedding, dim=-1)
            
        self.cache.set(audio_bytes, embedding)
        return embedding

    def compare_embeddings(self, emb1: torch.Tensor, emb2: torch.Tensor) -> float:
        # Cosine similarity for normalized embeddings
        cos_sim = F.cosine_similarity(emb1, emb2).item()
        return cos_sim

wavlm_engine = WavLMEngine()
