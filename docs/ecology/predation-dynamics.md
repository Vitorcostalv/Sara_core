# Predação, cascatas e decisões da simulação

O cenário de introdução usa uma projeção determinística de populações e recursos,
comparada a um controle sem a espécie introduzida. As fases são amostras dessa
projeção; não há mais crescimento obrigatório 2 → 6 → 12 → 18 no fluxo ativo.

## O que determina o resultado

- Apenas elos predador → presa explícitos entram na integração. Categoria de
  renderização ou tamanho não bastam para afirmar uma relação alimentar.
- O invasor recebe presas candidatas de uma lista fechada por perfil. Essas
  relações são hipóteses educacionais de introdução, não registros de ocorrência
  ou prova de que cada par interage na natureza. Nativos predam a introduzida
  apenas quando a rede já declara uma presa do mesmo táxon.
- A mesma espécie pode predar outras e ser predada. Predadores compartilham um
  estoque finito de presas; consumidores compartilham recursos renováveis.
- Crescimento depende de alimento, mortalidade e capacidade de suporte. Sem
  alimento, uma introdução pode fracassar mesmo sem predadores registrados.
- Ausência de um inimigo registrado não implica devastação. Efeitos podem ser
  pequenos, indiretos ou limitados por alimento. O controle permite separar
  variação de fundo de efeitos da introdução.
- Espécies com dieta implícita não recebem elos inventados; essa lacuna aparece
  nas incertezas. Reprodução, doenças, estágios de vida e taxas reais não são
  calibrados por dados populacionais de campo.

## Parâmetros e limites

Passos fixos de 3 segundos de apresentação até 180 segundos. Não representam
tempo biológico real. A massa é um índice relativo já utilizado no catálogo.
Demanda de caça usa coeficiente 0,12 por passo, saturação por alimento e limite
compartilhado de 25% das presas por passo. Recursos recuperam 7% da diferença
para a disponibilidade inicial por passo, com consumo proporcional à população.
Capacidades de suporte são índices (3 vezes o alvo nativo, 8 vezes a introdução),
com limite numérico de 100 indivíduos por espécie. Nenhum desses coeficientes é
uma estimativa científica validada. Os testes verificam regras, limites e fluxo,
não a fidelidade quantitativa de uma previsão ecológica.

## Papel da LLM e da cena

A LLM recebe a rede, os controladores presentes, as quatro amostras populacionais,
o controle, os recursos, as ações e as incertezas. Deve explicar o estado com a
lista exata de ações permitidas. IDs inventados, duplicados ou omitidos, campos
extras, JSON inválido, timeout ou indisponibilidade causam fallback para texto
determinístico. A resposta da LLM nunca modifica populações, elos ou coeficientes.
O prompt geral de consultas também inclui as regras, identificadas como regras
de simulação; elas não substituem nem aumentam artificialmente a cobertura do banco.

O seletor de fase aplica as populações calculadas aos animais renderizados.
Nesse modo a cena anima movimento e fuga, mas não executa uma segunda dinâmica
de mortalidade/respawn que contradiga a projeção. Uma espécie com alvo zero não
reaparece espontaneamente. Voltar à fase inicial restaura seus alvos originais.

O gerador por texto também preserva o contexto regional: similaridade climática
não transforma Amazônia/Cerrado em Mata Atlântica. Pantanal e manguezal passam a
expor habitats próprios, permitindo as espécies cadastradas para esses ambientes.
A biogeografia continua aproximada e não representa município ou bacia real.

## Como reproduzir a validação sem produção

```sh
npm run test:local
npm run test:browser
npm run typecheck
npm run lint
npm run build
```

`test:local` cria um PostgreSQL exclusivo em uma porta livre de `127.0.0.1`,
com senha aleatória, executa migrations, seeds e testes de backend/frontend e
encerra o banco. Não usa `DATABASE_URL` de produção. Dados ficam ignorados pelo
Git em `.tmp/test-postgres/`. `test:browser` inclui o fluxo em Edge headless local
e salva evidências em `.tmp/verification/`. O navegador bloqueia destinos externos.
É necessário ter o Edge instalado; os testes não baixam outro navegador.

LLMs externos são simulados nos testes; nenhum teste valida uma chamada com
credenciais reais de Gemini/Grok. O caminho de indisponibilidade também é testado.

## Referências conceituais

- [Estes et al. (2011), Trophic downgrading of planet Earth](https://pubmed.ncbi.nlm.nih.gov/21764740/): efeitos em cascata da perda de consumidores de topo.
- [Juliano et al. (2010), predator contributions to invasion resistance](https://pubmed.ncbi.nlm.nih.gov/19841945/): experimento com efeitos diretos e indiretos dependentes da comunidade.

Esses trabalhos sustentam os conceitos gerais; não calibram os coeficientes nem
comprovam os pares hipotéticos de predação utilizados neste protótipo.
