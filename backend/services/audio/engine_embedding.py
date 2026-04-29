import logging
import numpy as np
from .cache_utils import EmbeddingCache

logger = logging.getLogger("forenlytics.audio.embedding")

class SpeakerEmbeddingEngine:
    def __init__(self, target_sr: int = 16000):
        self.target_sr = target_sr
        self.device = "cpu"
        self.model_name = "facebook/wav2vec2-base"
        self.cache = EmbeddingCache(max_size=100)
        
        self.processor = None
        self.model = None
        self._initialized = False

    def _ensure_loaded(self):
        if self._initialized:
            return
        
        import torch
        from transformers import Wav2Vec2FeatureExtractor, Wav2Vec2Model
        
        self.device = torch.device("cpu")
        logger.info(f"Loading Wav2Vec2 Speaker Embedding framework on {self.device}...")
        try:
            self.processor = Wav2Vec2FeatureExtractor.from_pretrained(self.model_name)
            self.model = Wav2Vec2Model.from_pretrained(
                self.model_name,
                low_cpu_mem_usage=True
            ).to(self.device)
            self.model.eval()
            self._initialized = True
            logger.info("Wav2Vec2 model loaded successfully.")
        except Exception as e:
            logger.error(f"Failed to load ML models: {e}")
            raise Exception(f"Wav2Vec2 engine could not be initialized: {str(e)}")

    def unload(self):
        """Purge model from memory."""
        if not self._initialized:
            return
        self.model = None
        self.processor = None
        self._initialized = False
        import gc
        gc.collect()
        logger.info("Wav2Vec2 model unloaded from memory.")

    def get_embedding(self, audio_bytes: bytes, y: np.ndarray) -> any:
        self._ensure_loaded()
        import torch
            
        cached = self.cache.get(audio_bytes)
        if cached is not None:
            return cached
            
        inputs = self.processor(y, sampling_rate=self.target_sr, return_tensors="pt", padding=True)
        inputs = {k: v.to(self.device) for k, v in inputs.items()}
        
        with torch.no_grad():
            outputs = self.model(**inputs)
            hidden_states = outputs.last_hidden_state
            embedding = hidden_states.mean(dim=1)
            
        self.cache.set(audio_bytes, embedding)
        return embedding

    def compare_embeddings(self, emb1: any, emb2: any) -> float:
        import torch.nn.functional as F
        cos_sim = F.cosine_similarity(emb1, emb2).item()
        return cos_sim

# Lazy instance
embedding_engine = SpeakerEmbeddingEngine()
