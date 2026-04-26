# Services

Esta pasta reúne serviços locais e artefatos de runtime usados pela Sara Core.

## O que já existe
- `stt/`: implementação funcional do fluxo de Speech-to-Text offline usado pelo backend

## O que ainda é placeholder
- `tts/`
- `wake-word/`
- `llm/`

Esses diretórios seguem reservados para evoluções futuras, mas não fazem parte do fluxo principal do MVP atual.

## STT atual
O backend usa `services/stt` para processar `POST /api/v1/voice/interactions`.

Fluxo resumido:
1. o frontend envia um arquivo de áudio;
2. o backend converte o áudio com FFmpeg;
3. o script Python chama o modelo local do Vosk;
4. a API devolve a transcrição e o texto de resposta.

## Dependências do STT
- Python no PATH
- pacote `vosk` instalado no ambiente Python
- FFmpeg no PATH
- modelo extraído em `services/stt/models/pt-br`

## Limitações atuais
- o fluxo ainda é voltado para uso local;
- a configuração do ambiente influencia diretamente a execução;
- falhas de Python, FFmpeg ou modelo ausente aparecem no request path da API;
- TTS e wake word ainda não estão implementados nesta fase.
