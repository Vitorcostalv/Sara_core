# Expansão e validação da fauna

Foram adicionadas 70 espécies (40 iniciais e mais 30 aves) em `fauna-catalog-expansion.ts`, consumidas pelo
mesmo catálogo da simulação. Não exigem seed nem migração de banco. A expansão
não altera os snapshots estáticos de demonstração offline.

| Ambiente principal | Espécies novas |
| --- | --- |
| Floresta amazônica | Preguiça-de-três-dedos, preguiça-de-dois-dedos, macaco-de-cheiro, uacari-branco, macaco-aranha-preto, arara-canindé, arara-vermelha-grande, jacamim |
| Mata Atlântica | Mico-leão-dourado, muriqui-do-sul, jacutinga, jacu-guaçu, saíra-sete-cores, preguiça-de-coleira, esquilo-brasileiro |
| Cerrado / Caatinga / formações abertas | Tamanduá-bandeira, tamanduá-mirim, tatu-canastra, tatu-bola-do-nordeste, tatu-peba, caititu, cachorro-do-mato, raposa-do-campo, teiú, cascavel, gralha-do-campo, codorna-amarela, perdiz, avoante, soldadinho-do-araripe |
| Áreas úmidas / manguezal | Biguá, colhereiro, guará, caranguejo-uçá, aratu-vermelho |
| Água doce | Lambari-do-rabo-amarelo, curimbatá, dourado, pintado, tambaqui |

Os grupos da tabela são indicativos; as associações completas estão no catálogo.
`savana-tropical` é o identificador de terreno utilizado para Cerrado. Velocidade,
população, massa relativa, limiares de umidade e distâncias são parâmetros
heurísticos da simulação, não medidas de campo.

## Regras verificadas

A segunda leva acrescenta 30 aves de campos e matas do Cerrado, com inclusão
conservadora apenas em `savana-tropical`. Ocorrência nesse mosaico não implica
ocorrência em todas as suas células ou exclusividade desse bioma. Matas de galeria
precisam de células florestais compatíveis. A dieta onívora permanece aproximada;
não foram inventados pares de predação para preencher lacunas de insetos.
Referência de ocorrência e ambientes: [Guia de aves do Parque Nacional de Brasília,
ICMBio (2011)](https://www.gov.br/icmbio/pt-br/centrais-de-conteudo/publicacoes/guias-de-aves/guia-aves-pnb-completo.pdf).
Nomenclatura atualizada em alguns gêneros; o catálogo não pretende cobrir toda
a distribuição geográfica ou migração das espécies.

- IDs únicos e 70 adições sem repetir espécies existentes; todas as presas existem e nenhuma espécie
  depende de si mesma. Após filtrar o ambiente, presas ausentes são removidas e
  predadores sem suporte não são incluídos.
- Peixes precisam de células de água em um bioma compatível. Espécies de água
  doce não ocupam células com salinidade acima de 5 PSU. Esse limiar é uma
  aproximação conservadora de habitat, não um limite fisiológico por espécie.
- Animais terrestres precisam de terra disponível; a cena não os coloca em
  qualquer outro habitat quando o preferido está ausente. O deslocamento também
  respeita o habitat compatível.
- O soldadinho-do-araripe exige um enclave úmido junto a curso d'água na Caatinga
  (umidade >=70%, distância do rio <=1 célula); a Caatinga seca não basta.
- Endemismos da Mata Atlântica não são associados à Amazônia. O bugio-ruivo
  (`Alouatta guariba`) existente foi restringido à Mata Atlântica, e o mocó
  (`Kerodon rupestris`) à Caatinga, removendo deserto genérico.
- Biomas com menos de 5% do grid não introduzem fauna residual. Permanecem os
  filtros existentes de clima polar, montanha e cavernas.
- Sem sprite registrado, o frontend usa polígonos sem solicitar arquivo
  inexistente. Todas as 70 adições seguem esse caminho inicialmente.

## Referências e limites

Curadoria por bioma e habitat, sem pretensão de modelar toda a distribuição
geográfica. Um grid não identifica município, bacia hidrográfica ou sub-região;
portanto, compatibilidade de bioma não comprova ocorrência em qualquer ponto
real desse bioma. O soldadinho, por exemplo, continua geograficamente restrito
à Chapada do Araripe. Algumas presas invertebradas e recursos alimentares são
representados por guildas aproximadas do catálogo existente.

- [Animal Diversity Web: Alouatta guariba](https://animaldiversity.org/accounts/Alouatta_guariba/)
- [Animal Diversity Web: Kerodon rupestris](https://animaldiversity.org/accounts/Kerodon_rupestris/)
- [Animal Diversity Web: Leontopithecus rosalia](https://animaldiversity.org/accounts/Leontopithecus_rosalia/)
- [Governo do Ceará: soldadinho-do-araripe](https://www.ce.gov.br/2021/12/15/descoberta-do-soldadinho-do-araripe-completa-25-anos/)
- [ICMBio: refúgio do soldadinho-do-araripe](https://www.gov.br/icmbio/pt-br/assuntos/unidade-de-conservacao/unidades-de-biomas/caatinga/lista-de-ucs/revis-soldadinho-araripe)
- [Mamíferos endêmicos de Cerrado e Caatinga](https://pmc.ncbi.nlm.nih.gov/articles/PMC5242261/)
- [ISPN: fauna e flora do Cerrado](https://ispn.org.br/en/biomas/Cerrado/fauna-e-flora-do-Cerrado/)
- [ISPN: fauna e flora da Caatinga](https://ispn.org.br/caatinga/fauna-e-flora-da-caatinga/)
- [ICMBio: PAN Manguezais](https://www.icmbio.gov.br/cepsul/images/stories/legislacao/Portaria/2015/p_icmbio_09_2015_aprova_pan_manguezais.pdf)
