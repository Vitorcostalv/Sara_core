# Previsão com observações

`POST /api/v1/ecology/forecast` estima tendências de abundância a partir de uma
série datada. É separado da simulação hipotética de introdução: não aprende nem
comprova efeitos causais de remover predadores ou introduzir espécies.

O modelo `observational-log-trend-v1` ajusta uma regressão linear em
`log(1 + abundância)` contra dias decorridos desde a primeira observação. A
estimativa transformada de volta é uma tendência mediana condicional, não uma
medida de campo. Taxas são ajustadas aos dados fornecidos; a LLM não cria valores.

## Dados e avaliação

Exige de 12 a 240 observações, de 1 a 8 espécies do catálogo e pelo menos um dia
entre registros ordenados. Todas as datas devem conter exatamente as mesmas
espécies. O usuário declara origem, unidade e protocolo comparável de amostragem.
Essa declaração não é verificada automaticamente. Dados não são salvos no banco.

Reserva os últimos 25% dos registros (mínimo 3) para avaliação temporal. O ajuste
avaliado usa somente o período anterior, sem escolher parâmetros no período de
teste. Compara erro absoluto médio com persistir a última observação conhecida.
Depois da avaliação, ajusta novamente em todo o histórico para prever até 90 dias,
limitados à duração do próprio histórico.

Se não superar a persistência, ou se os dados forem sintéticos, a resposta marca
evidência insuficiente. Superar esse único período de teste permite apenas o
status experimental; não equivale a validação externa. A estrutura do modelo
pode falhar com sazonalidade, rupturas ambientais, esforço de amostragem variável,
dependência temporal e interações tróficas não identificadas.

As faixas de 95% são intervalos de predição condicionais à regressão, usando
Student-t e erros normais independentes na escala transformada. Não incluem
toda a incerteza ecológica. A cobertura observada no teste é retornada e pode
ser ruim mesmo quando o erro médio melhora. Extrapolações acima do limite
numérico de 1 bilhão são sinalizadas, nunca apresentadas como evidência suficiente.

O retorno contém versão do modelo, hash SHA-256 dos dados/protocolo, origem,
divisão treino/teste, métricas, datas previstas e faixas. O painel Bioinvasão
permite importar JSON, carregar um exemplo **sintético** e exportar a avaliação.
As datas previstas começam depois do último registro, não necessariamente hoje.

## Validação seguinte

Para avaliar precisão real, forneça séries de campo comparáveis e faça previsões
antes de observar o período futuro. Guarde a exportação, confronte-a com as novas
observações e repita a avaliação em vários locais e períodos. Para prever efeitos
causais de intervenções, será necessário um modelo próprio, dados de interações
e validação adicional; tendências observadas não bastam para essa conclusão.

Referência conceitual: [Dietze et al., iterative near-term ecological forecasting](https://mhooten.github.io/publications/Dietze_etal_PNAS_2018.pdf).
O trabalho sustenta avaliação iterativa com observações; não valida o modelo deste projeto.
