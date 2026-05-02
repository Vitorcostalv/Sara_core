-- Ecological domain Part 2 — advanced seeds
-- Idempotent. Extends Part 1 seeds with:
--   • additional grounding_facts (abiotic-factor, formation-process, species, artificial-project, modeling-approach)
--   • ecosystem_processes for more ecosystems
--   • additional ecosystem_species and ecosystem_factors
--   • biotic_interactions
--   • additional artificial project metrics

-- ─── Additional grounding_facts: abiotic factors ────────────────────────────

INSERT INTO grounding_facts (
  id, domain_id, category, slug, title, fact_text, language, importance,
  entity_table, entity_id, source_id, citation_key, metadata, verified_at, is_active
)
VALUES
  (
    'gfact-abiotic-temperature',
    'domain-environmental-ecology',
    'abiotic-factor',
    'temperature',
    'Temperatura',
    'A temperatura é o fator abiótico mais amplamente correlacionado com a distribuição de espécies e ecossistemas, regulando metabolismo, fenologia e limites de tolerância fisiológica.',
    'pt-BR', 5, 'abiotic_factors', 'abiotic-temperature',
    'src-odum-barrett-2005', 'ODUM-BARRETT-2005',
    '{}'::jsonb, NOW(), TRUE
  ),
  (
    'gfact-abiotic-precipitation',
    'domain-environmental-ecology',
    'abiotic-factor',
    'precipitation',
    'Precipitação',
    'A precipitação determina a disponibilidade hídrica e a sazonalidade, estruturando a distribuição de biomas e a produtividade primária em escala global.',
    'pt-BR', 5, 'abiotic_factors', 'abiotic-precipitation',
    'src-odum-barrett-2005', 'ODUM-BARRETT-2005',
    '{}'::jsonb, NOW(), TRUE
  ),
  (
    'gfact-abiotic-salinity',
    'domain-environmental-ecology',
    'abiotic-factor',
    'salinity',
    'Salinidade',
    'A salinidade define habitats costeiros e marinhos, determinando quais organismos são halófilos, halotolerantes ou intolerantes. Valores entre 0,5 e 5 PSU caracterizam zonas salobras.',
    'pt-BR', 4, 'abiotic_factors', 'abiotic-salinity',
    'src-sara-part1', 'SARA-PART1-2026',
    '{}'::jsonb, NOW(), TRUE
  ),
  (
    'gfact-abiotic-hydroperiod',
    'domain-environmental-ecology',
    'abiotic-factor',
    'hydroperiod',
    'Hidroperíodo',
    'O hidroperíodo é a duração e frequência de alagamento ou inundação em zonas úmidas. Determina a zonação de macrófitas, distribuição de anfíbios e ciclagem de nutrientes no sedimento.',
    'pt-BR', 4, 'abiotic_factors', 'abiotic-hydroperiod',
    'src-sara-part1', 'SARA-PART1-2026',
    '{}'::jsonb, NOW(), TRUE
  ),
  (
    'gfact-abiotic-ph',
    'domain-environmental-ecology',
    'abiotic-factor',
    'ph',
    'pH',
    'O pH controla a disponibilidade de nutrientes e a tolerância fisiológica. Solos ácidos (pH < 5,5) como os do Cerrado limitam a disponibilidade de fósforo e favorecem espécies adaptadas.',
    'pt-BR', 4, 'abiotic_factors', 'abiotic-ph',
    'src-sara-part1', 'SARA-PART1-2026',
    '{}'::jsonb, NOW(), TRUE
  ),
  (
    'gfact-abiotic-hydrology',
    'domain-environmental-ecology',
    'abiotic-factor',
    'hydrology',
    'Hidrologia',
    'A hidrologia inclui fluxos, pulsos e conectividade hídrica. Em rios, determina velocidade de correnteza, transporte de sedimentos e habitat de organismos bentônicos e pelágicos.',
    'pt-BR', 4, 'abiotic_factors', 'abiotic-hydrology',
    'src-sara-part1', 'SARA-PART1-2026',
    '{}'::jsonb, NOW(), TRUE
  )
ON CONFLICT (id) DO UPDATE SET
  fact_text = EXCLUDED.fact_text,
  importance = EXCLUDED.importance,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- ─── Additional grounding_facts: formation processes ────────────────────────

INSERT INTO grounding_facts (
  id, domain_id, category, slug, title, fact_text, language, importance,
  entity_table, entity_id, source_id, citation_key, metadata, verified_at, is_active
)
VALUES
  (
    'gfact-formation-successional',
    'domain-environmental-ecology',
    'formation-process',
    'successional',
    'Sucessão ecológica',
    'A sucessão ecológica é o processo ordenado de colonização, substituição e reorganização de comunidades ao longo do tempo, do substrato nu (primária) ou após distúrbio (secundária) até o estado de clímax.',
    'pt-BR', 5, 'formation_processes', 'formation-successional',
    'src-odum-barrett-2005', 'ODUM-BARRETT-2005',
    '{}'::jsonb, NOW(), TRUE
  ),
  (
    'gfact-formation-fluvial',
    'domain-environmental-ecology',
    'formation-process',
    'fluvial',
    'Processos fluviais',
    'Processos fluviais moldam sistemas ripários e planícies aluviais por erosão, transporte e deposição sedimentar ao longo de escalas sazonais a milenares.',
    'pt-BR', 4, 'formation_processes', 'formation-fluvial',
    'src-sara-part1', 'SARA-PART1-2026',
    '{}'::jsonb, NOW(), TRUE
  ),
  (
    'gfact-formation-anthropic',
    'domain-environmental-ecology',
    'formation-process',
    'anthropic-restorative',
    'Formação antrópica restaurativa',
    'Processos antrópico-restaurativos incluem reabilitação, restauração ecológica e engenharia ecológica, conduzidos de forma dirigida para recuperar estrutura e função de ecossistemas degradados.',
    'pt-BR', 4, 'formation_processes', 'formation-anthropic-restorative',
    'src-ipbes-2019', 'IPBES-2019',
    '{}'::jsonb, NOW(), TRUE
  ),
  (
    'gfact-formation-marine-coastal',
    'domain-environmental-ecology',
    'formation-process',
    'marine-coastal',
    'Formação costeira marinha',
    'Processos costeiros marinhos estruturam manguezais, estuários e recifes por meio de marés, ondas, sedimentação e dinâmica de salinidade em escalas sazonais a milenares.',
    'pt-BR', 4, 'formation_processes', 'formation-marine-coastal',
    'src-sara-part1', 'SARA-PART1-2026',
    '{}'::jsonb, NOW(), TRUE
  )
ON CONFLICT (id) DO UPDATE SET
  fact_text = EXCLUDED.fact_text,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- ─── Additional grounding_facts: species ─────────────────────────────────────

INSERT INTO grounding_facts (
  id, domain_id, category, slug, title, fact_text, language, importance,
  entity_table, entity_id, source_id, citation_key, metadata, verified_at, is_active
)
VALUES
  (
    'gfact-species-panthera-onca',
    'domain-environmental-ecology',
    'species',
    'panthera-onca',
    'Panthera onca (onça-pintada)',
    'Panthera onca é o maior felino das Américas e predador de topo neotropical. Reguladora de teias tróficas, sua presença indica conectividade e integridade de habitats florestais e de planícies.',
    'pt-BR', 4, 'species', 'species-panthera-onca',
    'src-ipbes-2019', 'IPBES-2019',
    '{}'::jsonb, NOW(), TRUE
  ),
  (
    'gfact-species-rhizophora-mangle',
    'domain-environmental-ecology',
    'species',
    'rhizophora-mangle',
    'Rhizophora mangle (mangue-vermelho)',
    'Rhizophora mangle é engenheira de habitat em manguezais. Suas raízes escoras retêm sedimentos, reduzem erosão costeira e criam microhabitats para crustáceos, peixes juvenis e aves.',
    'pt-BR', 4, 'species', 'species-rhizophora-mangle',
    'src-sara-part1', 'SARA-PART1-2026',
    '{}'::jsonb, NOW(), TRUE
  ),
  (
    'gfact-species-acropora-palmata',
    'domain-environmental-ecology',
    'species',
    'acropora-palmata',
    'Acropora palmata (coral-corno-de-alce)',
    'Acropora palmata é coral construtor estrutural em recifes do Caribe. Criticamente ameaçado por branqueamento, doenças e acidificação oceânica; espécie-chave para restauração coralinea.',
    'pt-BR', 5, 'species', 'species-acropora-palmata',
    'src-ipbes-2019', 'IPBES-2019',
    '{}'::jsonb, NOW(), TRUE
  ),
  (
    'gfact-species-bertholletia-excelsa',
    'domain-environmental-ecology',
    'species',
    'bertholletia-excelsa',
    'Bertholletia excelsa (castanheira-do-brasil)',
    'Bertholletia excelsa é um símbolo da floresta amazônica, produtora de sementes nutritivas e dependente de polinizadores e dispersores especializados para regeneração. Vulnerável ao desmatamento.',
    'pt-BR', 4, 'species', 'species-bertholletia-excelsa',
    'src-sara-part1', 'SARA-PART1-2026',
    '{}'::jsonb, NOW(), TRUE
  )
ON CONFLICT (id) DO UPDATE SET
  fact_text = EXCLUDED.fact_text,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- ─── Additional grounding_facts: artificial projects ─────────────────────────

INSERT INTO grounding_facts (
  id, domain_id, category, slug, title, fact_text, language, importance,
  entity_table, entity_id, source_id, citation_key, metadata, verified_at, is_active
)
VALUES
  (
    'gfact-project-wetland-construida',
    'domain-environmental-ecology',
    'artificial-project',
    'wetland-construida',
    'Wetland construída',
    'Wetlands construídas combinam zonas de sedimentação, macrófitas e substrato filtrante para tratamento de água, amortecimento hidrológico e suporte a habitat semi-natural. Exigem controle de colmatação e espécies invasoras.',
    'pt-BR', 4, 'artificial_projects', 'project-wetland-construida',
    'src-sara-analytical-report', 'SARA-ANALYTICAL-2026',
    '{}'::jsonb, NOW(), TRUE
  ),
  (
    'gfact-project-restauracao-coral',
    'domain-environmental-ecology',
    'artificial-project',
    'restauracao-de-coral',
    'Restauração de coral',
    'Projetos de restauração coralinea usam viveiros de fragmentos, seleção genotípica e transplante para recuperar cobertura e diversidade em recifes degradados. A resiliência ao estresse térmico é critério-chave de seleção.',
    'pt-BR', 4, 'artificial_projects', 'project-restauracao-de-coral',
    'src-sara-analytical-report', 'SARA-ANALYTICAL-2026',
    '{}'::jsonb, NOW(), TRUE
  ),
  (
    'gfact-project-agrofloresta',
    'domain-environmental-ecology',
    'artificial-project',
    'agrofloresta-multiestrato',
    'Agrofloresta multiestrato',
    'Agroflorestas multiestrato imitam a estratificação e sucessão de florestas tropicais combinando produção alimentar com funções ecológicas como cobertura permanente, ciclagem de nutrientes e habitat.',
    'pt-BR', 4, 'artificial_projects', 'project-agrofloresta-multiestrato',
    'src-sara-analytical-report', 'SARA-ANALYTICAL-2026',
    '{}'::jsonb, NOW(), TRUE
  ),
  (
    'gfact-project-recife-artificial',
    'domain-environmental-ecology',
    'artificial-project',
    'recife-artificial',
    'Recife artificial',
    'Recifes artificiais são estruturas submersas instaladas para aumentar rugosidade, abrigo e colonização biológica em áreas com substrato pobre. Não substituem recifes naturais e podem atrair pesca excessiva se mal posicionados.',
    'pt-BR', 3, 'artificial_projects', 'project-recife-artificial',
    'src-sara-analytical-report', 'SARA-ANALYTICAL-2026',
    '{}'::jsonb, NOW(), TRUE
  )
ON CONFLICT (id) DO UPDATE SET
  fact_text = EXCLUDED.fact_text,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- ─── Additional grounding_facts: modeling approaches ─────────────────────────

INSERT INTO grounding_facts (
  id, domain_id, category, slug, title, fact_text, language, importance,
  entity_table, entity_id, source_id, citation_key, metadata, verified_at, is_active
)
VALUES
  (
    'gfact-model-procedural-terrain',
    'domain-environmental-ecology',
    'modeling-approach',
    'procedural-terrain-generation',
    'Geração procedural de terreno',
    'Geração procedural de terreno usa ruído de Perlin, Simplex ou valor-noise para criar gradientes contínuos de altitude, temperatura e umidade em cenários sintéticos. É uma ferramenta de exploração, não de predição ecológica validada.',
    'pt-BR', 4, 'modeling_approaches', 'model-procedural-terrain',
    'src-perlin-1985', 'PERLIN-1985',
    '{}'::jsonb, NOW(), TRUE
  ),
  (
    'gfact-model-agent-based',
    'domain-environmental-ecology',
    'modeling-approach',
    'agent-based-modeling',
    'Modelagem baseada em agentes (ABM)',
    'ABM ecológica representa agentes heterogêneos com regras locais para explorar comportamento emergente, dispersão e dinâmica de população. Requer validação cuidadosa com dados observacionais e pode demandar muitos parâmetros.',
    'pt-BR', 4, 'modeling_approaches', 'model-agent-based',
    'src-grimm-railsback-2005', 'GRIMM-RAILSBACK-2005',
    '{}'::jsonb, NOW(), TRUE
  ),
  (
    'gfact-model-digital-twin',
    'domain-environmental-ecology',
    'modeling-approach',
    'biodiversity-digital-twin',
    'Digital twin de biodiversidade',
    'Digital twins de biodiversidade integram observação de campo, modelos de simulação e interfaces de decisão para criar representações dinâmicas de ecossistemas. Alta demanda de dados e governança, mas forte potencial para tomada de decisão baseada em evidências.',
    'pt-BR', 5, 'modeling_approaches', 'model-digital-twin',
    'src-sara-analytical-report', 'SARA-ANALYTICAL-2026',
    '{}'::jsonb, NOW(), TRUE
  ),
  (
    'gfact-model-generative-ai',
    'domain-environmental-ecology',
    'modeling-approach',
    'generative-ai-for-ecology',
    'IA generativa para suporte ecológico',
    'IA generativa pode sumarizar, explicar e gerar hipóteses condicionadas a dados ecológicos, mas não deve ser usada como fonte primária de dados. O grounding em banco de dados científicos é essencial para evitar alucinação e garantir rastreabilidade.',
    'pt-BR', 5, 'modeling_approaches', 'model-generative-ai-support',
    'src-sara-analytical-report', 'SARA-ANALYTICAL-2026',
    '{}'::jsonb, NOW(), TRUE
  ),
  (
    'gfact-model-simplified-climate',
    'domain-environmental-ecology',
    'modeling-approach',
    'simplified-climate-simulation',
    'Simulação climática simplificada',
    'Modelos climáticos simplificados usam regras heurísticas de temperatura, umidade e precipitação para mapeamento exploratório de biomas e cenários de sensibilidade. Não substituem GCMs (modelos de circulação geral) validados.',
    'pt-BR', 3, 'modeling_approaches', 'model-simplified-climate',
    'src-sara-part1', 'SARA-PART1-2026',
    '{}'::jsonb, NOW(), TRUE
  )
ON CONFLICT (id) DO UPDATE SET
  fact_text = EXCLUDED.fact_text,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- ─── Additional ecosystem_processes ──────────────────────────────────────────

INSERT INTO ecosystem_processes (
  id, ecosystem_id, formation_process_id, role_label, evidence_source_id, notes, is_primary, metadata
)
VALUES
  ('eprocess-caatinga-successional', 'ecosystem-caatinga', 'formation-successional', 'pulse-driven succession after rainfall', 'src-sara-part1', 'Na caatinga, a sucessão é pulsada por eventos de chuva irregulares.', TRUE, '{}'::jsonb),
  ('eprocess-mata-atlantica-successional', 'ecosystem-mata-atlantica', 'formation-successional', 'gap-phase regeneration', 'src-odum-barrett-2005', 'Clareiras e regeneração por dispersão são processos-chave na Mata Atlântica.', TRUE, '{}'::jsonb),
  ('eprocess-savana-successional', 'ecosystem-savana-tropical', 'formation-successional', 'fire-grass-tree dynamics', 'src-sara-part1', 'Dinâmica fogo-gramíneas-arbóreas regula a fisionomia da savana.', TRUE, '{}'::jsonb),
  ('eprocess-lago-sedimentary', 'ecosystem-lago', 'formation-sedimentary', 'sediment accumulation and nutrient cycling', 'src-sara-part1', 'Acumulação sedimentar regula estado trófico e transparência da água.', FALSE, '{}'::jsonb),
  ('eprocess-rio-fluvial-anthropic', 'ecosystem-rio', 'formation-anthropic-restorative', 'channelization and flow restoration', 'src-sara-analytical-report', 'Restauração hidrológica reverte impactos de canalização em rios urbanos.', FALSE, '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  ecosystem_id = EXCLUDED.ecosystem_id,
  formation_process_id = EXCLUDED.formation_process_id,
  role_label = EXCLUDED.role_label,
  notes = EXCLUDED.notes,
  is_primary = EXCLUDED.is_primary,
  metadata = EXCLUDED.metadata;

-- ─── Additional ecosystem_factors ────────────────────────────────────────────

INSERT INTO ecosystem_factors (
  id, ecosystem_id, abiotic_factor_id, typical_min, typical_max, unit, seasonality, notes, metadata
)
VALUES
  ('efactor-mata-atlantica-precipitation', 'ecosystem-mata-atlantica', 'abiotic-precipitation', 1200, 4000, 'mm/year', 'humid year-round with orographic variation', 'Alta umidade costeira e gradiente altitudinal geram diversidade microclimática.', '{}'::jsonb),
  ('efactor-mata-atlantica-humidity', 'ecosystem-mata-atlantica', 'abiotic-humidity', 70, 95, 'percent', 'high year-round', 'Alta umidade favorece epifitismo e diversidade fúngica.', '{}'::jsonb),
  ('efactor-recife-salinity', 'ecosystem-recife-de-coral', 'abiotic-salinity', 34, 37, 'PSU', 'stable', 'Salinidade relativamente constante é essencial para a fisiologia coralinea.', '{}'::jsonb),
  ('efactor-recife-ph', 'ecosystem-recife-de-coral', 'abiotic-ph', 7.9, 8.3, 'pH', 'varies with CO2', 'Acidificação oceânica reduz pH, comprometendo calcificação coralinea.', '{}'::jsonb),
  ('efactor-caatinga-temperature', 'ecosystem-caatinga', 'abiotic-temperature', 20, 38, 'C', 'high year-round', 'Alta temperatura e variação diurna intensa.', '{}'::jsonb),
  ('efactor-cerrado-temperature', 'ecosystem-cerrado', 'abiotic-temperature', 18, 28, 'C', 'seasonal', 'Temperatura moderada com estação seca marcada.', '{}'::jsonb),
  ('efactor-cerrado-ph', 'ecosystem-cerrado', 'abiotic-ph', 4, 5.5, 'pH', 'year-round', 'Solos ácidos com alumínio elevado são característicos do Cerrado.', '{"typical":"dystrophic ferralsols"}'::jsonb),
  ('efactor-pantanal-nutrients', 'ecosystem-pantanal', 'abiotic-nutrients', NULL, NULL, 'mg/L', 'seasonal', 'Exportação e redistribuição de nutrientes pelos pulsos de inundação.', '{}'::jsonb),
  ('efactor-caverna-temperature', 'ecosystem-caverna-subterranea', 'abiotic-temperature', 10, 22, 'C', 'remarkably stable', 'Temperatura subterrânea é próxima à média anual da superfície sobrejacente.', '{}'::jsonb),
  ('efactor-tundra-temperature', 'ecosystem-tundra', 'abiotic-temperature', -20, 10, 'C', 'high seasonality', 'Curta estação de crescimento com degelo sazonal da camada ativa.', '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  ecosystem_id = EXCLUDED.ecosystem_id,
  abiotic_factor_id = EXCLUDED.abiotic_factor_id,
  typical_min = EXCLUDED.typical_min,
  typical_max = EXCLUDED.typical_max,
  unit = EXCLUDED.unit,
  seasonality = EXCLUDED.seasonality,
  notes = EXCLUDED.notes,
  metadata = EXCLUDED.metadata;

-- ─── Additional biotic interactions ──────────────────────────────────────────

INSERT INTO biotic_interactions (
  id, domain_id, interaction_type, source_species_id, target_species_id,
  source_ecosystem_id, target_ecosystem_id, description, interaction_strength, source_id, metadata
)
VALUES
  (
    'interaction-bertholletia-mutualism',
    'domain-environmental-ecology',
    'mutualism',
    'species-bertholletia-excelsa', NULL,
    'ecosystem-floresta-tropical-umida', NULL,
    'Bertholletia excelsa depende de abelhas grandes (Eulaema sp.) para polinização e da cotia (Dasyprocta sp.) para dispersão de sementes. Mutualismo obrigatório com dispersores especializados.',
    0.85,
    'src-sara-part1',
    '{"type":"pollination-dispersal-mutualism"}'::jsonb
  ),
  (
    'interaction-sphagnum-engineering-tundra',
    'domain-environmental-ecology',
    'engineering',
    'species-sphagnum-fuscum', NULL,
    'ecosystem-tundra', NULL,
    'Sphagnum fuscum retém água e abranda decomposição por acidificação, construindo e mantendo turfeiras na tundra úmida.',
    0.88,
    'src-sara-part1',
    '{"type":"peat-formation"}'::jsonb
  ),
  (
    'interaction-phragmites-competition',
    'domain-environmental-ecology',
    'competition',
    'species-phragmites-australis', NULL,
    'ecosystem-estuario', NULL,
    'Phragmites australis pode suprimir espécies nativas de zonas úmidas em contextos de invasão, alterando a estrutura da vegetação marginal por competição por luz e espaço.',
    0.65,
    'src-sara-part1',
    '{"note":"invasive lineage context-dependent"}'::jsonb
  )
ON CONFLICT (id) DO UPDATE SET
  description = EXCLUDED.description,
  interaction_strength = EXCLUDED.interaction_strength,
  source_id = EXCLUDED.source_id,
  metadata = EXCLUDED.metadata;

-- ─── Additional project metrics ───────────────────────────────────────────────

INSERT INTO project_metrics (id, project_id, metric_id, target_description, target_value, unit, notes, metadata)
VALUES
  ('pmetric-wetland-diversity', 'project-wetland-construida', 'metric-species-richness', 'Aumentar riqueza de macrófitas e invertebrados aquáticos', NULL, 'count', 'Indicador funcional de maturação da wetland.', '{}'::jsonb),
  ('pmetric-coral-diversity', 'project-restauracao-de-coral', 'metric-shannon-diversity', 'Recuperar diversidade trófica do recife', NULL, 'index', 'Índice de Shannon para peixes recifais.', '{}'::jsonb),
  ('pmetric-agroforestry-carbon', 'project-agrofloresta-multiestrato', 'metric-soil-organic-carbon', 'Elevar carbono orgânico do solo', 3, 'percent', 'Meta operacional após 5 anos de manejo.', '{}'::jsonb),
  ('pmetric-reef-connectivity', 'project-recife-artificial', 'metric-habitat-connectivity', 'Aumentar conectividade funcional entre fragmentos recifais', NULL, 'index', 'Avaliado por telemetria de peixes.', '{}'::jsonb),
  ('pmetric-syntropic-biomass', 'project-agricultura-sintropica', 'metric-aboveground-biomass', 'Elevar biomassa aérea por manejo de poda', NULL, 'Mg/ha', 'Proxy de produtividade e ciclagem.', '{}'::jsonb),
  ('pmetric-urban-npp', 'project-parque-urbano-restaurado', 'metric-net-primary-productivity', 'Aumentar produtividade primária do fragmento restaurado', NULL, 'gC/m2/year', 'Estimado por sensoriamento remoto.', '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  target_description = EXCLUDED.target_description,
  target_value = EXCLUDED.target_value,
  unit = EXCLUDED.unit,
  notes = EXCLUDED.notes,
  metadata = EXCLUDED.metadata;

-- ─── Additional ecosystem_species ─────────────────────────────────────────────

INSERT INTO ecosystem_species (
  id, ecosystem_id, species_id, trophic_role_id, ecological_function, native_status, abundance_qualifier, notes, metadata
)
VALUES
  (
    'es-caryocar-cerrado-part2',
    'ecosystem-cerrado', 'species-caryocar-brasiliense', 'trophic-primary-producer',
    'Espécie produtora de frutos com alta importância cultural e para fauna frugívora.',
    'native', 'locally important',
    'O pequi é um recurso alimentar crítico e indicador do Cerrado típico.',
    '{}'::jsonb
  ),
  (
    'es-sphagnum-taiga-part2',
    'ecosystem-taiga', 'species-sphagnum-fuscum', 'trophic-primary-producer',
    'Acumulação de turfa e retenção de carbono em florestas boreais.',
    'native', 'common',
    'Presente em depressões úmidas e beiras de lagos boreais.',
    '{}'::jsonb
  ),
  (
    'es-bertholletia-amazon',
    'ecosystem-floresta-tropical-umida', 'species-bertholletia-excelsa', 'trophic-primary-producer',
    'Produção de castanhas e estrutura de dossel amazônico.',
    'native', 'locally important',
    'Dependente de polinizadores e dispersores de sementes especializados.',
    '{}'::jsonb
  )
ON CONFLICT (id) DO UPDATE SET
  trophic_role_id = EXCLUDED.trophic_role_id,
  ecological_function = EXCLUDED.ecological_function,
  native_status = EXCLUDED.native_status,
  notes = EXCLUDED.notes,
  metadata = EXCLUDED.metadata;

-- ─── Track this seed in schema_migrations ────────────────────────────────────

INSERT INTO schema_migrations (version, applied_at)
VALUES ('006_seed_ecological_part2', NOW())
ON CONFLICT (version) DO NOTHING;
