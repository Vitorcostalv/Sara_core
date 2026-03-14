# STT (Vosk) - MVP Setup

Este diretorio concentra modelos e assets locais de Speech-to-Text.

## Estrutura sugerida

```text
services/stt/
  models/
    pt-br/
      am/
      conf/
      graph/
      ivector/
```

Se o zip do modelo vier com pasta extra (ex.: `pt-br/vosk-model-small-pt-0.3/...`), mova o conteudo interno para `pt-br` para manter o `STT_MODEL_PATH` funcionando.

## Configuracao por ambiente

No `.env` da raiz:

```env
STT_PROVIDER=vosk
STT_MODEL_PATH=services/stt/models/pt-br
STT_AUDIO_MAX_BYTES=10485760
STT_FFMPEG_PATH=ffmpeg
STT_PYTHON_PATH=python
```

## Requisitos locais

- Modelo Vosk ja extraido em `STT_MODEL_PATH`.
- FFmpeg disponivel no PATH (ou caminho absoluto em `STT_FFMPEG_PATH`).
- Python com pacote `vosk` instalado (`pip install vosk`).
- Script local em `services/stt/scripts/vosk_transcribe.py`.

## Fluxo do backend

1. Recebe multipart com `audio`.
2. Converte audio para PCM mono 16k usando FFmpeg.
3. Executa transcricao offline com Vosk.
4. Retorna JSON compativel com o contrato HTTP de voz.
