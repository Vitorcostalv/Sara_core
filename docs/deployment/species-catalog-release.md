# Catálogo completo de espécies

A aba Espécies consultava apenas a tabela científica, que tinha sete registros
em produção. Os 130 perfis usados pelo motor de simulação não eram retornados.
A listagem agora reúne essas fontes e os 21 perfis de bioinvasão antes de
filtrar, ordenar e paginar. Isso inclui javali, peixe-leão e outras espécies
que só tinham perfil de introdução/invasão, fora do catálogo de fauna nativa.

A identidade é o nome científico normalizado. Perfis regionais da mesma espécie
ficam no mesmo card, preservando todos os IDs, nomes e ambientes de simulação.
Por exemplo, onça-parda e puma-andino são perfis de `Puma concolor`. Registros
como onça-pintada conservam os dados científicos já existentes.

Os cards identificam Registro científico, Na simulação e Na bioinvasão. Ocorrência registrada
e compatibilidade de habitat no modelo têm campos separados; não são inferidas
novas áreas nativas nem classificações de conservação para os perfis.

Não há migration, seed nem escrita no banco. O catálogo adicional não aumenta
artificialmente a quantidade de fatos científicos usados pelo RAG.
`categoryCounts.species` continua contando fatos científicos dessa categoria.
O endpoint `/ecology/coverage` acrescenta `speciesCatalog`, com os totais do
catálogo completo, registros científicos, perfis e espécies únicas da simulação.
A interface também passa a ler `categoryCounts`, antes ignorado em favor de
um campo antigo `byCategory`.

## Verificação

1. Abrir Explorar → Dados → Espécies. Conferir o total, Próxima e Anterior.
2. Buscar `puma-andino`: um card `Puma concolor`, com os dois perfis preservados.
3. Buscar `Panthera onca`: um card com as duas origens de dados.
4. Buscar um nome inexistente, limpar o campo e buscar novamente.
5. Conferir todos os ambientes dos cards, inclusive após o terceiro ambiente.
6. Abrir Cobertura: catálogo completo e perfis separados dos fatos científicos.
7. A API deve paginar o catálogo sem IDs repetidos, preservar todos os IDs dos
   perfis do motor e aplicar busca e filtros antes da paginação.
8. Repetir busca e paginação no celular, sem erros de console.

O total depende do conteúdo do banco. O banco descartável de testes tem mais
registros científicos que a produção; não se deve fixar o total de produção
como uma constante de código ou inflar os dados científicos para igualá-los.

## Rollback

Restaurar a publicação do commit `9c6ab2277d0c6e3633dc63c661d4519c24918514`
(`dpl_Fq8FbNvYCQu6RNsnQwmJitJBwqRr`). Não há dados a desfazer nem configuração
de modelo, credencial ou plano a alterar. A versão anterior volta a listar
somente os registros científicos; perguntas e simulações mantêm sua configuração.
