# Backend (`@sara/backend`)

API HTTP da Sara Core com arquitetura em camadas:

- `http/routes`: registro de endpoints
- `modules/*/controller`: entrada/saida HTTP
- `modules/*/service`: regras de aplicacao
- `modules/*/repository`: acesso ao SQLite
- `database`: conexao, migracao e reset de schema
- `core/errors`: erros padronizados
- `core/middleware`: validacao e middleware cross-cutting
- `logging`: logger estruturado

Documentacao de API e contratos:
- `docs/api/endpoints.md`
- `docs/api/contracts.md`

## Voice STT MVP

Endpoint disponivel para o MVP de voz:
- `POST /api/v1/voice/interactions`

Configuracoes de ambiente relevantes:
- `STT_PROVIDER=vosk`
- `STT_MODEL_PATH=services/stt/models/pt-br`
- `STT_AUDIO_MAX_BYTES=10485760`
- `STT_FFMPEG_PATH=ffmpeg`
- `STT_PYTHON_PATH=python`
