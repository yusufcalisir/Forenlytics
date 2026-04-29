import hashlib
from collections import OrderedDict
from typing import Any

class EmbeddingCache:
    def __init__(self, max_size: int = 100):
        self.max_size = max_size
        self.cache = OrderedDict()

    def get(self, audio_bytes: bytes) -> Any:
        key = hashlib.md5(audio_bytes).hexdigest()
        if key in self.cache:
            self.cache.move_to_end(key)
            return self.cache[key]
        return None

    def set(self, audio_bytes: bytes, embedding: Any):
        key = hashlib.md5(audio_bytes).hexdigest()
        self.cache[key] = embedding
        self.cache.move_to_end(key)
        if len(self.cache) > self.max_size:
            self.cache.popitem(last=False)
