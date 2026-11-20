# Modelo próprio como provedor de todos os fluxos

`LLM_PROVIDER=render` seleciona Qwen2.5-0.5B-Instruct hospedado no serviço
existente da Render para perguntas, explicação de predação e biomas.
Não é um modelo treinado do zero: são pesos abertos hospedados pelo projeto.

Configuração de produção:

- `LLM_PROVIDER=render`
- `LLM_CLOUD_ENABLED=false` (sem fallback para Gemini/Grok)
- `LLM_RENDER_ENABLED=true`
- `LLM_RENDER_BASE_URL` e `LLM_RENDER_API_KEY`: manter os segredos existentes
- `LLM_RENDER_TIMEOUT_MS=45000`

O texto usa exclusivamente as credenciais `LLM_RENDER_*`. Valores antigos de
`LLM_MODEL`, `LLM_API_KEY` e `LLM_BASE_URL` não são utilizados neste modo.
Uma falha local não autoriza tentativa em serviço externo.

O contexto de 2048 tokens e a saída de 128 tokens exigem respostas curtas.
Perguntas recebem até três fatos do banco, com trechos de até 240 caracteres,
e aceitam até 600 caracteres. A recuperação continua filtrando domínio,
proveniência e cobertura. A inspeção mostra o contexto recuperado; a inferência
recebe os trechos compactados. Isso limita a profundidade de perguntas amplas.
Sem cobertura suficiente, a API informa a falta de evidência sem chamar o modelo.

O primeiro teste real rejeitou o uso de prosa livre: o modelo pequeno podia
combinar fatos em explicações causais incorretas. O modo publicado é
`responseMode=grounded-extractive`: a LLM seleciona até dois IDs de evidências
e o backend retorna os trechos originais. Essa é uma resposta extrativa,
não uma redação científica autônoma. O aviso aparece na interface.

Perguntas sobre crescimento e predação recebem também regras identificadas
como `food-web-v1` e exemplos do catálogo identificados como didáticos, sem
afirmar ocorrência de campo. Fatos do banco conservam sua chave de fonte.
Uma seleção vazia informa insuficiência; seleção inventada, duplicada ou com
campos extras é rejeitada. A relevância da seleção ainda pode falhar.

A explicação recebe o resultado educacional, as populações inicial/final da
introduzida, quantidade de reguladores e causas únicas do motor. Seleciona
causas existentes; a causa principal do resultado sempre é preservada.
IDs de ações e populações nunca são delegados ao modelo. Falha ou saída
inválida preserva explicação `rules`, sem fallback para API externa.
Não apresentar o sistema como previsão de campo validada.

## Conferência em produção

1. `/api/v1/health`: `llmProvider=render`, `llmConfigured=true`,
   `cloudLlmEnabled=false`, papéis `questions=render`,
   `predationExplanation=render`, `ownModelRole=biomes-questions-predation`.
2. Pergunta com fatos suficientes: resposta 200, `provider=render`,
   `model=sara-qwen-0.5b`, conteúdo coerente com fatos recuperados.
3. Invasão: `predationReasoning.source=llm`, `provider=render`, modelo próprio.
   Comparar resumo com as fases, sem alterar resultados para acomodar a LLM.
4. Indisponibilidade: erro claro para perguntas; cenários continuam com `rules`.
5. Perguntas sem evidência: mensagem de insuficiência. Não inventar resposta.
6. Testar habitat incompatível, falta de alimento, recursos finitos e controle.

## Rollback sem voltar a consumir Gemini

Não há migration ou escrita de dados nesta alteração. Se a versão apresentar
falha, restaurar a publicação `dpl_4VqvY2fXVSRZNgTzLLLnjk87BcSp`
(commit `86ba7a39750b2b8756a028d83163d051261b8113`). Ela contém configuração
congelada com o Gemini suspenso: perguntas pausadas, cenários por regras.
Conferir o SHA e `cloudLlmEnabled=false` após restaurar.

Para uma nova compilação daquele código antigo, ajustar `LLM_PROVIDER=disabled`
e manter `LLM_CLOUD_ENABLED=false` antes de compilar: o esquema antigo não aceita
`render` no provedor principal. Não reativar Gemini como parte do rollback.
