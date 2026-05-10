FROM public.ecr.aws/docker/library/python:3.12-slim

WORKDIR /app

# PyPI "torch" on Linux pulls CUDA + NVIDIA wheels (~2GB+); CI runners often OOM.
# Inference here is CPU-only; use the official CPU wheel index.
COPY requirements.txt .
RUN sed '/^torch/d' requirements.txt > /tmp/requirements.notorch.txt \
    && pip install --no-cache-dir --index-url https://download.pytorch.org/whl/cpu "torch>=2.3.0" \
    && pip install --no-cache-dir -r /tmp/requirements.notorch.txt

COPY . .

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
