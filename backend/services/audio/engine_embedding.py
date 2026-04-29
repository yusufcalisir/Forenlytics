import logging
import torch
import torch.nn.functional as F
from transformers import Wav2Vec2FeatureExtractor, Wav2Vec2Model
import numpy as np
from .cache_utils import EmbeddingCache

logger = logging.getLogger("forenlytics.audio.embedding")

class SpeakerEmbeddingEngine:
    def __init__(self, target_sr: int = 16000):
        self.target_sr = target_sr
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model_name = "facebook/wav2vec2-base"
        
        logger.info(f"Loading Wav2Vec2 Speaker Embedding framework on {self.device}...")
        self.cache = EmbeddingCache(max_size=100)
        
        try:
            self.processor = Wav2Vec2FeatureExtractor.from_pretrained(self.model_name)
            self.model = Wav2Vec2Model.from_pretrained(self.model_name).to(self.device)
            self.model.eval()
        except Exception as e:
            logger.error(f"Failed to load ML models: {e}")
            self.processor = None
            self.model = None

    def get_embedding(self, audio_bytes: bytes, y: np.ndarray) -> torch.Tensor:
        if self.model is None or self.processor is None:
            raise Exception("Machine Learning framework is offline. Unable to execute inference.")
            
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

    def compare_embeddings(self, emb1: torch.Tensor, emb2: torch.Tensor) -> float:
        cos_sim = F.cosine_similarity(emb1, emb2).item()
        return cos_sim

embedding_engine = SpeakerEmbeddingEngine()
