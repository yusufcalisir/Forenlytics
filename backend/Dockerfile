# ==============================================================================
# Forenlytics Audio Forensics Engine - Backend Production Dockerfile
# ==============================================================================

FROM python:3.11-slim

# Prevent interactive prompts during installation
ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Install essential system audio codecs, compilation tools & health tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    libsndfile1 \
    ffmpeg \
    sox \
    libsox-fmt-all \
    build-essential \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Upgrade pip & install Python dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip setuptools wheel && \
    pip install --no-cache-dir -r requirements.txt

# Create standard directories for models and sessions
RUN mkdir -p \
    /app/models/speechbrain \
    /app/models/huggingface \
    /app/models/torch \
    /app/speechbrain_cache \
    /app/data/sessions \
    /app/data/reports

# Copy application source code
COPY . .

# Default offline model cache locations
ENV TORCH_HOME=/app/models/torch
ENV HF_HOME=/app/models/huggingface
ENV TRANSFORMERS_CACHE=/app/models/huggingface/hub
ENV SPEECHBRAIN_CACHE_DIR=/app/models/speechbrain
ENV PORT=8000

EXPOSE 8000

# Healthcheck to verify FastAPI is responding
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://127.0.0.1:8000/health || exit 1

# Start Uvicorn ASGI server
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
