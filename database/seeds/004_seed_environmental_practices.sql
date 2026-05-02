-- 004_seed_environmental_practices.sql
-- Keeps practical environmental habits available for future reference,
-- but outside the ecological ecosystem grounding path.

INSERT INTO facts (id, user_id, key, value, category, is_important, created_at, updated_at)
VALUES
  ('fact-env-reciclagem-separacao', 'local-user', 'environment.reciclagem.separacao-residuos', 'Separar residuos reciclaveis facilita a destinacao correta e reduz o descarte inadequado.', 'reference:environmental-practices', TRUE, '2026-04-26T00:00:00.000Z', '2026-05-01T00:00:00.000Z'),
  ('fact-env-reciclagem-coleta-especial', 'local-user', 'environment.reciclagem.coleta-especial', 'Pilhas, baterias e eletronicos precisam de destinacao adequada em pontos de coleta especificos.', 'reference:environmental-practices', TRUE, '2026-04-26T00:00:00.000Z', '2026-05-01T00:00:00.000Z'),
  ('fact-env-agua-desperdicio', 'local-user', 'environment.agua.reducao-desperdicio', 'Reduzir desperdicio de agua em atividades diarias ajuda a preservar recursos hidricos.', 'reference:environmental-practices', TRUE, '2026-04-26T00:00:00.000Z', '2026-05-01T00:00:00.000Z'),
  ('fact-env-agua-nascentes', 'local-user', 'environment.agua.preservacao-nascentes', 'Preservar nascentes e matas ciliares ajuda a proteger corpos de agua e a manter o abastecimento hidrico.', 'reference:environmental-practices', TRUE, '2026-04-26T00:00:00.000Z', '2026-05-01T00:00:00.000Z'),
  ('fact-env-energia-consumo', 'local-user', 'environment.energia.reducao-consumo', 'Apagar luzes e desligar equipamentos sem uso reduz o consumo de energia eletrica.', 'reference:environmental-practices', TRUE, '2026-04-26T00:00:00.000Z', '2026-05-01T00:00:00.000Z'),
  ('fact-env-residuos-reutilizacao', 'local-user', 'environment.residuos.reutilizacao', 'Reutilizar materiais quando possivel diminui a geracao de residuos e reduz a pressao sobre aterros.', 'reference:environmental-practices', TRUE, '2026-04-26T00:00:00.000Z', '2026-05-01T00:00:00.000Z'),
  ('fact-env-residuos-oleo', 'local-user', 'environment.residuos.oleo-cozinha', 'Oleo de cozinha descartado incorretamente pode contaminar agua e solo, afetando ecossistemas locais.', 'reference:environmental-practices', TRUE, '2026-04-26T00:00:00.000Z', '2026-05-01T00:00:00.000Z'),
  ('fact-env-residuos-compostagem', 'local-user', 'environment.residuos.compostagem', 'Compostagem pode reduzir residuos organicos enviados ao lixo comum e gerar adubo natural.', 'reference:environmental-practices', FALSE, '2026-04-26T00:00:00.000Z', '2026-05-01T00:00:00.000Z'),
  ('fact-env-residuos-descartaveis', 'local-user', 'environment.residuos.descartaveis', 'Evitar descartaveis reduz a pressao sobre coleta, transporte e destinacao de residuos solidos.', 'reference:environmental-practices', FALSE, '2026-04-26T00:00:00.000Z', '2026-05-01T00:00:00.000Z'),
  ('fact-env-consumo-definicao', 'local-user', 'environment.consumo-consciente.definicao', 'Consumo consciente considera necessidade real, durabilidade, origem e descarte do produto antes da compra.', 'reference:environmental-practices', TRUE, '2026-04-26T00:00:00.000Z', '2026-05-01T00:00:00.000Z'),
  ('fact-env-consumo-planejamento', 'local-user', 'environment.consumo-consciente.planejamento', 'Planejar compras ajuda a reduzir desperdicio de alimentos e consumo desnecessario.', 'reference:environmental-practices', FALSE, '2026-04-26T00:00:00.000Z', '2026-05-01T00:00:00.000Z'),
  ('fact-env-biodiversidade-areas-verdes', 'local-user', 'environment.biodiversidade.areas-verdes', 'Areas verdes contribuem para conforto termico, biodiversidade e qualidade de vida urbana.', 'reference:environmental-practices', TRUE, '2026-04-26T00:00:00.000Z', '2026-05-01T00:00:00.000Z'),
  ('fact-env-educacao-habitos', 'local-user', 'environment.educacao-ambiental.mudanca-habitos', 'Educacao ambiental incentiva mudancas de habito individuais e coletivas com impacto duradouro.', 'reference:environmental-practices', TRUE, '2026-04-26T00:00:00.000Z', '2026-05-01T00:00:00.000Z'),
  ('fact-env-educacao-medicamentos', 'local-user', 'environment.educacao-ambiental.medicamentos', 'O descarte correto de medicamentos evita contaminacao ambiental e deve ser feito em pontos de coleta autorizados.', 'reference:environmental-practices', FALSE, '2026-04-26T00:00:00.000Z', '2026-05-01T00:00:00.000Z'),
  ('fact-env-comunidade-hortas', 'local-user', 'environment.comunidade.hortas-comunitarias', 'Hortas comunitarias podem fortalecer educacao ambiental e seguranca alimentar local.', 'reference:environmental-practices', FALSE, '2026-04-26T00:00:00.000Z', '2026-05-01T00:00:00.000Z')
ON CONFLICT (id) DO UPDATE SET
  key = EXCLUDED.key,
  value = EXCLUDED.value,
  category = EXCLUDED.category,
  is_important = EXCLUDED.is_important,
  updated_at = EXCLUDED.updated_at;
