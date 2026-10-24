#!/bin/sh
set -eu
: "${SARA_LLM_API_KEY:?Configure SARA_LLM_API_KEY before starting the model}"
exec /opt/llama/llama-server \
  --model /models/qwen.gguf --alias sara-qwen-0.5b \
  --host 0.0.0.0 --port "${PORT:-10000}" \
  --api-key "$SARA_LLM_API_KEY" \
  --ctx-size 2048 --parallel 1 --threads 1 --threads-batch 1 \
  --batch-size 32 --ubatch-size 32 --n-predict 128 \
  --n-gpu-layers 0 --no-webui
