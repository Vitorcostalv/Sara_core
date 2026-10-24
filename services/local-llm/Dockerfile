FROM ubuntu:24.04
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl libgomp1 libcurl4t64 && rm -rf /var/lib/apt/lists/*
WORKDIR /opt/llama
RUN curl -fL --retry 3 https://github.com/ggml-org/llama.cpp/releases/download/b11861/llama-b11861-bin-ubuntu-x64.tar.gz -o /tmp/llama.tar.gz \
 && echo "af86309b14d55f77b59053b8e8e064e1ce27c58f288adb474ff99d61b29a8e76  /tmp/llama.tar.gz" | sha256sum -c - \
 && tar -xzf /tmp/llama.tar.gz --strip-components=1 && rm /tmp/llama.tar.gz
RUN mkdir /models && curl -fL --retry 3 https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/9217f5db79a29953eb74d5343926648285ec7e67/qwen2.5-0.5b-instruct-q4_0.gguf -o /models/qwen.gguf \
 && echo "7671c0c304e6ce5a7fc577bcb12aba01e2c155cc2efd29b2213c95b18edaf6ed  /models/qwen.gguf" | sha256sum -c -
COPY start.sh /opt/llama/start.sh
RUN chmod +x /opt/llama/start.sh && useradd --system --uid 10001 sara
USER sara
ENV LD_LIBRARY_PATH=/opt/llama
EXPOSE 10000
ENTRYPOINT ["/opt/llama/start.sh"]
