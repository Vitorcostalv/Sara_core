# Dinâmica ecológica do Sara Core

O Sara Core usa um modelo educativo baseado em agentes. Os tempos, energia, salinidade de referência e limiares abaixo são escolhas de modelagem para exploração qualitativa: não representam previsões de campo nem taxas reprodutivas de espécies reais.

## Geração

- A IA escolhe um bioma de um catálogo fechado; clima e fauna vêm de dados curados. A interface informa se a classificação veio da IA, de palavras-chave ou de um ambiente genérico.
- Água continental é doce, água dos estilos marinho/polar usa 35 PSU e o preset de manguezal declara água salobra com 15 PSU. Estes valores de referência são simplificações; chuva e profundidade não determinam salinidade.
- Pequenas depressões com drenagem acumulada e precipitação suficiente podem formar lagos. É uma aproximação, sem balanço hídrico, evaporação ou cheias sazonais.
- Cada corpo de água conectado tem seu próprio nível, usado tanto na geometria quanto na natação. Vegetação segue agrupamentos, clareiras, inclinação e umidade ribeirinha, com limite de árvores por célula para celulares.

## Tempo, alimentação e predação

- Passos fixos de 1/30 s são compartilhados por todas as espécies, independentemente da taxa de renderização. Pausa e abas em segundo plano interrompem o relógio; lacunas acima de um segundo são tratadas como suspensão.
- Fome cresce para todos os consumidores. Perseguição e fuga gastam 1,8 vez a energia básica. Herbívoros e onívoros consomem estoques locais finitos, com regeneração, usando o mesmo catálogo de recursos do relatório. Carniça só aparece após morte e decai.
- Caça inicia a 38% do limiar de fome; uma perseguição já iniciada pode continuar até 20%. Alimentação suspende novas caçadas por pelo menos oito segundos. A perseguição antecipa até 1,2 s do movimento da presa.
- Caminhos são amostrados antes de ataques e deslocamentos: terrestres não atravessam água nem desníveis abruptos; peixes permanecem na água; aves podem sobrevoar. Desvio local não equivale a planejamento global de caminhos ou visão realista através da vegetação.
- Recuperação de saúde exige reservas e ausência de caça/fuga. Atualizações da interface preservam a identidade dos animais.

## Populações e interface

O modo ecológico é o padrão. Nascimentos exigem ao menos dois sobreviventes saudáveis próximos, reservas, alimento e intervalo mínimo de 35 segundos por espécie. Há custo energético e a população inicial funciona como teto. Não há sexos, gestação, juvenis, genética, migração nem calibração demográfica por espécie. Extinção não aciona reposição.

No modo demonstração, uma reposição explícita ocorre a cada cinco segundos quando a espécie fica abaixo de 60% da população inicial. Trocar de modo preserva o cenário; gerar novamente reinicia o sistema.

O relatório opcional descreve as condições iniciais e os recursos potenciais. Eventos mostram mortes, nascimentos e reposições ao vivo. Sua avaliação de plausibilidade não valida cientificamente a dinâmica populacional.

## Referências de implementação

- Reynolds, Pursuit and Evasion: https://www.red3d.com/cwr/steer/PursueEvade.html
- Wilensky, NetLogo Wolf Sheep Predation: https://ccl.northwestern.edu/netlogo/models/WolfSheepPredation
- Red Blob Games, Making maps with noise functions: https://www.redblobgames.com/maps/terrain-from-noise/

São referências de técnicas e modelos educativos, não validação empírica dos parâmetros adotados pelo Sara Core.
