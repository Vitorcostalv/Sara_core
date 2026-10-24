# LLM própria no Render (experimental)

O serviço `sara-core-llm` roda Qwen2.5-0.5B-Instruct Q4_0 em CPU, com llama.cpp b11861. Modelo e executor têm revisões e SHA-256 fixos no Dockerfile. O contexto é de 2048 tokens, uma requisição simultânea e até 128 tokens de saída. Não existe GPU nem disco persistente e nenhum segredo do banco ou Gemini vai para o Render.

## Integração

O site permanece na Vercel. A classificação do bioma pode tentar o Render primeiro com `LLM_RENDER_ENABLED=true`. `LLM_RENDER_BASE_URL` termina em `/v1`; `LLM_RENDER_API_KEY` deve corresponder a `SARA_LLM_API_KEY` do Render. O provedor principal existente continua configurado com `LLM_PROVIDER`, `LLM_API_KEY` e `LLM_MODEL`.

Uma indisponibilidade, partida fria, resposta vazia, truncada ou JSON inválido aciona o provedor principal. O limite local padrão é 10 segundos; não há repetição automática local. A resposta local precisa pertencer ao catálogo de biomas. Além do formato, a escolha é comparada com os termos conhecidos do catálogo. Uma contradição explícita aciona o provedor principal. Essa proteção não garante acerto em descrições ambíguas ou sem termos conhecidos. A API registra provedor, modelo e uso de fallback no campo inference.

Explicações com RAG continuam no provedor principal: a aprovação do classificador não autoriza automaticamente um modelo pequeno a produzir afirmações científicas livres.

## Operação gratuita

O Render Free possui 512 MB e 0,1 CPU, dorme após inatividade e compartilha a franquia de horas com os outros serviços da conta. O modelo fica dentro da imagem para evitar baixá-lo a cada inicialização. Nunca trocar o plano por um pago automaticamente.

As atualizações seguem a branch Dev-Vitor e a pasta services/local-llm. A chave fica apenas nas variáveis secretas dos servidores. `/health` verifica se o executor carregou; inferência exige autenticação.

## Critério para ativar

Antes de ativar como primeira opção: serviço saudável, sem acesso anônimo à inferência, sem estouro de memória, classificação correta em todos os casos básicos do roteiro e latência compatível com o limite local. O relatório de avaliação registra resultados reais e a decisão. Se reprovar, preservar a integração configurável e manter Gemini como principal.

## Resultado em 24/10/2026

A configuração Q2_K acertou 9/12 casos e Q4_0 acertou 11/12 no mesmo roteiro. O erro de tundra da Q4 foi rejeitado pelo cruzamento com o termo permafrost do catálogo. São testes pequenos de engenharia, não uma estimativa científica de precisão geral.

O Render ficou ativado somente para classificação, com tentativa limitada a 10 s. Respostas locais válidas usam parâmetros e textos canônicos; resultados contraditórios seguem para Gemini e, se a API também falhar, para palavras-chave/default. Durante a avaliação, o Gemini informou HTTP 429 por cota diária gratuita, e a contingência por palavras-chave preservou a geração.

A primeira inferência após carregar um catálogo sem cache levou aproximadamente 34 s; requisições seguintes ficaram em torno de 4-6 s no teste direto. A partida fria do Render pode acrescentar sua própria espera. Uma resposta válida não garante correção para toda descrição possível, principalmente em casos ambíguos sem termos do catálogo.

Para repetir: compilar o backend e executar `node scripts/benchmark-render-llm.cjs` com `LLM_RENDER_BASE_URL` e `LLM_RENDER_API_KEY` no ambiente do servidor. O roteiro mede resultado bruto e rejeição pelas regras, grava JSON sem credenciais em .tmp/render-llm-benchmark.json e falha se aceitar uma resposta errada.

O RAG utiliza agora a pergunta na busca textual nativa do PostgreSQL e preserva a relevância na seleção final. Fontes e domínio continuam sendo filtrados; nenhum dado foi alterado e não foi adicionado serviço vetorial pago. Isso melhora recuperação, não certifica a veracidade de todo conteúdo do banco.
