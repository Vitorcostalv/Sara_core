# Invasão por descrição e abertura ao vivo

O campo de ecossistemas chama `/api/v1/ecology/simulate-prompt`. Descrições
com introdução/invasão, uma espécie de perfil conhecido e um ambiente do catálogo
recebem a mesma projeção e explicação usadas na Bioinvasão. A interface abre as
fases, fauna e cenário correspondentes sem fazer uma segunda simulação.

Exemplos: `Simule uma invasão de javalis no Cerrado`, `Leões introduzidos na
Antártida`, `Introduza peixe-leão no oceano`. O reconhecimento usa nomes e aliases
dos perfis existentes, sem inferir um invasor arbitrário. Pedidos sem espécie,
sem ambiente ou com várias espécies recebem HTTP 422 e mensagem de esclarecimento.
Pedidos comuns continuam gerando o relatório do ecossistema. `Cerrado sem espécies
invasoras` não ativa uma introdução. A interpretação é limitada ao vocabulário
implementado, não é compreensão irrestrita de linguagem natural.

A abertura inicia uma requisição real para o ecossistema padrão. Os cenários
prontos também usam a API. Uma falha mostra erro e oferece uma ação offline;
nunca troca automaticamente o resultado por um snapshot. A escolha explícita
de demonstração offline continua disponível e identificada. No build hospedado,
`/api/v1` prevalece sobre uma URL antiga de outro computador salva no navegador.

## Reteste

1. Em sessão nova, espere a abertura e confirme um POST `simulate-prompt`.
   Não deve aparecer aviso de demonstração offline.
2. Bloqueie essa requisição em um navegador isolado e recarregue. Confirme erro
   visível e ausência de snapshot automático. A demo só abre após o clique.
3. Digite os exemplos acima no campo principal. Confira a seleção da espécie,
   local, explicação, fases e contagens. A Antártida deve rejeitar estabelecimento
   do leão. Não aceite rótulo de LLM quando a origem for regras.
4. Clique em `Invasão de javali no Cerrado` nos cenários prontos. Confira que
   usa a API, sem carregar o snapshot offline em paralelo.
5. Gere um ambiente comum e repita a invasão. Confira que o resultado antigo
   não sobrescreve o pedido mais recente.
6. Atualize um navegador com cache v10: a PWA passa a v11.

Validação local: 249 testes de backend, 101 de frontend, 3 da entrada web e
5 do gateway. O navegador verifica inicialização saudável, falha de rede com
demo explícita, invasão digitada no campo principal, exportação, tela móvel e fases.
Build e lint passam. Os testes locais usam PostgreSQL temporário e LLM simulada;
a explicação real deve ser conferida após a publicação.

## Rollback desta entrega

Destino anterior: commit `59bc7906fc5097d8032e849f912357e32504a9e3`, deployment
`dpl_76mHLAHAi12Kh1ChGbw2kGqoFj43`. Se houver regressão grave, reverter o projeto
`sara-core` a esse deployment na Vercel. Não há migração ou reversão de banco.
