import io
import logging
from typing import Tuple
import numpy as np
import librosa
import soundfile as sf
import scipy.signal

logger = logging.getLogger("forenlytics.audio.preprocessor")

class AudioPreprocessor:
    def __init__(self, target_sr: int = 16000, max_duration_sec: int = 30):
        self.target_sr = target_sr
        self.max_duration_sec = max_duration_sec

    def preprocess(self, file_content: bytes) -> Tuple[np.ndarray, list]:
        """
        Loads bytes into a 16kHz mono array, trims silence, normalizes,
        and generates a downsampled UI envelope.
        """
        try:
            data, samplerate = sf.read(io.BytesIO(file_content))
            
            # Mono conversion
            if len(data.shape) > 1:
                data = np.mean(data, axis=1)
                
            # Resampling to 16kHz
            if samplerate != self.target_sr:
                y = librosa.resample(data, orig_sr=samplerate, target_sr=self.target_sr)
            else:
                y = data
                
            # Noise Reduction: Simple median filter to remove transient spikes/clicks
            y = scipy.signal.medfilt(y, kernel_size=3)

            # Trim silence
            y_trimmed, _ = librosa.effects.trim(y, top_db=25)
            
            # Normalize
            if np.max(np.abs(y_trimmed)) > 0:
                y_norm = librosa.util.normalize(y_trimmed)
            else:
                y_norm = y_trimmed
                
            # Restrict duration to prevent memory OOM on long files
            max_len = self.max_duration_sec * self.target_sr
            if len(y_norm) > max_len:
                y_norm = y_norm[:max_len]
                
            # Extract UI envelope
            envelope = self._extract_waveform_envelope(y_norm)

            return y_norm, envelope
            
        except Exception as e:
            logger.exception("Audio ML Preprocessing failed")
            raise Exception(f"Failed to preprocess audio stream: {str(e)}")

    def _extract_waveform_envelope(self, y: np.ndarray, num_points: int = 150) -> list:
        if len(y) == 0:
            return []
        chunk_size = max(1, len(y) // num_points)
        truncated_length = chunk_size * num_points
        y_truncated = y[:truncated_length]
        chunks = y_truncated.reshape(num_points, chunk_size)
        envelope = np.max(np.abs(chunks), axis=1)
        max_val = np.max(envelope)
        if max_val > 0:
            envelope = envelope / max_val
        return [round(float(val), 3) for val in envelope]

preprocessor = AudioPreprocessor()
