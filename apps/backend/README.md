# Backend (`@sara/backend`)

API HTTP da Sara Core com arquitetura em camadas:

- `http/routes`: registro de endpoints
- `modules/*/controller`: entrada/saida HTTP
- `modules/*/service`: regras de aplicacao
- `modules/*/repository`: acesso ao PostgreSQL (Neon)
- `database`: conexao, migracao e reset de schema
- `core/errors`: erros padronizados
- `core/middleware`: validacao e middleware cross-cutting
- `logging`: logger estruturado

Documentacao de API e contratos:
- `docs/api/endpoints.md`
- `docs/api/contracts.md`
- `docs/conventions/ecosystem-facts.md`

## Voice STT MVP

Endpoint disponivel para o MVP de voz:
- `POST /api/v1/voice/interactions`

Endpoint inicial para a fase de LLM grounded:
- `POST /api/v1/llm/generate`

## Como funciona a LLM hoje

O modulo `llm` segue a arquitetura atual do backend e nao recria o projeto:
- `routes`: registro do endpoint
- `controller`: adaptacao HTTP fina
- `service`: orquestracao de grounding + chamada ao provider
- `provider`: adapter de Gemini ou Grok
- `context-builder`: montagem de contexto a partir do banco

### Fontes de grounding

Nesta fase, a LLM usa apenas:
- `user_profile`
- `facts`

Ela nao usa como base principal:
- `tasks`
- `conversation_turns`

### Ecossistemas

Ecossistemas sao modelados dentro de `facts` com a convencao:
- `category = ecosystem:<slug>`

Exemplo:
- `ecosystem:sara-core`
- `ecosystem:voice-stt`
- `ecosystem:llm-grounding`

### Fluxo de geracao

1. `POST /api/v1/llm/generate` recebe `prompt`, `ecosystems`, `maxFacts`, `includeProfile` e `dryRun`
2. o `context-builder` busca facts relevantes, sanitiza conteudo e monta `contextPreview`
3. o `llm.service` reforca regras de grounding no prompt de sistema
4. se `dryRun=true`, retorna preview do contexto sem chamar provider externo
5. se o grounding for insuficiente, retorna a mensagem explicita de insuficiencia
6. se houver grounding suficiente, chama o provider configurado

### Regras de seguranca do grounding

- profile e facts persistidos sao tratados como dados nao confiaveis
- facts fora da convencao de grounding sao ignorados
- o provider nao deve responder com conhecimento solto nesta fase
- se o banco nao sustentar a resposta, o backend responde:
  `Nao encontrei informacao suficiente no banco para responder com seguranca.`

### Seeds e banco

`db:reset` hoje:
- limpa schema
- reaplica migrations
- reaplica seeds

O runtime principal do backend nesta fase e:
- PostgreSQL/Neon como store persistido
- `database/postgres/migrations` como fonte de schema aplicada em runtime
- scripts SQLite mantidos apenas como legado de migracao

Seeds atuais:
- `database/seeds/001_seed_dev.sql`
- `database/seeds/002_seed_ecosystems.sql`
- `database/seeds/003_seed_environment.sql`

Configuracoes de ambiente relevantes:
- `LLM_PROVIDER=disabled|gemini|grok`
- `LLM_API_KEY=...`
- `LLM_MODEL=...`
- `LLM_BASE_URL=...`
- `LLM_TIMEOUT_MS=45000`
- `STT_PROVIDER=vosk`
- `STT_MODEL_PATH=services/stt/models/pt-br`
- `STT_AUDIO_MAX_BYTES=10485760`
- `STT_FFMPEG_PATH=ffmpeg`
- `STT_PYTHON_PATH=python`
