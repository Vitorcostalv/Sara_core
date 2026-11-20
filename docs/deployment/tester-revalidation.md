# Revalidação do relatório de produção

No site https://sara-core-one.vercel.app/ecology, teste novamente os itens
reprovados do relatório. Não altere dados existentes nem configurações.

Antes de começar, leia `/api/v1/health`: registre `deployment.commit`,
`httpStatus` e o cabeçalho `X-Sara-Commit`. Registre o HTTP real pela aba de rede
quando disponível. Não infira aprovação de outro commit apenas pelo nome do modelo.

- Repita o exemplo sintético três vezes, exporte e compare o JSON com a tela.
  Uma falha transitória de rede pode causar uma única repetição automática;
  uma falha persistente deve continuar visível. Isso não garante disponibilidade
  nem elimina problemas de DNS, conexão ou provedor.
- Troque o ID por `especie-inexistente` tanto em `speciesIds` quanto nas chaves
  de todas as populações. Espere rejeição explícita HTTP 422. Teste também
  inconsistência entre IDs e populações, que deve retornar validação HTTP 400.
- Repita os sete prompts do relatório. Oceano polar deve usar preset frio e
  fauna polar; Caverna deve ser identificada como ambiente subterrâneo. Cenários
  com superfície e cavernas, como Cerrado com cavernas, mantêm o bioma superficial.
- Amazônia e Manguezal devem ter habitat aquático e salinidade compatíveis.
  As coberturas mínimas configuradas são convenções do gerador sintético;
  não representam percentuais medidos desses biomas no mundo real.
- Refaça a explicação de predação. Se aparecer origem `rules`, registre a causa
  indicada (HTTP do provedor, timeout ou formato) e não aprove a LLM como real.
- Na pergunta sobre predador ser predado, confira um elo explícito e sua origem:
  exemplos do catálogo são didáticos, não observações do cenário consultado.
- Teste a previsão em largura de 390 px e a atualização da PWA v9 para v10.

Relate aprovado/reprovado/bloqueado, passos e evidências para cada item. Não
declare o sistema inteiro aprovado quando algum teste continuar bloqueado.
