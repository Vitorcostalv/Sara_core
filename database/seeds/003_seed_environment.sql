-- 003_seed_environment.sql
-- Base inicial de conhecimento ambiental para facts e tasks.
-- Idempotente: ON CONFLICT(id) atualiza sem duplicar.
-- Requer que 001_seed_dev.sql já tenha criado o usuário 'local-user'.

INSERT INTO facts (id, user_id, key, value, category, is_important, created_at, updated_at)
VALUES
  -- environment:reciclagem
  (
    'fact-env-reciclagem-separacao',
    'local-user',
    'environment.reciclagem.separacao-residuos',
    'Separar resíduos recicláveis facilita a destinação correta e reduz o descarte inadequado.',
    'ecosystem:environment',
    TRUE,
    '2026-04-26T00:00:00.000Z',
    '2026-04-26T00:00:00.000Z'
  ),
  (
    'fact-env-reciclagem-coleta-especial',
    'local-user',
    'environment.reciclagem.coleta-especial',
    'Pilhas, baterias e eletrônicos precisam de destinação adequada em pontos de coleta específicos.',
    'ecosystem:environment',
    TRUE,
    '2026-04-26T00:00:00.000Z',
    '2026-04-26T00:00:00.000Z'
  ),

  -- environment:agua
  (
    'fact-env-agua-desperdicio',
    'local-user',
    'environment.agua.reducao-desperdicio',
    'Reduzir desperdício de água em atividades diárias ajuda a preservar recursos hídricos.',
    'ecosystem:environment',
    TRUE,
    '2026-04-26T00:00:00.000Z',
    '2026-04-26T00:00:00.000Z'
  ),
  (
    'fact-env-agua-nascentes',
    'local-user',
    'environment.agua.preservacao-nascentes',
    'A preservação de nascentes e matas ciliares ajuda a proteger corpos d''água e manter o abastecimento hídrico.',
    'ecosystem:environment',
    TRUE,
    '2026-04-26T00:00:00.000Z',
    '2026-04-26T00:00:00.000Z'
  ),

  -- environment:energia
  (
    'fact-env-energia-consumo',
    'local-user',
    'environment.energia.reducao-consumo',
    'Apagar luzes e desligar equipamentos sem uso reduz o consumo de energia elétrica.',
    'ecosystem:environment',
    TRUE,
    '2026-04-26T00:00:00.000Z',
    '2026-04-26T00:00:00.000Z'
  ),

  -- environment:residuos
  (
    'fact-env-residuos-reutilizacao',
    'local-user',
    'environment.residuos.reutilizacao',
    'Reutilizar materiais quando possível diminui a geração de resíduos e reduz a pressão sobre aterros.',
    'ecosystem:environment',
    TRUE,
    '2026-04-26T00:00:00.000Z',
    '2026-04-26T00:00:00.000Z'
  ),
  (
    'fact-env-residuos-oleo',
    'local-user',
    'environment.residuos.oleo-cozinha',
    'Óleo de cozinha descartado incorretamente pode contaminar água e solo, afetando ecossistemas locais.',
    'ecosystem:environment',
    TRUE,
    '2026-04-26T00:00:00.000Z',
    '2026-04-26T00:00:00.000Z'
  ),
  (
    'fact-env-residuos-compostagem',
    'local-user',
    'environment.residuos.compostagem',
    'Compostagem pode reduzir resíduos orgânicos enviados ao lixo comum e gerar adubo natural.',
    'ecosystem:environment',
    FALSE,
    '2026-04-26T00:00:00.000Z',
    '2026-04-26T00:00:00.000Z'
  ),
  (
    'fact-env-residuos-descartaveis',
    'local-user',
    'environment.residuos.descartaveis',
    'Evitar descartáveis reduz a pressão sobre coleta, transporte e destinação de resíduos sólidos.',
    'ecosystem:environment',
    FALSE,
    '2026-04-26T00:00:00.000Z',
    '2026-04-26T00:00:00.000Z'
  ),

  -- environment:consumo-consciente
  (
    'fact-env-consumo-definicao',
    'local-user',
    'environment.consumo-consciente.definicao',
    'Consumo consciente considera necessidade real, durabilidade, origem e descarte do produto antes da compra.',
    'ecosystem:environment',
    TRUE,
    '2026-04-26T00:00:00.000Z',
    '2026-04-26T00:00:00.000Z'
  ),
  (
    'fact-env-consumo-planejamento',
    'local-user',
    'environment.consumo-consciente.planejamento',
    'Planejar compras ajuda a reduzir desperdício de alimentos e consumo desnecessário.',
    'ecosystem:environment',
    FALSE,
    '2026-04-26T00:00:00.000Z',
    '2026-04-26T00:00:00.000Z'
  ),

  -- environment:biodiversidade
  (
    'fact-env-biodiversidade-areas-verdes',
    'local-user',
    'environment.biodiversidade.areas-verdes',
    'Áreas verdes contribuem para conforto térmico, biodiversidade e qualidade de vida urbana.',
    'ecosystem:environment',
    TRUE,
    '2026-04-26T00:00:00.000Z',
    '2026-04-26T00:00:00.000Z'
  ),

  -- environment:educacao-ambiental
  (
    'fact-env-educacao-habitos',
    'local-user',
    'environment.educacao-ambiental.mudanca-habitos',
    'Educação ambiental incentiva mudanças de hábito individuais e coletivas com impacto duradouro.',
    'ecosystem:environment',
    TRUE,
    '2026-04-26T00:00:00.000Z',
    '2026-04-26T00:00:00.000Z'
  ),
  (
    'fact-env-educacao-medicamentos',
    'local-user',
    'environment.educacao-ambiental.medicamentos',
    'O descarte correto de medicamentos evita contaminação ambiental e deve ser feito em pontos de coleta autorizados.',
    'ecosystem:environment',
    FALSE,
    '2026-04-26T00:00:00.000Z',
    '2026-04-26T00:00:00.000Z'
  ),

  -- environment:comunidade
  (
    'fact-env-comunidade-hortas',
    'local-user',
    'environment.comunidade.hortas-comunitarias',
    'Hortas comunitárias podem fortalecer educação ambiental e segurança alimentar local.',
    'ecosystem:environment',
    FALSE,
    '2026-04-26T00:00:00.000Z',
    '2026-04-26T00:00:00.000Z'
  )
ON CONFLICT (id) DO UPDATE SET
  key        = EXCLUDED.key,
  value      = EXCLUDED.value,
  category   = EXCLUDED.category,
  is_important = EXCLUDED.is_important,
  updated_at = EXCLUDED.updated_at;

INSERT INTO tasks (id, user_id, title, description, status, priority, due_date, created_at, updated_at)
VALUES
  (
    'task-env-001',
    'local-user',
    'Criar rotina de separação de recicláveis',
    'Definir dias e locais para separar resíduos secos e orgânicos em casa.',
    'pending',
    3,
    NULL,
    '2026-04-26T00:00:00.000Z',
    '2026-04-26T00:00:00.000Z'
  ),
  (
    'task-env-002',
    'local-user',
    'Mapear pontos de coleta especiais',
    'Identificar onde descartar pilhas, baterias, eletrônicos e óleo de cozinha na região.',
    'pending',
    3,
    NULL,
    '2026-04-26T00:00:00.000Z',
    '2026-04-26T00:00:00.000Z'
  ),
  (
    'task-env-003',
    'local-user',
    'Verificar vazamentos ou desperdício de água',
    'Inspecionar torneiras, vasos sanitários e tubulações em busca de vazamentos evitáveis.',
    'pending',
    2,
    NULL,
    '2026-04-26T00:00:00.000Z',
    '2026-04-26T00:00:00.000Z'
  ),
  (
    'task-env-004',
    'local-user',
    'Reduzir uso de descartáveis durante a semana',
    'Substituir pelo menos um item descartável por uma alternativa reutilizável.',
    'pending',
    3,
    NULL,
    '2026-04-26T00:00:00.000Z',
    '2026-04-26T00:00:00.000Z'
  ),
  (
    'task-env-005',
    'local-user',
    'Criar lembrete para economia de energia',
    'Configurar lembrete para apagar luzes e desligar equipamentos sem uso ao sair dos ambientes.',
    'pending',
    4,
    NULL,
    '2026-04-26T00:00:00.000Z',
    '2026-04-26T00:00:00.000Z'
  ),
  (
    'task-env-006',
    'local-user',
    'Separar óleo de cozinha para descarte adequado',
    'Guardar o óleo usado em garrafa PET e levar ao ponto de coleta mais próximo.',
    'pending',
    3,
    NULL,
    '2026-04-26T00:00:00.000Z',
    '2026-04-26T00:00:00.000Z'
  ),
  (
    'task-env-007',
    'local-user',
    'Registrar hábitos sustentáveis adotados no mês',
    'Listar e avaliar ações sustentáveis praticadas durante o mês para medir evolução.',
    'pending',
    2,
    NULL,
    '2026-04-26T00:00:00.000Z',
    '2026-04-26T00:00:00.000Z'
  ),
  (
    'task-env-008',
    'local-user',
    'Pesquisar materiais recicláveis aceitos na região',
    'Consultar o serviço de coleta seletiva local para saber quais materiais são aceitos.',
    'pending',
    2,
    NULL,
    '2026-04-26T00:00:00.000Z',
    '2026-04-26T00:00:00.000Z'
  ),
  (
    'task-env-009',
    'local-user',
    'Montar checklist de consumo consciente',
    'Criar lista de perguntas para avaliar necessidade real antes de realizar compras.',
    'pending',
    3,
    NULL,
    '2026-04-26T00:00:00.000Z',
    '2026-04-26T00:00:00.000Z'
  ),
  (
    'task-env-010',
    'local-user',
    'Avaliar possibilidade de compostagem',
    'Pesquisar opções de compostagem doméstica ou comunitária disponíveis na região.',
    'pending',
    2,
    NULL,
    '2026-04-26T00:00:00.000Z',
    '2026-04-26T00:00:00.000Z'
  )
ON CONFLICT (id) DO UPDATE SET
  title       = EXCLUDED.title,
  description = EXCLUDED.description,
  status      = EXCLUDED.status,
  priority    = EXCLUDED.priority,
  due_date    = EXCLUDED.due_date,
  updated_at  = EXCLUDED.updated_at;
