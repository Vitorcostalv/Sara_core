# Sara Core na web — apresentação do TCC

## Manutenção

O projeto da Vercel **sara-core**, da conta **vitorcostalvs-projects**, está conectado ao repositório `Vitorcostalv/Sara_core`. A branch de produção é **Dev-Vitor**, a mesma usada nesta pasta. Um push nessa branch dispara a publicação automática. Não é necessário copiar arquivos para outro projeto ou executar o servidor no computador durante a apresentação.

Para conferir uma alteração antes de publicar:

```sh
npm ci
npm run build:web
npm run test:web
npm test
```

`build:web` compila os tipos compartilhados, o backend e o frontend nesta ordem. O frontend chama `/api/v1` no próprio domínio; nunca deve apontar para `localhost` em produção. O código de integração da Vercel está em `api/index.js` e as rotas/configuração em `vercel.json`.

## Serviços e custos

- **Vercel Hobby:** interface estática e backend Node em uma função, no mesmo projeto. Adequado ao TCC de uso pessoal/não comercial, dentro das cotas gratuitas. Não contratar Pro, teste pago ou domínio para esta apresentação.
- **Neon:** reutiliza o banco PostgreSQL já utilizado pelo Sara Core. A migração não reseta, recria ou repovoa esse banco. É necessário conferir no painel se a conta permanece no plano gratuito e dentro da cota.
- **Gemini:** reutiliza o provedor configurado. A hospedagem gratuita não muda o plano de faturamento da chave do Google. Use um projeto sem faturamento habilitado se a exigência for impedir qualquer cobrança; limites ou indisponibilidade do Gemini podem acionar o fallback por palavras-chave já existente.
- **Render:** alternativa caso seja preciso um servidor contínuo, mas o serviço gratuito suspende após 15 minutos sem tráfego e pode demorar a retornar. Não é necessário na configuração escolhida.
- **Supabase:** dispensável neste caso, pois o banco Neon já existe. Não há motivo técnico para migrar apenas para apresentar.

Os planos gratuitos têm limites e não garantem disponibilidade. Não foram ativadas assinaturas pagas nem tarefas periódicas para manter serviços acordados.

## Segredos

Configure as variáveis em Vercel > sara-core > Settings > Environment Variables, no ambiente Production (e Preview se desejar validar versões):

| Variável | Uso |
| --- | --- |
| `DATABASE_URL` | Conexão Neon, preferencialmente a conexão pooled |
| `DATABASE_SSL_MODE` | `verify-full` |
| `LLM_PROVIDER` | `gemini` |
| `LLM_API_KEY` | Chave do provedor, somente no servidor |
| `LLM_MODEL` | Modelo já configurado no projeto |
| `LLM_TIMEOUT_MS` | `45000` |
| `API_JSON_MAX_BYTES` | `4194304`, para receber grades de terreno |
| `LOG_LEVEL` | `warn` |

Não use prefixo `VITE_` para segredos. Não envie `.env`, `.env.local` ou `.vercel` ao Git. O adaptador gera uma chave de integração interna por instância e a injeta no servidor; essa chave não é entregue ao navegador. O site público permite executar as funções da aplicação; essa chave interna não é autenticação dos visitantes. O limite de requisições existente é em memória e por instância, e não deve ser tratado como garantia de limite de gastos do provedor.

## Apresentar pelo celular

1. Abra o endereço HTTPS no Chrome do Android ou Safari do iPhone.
2. Abra os cenários que pretende mostrar; o modo leve já é selecionado em telas pequenas.
3. No Android, use **Instalar app** ou **Adicionar à tela inicial**; no iPhone, Compartilhar > Adicionar à Tela de Início.
4. Para demonstrar a geração real, use **Ao vivo** com internet. Confira o resultado antes de começar a apresentação.
5. Para reserva, selecione explicitamente **Demonstração offline** e carregue os cenários. Eles são exemplos previamente calculados; não representam uma nova consulta à IA.
6. Antes de sair, teste uma recarga em modo avião. O cache depende do navegador e pode ser apagado pelo sistema.
7. Teste o projetor/TV da instituição com antecedência: o site funcionar no celular não garante que o aparelho suporte HDMI ou espelhamento.

Os controles de toque permitem explorar o terreno; o desempenho real depende da GPU e da memória do aparelho. Uma verificação em tela estreita no computador não substitui o teste no seu celular.

## Referências verificadas em 24/10/2026

- [Vercel Hobby](https://vercel.com/docs/plans/hobby)
- [Express na Vercel](https://vercel.com/docs/frameworks/backend/express)
- [Limites das funções Vercel](https://vercel.com/docs/functions/limitations)
- [Render gratuito](https://render.com/docs/free)
- [Plano gratuito Neon](https://neon.com/blog/neon-free-plan-1-gb-per-project)
- [Preços e cotas Gemini](https://ai.google.dev/gemini-api/docs/pricing)
