FROM python:3.11-slim

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PORT=7860 \
    DATA_SOURCE=huggingface \
    HF_DATASET_REPO=Yuvi2006pro/ocean-data \
    HF_REVISION=main \
    CACHE_ENABLED=true

# Create a non-root user (required by Hugging Face Spaces permissions)
RUN useradd -m -u 1000 user
WORKDIR /app

# Install system utilities
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source code
COPY --chown=user:user . .

# Switch to non-root user
USER user
ENV HOME=/home/user \
    HF_HOME=/home/user/.cache/huggingface

EXPOSE 7860

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
