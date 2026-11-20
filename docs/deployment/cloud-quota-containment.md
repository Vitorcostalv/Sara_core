# Contenção da quota do provedor externo

Este documento descreve a contenção nos commits `c541070` e `86ba7a3`.
A migração posterior para o modelo próprio está em
[own-model-release.md](own-model-release.md); nesse modo perguntas voltam a
usar a Render, mantendo o provedor externo desativado.

A instalação é híbrida: Qwen2.5-0.5B na Render classifica biomas; Gemini responde
consultas e explica projeções. O ping da Render não renova a quota do Gemini.
O modelo próprio tem contexto de 2048 tokens e saída de até 128 tokens nesta
instalação. Ele não foi migrado nem validado como substituto integral do RAG
ou da explicação de uma rede de predação inteira.

Foi configurado `LLM_CLOUD_ENABLED=false` apenas no ambiente de produção da
Vercel. A alteração entra em vigor na publicação que implementa essa opção.
Não muda plano, chave, banco ou modelo da Render. Enquanto estiver ativa:

- Consultas de texto retornam HTTP 503, código `LLM_CLOUD_SUSPENDED`, com aviso
  explícito. Dry-run e inspeção do contexto permanecem disponíveis.
- Cenários e previsões continuam na API. A explicação da predação usa regras e
  informa a suspensão, sem se apresentar como resposta de uma LLM.
- O classificador próprio pode continuar operando sem fallback para Gemini.
  Se falhar, o gerador mantém a identificação por catálogo/default existente.
- Respostas HTTP 429 do Gemini não são mais repetidas automaticamente.

O health expõe `cloudLlmEnabled`, `llmRoles` e a configuração do classificador.
Estar configurado não comprova inferência disponível. `/health/ping` mantém
`message: oi` e acrescenta `renderHeartbeat`: `sent` indica HTTP bem-sucedido no
health remoto, `cooldown` não faz nova sondagem e `failed` indica falha da sondagem.
Essa sondagem não certifica qualidade ou autenticação da inferência.

A janela de inferência própria em produção foi ampliada para 45 segundos
durante a contenção: o teste de implantação anterior já registrava cerca de
34 segundos na primeira inferência em CPU, acima do antigo limite de 10.
Com fallback externo habilitado continua valendo o orçamento combinado anterior.
Falhas locais são identificadas em `inferenceFailure` e não ficam memorizadas
como classificação padrão permanente, permitindo nova tentativa após recuperação.

## Verificação sem consumir Gemini

1. Health saudável e `cloudLlmEnabled=false`.
2. Pergunta de texto rejeitada por contenção, sem request ao provedor.
3. Invasão de javali no Cerrado gera fases com origem `rules` e aviso de suspensão.
4. Leão na Antártida termina sem estabelecimento; coelhos na Caatinga mantêm
   populações limitadas pela projeção, sem ressurgimento espontâneo.
5. Previsão sintética e abertura ao vivo continuam funcionando.
6. Uma descrição sem nomes explícitos de bioma pode testar o modelo próprio;
   somente `inference.provider=render` comprova que ele respondeu nessa tentativa.

Retomar o provedor externo exige verificar sua quota/política, ajustar a variável
e publicar novamente. Não reativar automaticamente após um tempo presumido.
Rollback de código não renova quota e uma versão antiga pode ignorar a contenção.
Para migrar todo o texto ao modelo próprio, é necessário adequar contexto,
capacidade e validação; alterar apenas `LLM_PROVIDER` não realiza essa migração.
