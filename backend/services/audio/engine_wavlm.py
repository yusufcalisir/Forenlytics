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
        self.device = torch.device("cpu") # Force CPU to save memory on constrained envs
        self.model_name = "microsoft/wavlm-base-plus-sv"
        self.cache = EmbeddingCache(max_size=100)
        
        self.processor = None
        self.model = None
        self._initialized = False

    def _ensure_loaded(self):
        """Lazy loader: Only loads the model when actually needed."""
        if self._initialized:
            return
            
        logger.info(f"Loading Microsoft WavLM Speaker Verification framework on {self.device}...")
        try:
            self.processor = Wav2Vec2FeatureExtractor.from_pretrained(self.model_name)
            # Use low_cpu_mem_usage=True to save RAM during loading
            self.model = WavLMForXVector.from_pretrained(
                self.model_name, 
                low_cpu_mem_usage=True
            ).to(self.device)
            self.model.eval()
            self._initialized = True
            logger.info("WavLM model loaded successfully.")
        except Exception as e:
            logger.error(f"Failed to load WavLM models: {e}")
            raise Exception(f"Forensic engine could not be initialized: {str(e)}")

    def get_embedding(self, audio_bytes: bytes, y: np.ndarray) -> torch.Tensor:
        self._ensure_loaded()
            
        cached = self.cache.get(audio_bytes)
        if cached is not None:
            return cached
            
        inputs = self.processor(y, sampling_rate=self.target_sr, return_tensors="pt", padding=True)
        inputs = {k: v.to(self.device) for k, v in inputs.items()}
        
        with torch.no_grad():
            outputs = self.model(**inputs)
            embedding = outputs.embeddings
            embedding = F.normalize(embedding, dim=-1)
            
        self.cache.set(audio_bytes, embedding)
        return embedding

    def compare_embeddings(self, emb1: torch.Tensor, emb2: torch.Tensor) -> float:
        cos_sim = F.cosine_similarity(emb1, emb2).item()
        return cos_sim

# Create the instance but don't load the model yet
wavlm_engine = WavLMEngine()
