-- Environmental ecology foundation seed
-- Idempotent structural seed for local and development environments.

INSERT INTO domains (id, slug, title, description, is_active)
VALUES (
  'domain-environmental-ecology',
  'environmental_ecology',
  'Environmental Ecology',
  'Dominio cientifico para ecossistemas reais, restauracao, biodiversidade, fatores abioticos e modelagem ecologica aplicada.',
  TRUE
)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

INSERT INTO sources (
  id, domain_id, citation_key, title, source_type, publisher, authors, year, doi, url, language, abstract_text, metadata, is_active
)
VALUES
  (
    'src-sara-part1',
    'domain-environmental-ecology',
    'SARA-PART1-2026',
    'Sara Core Environmental Ecology Foundation - Part 1',
    'internal_document',
    'Sara Core',
    '["Sara Core Team"]'::jsonb,
    2026,
    NULL,
    NULL,
    'pt-BR',
    'Documento interno que consolida definicoes operacionais, taxonomias e o schema relacional para ecologia ambiental grounded.',
    '{"kind":"internal-foundation","scope":"schema-and-taxonomy"}'::jsonb,
    TRUE
  ),
  (
    'src-sara-analytical-report',
    'domain-environmental-ecology',
    'SARA-ANALYTICAL-2026',
    'Sara Core Ecological Grounding Analytical Report',
    'internal_document',
    'Sara Core',
    '["Sara Core Team"]'::jsonb,
    2026,
    NULL,
    NULL,
    'pt-BR',
    'Relatorio interno que recomenda separar o dominio environmental_ecology, adotar categorias semanticas restritas e reforcar proveniencia cientifica.',
    '{"kind":"internal-analytical-report","scope":"grounding-and-data-governance"}'::jsonb,
    TRUE
  ),
  (
    'src-odum-barrett-2005',
    'domain-environmental-ecology',
    'ODUM-BARRETT-2005',
    'Fundamentals of Ecology',
    'book',
    'Thomson Brooks/Cole',
    '["Eugene P. Odum","Gary W. Barrett"]'::jsonb,
    2005,
    NULL,
    'https://www.cengage.com/c/fundamentals-of-ecology-5e-odum/',
    'en',
    'Texto de referencia sobre estrutura e funcao de ecossistemas, fluxo de energia e ciclos biogeoquimicos.',
    '{"edition":"5th"}'::jsonb,
    TRUE
  ),
  (
    'src-whittaker-1975',
    'domain-environmental-ecology',
    'WHITTAKER-1975',
    'Communities and Ecosystems',
    'book',
    'Macmillan',
    '["Robert H. Whittaker"]'::jsonb,
    1975,
    NULL,
    NULL,
    'en',
    'Referencia classica para gradientes de vegetacao, biomas e ecologia de comunidades.',
    '{"edition":"2nd"}'::jsonb,
    TRUE
  ),
  (
    'src-holdridge-1967',
    'domain-environmental-ecology',
    'HOLDRIDGE-1967',
    'Life Zone Ecology',
    'book',
    'Tropical Science Center',
    '["Leslie R. Holdridge"]'::jsonb,
    1967,
    NULL,
    'https://books.google.com/books?id=7sM1AAAAIAAJ',
    'en',
    'Obra-base para zonas de vida e relacoes entre biotemperatura, precipitacao e vegetacao potencial.',
    '{"edition":"Revised"}'::jsonb,
    TRUE
  ),
  (
    'src-kottek-2006',
    'domain-environmental-ecology',
    'KOTTEK-2006',
    'World Map of the Koppen-Geiger Climate Classification Updated',
    'article',
    'Meteorologische Zeitschrift',
    '["Markus Kottek","J. Grieser","C. Beck","B. Rudolf","F. Rubel"]'::jsonb,
    2006,
    '10.1127/0941-2948/2006/0130',
    'https://doi.org/10.1127/0941-2948/2006/0130',
    'en',
    'Atualizacao amplamente usada da classificacao climatica de Koppen-Geiger.',
    '{"journal":"Meteorologische Zeitschrift"}'::jsonb,
    TRUE
  ),
  (
    'src-olson-2001',
    'domain-environmental-ecology',
    'OLSON-2001',
    'Terrestrial Ecoregions of the World: A New Map of Life on Earth',
    'article',
    'BioScience',
    '["David M. Olson","Eric Dinerstein","Eric D. Wikramanayake","Neil D. Burgess","George V. N. Powell","Emma C. Underwood","Jennifer A. D''amico","Itoua Illanga","Hedao P. Strand","John C. Morrison","Colby J. Loucks","Thomas F. Allnutt","Taylor H. Ricketts","Yongsheng Kura","John F. Lamoreux","Wesley W. Wettengel","Prashant Hedao","Kenneth R. Kassem"]'::jsonb,
    2001,
    '10.1641/0006-3568(2001)051[0933:TEOTWA]2.0.CO;2',
    'https://doi.org/10.1641/0006-3568(2001)051[0933:TEOTWA]2.0.CO;2',
    'en',
    'Mapa e estrutura conceitual amplamente usados para ecorregioes terrestres globais.',
    '{"journal":"BioScience"}'::jsonb,
    TRUE
  ),
  (
    'src-holling-1973',
    'domain-environmental-ecology',
    'HOLLING-1973',
    'Resilience and Stability of Ecological Systems',
    'article',
    'Annual Review of Ecology and Systematics',
    '["C. S. Holling"]'::jsonb,
    1973,
    '10.1146/annurev.es.04.110173.000245',
    'https://doi.org/10.1146/annurev.es.04.110173.000245',
    'en',
    'Artigo classico que diferencia resiliencia e estabilidade em sistemas ecologicos.',
    '{"journal":"Annual Review of Ecology and Systematics"}'::jsonb,
    TRUE
  ),
  (
    'src-millennium-2005',
    'domain-environmental-ecology',
    'MEA-2005',
    'Millennium Ecosystem Assessment: Ecosystems and Human Well-being',
    'report',
    'Island Press',
    '["Millennium Ecosystem Assessment"]'::jsonb,
    2005,
    NULL,
    'https://www.millenniumassessment.org/en/index.html',
    'en',
    'Relatorio de referencia sobre servicos ecossistemicos e mudancas ecologicas globais.',
    '{"series":"Synthesis"}'::jsonb,
    TRUE
  ),
  (
    'src-ipbes-2019',
    'domain-environmental-ecology',
    'IPBES-2019',
    'Global Assessment Report on Biodiversity and Ecosystem Services',
    'report',
    'IPBES',
    '["IPBES"]'::jsonb,
    2019,
    '10.5281/zenodo.3831673',
    'https://doi.org/10.5281/zenodo.3831673',
    'en',
    'Avaliacao global sobre biodiversidade, pressao antropica e trajetorias de conservacao.',
    '{"series":"Global Assessment"}'::jsonb,
    TRUE
  ),
  (
    'src-prusinkiewicz-1990',
    'domain-environmental-ecology',
    'PRUSINKIEWICZ-1990',
    'The Algorithmic Beauty of Plants',
    'book',
    'Springer',
    '["Przemyslaw Prusinkiewicz","Aristid Lindenmayer"]'::jsonb,
    1990,
    '10.1007/978-1-4613-8476-2',
    'https://doi.org/10.1007/978-1-4613-8476-2',
    'en',
    'Obra classica sobre L-systems e modelagem procedural de estruturas vegetais.',
    '{"series":"The Virtual Laboratory"}'::jsonb,
    TRUE
  ),
  (
    'src-perlin-1985',
    'domain-environmental-ecology',
    'PERLIN-1985',
    'An Image Synthesizer',
    'article',
    'SIGGRAPH',
    '["Ken Perlin"]'::jsonb,
    1985,
    '10.1145/325165.325247',
    'https://doi.org/10.1145/325165.325247',
    'en',
    'Artigo seminal do ruido de Perlin, importante para geracao procedural de terreno e heterogeneidade espacial.',
    '{"conference":"SIGGRAPH 1985"}'::jsonb,
    TRUE
  ),
  (
    'src-grimm-railsback-2005',
    'domain-environmental-ecology',
    'GRIMM-RAILSBACK-2005',
    'Individual-based Modeling and Ecology',
    'book',
    'Princeton University Press',
    '["Volker Grimm","Steven F. Railsback"]'::jsonb,
    2005,
    NULL,
    'https://press.princeton.edu/books/paperback/9780691096667/individual-based-modeling-and-ecology',
    'en',
    'Referencia para modelagem baseada em agentes e individuos em ecologia.',
    '{}'::jsonb,
    TRUE
  ),
  (
    'src-sutton-barto-2018',
    'domain-environmental-ecology',
    'SUTTON-BARTO-2018',
    'Reinforcement Learning: An Introduction',
    'book',
    'MIT Press',
    '["Richard S. Sutton","Andrew G. Barto"]'::jsonb,
    2018,
    NULL,
    'http://incompleteideas.net/book/the-book-2nd.html',
    'en',
    'Base conceitual para RL, util para priorizacao adaptativa em planejamento ecológico e manejo.',
    '{"edition":"2nd"}'::jsonb,
    TRUE
  ),
  (
    'src-okabe-2000',
    'domain-environmental-ecology',
    'OKABE-2000',
    'Spatial Tessellations: Concepts and Applications of Voronoi Diagrams',
    'book',
    'Wiley',
    '["Atsuyuki Okabe","Barry Boots","Kokichi Sugihara","Sung Nok Chiu"]'::jsonb,
    2000,
    NULL,
    'https://onlinelibrary.wiley.com/doi/book/10.1002/9780470317013',
    'en',
    'Referencia para tesselações e aplicacoes espaciais baseadas em Voronoi.',
    '{"edition":"2nd"}'::jsonb,
    TRUE
  )
ON CONFLICT (id) DO UPDATE SET
  domain_id = EXCLUDED.domain_id,
  citation_key = EXCLUDED.citation_key,
  title = EXCLUDED.title,
  source_type = EXCLUDED.source_type,
  publisher = EXCLUDED.publisher,
  authors = EXCLUDED.authors,
  year = EXCLUDED.year,
  doi = EXCLUDED.doi,
  url = EXCLUDED.url,
  language = EXCLUDED.language,
  abstract_text = EXCLUDED.abstract_text,
  metadata = EXCLUDED.metadata,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

INSERT INTO source_topics (source_id, topic_slug, topic_label, topic_notes)
VALUES
  ('src-sara-part1', 'schema-relacional', 'Schema relacional', 'Fundamentacao estrutural do dominio environmental_ecology.'),
  ('src-sara-part1', 'taxonomias-ecologicas', 'Taxonomias ecologicas', 'Enums, classificacoes e entidades cientificas.'),
  ('src-sara-analytical-report', 'governanca-semantica', 'Governanca semantica', 'Separacao entre ecologia e contexto interno de software.'),
  ('src-sara-analytical-report', 'grounding-com-proveniencia', 'Grounding com proveniencia', 'Recomendacoes de fonte e metadados cientificos.'),
  ('src-odum-barrett-2005', 'fundamentos-de-ecossistemas', 'Fundamentos de ecossistemas', 'Fluxo de energia e ciclos biogeoquimicos.'),
  ('src-whittaker-1975', 'biomas', 'Biomas', 'Classificacao ampla de biomas e gradientes.'),
  ('src-holdridge-1967', 'zonas-de-vida', 'Zonas de vida', 'Holdridge life zones.'),
  ('src-kottek-2006', 'clima-koppen', 'Clima Koppen-Geiger', 'Classificacao climatica global.'),
  ('src-olson-2001', 'ecorregioes', 'Ecorregioes', 'Ecoregioes terrestres globais.'),
  ('src-holling-1973', 'resiliencia', 'Resiliencia', 'Resistencia, resiliencia e estados alternativos.'),
  ('src-millennium-2005', 'servicos-ecossistemicos', 'Servicos ecossistemicos', 'Ligacao entre ecologia e bem-estar humano.'),
  ('src-ipbes-2019', 'ameacas-a-biodiversidade', 'Ameacas a biodiversidade', 'Drivers antropicos e restauracao.'),
  ('src-prusinkiewicz-1990', 'l-systems', 'L-systems', 'Modelagem vegetal procedural.'),
  ('src-perlin-1985', 'ruido-procedural', 'Ruido procedural', 'Perlin e heterogeneidade espacial.'),
  ('src-grimm-railsback-2005', 'agent-based-modeling', 'Modelagem baseada em agentes', 'ABM ecologico.'),
  ('src-sutton-barto-2018', 'reinforcement-learning', 'Reinforcement learning', 'Priorizacao adaptativa e decisao sequencial.'),
  ('src-okabe-2000', 'voronoi', 'Voronoi', 'Particionamento espacial e bioregioes.')
ON CONFLICT (source_id, topic_slug) DO UPDATE SET
  topic_label = EXCLUDED.topic_label,
  topic_notes = EXCLUDED.topic_notes;

INSERT INTO biomes (id, slug, title, whittaker_group, climate_signature, description, metadata)
VALUES
  ('biome-tropical-rain-forest', 'tropical-rain-forest', 'Floresta tropical umida', 'Whittaker tropical forest', 'Alta temperatura e alta precipitacao', 'Bioma de alta produtividade e forte estratificacao vertical.', '{}'::jsonb),
  ('biome-tropical-seasonal-forest', 'tropical-seasonal-forest', 'Floresta tropical seca', 'Whittaker tropical seasonal forest', 'Temperatura alta com estacao seca marcada', 'Bioma com deciduidade parcial e forte sazonalidade hidrica.', '{}'::jsonb),
  ('biome-tropical-savanna', 'tropical-savanna', 'Savana tropical', 'Whittaker tropical savanna', 'Clima tropical sazonal com fogo recorrente', 'Bioma de matriz herbacea e arvores esparsas.', '{}'::jsonb),
  ('biome-mediterranean-shrubland', 'mediterranean-shrubland', 'Chaparral mediterraneo', 'Whittaker woodland/shrubland', 'Verao seco e inverno chuvoso', 'Bioma arbustivo adaptado a seca e fogo.', '{}'::jsonb),
  ('biome-temperate-grassland', 'temperate-grassland', 'Pradaria e estepe', 'Whittaker temperate grassland', 'Clima temperado com chuvas moderadas', 'Bioma dominado por gramíneas e variabilidade interanual.', '{}'::jsonb),
  ('biome-temperate-forest', 'temperate-forest', 'Floresta temperada', 'Whittaker temperate forest', 'Temperatura moderada e estacoes definidas', 'Bioma florestal de media latitude.', '{}'::jsonb),
  ('biome-boreal-forest', 'boreal-forest', 'Taiga', 'Whittaker boreal forest', 'Invernos longos e frios', 'Bioma dominado por coniferas de alta latitude.', '{}'::jsonb),
  ('biome-tundra', 'tundra', 'Tundra', 'Whittaker tundra', 'Baixa temperatura e curta estacao de crescimento', 'Bioma com vegetacao rasteira e permafrost frequente.', '{}'::jsonb),
  ('biome-hot-desert', 'hot-desert', 'Deserto quente', 'Whittaker subtropical desert', 'Altas temperaturas e baixa precipitacao', 'Bioma xerico com alta evaporacao.', '{}'::jsonb),
  ('biome-cold-desert', 'cold-desert', 'Deserto frio', 'Whittaker temperate desert', 'Baixa umidade e inverno frio', 'Bioma arido de interior continental ou alta altitude.', '{}'::jsonb),
  ('biome-freshwater', 'freshwater', 'Agua doce continental', 'Hydrological extension', 'Hidrologia dominante', 'Conjunto de ecossistemas loticos e lenticos de agua doce.', '{"extension":"non-whittaker"}'::jsonb),
  ('biome-coastal-wetland', 'coastal-wetland', 'Zona umida costeira', 'Hydrological extension', 'Influencia marinha, salinidade variavel e marés', 'Manguezais e estuarios como ecossistemas de transicao.', '{"extension":"non-whittaker"}'::jsonb),
  ('biome-marine-pelagic', 'marine-pelagic', 'Oceano pelagico', 'Marine extension', 'Coluna d''agua marinha aberta', 'Ecossistema marinho de larga escala controlado por luz, nutrientes e circulacao.', '{"extension":"non-whittaker"}'::jsonb),
  ('biome-marine-reef', 'marine-reef', 'Recife coralino', 'Marine extension', 'Aguas rasas quentes e claras', 'Ecossistema marinho estruturado por construtores biogenicos.', '{"extension":"non-whittaker"}'::jsonb),
  ('biome-subterranean', 'subterranean', 'Subterraneo', 'Subterranean extension', 'Baixa luz e forte dependencia do substrato', 'Ecossistemas cavernicolas com subsidio externo de energia.', '{"extension":"non-whittaker"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  title = EXCLUDED.title,
  whittaker_group = EXCLUDED.whittaker_group,
  climate_signature = EXCLUDED.climate_signature,
  description = EXCLUDED.description,
  metadata = EXCLUDED.metadata;

INSERT INTO climates_koppen (id, code, label, thermal_group, moisture_pattern, description)
VALUES
  ('climate-af', 'Af', 'Tropical rainforest', 'tropical', 'humid year-round', 'Clima tropical muito umido sem estacao seca definida.'),
  ('climate-am', 'Am', 'Tropical monsoon', 'tropical', 'short dry season', 'Clima tropical de moncao com pico chuvoso e breve seca.'),
  ('climate-aw', 'Aw', 'Tropical savanna', 'tropical', 'winter dry season', 'Clima tropical com seca sazonal pronunciada.'),
  ('climate-bwh', 'BWh', 'Hot desert', 'arid', 'desert', 'Clima desertico quente com precipitacao muito baixa.'),
  ('climate-bwk', 'BWk', 'Cold desert', 'arid', 'desert', 'Clima desertico frio de inverno severo.'),
  ('climate-bsh', 'BSh', 'Hot semi-arid', 'semi-arid', 'steppe', 'Clima semi-arido quente.'),
  ('climate-bsk', 'BSk', 'Cold semi-arid', 'semi-arid', 'steppe', 'Clima semi-arido frio.'),
  ('climate-csa', 'Csa', 'Hot-summer Mediterranean', 'temperate', 'summer dry', 'Clima mediterraneo de verao quente e seco.'),
  ('climate-cfa', 'Cfa', 'Humid subtropical', 'temperate', 'no dry season', 'Clima subtropical umido sem seca definida.'),
  ('climate-cfb', 'Cfb', 'Temperate oceanic', 'temperate', 'no dry season', 'Clima temperado oceanico de veroes amenos.'),
  ('climate-dfc', 'Dfc', 'Subarctic', 'cold', 'no dry season', 'Clima subartico com inverno longo.'),
  ('climate-et', 'ET', 'Tundra', 'polar', 'polar', 'Clima polar de tundra com verao curto.')
ON CONFLICT (id) DO UPDATE SET
  code = EXCLUDED.code,
  label = EXCLUDED.label,
  thermal_group = EXCLUDED.thermal_group,
  moisture_pattern = EXCLUDED.moisture_pattern,
  description = EXCLUDED.description;

INSERT INTO life_zones_holdridge (id, code, label, biotemperature_band, precipitation_band, pet_ratio_band, description)
VALUES
  ('lifezone-tropical-wet-forest', 'twf', 'Tropical wet forest', 'tropical', 'very humid', 'humid', 'Zona de vida de floresta tropical muito umida.'),
  ('lifezone-tropical-dry-forest', 'tdf', 'Tropical dry forest', 'tropical', 'seasonal dry', 'subhumid', 'Zona de vida de floresta tropical seca.'),
  ('lifezone-tropical-savanna', 'tsa', 'Tropical savanna woodland', 'tropical', 'seasonal', 'semiarid to subhumid', 'Zona de vida associada a savanas tropicais.'),
  ('lifezone-subtropical-thorn', 'sth', 'Subtropical thorn woodland', 'subtropical', 'semi-arid', 'semiarid', 'Zona de vida seca com vegetacao espinhosa.'),
  ('lifezone-warm-temperate-moist', 'wtm', 'Warm temperate moist forest', 'warm temperate', 'moist', 'humid', 'Zona de vida de florestas temperadas umidas.'),
  ('lifezone-cool-temperate-steppe', 'cts', 'Cool temperate steppe', 'cool temperate', 'semi-arid', 'semiarid', 'Zona de vida de pradarias e estepes frias.'),
  ('lifezone-boreal-moist', 'bom', 'Boreal moist forest', 'boreal', 'moist', 'humid', 'Zona de vida tipica de taiga.'),
  ('lifezone-subpolar-tundra', 'spt', 'Subpolar tundra', 'subpolar', 'dry to moist', 'humid cold', 'Zona de vida de tundra subpolar.'),
  ('lifezone-warm-desert', 'wde', 'Warm desert scrub', 'warm temperate to tropical', 'arid', 'arid', 'Zona de vida desertica quente.'),
  ('lifezone-coastal-brackish', 'cbr', 'Coastal brackish wetland', 'tropical to warm temperate', 'humid', 'humid', 'Adaptacao operacional para manguezais e estuarios.')
ON CONFLICT (id) DO UPDATE SET
  code = EXCLUDED.code,
  label = EXCLUDED.label,
  biotemperature_band = EXCLUDED.biotemperature_band,
  precipitation_band = EXCLUDED.precipitation_band,
  pet_ratio_band = EXCLUDED.pet_ratio_band,
  description = EXCLUDED.description;

INSERT INTO biogeographic_realms (id, slug, title, description)
VALUES
  ('realm-neotropical', 'neotropical', 'Neotropical', 'Reino biogeografico da America do Sul, America Central e Caribe tropical.'),
  ('realm-nearctic', 'nearctic', 'Nearctic', 'Reino biogeografico da maior parte da America do Norte.'),
  ('realm-palearctic', 'palearctic', 'Palearctic', 'Reino biogeografico da Europa, norte da Africa e grande parte da Asia temperada.'),
  ('realm-afrotropical', 'afrotropical', 'Afrotropical', 'Reino biogeografico da Africa subsaariana.'),
  ('realm-indomalayan', 'indomalayan', 'Indomalayan', 'Reino biogeografico do sul e sudeste da Asia.'),
  ('realm-australasian', 'australasian', 'Australasian', 'Reino biogeografico da Australia, Nova Guine e ilhas associadas.'),
  ('realm-oceanian', 'oceanian', 'Oceanian', 'Reino biogeografico de ilhas oceanicas do Pacifico.'),
  ('realm-antarctic', 'antarctic', 'Antarctic', 'Reino biogeografico das regioes polares austrais.')
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  title = EXCLUDED.title,
  description = EXCLUDED.description;

INSERT INTO trophic_roles (id, slug, label, trophic_level, description)
VALUES
  ('trophic-primary-producer', 'primary-producer', 'Primary producer', 1, 'Organismo autotrofico que converte energia luminosa ou quimica em biomassa.'),
  ('trophic-detritivore', 'detritivore', 'Detritivore', 2, 'Organismo que consome detritos organicos e particulados.'),
  ('trophic-decomposer', 'decomposer', 'Decomposer', 2, 'Organismo que mineraliza materia organica e fecha ciclos biogeoquimicos.'),
  ('trophic-herbivore', 'herbivore', 'Herbivore', 2, 'Consumidor primario de biomassa vegetal ou algal.'),
  ('trophic-omnivore', 'omnivore', 'Omnivore', 3, 'Consumidor com dieta mista de recursos vegetais e animais.'),
  ('trophic-mesopredator', 'mesopredator', 'Mesopredator', 4, 'Predador intermediario na rede trofica.'),
  ('trophic-apex-predator', 'apex-predator', 'Apex predator', 5, 'Predador de topo com poucos inimigos naturais.'),
  ('trophic-ecosystem-engineer', 'ecosystem-engineer', 'Ecosystem engineer', 3, 'Organismo que modifica fisicamente o habitat e afeta fluxos ecologicos.')
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  label = EXCLUDED.label,
  trophic_level = EXCLUDED.trophic_level,
  description = EXCLUDED.description;

INSERT INTO metrics (id, domain_id, slug, label, metric_type, unit_hint, description, metadata)
VALUES
  ('metric-species-richness', 'domain-environmental-ecology', 'species-richness', 'Species richness', 'biodiversity', 'count', 'Numero total de especies observadas em uma unidade espacial.', '{}'::jsonb),
  ('metric-shannon-diversity', 'domain-environmental-ecology', 'shannon-diversity', 'Shannon diversity', 'biodiversity', 'index', 'Indice que combina riqueza e equitatividade de especies.', '{}'::jsonb),
  ('metric-aboveground-biomass', 'domain-environmental-ecology', 'aboveground-biomass', 'Aboveground biomass', 'productivity', 'Mg/ha', 'Biomassa aerea por area.', '{}'::jsonb),
  ('metric-net-primary-productivity', 'domain-environmental-ecology', 'net-primary-productivity', 'Net primary productivity', 'productivity', 'gC/m2/year', 'Fluxo liquido de carbono fixado pela producao primaria.', '{}'::jsonb),
  ('metric-water-clarity', 'domain-environmental-ecology', 'water-clarity', 'Water clarity', 'water-quality', 'Secchi depth', 'Transparencia da coluna d''agua.', '{}'::jsonb),
  ('metric-dissolved-oxygen', 'domain-environmental-ecology', 'dissolved-oxygen', 'Dissolved oxygen', 'water-quality', 'mg/L', 'Disponibilidade de oxigenio dissolvido.', '{}'::jsonb),
  ('metric-soil-organic-carbon', 'domain-environmental-ecology', 'soil-organic-carbon', 'Soil organic carbon', 'soil', 'percent or Mg/ha', 'Estoque de carbono organico no solo.', '{}'::jsonb),
  ('metric-canopy-cover', 'domain-environmental-ecology', 'canopy-cover', 'Canopy cover', 'restoration', 'percent', 'Cobertura de dossel em ecossistemas florestais.', '{}'::jsonb),
  ('metric-habitat-connectivity', 'domain-environmental-ecology', 'habitat-connectivity', 'Habitat connectivity', 'connectivity', 'index', 'Conectividade estrutural ou funcional entre fragmentos.', '{}'::jsonb),
  ('metric-restoration-survival-rate', 'domain-environmental-ecology', 'restoration-survival-rate', 'Restoration survival rate', 'restoration', 'percent', 'Sobrevivencia de organismos ou estruturas implantadas em projetos.', '{}'::jsonb),
  ('metric-grounding-coverage', 'domain-environmental-ecology', 'grounding-coverage', 'Grounding coverage', 'grounding-quality', 'percent', 'Cobertura factual do dominio ambiental no banco.', '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  domain_id = EXCLUDED.domain_id,
  slug = EXCLUDED.slug,
  label = EXCLUDED.label,
  metric_type = EXCLUDED.metric_type,
  unit_hint = EXCLUDED.unit_hint,
  description = EXCLUDED.description,
  metadata = EXCLUDED.metadata;

INSERT INTO abiotic_factors (id, domain_id, slug, label, factor_group, unit_hint, description, metadata)
VALUES
  ('abiotic-temperature', 'domain-environmental-ecology', 'temperature', 'Temperature', 'climate', 'C', 'Gradiente termico que regula metabolismo, distribuicao de especies e sazonalidade.', '{}'::jsonb),
  ('abiotic-precipitation', 'domain-environmental-ecology', 'precipitation', 'Precipitation', 'climate', 'mm/year', 'Entrada hidrica atmosferica em forma de chuva, neve ou granizo.', '{}'::jsonb),
  ('abiotic-humidity', 'domain-environmental-ecology', 'humidity', 'Humidity', 'climate', 'percent', 'Disponibilidade relativa de vapor d''agua no ar.', '{}'::jsonb),
  ('abiotic-light', 'domain-environmental-ecology', 'light', 'Light', 'radiation', 'PAR or lux', 'Energia radiante disponivel para fotossintese e sinalizacao biologica.', '{}'::jsonb),
  ('abiotic-salinity', 'domain-environmental-ecology', 'salinity', 'Salinity', 'chemistry', 'PSU', 'Concentracao de sais dissolvidos, critica em sistemas costeiros e marinhos.', '{}'::jsonb),
  ('abiotic-ph', 'domain-environmental-ecology', 'ph', 'pH', 'chemistry', 'pH', 'Acidez ou alcalinidade do meio.', '{}'::jsonb),
  ('abiotic-nutrients', 'domain-environmental-ecology', 'nutrients', 'Nutrients', 'chemistry', 'mg/L or mg/kg', 'Disponibilidade de nitrogenio, fosforo e outros nutrientes essenciais.', '{}'::jsonb),
  ('abiotic-soil', 'domain-environmental-ecology', 'soil', 'Soil', 'edaphic', 'qualitative', 'Composicao, textura, profundidade e fertilidade do solo.', '{}'::jsonb),
  ('abiotic-topography', 'domain-environmental-ecology', 'topography', 'Topography', 'topography', 'qualitative', 'Declive, altitude e relevo que modulam drenagem e microclima.', '{}'::jsonb),
  ('abiotic-hydrology', 'domain-environmental-ecology', 'hydrology', 'Hydrology', 'hydrology', 'qualitative', 'Fluxos, pulsos e conectividade da agua no sistema.', '{}'::jsonb),
  ('abiotic-hydroperiod', 'domain-environmental-ecology', 'hydroperiod', 'Hydroperiod', 'hydrology', 'days/year', 'Duracao e frequencia de alagamento ou inundacao.', '{}'::jsonb),
  ('abiotic-conductivity', 'domain-environmental-ecology', 'conductivity', 'Conductivity', 'chemistry', 'uS/cm', 'Proxy para ions dissolvidos em agua ou solo saturado.', '{}'::jsonb),
  ('abiotic-substrate', 'domain-environmental-ecology', 'substrate', 'Substrate', 'substrate', 'qualitative', 'Base fisica de suporte como rocha, sedimento, turfa ou carbonato.', '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  domain_id = EXCLUDED.domain_id,
  slug = EXCLUDED.slug,
  label = EXCLUDED.label,
  factor_group = EXCLUDED.factor_group,
  unit_hint = EXCLUDED.unit_hint,
  description = EXCLUDED.description,
  metadata = EXCLUDED.metadata;

INSERT INTO formation_processes (id, domain_id, slug, label, process_family, temporal_scale, description, metadata)
VALUES
  ('formation-glacial-postglacial', 'domain-environmental-ecology', 'glacial-postglacial', 'Glacial and post-glacial', 'cryogenic', 'millennial', 'Processos de gelo, degelo, deposicao e reorganizacao de solos e hidrologia apos glaciacoes.', '{}'::jsonb),
  ('formation-volcanic', 'domain-environmental-ecology', 'volcanic', 'Volcanic', 'geological', 'centennial to millennial', 'Formacao sobre lava, cinzas ou subsidios vulcanicos recentes.', '{}'::jsonb),
  ('formation-sedimentary', 'domain-environmental-ecology', 'sedimentary', 'Sedimentary', 'geological', 'millennial', 'Acumulacao de sedimentos finos, materia organica e consolidacao de substratos.', '{}'::jsonb),
  ('formation-fluvial', 'domain-environmental-ecology', 'fluvial', 'Fluvial', 'hydrogeomorphic', 'seasonal to millennial', 'Moldado por erosao, transporte e deposicao em rios e planicies aluviais.', '{}'::jsonb),
  ('formation-marine-coastal', 'domain-environmental-ecology', 'marine-coastal', 'Marine coastal', 'hydrogeomorphic', 'seasonal to millennial', 'Estruturado por marés, ondas, salinidade e sedimentos costeiros.', '{}'::jsonb),
  ('formation-successional', 'domain-environmental-ecology', 'successional', 'Successional', 'ecological', 'annual to centennial', 'Processo de colonizacao, substituicao e reorganizacao de comunidades biologicas.', '{}'::jsonb),
  ('formation-anthropic-restorative', 'domain-environmental-ecology', 'anthropic-restorative', 'Anthropic restorative', 'intervention', 'annual to decadal', 'Transformacoes dirigidas por restauracao, reabilitacao ou engenharia ecologica.', '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  domain_id = EXCLUDED.domain_id,
  slug = EXCLUDED.slug,
  label = EXCLUDED.label,
  process_family = EXCLUDED.process_family,
  temporal_scale = EXCLUDED.temporal_scale,
  description = EXCLUDED.description,
  metadata = EXCLUDED.metadata;

INSERT INTO restoration_methods (id, domain_id, slug, label, method_family, description, caution_notes, metadata)
VALUES
  ('method-ecological-restoration', 'domain-environmental-ecology', 'ecological-restoration', 'Ecological restoration', 'restoration', 'Recupera estrutura, funcao e trajetorias ecologicas de um ecossistema degradado.', 'Exige referencia ecologica e monitoramento de longo prazo.', '{}'::jsonb),
  ('method-rehabilitation', 'domain-environmental-ecology', 'rehabilitation', 'Rehabilitation', 'rehabilitation', 'Recupera parte das funcoes sem necessariamente reconstruir o estado historico.', 'Nao deve ser confundida com restauracao integral.', '{}'::jsonb),
  ('method-agroforestry-design', 'domain-environmental-ecology', 'agroforestry-design', 'Agroforestry design', 'agroecology', 'Combina estratos vegetais e producao agricola inspirada em sucessao e ciclagem de nutrientes.', 'Precisa evitar simplificacao excessiva da diversidade funcional.', '{}'::jsonb),
  ('method-hydrological-reconnection', 'domain-environmental-ecology', 'hydrological-reconnection', 'Hydrological reconnection', 'restoration', 'Reestabelece pulsos hidrologicos, conectividade lateral ou fluxo mareal.', 'Fundamental em zonas umidas e planicies alagaveis.', '{}'::jsonb),
  ('method-coral-fragmentation', 'domain-environmental-ecology', 'coral-fragmentation', 'Coral fragmentation and nurseries', 'restoration', 'Propagacao de corais por fragmentos, viveiros e posterior transplante.', 'Demanda escolha cuidadosa de genotipos e manejo termico.', '{}'::jsonb),
  ('method-assisted-natural-regeneration', 'domain-environmental-ecology', 'assisted-natural-regeneration', 'Assisted natural regeneration', 'restoration', 'Protege nucleos e bancos de propágulos para acelerar a regeneracao natural.', 'Depende de pressao de disturbio reduzida.', '{}'::jsonb),
  ('method-wetland-construction', 'domain-environmental-ecology', 'wetland-construction', 'Constructed wetland design', 'constructed-system', 'Cria zonas umidas funcionais para tratamento, habitat e amortecimento hidrologico.', 'Projeto inadequado pode gerar colmatação ou emissões elevadas.', '{}'::jsonb),
  ('method-biomimetic-substrate', 'domain-environmental-ecology', 'biomimetic-substrate', 'Biomimetic substrate design', 'biomimicry', 'Usa materiais e geometrias inspiradas na natureza para favorecer colonizacao ecologica.', 'Nao substitui condicoes ambientais adequadas.', '{}'::jsonb),
  ('method-urban-rewilding', 'domain-environmental-ecology', 'urban-rewilding', 'Urban rewilding', 'urban-ecology', 'Amplia heterogeneidade, conectividade e autonomizacao parcial de areas urbanas.', 'Precisa conciliar seguranca, governanca e conflito de uso.', '{}'::jsonb),
  ('method-syntropic-management', 'domain-environmental-ecology', 'syntropic-management', 'Syntropic management', 'agroecology', 'Manejo baseado em sucessao, poda e incremento de biomassa.', 'Nao deve ser tratado como solucao unica para todo contexto socioecologico.', '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  domain_id = EXCLUDED.domain_id,
  slug = EXCLUDED.slug,
  label = EXCLUDED.label,
  method_family = EXCLUDED.method_family,
  description = EXCLUDED.description,
  caution_notes = EXCLUDED.caution_notes,
  metadata = EXCLUDED.metadata;

INSERT INTO modeling_approaches (
  id, domain_id, slug, title, family, description, primary_use, strengths, limitations, caution_notes, source_id, metadata
)
VALUES
  ('model-agent-based', 'domain-environmental-ecology', 'agent-based-modeling', 'Agent-based modeling', 'agent-based-modeling', 'Representa agentes heterogeneos e suas interacoes locais ao longo do tempo.', 'Explorar comportamento emergente, dispersao e decisao individual.', 'Captura heterogeneidade e nao linearidade local.', 'Pode exigir muitos parametros e validacao cuidadosa.', 'Nao substitui dados observacionais.', 'src-grimm-railsback-2005', '{}'::jsonb),
  ('model-procedural-terrain', 'domain-environmental-ecology', 'procedural-terrain-generation', 'Procedural terrain generation', 'procedural-generation', 'Gera superficies e heterogeneidade espacial de forma algoritimica.', 'Criacao de cenarios sinteticos e paisagens virtuais.', 'Rapido para explorar gradientes e cenarios.', 'Nao e uma representacao ecologica valida por si so.', 'Precisa ser condicionado por regras ambientais.', 'src-perlin-1985', '{}'::jsonb),
  ('model-perlin-simplex', 'domain-environmental-ecology', 'perlin-simplex', 'Perlin and Simplex noise', 'procedural-generation', 'Familia de ruidos usada para padroes continuos em terreno, umidade e vegetacao.', 'Campos espaciais continuos em simulacoes.', 'Bom custo-beneficio computacional.', 'Pode gerar artefatos se usado isoladamente.', 'Nao deve ser confundido com mecanismo ecologico.', 'src-perlin-1985', '{}'::jsonb),
  ('model-voronoi-bioregions', 'domain-environmental-ecology', 'voronoi-bioregions', 'Voronoi bioregions', 'geospatial-modeling', 'Particiona o espaco em regioes de proximidade para representar nucleos, bacias ou mosaicos.', 'Regionalizacao espacial e territorial.', 'Intuitivo para fronteiras e influencias.', 'Sozinho nao representa processo ecologico.', 'Precisa ser combinado com dados ambientais.', 'src-okabe-2000', '{}'::jsonb),
  ('model-l-systems', 'domain-environmental-ecology', 'l-systems', 'L-systems', 'procedural-generation', 'Sistemas gramaticais para crescimento de estruturas vegetais e padroes ramificados.', 'Arquitetura vegetal e simulacao de formas biologicas.', 'Representa crescimento iterativo com regras claras.', 'Simplifica plasticidade e fisiologia.', 'Melhor como camada estrutural do que como verdade ecológica.', 'src-prusinkiewicz-1990', '{}'::jsonb),
  ('model-cellular-automata', 'domain-environmental-ecology', 'cellular-automata', 'Cellular automata', 'simulation', 'Atualiza o estado espacial por regras locais discretas.', 'Uso em fogo, sucessao, fragmentacao e colonizacao.', 'Transparente e eficiente.', 'Escalas e regras podem ser arbitrarias.', 'Depende fortemente da calibracao do modelo.', 'src-sara-part1', '{}'::jsonb),
  ('model-rl-prioritization', 'domain-environmental-ecology', 'rl-ecological-prioritization', 'RL for ecological prioritization', 'machine-learning', 'Aprendizado por reforco para alocar esforco de restauracao, protecao ou monitoramento.', 'Apoio a decisao sequencial sob restricoes.', 'Otimiza trade-offs e feedback acumulado.', 'Risco de funcao objetivo mal especificada.', 'Requer guardrails eticos e interpretabilidade.', 'src-sutton-barto-2018', '{}'::jsonb),
  ('model-digital-twin', 'domain-environmental-ecology', 'biodiversity-digital-twin', 'Biodiversity digital twin', 'digital-twin', 'Representacao digital sincronizada com dados de um ecossistema ou paisagem.', 'Integracao de monitoramento, cenarios e tomada de decisao.', 'Combina observacao, simulacao e comunicacao.', 'Alta demanda de dados e governanca.', 'Nao deve mascarar incerteza ecologica.', 'src-sara-analytical-report', '{}'::jsonb),
  ('model-generative-ai-support', 'domain-environmental-ecology', 'generative-ai-for-ecology', 'Generative AI for ecology support', 'knowledge-grounding', 'Uso de IA generativa como camada de explicacao, sumarizacao ou geracao condicionada.', 'Apoio a analise, documentacao e interfaces.', 'Escala cognitiva e interacao natural.', 'Pode alucinar ou obscurecer lacunas de dados.', 'LLM nao e verdade primaria; deve ficar grounded.', 'src-sara-analytical-report', '{}'::jsonb),
  ('model-simplified-climate', 'domain-environmental-ecology', 'simplified-climate-simulation', 'Simplified climate simulation', 'system-dynamics', 'Modelos reduzidos de temperatura, umidade e precipitação para cenarios exploratorios.', 'Biome mapping e experimentos de sensibilidade.', 'Explicito e integravel com procedural generation.', 'Nao substitui modelos climaticos completos.', 'Usar apenas para exploracao de cenarios.', 'src-sara-part1', '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  domain_id = EXCLUDED.domain_id,
  slug = EXCLUDED.slug,
  title = EXCLUDED.title,
  family = EXCLUDED.family,
  description = EXCLUDED.description,
  primary_use = EXCLUDED.primary_use,
  strengths = EXCLUDED.strengths,
  limitations = EXCLUDED.limitations,
  caution_notes = EXCLUDED.caution_notes,
  source_id = EXCLUDED.source_id,
  metadata = EXCLUDED.metadata;

INSERT INTO taxa (id, domain_id, parent_taxon_id, scientific_name, canonical_name, rank, authorship, common_name, taxon_status, metadata)
VALUES
  ('taxon-domain-eukaryota', 'domain-environmental-ecology', NULL, 'Eukaryota', 'Eukaryota', 'domain', NULL, NULL, 'accepted', '{}'::jsonb),
  ('taxon-kingdom-animalia', 'domain-environmental-ecology', 'taxon-domain-eukaryota', 'Animalia', 'Animalia', 'kingdom', NULL, 'Animais', 'accepted', '{}'::jsonb),
  ('taxon-kingdom-plantae', 'domain-environmental-ecology', 'taxon-domain-eukaryota', 'Plantae', 'Plantae', 'kingdom', NULL, 'Plantas', 'accepted', '{}'::jsonb),
  ('taxon-species-panthera-onca', 'domain-environmental-ecology', 'taxon-kingdom-animalia', 'Panthera onca', 'Panthera onca', 'species', 'Linnaeus, 1758', 'Onca-pintada', 'accepted', '{"example_rank_chain":"simplified"}'::jsonb),
  ('taxon-species-rhizophora-mangle', 'domain-environmental-ecology', 'taxon-kingdom-plantae', 'Rhizophora mangle', 'Rhizophora mangle', 'species', 'L.', 'Mangue-vermelho', 'accepted', '{"example_rank_chain":"simplified"}'::jsonb),
  ('taxon-species-caryocar-brasiliense', 'domain-environmental-ecology', 'taxon-kingdom-plantae', 'Caryocar brasiliense', 'Caryocar brasiliense', 'species', 'Cambess.', 'Pequi', 'accepted', '{"example_rank_chain":"simplified"}'::jsonb),
  ('taxon-species-bertholletia-excelsa', 'domain-environmental-ecology', 'taxon-kingdom-plantae', 'Bertholletia excelsa', 'Bertholletia excelsa', 'species', 'Bonpl.', 'Castanheira-do-brasil', 'accepted', '{"example_rank_chain":"simplified"}'::jsonb),
  ('taxon-species-acropora-palmata', 'domain-environmental-ecology', 'taxon-kingdom-animalia', 'Acropora palmata', 'Acropora palmata', 'species', '(Lamarck, 1816)', 'Coral-corno-de-alce', 'accepted', '{"example_rank_chain":"simplified"}'::jsonb),
  ('taxon-species-sphagnum-fuscum', 'domain-environmental-ecology', 'taxon-kingdom-plantae', 'Sphagnum fuscum', 'Sphagnum fuscum', 'species', '(Schimp.) Klinggr.', 'Musgo-de-turfeira', 'accepted', '{"example_rank_chain":"simplified"}'::jsonb),
  ('taxon-species-phragmites-australis', 'domain-environmental-ecology', 'taxon-kingdom-plantae', 'Phragmites australis', 'Phragmites australis', 'species', '(Cav.) Trin. ex Steud.', 'Canico-comum', 'accepted', '{"example_rank_chain":"simplified"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  domain_id = EXCLUDED.domain_id,
  parent_taxon_id = EXCLUDED.parent_taxon_id,
  scientific_name = EXCLUDED.scientific_name,
  canonical_name = EXCLUDED.canonical_name,
  rank = EXCLUDED.rank,
  authorship = EXCLUDED.authorship,
  common_name = EXCLUDED.common_name,
  taxon_status = EXCLUDED.taxon_status,
  metadata = EXCLUDED.metadata;

INSERT INTO species (
  id, domain_id, accepted_taxon_id, scientific_name, common_name, native_range, conservation_status, trophic_role_id, intraspecific_notes, metadata
)
VALUES
  ('species-panthera-onca', 'domain-environmental-ecology', 'taxon-species-panthera-onca', 'Panthera onca', 'Onca-pintada', 'Neotropico do Mexico ao norte da Argentina', 'Near Threatened (global)', 'trophic-apex-predator', 'Populacoes isoladas variam em conectividade e pressao antropica.', '{}'::jsonb),
  ('species-rhizophora-mangle', 'domain-environmental-ecology', 'taxon-species-rhizophora-mangle', 'Rhizophora mangle', 'Mangue-vermelho', 'Costas tropicais e subtropicais do Atlantico ocidental', NULL, 'trophic-ecosystem-engineer', 'Linhas populacionais podem responder diferentemente a salinidade e amplitude de mare.', '{}'::jsonb),
  ('species-caryocar-brasiliense', 'domain-environmental-ecology', 'taxon-species-caryocar-brasiliense', 'Caryocar brasiliense', 'Pequi', 'Cerrado brasileiro', NULL, 'trophic-primary-producer', 'Expressa variacao local ligada a solo e fogo.', '{}'::jsonb),
  ('species-bertholletia-excelsa', 'domain-environmental-ecology', 'taxon-species-bertholletia-excelsa', 'Bertholletia excelsa', 'Castanheira-do-brasil', 'Florestas tropicais umidas da Amazonia', 'Vulnerable (algumas avaliacoes regionais)', 'trophic-primary-producer', 'Depende de polinizadores e dispersores especializados.', '{}'::jsonb),
  ('species-acropora-palmata', 'domain-environmental-ecology', 'taxon-species-acropora-palmata', 'Acropora palmata', 'Coral-corno-de-alce', 'Caribe e oeste do Atlantico tropical', 'Critically Endangered (regional)', 'trophic-ecosystem-engineer', 'Alta sensibilidade a estresse termico e acidificacao.', '{}'::jsonb),
  ('species-sphagnum-fuscum', 'domain-environmental-ecology', 'taxon-species-sphagnum-fuscum', 'Sphagnum fuscum', 'Musgo-de-turfeira', 'Turfeiras boreais e subarticas', NULL, 'trophic-primary-producer', 'Importante para acúmulo de carbono e manutencao de turfeiras.', '{}'::jsonb),
  ('species-phragmites-australis', 'domain-environmental-ecology', 'taxon-species-phragmites-australis', 'Phragmites australis', 'Canico-comum', 'Zonas umidas temperadas e subtropicais', NULL, 'trophic-primary-producer', 'Complexos de linhagens podem variar entre nativas e invasoras.', '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  domain_id = EXCLUDED.domain_id,
  accepted_taxon_id = EXCLUDED.accepted_taxon_id,
  scientific_name = EXCLUDED.scientific_name,
  common_name = EXCLUDED.common_name,
  native_range = EXCLUDED.native_range,
  conservation_status = EXCLUDED.conservation_status,
  trophic_role_id = EXCLUDED.trophic_role_id,
  intraspecific_notes = EXCLUDED.intraspecific_notes,
  metadata = EXCLUDED.metadata;

INSERT INTO ecosystems (
  id, domain_id, slug, title, ecosystem_kind, medium, description, operational_definition, biotic_summary, abiotic_summary, energy_flow_summary, biogeochemical_summary, ecological_interactions_summary, habitat_scope, ecoregion_label, is_active, metadata
)
VALUES
  ('ecosystem-floresta-tropical-umida', 'domain-environmental-ecology', 'floresta-tropical-umida', 'Floresta tropical umida', 'natural', 'terrestrial', 'Floresta de alta biomassa e diversidade com chuva abundante ao longo do ano.', 'Ecossistema florestal tropical no qual biota altamente diversa interage com calor, umidade, solos frequentemente lixiviados e forte ciclagem biotica.', 'Arvores emergentes, epifitas, fungos, invertebrados, aves e mamiferos.', 'Alta temperatura, umidade elevada e precipitação anual alta.', 'Alta produtividade primaria e rede trofica complexa.', 'Ciclos rapidos de nutrientes na biomassa e serapilheira.', 'Mutualismos, dispersao zoocorica e intensa estratificacao.', 'regional', 'Amazonia e outras florestas tropicais umidas', TRUE, '{}'::jsonb),
  ('ecosystem-floresta-tropical-seca', 'domain-environmental-ecology', 'floresta-tropical-seca', 'Floresta tropical seca', 'natural', 'terrestrial', 'Floresta sazonal com estacao seca marcante e deciduidade parcial.', 'Ecossistema florestal tropical sazonal em que organismos respondem a forte variacao hidrica anual.', 'Arvores deciduas, lianas, polinizadores e dispersores sazonais.', 'Temperatura alta e seca prolongada.', 'Produtividade concentrada no periodo chuvoso.', 'Nutrientes e agua tornam-se fortemente sazonais.', 'Dormencia, fenologia sincronizada e uso eficiente da agua.', 'regional', 'Bosques secos tropicais', TRUE, '{}'::jsonb),
  ('ecosystem-savana-tropical', 'domain-environmental-ecology', 'savana-tropical', 'Savana tropical', 'natural', 'terrestrial', 'Mosaico de gramíneas e arvores esparsas sob fogo e seca sazonal.', 'Ecossistema tropical dominado por herbaceas C4 com lenhosas dispersas e forte influencia de fogo e herbivoria.', 'Gramíneas, arbustos, arvores esparsas, herbivoros e predadores.', 'Temperatura alta, chuvas sazonais e solos frequentemente pobres.', 'Alta produtividade herbacea sazonal.', 'Reciclagem influenciada por fogo e pulsos hidricos.', 'Competicao entre estrato arboreo e herbaceo, fogo, pastagem e mutualismos.', 'regional', 'Savana tropical global', TRUE, '{}'::jsonb),
  ('ecosystem-cerrado', 'domain-environmental-ecology', 'cerrado', 'Cerrado', 'natural', 'terrestrial', 'Savana neotropical com mosaico de campos, savanas e matas de galeria.', 'Ecossistema tropical sazonal do planalto central brasileiro, com flora adaptada a fogo, seca e solos acidos.', 'Gramíneas, arbustos, arvores tortuosas, polinizadores e mamiferos.', 'Solos acidos, aluminio elevado e forte sazonalidade das chuvas.', 'Produtividade modulada por fogo, estacao chuvosa e profundidade radicular.', 'Ciclagem de nutrientes limitada por solos pobres e fogo recorrente.', 'Polinizacao, dispersao, herbivoria e facilitação por mosaico hidrico.', 'regional', 'Cerrado brasileiro', TRUE, '{}'::jsonb),
  ('ecosystem-caatinga', 'domain-environmental-ecology', 'caatinga', 'Caatinga', 'natural', 'terrestrial', 'Ecossistema semiarido tropical com vegetacao xerofitica e alta irregularidade pluviometrica.', 'Ecossistema sazonal seco em que especies vegetais e animais suportam longos deficit hídricos.', 'Cactaceas, arbustos espinhosos, fauna adaptada a seca e flora decidua.', 'Chuvas irregulares, alta evaporacao e solos rasos em varios setores.', 'Produtividade concentrada em janelas curtas de umidade.', 'Ciclagem lenta durante a seca e pulsos rapidos apos chuva.', 'Fenologia explosiva apos chuva e forte pressao antrópica sobre recursos.', 'regional', 'Semiarido brasileiro', TRUE, '{}'::jsonb),
  ('ecosystem-mata-atlantica', 'domain-environmental-ecology', 'mata-atlantica', 'Mata Atlantica', 'natural', 'terrestrial', 'Complexo florestal umido e altamente fragmentado do leste da America do Sul.', 'Ecossistema florestal de alta diversidade e endemismo condicionado por gradientes costeiros e montanos.', 'Florestas ombrofilas, restingas, manguezais associados e fauna altamente endemica.', 'Alta umidade, relevo acidentado e gradientes altitudinais.', 'Alta produtividade e forte heterogeneidade espacial.', 'Ciclagem intensa sob elevada umidade.', 'Mutualismos de dispersao, polinizacao e forte sensibilidade a fragmentacao.', 'regional', 'Mata Atlantica brasileira', TRUE, '{}'::jsonb),
  ('ecosystem-pampa', 'domain-environmental-ecology', 'pampa', 'Pampa', 'natural', 'terrestrial', 'Campos subtropicais dominados por gramíneas, ervas e mosaicos com matas riparias.', 'Ecossistema campestre de clima subtropical e relevo suave com dinamica ligada a pastejo, fogo e solo.', 'Gramíneas perenes, ervas, aves campestres e mamiferos pastadores.', 'Clima subtropical umido e solos variados de media fertilidade.', 'Produtividade centrada no estrato herbaceo.', 'Ciclagem de nutrientes fortemente ligada a serapilheira e pastejo.', 'Competicao entre gramíneas, herbivoria e distúrbios moderados.', 'regional', 'Campos sulinos da America do Sul', TRUE, '{}'::jsonb),
  ('ecosystem-pantanal', 'domain-environmental-ecology', 'pantanal', 'Pantanal', 'natural', 'freshwater', 'Grande planicie sazonalmente inundavel com alta conectividade hidrologica.', 'Ecossistema alagavel cujo pulso de inundacao organiza habitats, nutrientes e movimentos biologicos.', 'Macrófitas, peixes, aves aquáticas, mamiferos e florestas alagaveis.', 'Pulso anual de inundacao, sedimentos finos e gradientes de profundidade.', 'Produtividade distribuida entre canais, baías e campos inundáveis.', 'Exporta e redistribui nutrientes por pulsos hidrológicos.', 'Migrações, predação aquatica e conexao entre ambientes secos e alagados.', 'regional', 'Pantanal sul-americano', TRUE, '{}'::jsonb),
  ('ecosystem-taiga', 'domain-environmental-ecology', 'taiga', 'Taiga', 'natural', 'terrestrial', 'Floresta boreal dominada por coniferas e inverno prolongado.', 'Ecossistema frio de altas latitudes com baixa decomposicao e forte sazonalidade luminosa.', 'Coniferas, musgos, liquens, insetos e grandes mamiferos.', 'Baixas temperaturas, solos acidos e neve prolongada.', 'Produtividade moderada e curta estacao de crescimento.', 'Ciclagem lenta e acúmulo de materia organica.', 'Herbivoria, decomposicao lenta e fogo em algumas regioes.', 'biome to regional', 'Boreal holartico', TRUE, '{}'::jsonb),
  ('ecosystem-tundra', 'domain-environmental-ecology', 'tundra', 'Tundra', 'natural', 'terrestrial', 'Ecossistema polar ou subpolar com vegetacao baixa e permafrost frequente.', 'Ecossistema de curta estacao de crescimento no qual frio, vento e solo congelado limitam a biomassa.', 'Musgos, liquens, pequenos arbustos, aves migratorias e herbivoros sazonais.', 'Baixa temperatura, permafrost e drenagem superficial.', 'Produtividade baixa mas sensivel ao aquecimento.', 'Ciclagem lenta com grande estoque de carbono no solo.', 'Interacoes sazonais intensas durante o curto verao.', 'regional', 'Altas latitudes do hemisferio norte', TRUE, '{}'::jsonb),
  ('ecosystem-pradaria-estepe', 'domain-environmental-ecology', 'pradaria-estepe', 'Pradaria e estepe', 'natural', 'terrestrial', 'Ecossistemas temperados dominados por gramíneas com umidade intermediaria a baixa.', 'Ecossistema campestre temperado mantido por clima, herbivoria e disturbios recorrentes.', 'Gramíneas, ervas, polinizadores e herbivoros de campo aberto.', 'Chuvas moderadas a baixas, ventos e solos profundos em varios trechos.', 'Alta produtividade herbacea em anos favoraveis.', 'Ciclagem concentrada nas raizes e no solo.', 'Fogo, pastejo e variabilidade interanual controlam a estrutura.', 'regional', 'Eurasia e Americas temperadas', TRUE, '{}'::jsonb),
  ('ecosystem-chaparral', 'domain-environmental-ecology', 'chaparral', 'Chaparral', 'natural', 'terrestrial', 'Arbustal mediterraneo adaptado a seca e fogo.', 'Ecossistema de clima mediterraneo em que arbustos esclerofilos enfrentam veroes secos e incendios recorrentes.', 'Arbustos lenhosos, ervas anuais e fauna oportunista.', 'Verao seco, inverno chuvoso e solos rasos.', 'Produtividade sazonal e estrategica no inverno e primavera.', 'Ciclagem fortemente modulada por fogo.', 'Rebrotamento, banco de sementes e competencia por agua.', 'regional', 'Regioes mediterraneas globais', TRUE, '{}'::jsonb),
  ('ecosystem-deserto-quente', 'domain-environmental-ecology', 'deserto-quente', 'Deserto quente', 'natural', 'terrestrial', 'Ecossistema arido de altas temperaturas e chuva extremamente escassa.', 'Ecossistema terrestre com forte limitacao hidrica, grande amplitude termica diaria e baixa cobertura vegetal.', 'Xerofitas, fauna noturna e organismos de estrategia conservativa.', 'Baixa precipitação, alta evaporacao e solos pouco desenvolvidos.', 'Produtividade muito baixa e pulsada por eventos raros de chuva.', 'Ciclagem lenta, muitas vezes concentrada em microhabitats.', 'Facilitacao por plantas nodrizas e uso eficiente da agua.', 'regional', 'Desertos subtropicais', TRUE, '{}'::jsonb),
  ('ecosystem-deserto-frio', 'domain-environmental-ecology', 'deserto-frio', 'Deserto frio', 'natural', 'terrestrial', 'Ecossistema arido de clima frio e forte continentalidade.', 'Ecossistema com baixa umidade, inverno frio e cobertura vegetal esparsa.', 'Arbustos baixos, gramíneas resistentes e fauna adaptada ao frio seco.', 'Baixa precipitação, geadas e solos pedregosos.', 'Produtividade baixa com janelas curtas de crescimento.', 'Ciclagem lenta sob baixa umidade e temperatura.', 'Competicao por agua e abrigo microclimatico.', 'regional', 'Desertos continentais frios', TRUE, '{}'::jsonb),
  ('ecosystem-manguezal', 'domain-environmental-ecology', 'manguezal', 'Manguezal', 'natural', 'brackish', 'Ecossistema costeiro intertidal sob influencia de marés e sedimentos finos.', 'Ecossistema de transicao onde arvores halofitas, sedimentos anoxicos e marés interagem continuamente.', 'Arvores halofitas, crustaceos, peixes juvenis, aves e microrganismos decompositores.', 'Salinidade variavel, sedimento lodoso e hidroperiodo mareal.', 'Alta exportacao de detritos e subsidio a cadeias costeiras.', 'Ciclagem de carbono e nutrientes muito intensa no sedimento anoxico.', 'Berçario para peixes, engenharia de habitat e acoplamento continente-mar.', 'local to regional', 'Costas tropicais e subtropicais', TRUE, '{}'::jsonb),
  ('ecosystem-estuario', 'domain-environmental-ecology', 'estuario', 'Estuario', 'natural', 'brackish', 'Zona de mistura entre agua doce continental e agua marinha.', 'Ecossistema hidrodinamico de salinidade gradiente e alta produtividade estuarina.', 'Fitoplancton, peixes, invertebrados, aves e vegetacao halofila em margens.', 'Mistura salina, marés, sedimentos e alta variabilidade fisico-quimica.', 'Produtividade elevada sustentada por nutrientes e mistura.', 'Forte transformação biogeoquimica e retenção de materiais.', 'Conectividade entre bacias, manguezais e mar aberto.', 'regional', 'Desembocaduras costeiras', TRUE, '{}'::jsonb),
  ('ecosystem-rio', 'domain-environmental-ecology', 'rio', 'Rio', 'natural', 'freshwater', 'Ecossistema lotico com fluxo unidirecional e conectividade longitudinal.', 'Ecossistema aquático de agua corrente no qual vazao, substrato e conectividade regulam comunidades.', 'Algas, macrófitas, peixes, macroinvertebrados e decompositores.', 'Velocidade de fluxo, oxigenacao, temperatura e carga de sedimentos.', 'Fluxo de energia acoplado a producao local e subsidios de montante.', 'Transporte de materia e nutrientes ao longo da rede de drenagem.', 'Predacao, deriva, decomposicao foliar e migrações aquáticas.', 'network to regional', 'Bacias hidrográficas', TRUE, '{}'::jsonb),
  ('ecosystem-lago', 'domain-environmental-ecology', 'lago', 'Lago', 'natural', 'freshwater', 'Ecossistema lentico de agua doce com estratificacao potencial.', 'Ecossistema aquático de residencia hídrica maior e gradientes verticais de luz, temperatura e oxigenio.', 'Fitoplancton, zooplancton, peixes, macrófitas e decompositores.', 'Estratificacao termica, nutrientes, profundidade e regime de mistura.', 'Produtividade varia conforme trofia e luz.', 'Sedimentacao e remineralizacao internas sao relevantes.', 'Interacoes pelagicas e litoraneas conectam varias zonas do lago.', 'local to regional', 'Lagos naturais e grandes reservatorios analogos', TRUE, '{}'::jsonb),
  ('ecosystem-recife-de-coral', 'domain-environmental-ecology', 'recife-de-coral', 'Recife de coral', 'natural', 'marine', 'Ecossistema marinho raso estruturado por corais construtores e simbiose com algas.', 'Ecossistema biogenico em aguas rasas e claras, dependente de luz, temperatura e carbonato.', 'Corais, algas simbiontes, peixes recifais, invertebrados e microrganismos.', 'Baixa turbidez, temperatura tropical e quimica carbonatada favoravel.', 'Alta produtividade local com forte reciclagem interna.', 'Ciclagem apertada de nutrientes e deposicao carbonatica.', 'Mutualismos, herbivoria e construcao de habitat tridimensional.', 'local to regional', 'Plataformas tropicais rasas', TRUE, '{}'::jsonb),
  ('ecosystem-oceano-pelagico', 'domain-environmental-ecology', 'oceano-pelagico', 'Oceano pelagico', 'natural', 'marine', 'Ecossistema de mar aberto dominado pela coluna d''agua e pela circulacao oceanica.', 'Ecossistema marinho de grande escala em que luz, profundidade, nutrientes e correntes estruturam a biota.', 'Fitoplancton, zooplancton, peixes, mamiferos marinhos e predadores pelagicos.', 'Salinidade relativamente estavel, gradientes de luz e mistura vertical.', 'Base produtiva no fitoplancton e em frentes oceanicas.', 'Bomba biologica de carbono e acoplamento atmosfera-oceano.', 'Predacao pelagica, migrações e subsidios verticais.', 'planetary to regional', 'Oceanos globais', TRUE, '{}'::jsonb),
  ('ecosystem-caverna-subterranea', 'domain-environmental-ecology', 'caverna-subterranea', 'Caverna e subterraneo', 'natural', 'subterranean', 'Ecossistema subterraneo de baixa luz e forte dependencia de subsidios externos ou quimiossintese.', 'Ecossistema cavernicola no qual a ausencia de luz restringe a producao primaria local e seleciona adaptacoes especiais.', 'Invertebrados troglobios, fungos, biofilmes e fauna especializada.', 'Escuridao, alta umidade, estabilidade termica e substrato rochoso.', 'Fluxo energetico geralmente limitado por detrito, guano ou quimiossintese local.', 'Ciclagem lenta e fortemente dependente de entradas externas.', 'Redes troficas simplificadas e alta especializacao adaptativa.', 'local', 'Sistemas cavernicolas e subterraneos', TRUE, '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  domain_id = EXCLUDED.domain_id,
  slug = EXCLUDED.slug,
  title = EXCLUDED.title,
  ecosystem_kind = EXCLUDED.ecosystem_kind,
  medium = EXCLUDED.medium,
  description = EXCLUDED.description,
  operational_definition = EXCLUDED.operational_definition,
  biotic_summary = EXCLUDED.biotic_summary,
  abiotic_summary = EXCLUDED.abiotic_summary,
  energy_flow_summary = EXCLUDED.energy_flow_summary,
  biogeochemical_summary = EXCLUDED.biogeochemical_summary,
  ecological_interactions_summary = EXCLUDED.ecological_interactions_summary,
  habitat_scope = EXCLUDED.habitat_scope,
  ecoregion_label = EXCLUDED.ecoregion_label,
  is_active = EXCLUDED.is_active,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();

INSERT INTO ecosystem_classifications (
  id, ecosystem_id, biome_id, climate_id, life_zone_id, realm_id, ecoregion_label, habitat_label, classification_notes, confidence, metadata
)
VALUES
  ('classification-floresta-tropical-umida', 'ecosystem-floresta-tropical-umida', 'biome-tropical-rain-forest', 'climate-af', 'lifezone-tropical-wet-forest', 'realm-neotropical', 'Amazonia e florestas tropicais analogas', 'forested humid tropics', 'Representa o arquétipo de floresta tropical umida.', 0.950, '{}'::jsonb),
  ('classification-floresta-tropical-seca', 'ecosystem-floresta-tropical-seca', 'biome-tropical-seasonal-forest', 'climate-aw', 'lifezone-tropical-dry-forest', 'realm-neotropical', 'Bosques secos tropicais', 'seasonal tropical forest', 'Forte sazonalidade hidrica e deciduidade.', 0.930, '{}'::jsonb),
  ('classification-savana-tropical', 'ecosystem-savana-tropical', 'biome-tropical-savanna', 'climate-aw', 'lifezone-tropical-savanna', 'realm-afrotropical', 'Savanas tropicais globais', 'savanna', 'Arquétipo amplo de savana tropical.', 0.900, '{}'::jsonb),
  ('classification-cerrado', 'ecosystem-cerrado', 'biome-tropical-savanna', 'climate-aw', 'lifezone-tropical-savanna', 'realm-neotropical', 'Cerrado', 'neotropical savanna mosaic', 'Savana neotropical com gradiente campestre-florestal.', 0.980, '{}'::jsonb),
  ('classification-caatinga', 'ecosystem-caatinga', 'biome-hot-desert', 'climate-bsh', 'lifezone-subtropical-thorn', 'realm-neotropical', 'Caatinga', 'seasonally dry tropical scrub', 'Semiarido tropical com vegetacao xerofitica.', 0.970, '{}'::jsonb),
  ('classification-mata-atlantica', 'ecosystem-mata-atlantica', 'biome-temperate-forest', 'climate-cfa', 'lifezone-warm-temperate-moist', 'realm-neotropical', 'Mata Atlantica', 'humid coastal forest complex', 'Complexo florestal com forte gradiente altitudinal e costeiro.', 0.920, '{}'::jsonb),
  ('classification-pampa', 'ecosystem-pampa', 'biome-temperate-grassland', 'climate-cfa', 'lifezone-cool-temperate-steppe', 'realm-neotropical', 'Campos sulinos', 'temperate grassland', 'Campos subtropicais sul-americanos.', 0.930, '{}'::jsonb),
  ('classification-pantanal', 'ecosystem-pantanal', 'biome-freshwater', 'climate-aw', 'lifezone-tropical-savanna', 'realm-neotropical', 'Pantanal', 'seasonal floodplain wetland', 'Grande planicie sazonalmente inundavel.', 0.980, '{}'::jsonb),
  ('classification-taiga', 'ecosystem-taiga', 'biome-boreal-forest', 'climate-dfc', 'lifezone-boreal-moist', 'realm-palearctic', 'Boreal', 'boreal forest', 'Floresta boreal do hemisferio norte.', 0.950, '{}'::jsonb),
  ('classification-tundra', 'ecosystem-tundra', 'biome-tundra', 'climate-et', 'lifezone-subpolar-tundra', 'realm-palearctic', 'Arctic tundra', 'polar tundra', 'Vegetacao rasteira com permafrost frequente.', 0.950, '{}'::jsonb),
  ('classification-pradaria-estepe', 'ecosystem-pradaria-estepe', 'biome-temperate-grassland', 'climate-bsk', 'lifezone-cool-temperate-steppe', 'realm-palearctic', 'Steppes e pradarias temperadas', 'temperate grassland-steppe', 'Campos temperados com clima mais seco.', 0.900, '{}'::jsonb),
  ('classification-chaparral', 'ecosystem-chaparral', 'biome-mediterranean-shrubland', 'climate-csa', 'lifezone-warm-temperate-moist', 'realm-nearctic', 'California floristic province and analogs', 'mediterranean shrubland', 'Arbustal mediterraneo adaptado a fogo.', 0.920, '{}'::jsonb),
  ('classification-deserto-quente', 'ecosystem-deserto-quente', 'biome-hot-desert', 'climate-bwh', 'lifezone-warm-desert', 'realm-palearctic', 'Hot deserts', 'hot desert', 'Arquétipo de deserto subtropical quente.', 0.940, '{}'::jsonb),
  ('classification-deserto-frio', 'ecosystem-deserto-frio', 'biome-cold-desert', 'climate-bwk', 'lifezone-cool-temperate-steppe', 'realm-palearctic', 'Cold continental deserts', 'cold desert', 'Deserto continental frio.', 0.920, '{}'::jsonb),
  ('classification-manguezal', 'ecosystem-manguezal', 'biome-coastal-wetland', 'climate-am', 'lifezone-coastal-brackish', 'realm-neotropical', 'Manguezais tropicais e subtropicais', 'intertidal mangrove wetland', 'Zona umida costeira halofitica.', 0.980, '{}'::jsonb),
  ('classification-estuario', 'ecosystem-estuario', 'biome-coastal-wetland', 'climate-cfa', 'lifezone-coastal-brackish', 'realm-neotropical', 'Estuarios costeiros', 'estuarine mixing zone', 'Gradiente de salinidade e mistura hidrogeomorfica.', 0.940, '{}'::jsonb),
  ('classification-rio', 'ecosystem-rio', 'biome-freshwater', 'climate-cfa', 'lifezone-warm-temperate-moist', 'realm-neotropical', 'Redes fluviais', 'lotic freshwater system', 'Ecossistema lotico e longitudinal.', 0.930, '{}'::jsonb),
  ('classification-lago', 'ecosystem-lago', 'biome-freshwater', 'climate-cfb', 'lifezone-warm-temperate-moist', 'realm-nearctic', 'Lagos de agua doce', 'lentic freshwater system', 'Ecossistema lentico com estratificacao potencial.', 0.900, '{}'::jsonb),
  ('classification-recife-de-coral', 'ecosystem-recife-de-coral', 'biome-marine-reef', 'climate-af', 'lifezone-tropical-wet-forest', 'realm-oceanian', 'Recifes tropicais', 'shallow coral reef', 'Recife biogenico marinho tropical.', 0.970, '{}'::jsonb),
  ('classification-oceano-pelagico', 'ecosystem-oceano-pelagico', 'biome-marine-pelagic', 'climate-af', 'lifezone-coastal-brackish', 'realm-oceanian', 'Open ocean', 'pelagic marine system', 'Mar aberto dominado pela coluna d''agua.', 0.900, '{"note":"life zone used operationally"}'::jsonb),
  ('classification-caverna-subterranea', 'ecosystem-caverna-subterranea', 'biome-subterranean', 'climate-cfb', 'lifezone-warm-temperate-moist', 'realm-neotropical', 'Subterranean caves', 'subterranean cavity', 'Sistema subterraneo de baixa energia.', 0.880, '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  ecosystem_id = EXCLUDED.ecosystem_id,
  biome_id = EXCLUDED.biome_id,
  climate_id = EXCLUDED.climate_id,
  life_zone_id = EXCLUDED.life_zone_id,
  realm_id = EXCLUDED.realm_id,
  ecoregion_label = EXCLUDED.ecoregion_label,
  habitat_label = EXCLUDED.habitat_label,
  classification_notes = EXCLUDED.classification_notes,
  confidence = EXCLUDED.confidence,
  metadata = EXCLUDED.metadata;

INSERT INTO populations (
  id, species_id, ecosystem_id, unit_type, label, location_notes, genetic_notes, status_notes, metadata
)
VALUES
  ('population-onca-pantanal', 'species-panthera-onca', 'ecosystem-pantanal', 'population', 'Pantanal jaguar population', 'Concentrada em mosaicos alagaveis e bordas de mata.', 'Conectividade depende de corredores riparios e paisagens menos fragmentadas.', 'Sensivel a caca e conflito com pecuaria.', '{}'::jsonb),
  ('population-mangue-atlantico', 'species-rhizophora-mangle', 'ecosystem-manguezal', 'population', 'Western Atlantic mangrove stands', 'Populacoes costeiras influenciadas por amplitude de marés e aporte sedimentar.', 'Pode variar em tolerancia a salinidade e anoxia.', 'Suscetivel a ocupacao costeira e poluicao.', '{}'::jsonb),
  ('population-coral-caribe', 'species-acropora-palmata', 'ecosystem-recife-de-coral', 'population', 'Caribbean elkhorn coral stands', 'Colonias em recifes rasos expostos a eventos termicos.', 'Diversidade genetica e relevante para restauracao.', 'Alta vulnerabilidade a branqueamento e doencas.', '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  species_id = EXCLUDED.species_id,
  ecosystem_id = EXCLUDED.ecosystem_id,
  unit_type = EXCLUDED.unit_type,
  label = EXCLUDED.label,
  location_notes = EXCLUDED.location_notes,
  genetic_notes = EXCLUDED.genetic_notes,
  status_notes = EXCLUDED.status_notes,
  metadata = EXCLUDED.metadata;

INSERT INTO ecosystem_species (
  id, ecosystem_id, species_id, trophic_role_id, ecological_function, native_status, abundance_qualifier, notes, metadata
)
VALUES
  ('ecosystem-species-bertholletia-rainforest', 'ecosystem-floresta-tropical-umida', 'species-bertholletia-excelsa', 'trophic-primary-producer', 'Estrutura de dossel e recurso alimentar para fauna.', 'native', 'locally important', 'Especie simbolo de florestas tropicais umidas amazônicas.', '{}'::jsonb),
  ('ecosystem-species-panthera-pantanal', 'ecosystem-pantanal', 'species-panthera-onca', 'trophic-apex-predator', 'Predador de topo e regulador de teias troficas.', 'native', 'locally important', 'Indicador de conectividade e integridade de habitat.', '{}'::jsonb),
  ('ecosystem-species-panthera-atlantic', 'ecosystem-mata-atlantica', 'species-panthera-onca', 'trophic-apex-predator', 'Predador de topo em remanescentes florestais.', 'native', 'rare', 'A fragmentacao reduz a persistencia populacional.', '{}'::jsonb),
  ('ecosystem-species-rhizophora-mangrove', 'ecosystem-manguezal', 'species-rhizophora-mangle', 'trophic-ecosystem-engineer', 'Retencao de sedimentos e oferta de microhabitats.', 'native', 'dominant', 'Raizes escoras aumentam complexidade estrutural.', '{}'::jsonb),
  ('ecosystem-species-caryocar-cerrado', 'ecosystem-cerrado', 'species-caryocar-brasiliense', 'trophic-primary-producer', 'Recurso alimentar e estrutural do cerrado.', 'native', 'locally important', 'Relaciona-se com polinizadores especializados e dispersores.', '{}'::jsonb),
  ('ecosystem-species-acropora-reef', 'ecosystem-recife-de-coral', 'species-acropora-palmata', 'trophic-ecosystem-engineer', 'Construcao de habitat tridimensional carbonatado.', 'native', 'structural', 'Fundamental para a rugosidade do recife.', '{}'::jsonb),
  ('ecosystem-species-sphagnum-tundra', 'ecosystem-tundra', 'species-sphagnum-fuscum', 'trophic-primary-producer', 'Acumulo de carbono e retencao de agua em turfeiras frias.', 'native', 'patchy', 'Importante em tundras umidas e transicoes boreais.', '{}'::jsonb),
  ('ecosystem-species-sphagnum-taiga', 'ecosystem-taiga', 'species-sphagnum-fuscum', 'trophic-primary-producer', 'Base de turfeiras e acúmulo de carbono em florestas boreais.', 'native', 'common', 'Ajuda a manter microambientes encharcados.', '{}'::jsonb),
  ('ecosystem-species-phragmites-estuary', 'ecosystem-estuario', 'species-phragmites-australis', 'trophic-primary-producer', 'Estabilizacao marginal e abrigo de fauna em zonas umidas.', 'context-dependent', 'common', 'Pode ser nativa ou invasora conforme a linhagem e a regiao.', '{}'::jsonb),
  ('ecosystem-species-phragmites-lake', 'ecosystem-lago', 'species-phragmites-australis', 'trophic-primary-producer', 'Forma bordas litoraneas e zonas de transicao com o ambiente terrestre.', 'context-dependent', 'common', 'Importante para filtragem e habitat, mas pode dominar margens eutrofizadas.', '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  ecosystem_id = EXCLUDED.ecosystem_id,
  species_id = EXCLUDED.species_id,
  trophic_role_id = EXCLUDED.trophic_role_id,
  ecological_function = EXCLUDED.ecological_function,
  native_status = EXCLUDED.native_status,
  abundance_qualifier = EXCLUDED.abundance_qualifier,
  notes = EXCLUDED.notes,
  metadata = EXCLUDED.metadata;

INSERT INTO ecosystem_factors (
  id, ecosystem_id, abiotic_factor_id, typical_min, typical_max, unit, seasonality, notes, metadata
)
VALUES
  ('efactor-rainforest-precipitation', 'ecosystem-floresta-tropical-umida', 'abiotic-precipitation', 2000, 4000, 'mm/year', 'high year-round', 'Alta chuva anual sustenta grande produtividade e reciclagem rapida.', '{}'::jsonb),
  ('efactor-rainforest-temperature', 'ecosystem-floresta-tropical-umida', 'abiotic-temperature', 22, 28, 'C', 'low annual amplitude', 'Temperaturas tipicamente altas e estaveis.', '{}'::jsonb),
  ('efactor-cerrado-soil', 'ecosystem-cerrado', 'abiotic-soil', NULL, NULL, 'qualitative', 'year-round', 'Solos acidos e pobres em nutrientes sao caracteristicos.', '{"typical":"acidic low-fertility soils"}'::jsonb),
  ('efactor-cerrado-precipitation', 'ecosystem-cerrado', 'abiotic-precipitation', 800, 1800, 'mm/year', 'strong wet-dry seasonality', 'A estacao seca modula fogo e fenologia.', '{}'::jsonb),
  ('efactor-caatinga-precipitation', 'ecosystem-caatinga', 'abiotic-precipitation', 250, 800, 'mm/year', 'irregular', 'Chuvas altamente variaveis no tempo e no espaco.', '{}'::jsonb),
  ('efactor-caatinga-soil', 'ecosystem-caatinga', 'abiotic-soil', NULL, NULL, 'qualitative', 'year-round', 'Solos rasos em muitos setores e alta evaporacao.', '{}'::jsonb),
  ('efactor-pantanal-hydroperiod', 'ecosystem-pantanal', 'abiotic-hydroperiod', 30, 240, 'days/year', 'seasonal flood pulse', 'Duracao do alagamento varia entre unidades de paisagem.', '{}'::jsonb),
  ('efactor-pantanal-hydrology', 'ecosystem-pantanal', 'abiotic-hydrology', NULL, NULL, 'qualitative', 'seasonal', 'O pulso de inundacao e a forca organizadora central.', '{}'::jsonb),
  ('efactor-manguezal-salinity', 'ecosystem-manguezal', 'abiotic-salinity', 5, 35, 'PSU', 'tidal', 'Salinidade oscila com marés, chuva e vazao continental.', '{}'::jsonb),
  ('efactor-manguezal-hydroperiod', 'ecosystem-manguezal', 'abiotic-hydroperiod', 100, 365, 'days/year', 'tidal', 'Inundacao periodica regula anoxia e zonacao.', '{}'::jsonb),
  ('efactor-estuario-salinity', 'ecosystem-estuario', 'abiotic-salinity', 0.5, 30, 'PSU', 'tidal and river discharge', 'Gradiente salino e traço definidor do estuario.', '{}'::jsonb),
  ('efactor-estuario-conductivity', 'ecosystem-estuario', 'abiotic-conductivity', 500, 50000, 'uS/cm', 'dynamic', 'Boa proxy para mistura e carga ionica.', '{}'::jsonb),
  ('efactor-rio-hydrology', 'ecosystem-rio', 'abiotic-hydrology', NULL, NULL, 'qualitative', 'seasonal to event-driven', 'Vazao e conectividade estruturam habitat e dispersao.', '{}'::jsonb),
  ('efactor-rio-substrate', 'ecosystem-rio', 'abiotic-substrate', NULL, NULL, 'qualitative', 'spatially variable', 'Cascalho, areia, silte e materia organica moldam a biota bentonica.', '{}'::jsonb),
  ('efactor-lago-nutrients', 'ecosystem-lago', 'abiotic-nutrients', NULL, NULL, 'mg/L', 'seasonal', 'Estado trofico regula floracoes e qualidade da agua.', '{}'::jsonb),
  ('efactor-lago-light', 'ecosystem-lago', 'abiotic-light', NULL, NULL, 'Secchi depth', 'seasonal', 'Penetracao de luz separa zonas e controla producao primaria.', '{}'::jsonb),
  ('efactor-recife-temperature', 'ecosystem-recife-de-coral', 'abiotic-temperature', 23, 29, 'C', 'seasonal with thermal anomalies', 'Pequenos desvios podem causar branqueamento.', '{}'::jsonb),
  ('efactor-recife-light', 'ecosystem-recife-de-coral', 'abiotic-light', NULL, NULL, 'PAR', 'high year-round', 'Luz e central para a simbiose coral-alga.', '{}'::jsonb),
  ('efactor-ocean-salinity', 'ecosystem-oceano-pelagico', 'abiotic-salinity', 33, 37, 'PSU', 'regionally stable', 'Salinidade afeta densidade, circulacao e distribuicao biologica.', '{}'::jsonb),
  ('efactor-ocean-light', 'ecosystem-oceano-pelagico', 'abiotic-light', NULL, NULL, 'PAR', 'depth-dependent', 'A zona eufotica limita a producao primaria direta.', '{}'::jsonb),
  ('efactor-taiga-temperature', 'ecosystem-taiga', 'abiotic-temperature', -15, 18, 'C', 'high seasonality', 'Inverno longo e frio define a dinâmica da taiga.', '{}'::jsonb),
  ('efactor-tundra-substrate', 'ecosystem-tundra', 'abiotic-substrate', NULL, NULL, 'qualitative', 'seasonally thawed active layer', 'Permafrost restringe drenagem e aprofundamento radicular.', '{}'::jsonb),
  ('efactor-cave-light', 'ecosystem-caverna-subterranea', 'abiotic-light', 0, 0, 'lux', 'constant darkness', 'Ausencia de luz define o ambiente afotico.', '{}'::jsonb),
  ('efactor-cave-humidity', 'ecosystem-caverna-subterranea', 'abiotic-humidity', 80, 100, 'percent', 'typically stable', 'Alta umidade reduz perda de agua e favorece fungos e biofilmes.', '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  ecosystem_id = EXCLUDED.ecosystem_id,
  abiotic_factor_id = EXCLUDED.abiotic_factor_id,
  typical_min = EXCLUDED.typical_min,
  typical_max = EXCLUDED.typical_max,
  unit = EXCLUDED.unit,
  seasonality = EXCLUDED.seasonality,
  notes = EXCLUDED.notes,
  metadata = EXCLUDED.metadata;

INSERT INTO biotic_interactions (
  id, domain_id, interaction_type, source_species_id, target_species_id, source_ecosystem_id, target_ecosystem_id, description, interaction_strength, source_id, metadata
)
VALUES
  ('interaction-rhizophora-engineering', 'domain-environmental-ecology', 'engineering', 'species-rhizophora-mangle', NULL, 'ecosystem-manguezal', NULL, 'Raizes de Rhizophora mangle retêm sedimentos e ampliam a complexidade estrutural do manguezal.', 0.90, 'src-sara-part1', '{}'::jsonb),
  ('interaction-acropora-engineering', 'domain-environmental-ecology', 'engineering', 'species-acropora-palmata', NULL, 'ecosystem-recife-de-coral', NULL, 'Acropora palmata constrói estrutura tridimensional que aumenta abrigo e fluxo hidrodinâmico local.', 0.92, 'src-sara-part1', '{}'::jsonb),
  ('interaction-panthera-predation', 'domain-environmental-ecology', 'predation', 'species-panthera-onca', NULL, 'ecosystem-pantanal', NULL, 'A onca-pintada atua como predador de topo e influencia distribuicao e comportamento de presas.', 0.75, 'src-sara-part1', '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  domain_id = EXCLUDED.domain_id,
  interaction_type = EXCLUDED.interaction_type,
  source_species_id = EXCLUDED.source_species_id,
  target_species_id = EXCLUDED.target_species_id,
  source_ecosystem_id = EXCLUDED.source_ecosystem_id,
  target_ecosystem_id = EXCLUDED.target_ecosystem_id,
  description = EXCLUDED.description,
  interaction_strength = EXCLUDED.interaction_strength,
  source_id = EXCLUDED.source_id,
  metadata = EXCLUDED.metadata;

INSERT INTO ecosystem_processes (
  id, ecosystem_id, formation_process_id, role_label, evidence_source_id, notes, is_primary, metadata
)
VALUES
  ('eprocess-rainforest-successional', 'ecosystem-floresta-tropical-umida', 'formation-successional', 'canopy gap succession', 'src-odum-barrett-2005', 'Quedas de arvores e clareiras mantem heterogeneidade estrutural.', TRUE, '{}'::jsonb),
  ('eprocess-cerrado-successional', 'ecosystem-cerrado', 'formation-successional', 'fire-mediated succession', 'src-sara-part1', 'Fogo e regrowth modulam composicao e fisionomias.', TRUE, '{}'::jsonb),
  ('eprocess-pantanal-fluvial', 'ecosystem-pantanal', 'formation-fluvial', 'flood pulse structuring', 'src-sara-part1', 'Pulsos de inundacao e sedimentacao sazonal moldam habitats.', TRUE, '{}'::jsonb),
  ('eprocess-manguezal-marine', 'ecosystem-manguezal', 'formation-marine-coastal', 'tidal sediment accretion', 'src-sara-part1', 'Marés e sedimentos finos sustentam a formacao do manguezal.', TRUE, '{}'::jsonb),
  ('eprocess-estuario-marine', 'ecosystem-estuario', 'formation-marine-coastal', 'salinity mixing and deposition', 'src-sara-part1', 'Mistura salina e deposicao sedimentar estruturam o estuario.', TRUE, '{}'::jsonb),
  ('eprocess-rio-fluvial', 'ecosystem-rio', 'formation-fluvial', 'channel erosion and deposition', 'src-sara-part1', 'Fluxo e transporte sedimentar configuram o sistema lotico.', TRUE, '{}'::jsonb),
  ('eprocess-taiga-postglacial', 'ecosystem-taiga', 'formation-glacial-postglacial', 'post-glacial soil formation', 'src-holdridge-1967', 'Boa parte das paisagens boreais atuais decorre de legados glaciares.', TRUE, '{}'::jsonb),
  ('eprocess-tundra-postglacial', 'ecosystem-tundra', 'formation-glacial-postglacial', 'permafrost landscape legacy', 'src-holdridge-1967', 'Processos glaciares e permafrost continuam estruturando o sistema.', TRUE, '{}'::jsonb),
  ('eprocess-recife-marine', 'ecosystem-recife-de-coral', 'formation-marine-coastal', 'carbonate accretion', 'src-sara-part1', 'Crescimento biogenico de carbonato sustenta a arquitetura do recife.', TRUE, '{}'::jsonb),
  ('eprocess-cave-sedimentary', 'ecosystem-caverna-subterranea', 'formation-sedimentary', 'karst cavity development', 'src-sara-part1', 'Formacao subterranea ligada a dissolucao e reorganizacao geologica.', TRUE, '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  ecosystem_id = EXCLUDED.ecosystem_id,
  formation_process_id = EXCLUDED.formation_process_id,
  role_label = EXCLUDED.role_label,
  evidence_source_id = EXCLUDED.evidence_source_id,
  notes = EXCLUDED.notes,
  is_primary = EXCLUDED.is_primary,
  metadata = EXCLUDED.metadata;

INSERT INTO artificial_projects (
  id, domain_id, slug, title, project_type, ecosystem_kind, description, objective, intervention_scale, caution_notes, source_id, is_active, metadata
)
VALUES
  ('project-wetland-construida', 'domain-environmental-ecology', 'wetland-construida', 'Wetland construida', 'constructed-wetland', 'artificial', 'Zona umida projetada para tratamento de agua, amortecimento hidrologico e suporte a habitat.', 'Combinar funcao hidrologica, depuracao e habitat semi-natural.', 'site to watershed', 'Precisa controlar colmatacao, carga organica e invasoras.', 'src-sara-analytical-report', TRUE, '{}'::jsonb),
  ('project-restauracao-de-coral', 'domain-environmental-ecology', 'restauracao-de-coral', 'Restauracao de coral', 'coral-restoration', 'restored', 'Projeto de viveiros, fragmentacao e transplante de corais.', 'Recuperar cobertura coralinea e complexidade estrutural.', 'reef patch to seascape', 'Exige monitoramento genetico e termico.', 'src-sara-analytical-report', TRUE, '{}'::jsonb),
  ('project-recife-artificial', 'domain-environmental-ecology', 'recife-artificial', 'Recife artificial', 'artificial-reef', 'artificial', 'Estrutura submersa instalada para gerar rugosidade, habitat e colonizacao.', 'Criar substrato estavel e aumentar abrigo para fauna.', 'local to coastal', 'Nao substitui recifes naturais e pode atrair impacto se mal posicionado.', 'src-sara-analytical-report', TRUE, '{}'::jsonb),
  ('project-agrofloresta-multiestrato', 'domain-environmental-ecology', 'agrofloresta-multiestrato', 'Agrofloresta multiestrato', 'agroforestry', 'improved', 'Sistema produtivo inspirado em sucessao e estratificacao vegetal.', 'Produzir alimentos mantendo funcoes ecologicas e cobertura permanente.', 'farm to landscape', 'Pode falhar se simplificado demais ou sem manejo sucessional.', 'src-sara-analytical-report', TRUE, '{}'::jsonb),
  ('project-biosfera-fechada', 'domain-environmental-ecology', 'biosfera-fechada', 'Biosfera fechada', 'closed-biosphere', 'closed', 'Sistema quase fechado para reciclagem de agua, ar e biomassa.', 'Testar suporte de vida e acoplamento ecologico em ambiente controlado.', 'facility', 'Alta sensibilidade a desequilibrios de materia e energia.', 'src-sara-analytical-report', TRUE, '{}'::jsonb),
  ('project-parque-urbano-restaurado', 'domain-environmental-ecology', 'parque-urbano-restaurado', 'Parque urbano restaurado', 'urban-restoration', 'restored', 'Area urbana com restauracao hidrologica, vegetacional e de conectividade.', 'Recuperar servicos ecossistemicos e uso publico com menor fragmentacao.', 'site to district', 'Precisa conciliar manutencao, seguranca e pressao de uso.', 'src-sara-analytical-report', TRUE, '{}'::jsonb),
  ('project-ecossistema-urbano-melhorado', 'domain-environmental-ecology', 'ecossistema-urbano-melhorado', 'Ecossistema urbano melhorado', 'enhanced-urban-ecosystem', 'improved', 'Infraestrutura verde-azul integrada com habitat, sombra e infiltracao.', 'Aumentar resiliência urbana e conectividade ecológica.', 'district to city', 'Risco de greenwashing sem manutencao e indicadores reais.', 'src-sara-analytical-report', TRUE, '{}'::jsonb),
  ('project-permacultura', 'domain-environmental-ecology', 'permacultura', 'Permacultura', 'permaculture', 'improved', 'Projeto socioecologico de design permanente inspirado em principios ecologicos.', 'Integrar producao, ciclagem e habitacao com menor desperdicio.', 'plot to community', 'Exige leitura local; nao deve virar receituario universal.', 'src-sara-analytical-report', TRUE, '{}'::jsonb),
  ('project-agricultura-sintropica', 'domain-environmental-ecology', 'agricultura-sintropica', 'Agricultura sintropica', 'syntropic-agriculture', 'improved', 'Sistema agrícola sucessional baseado em adensamento, poda e alta producao de biomassa.', 'Regenerar solo e produzir alimentos com estratificacao e sucessao.', 'farm to landscape', 'Precisa manejo intensivo e entendimento sucessional.', 'src-sara-analytical-report', TRUE, '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  domain_id = EXCLUDED.domain_id,
  slug = EXCLUDED.slug,
  title = EXCLUDED.title,
  project_type = EXCLUDED.project_type,
  ecosystem_kind = EXCLUDED.ecosystem_kind,
  description = EXCLUDED.description,
  objective = EXCLUDED.objective,
  intervention_scale = EXCLUDED.intervention_scale,
  caution_notes = EXCLUDED.caution_notes,
  source_id = EXCLUDED.source_id,
  is_active = EXCLUDED.is_active,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();

INSERT INTO project_target_ecosystems (project_id, ecosystem_id, relation_type, notes)
VALUES
  ('project-wetland-construida', 'ecosystem-estuario', 'functional-analog', 'Pode imitar parte das funcoes de zonas umidas naturais.'),
  ('project-wetland-construida', 'ecosystem-pantanal', 'hydrological-reference', 'Usa referencia de pulsos e tratamento natural, sem equivaler ao sistema inteiro.'),
  ('project-restauracao-de-coral', 'ecosystem-recife-de-coral', 'restore', 'Busca recuperar cobertura coralinea e rugosidade.'),
  ('project-recife-artificial', 'ecosystem-recife-de-coral', 'augment', 'Fornece substrato complementar para colonizacao.'),
  ('project-agrofloresta-multiestrato', 'ecosystem-floresta-tropical-umida', 'inspired-by', 'Imita estratificacao e sucessao de florestas tropicais.'),
  ('project-biosfera-fechada', 'ecosystem-floresta-tropical-umida', 'closed-system-analog', 'Usa referencia ecologica para ciclos fechados e diversidade funcional.'),
  ('project-parque-urbano-restaurado', 'ecosystem-mata-atlantica', 'restore-fragments', 'Procura reconectar fragmentos e recuperar cobertura nativa.'),
  ('project-ecossistema-urbano-melhorado', 'ecosystem-rio', 'urban-blue-green-analog', 'Melhora drenagem, margem e conectividade urbana.'),
  ('project-permacultura', 'ecosystem-pradaria-estepe', 'land-use-mosaic', 'Integra policultivos e microhabitats em paisagem manejada.'),
  ('project-agricultura-sintropica', 'ecosystem-cerrado', 'sucessional-analog', 'Usa principios de sucessao e cobertura permanente em contexto produtivo.')
ON CONFLICT (project_id, ecosystem_id) DO UPDATE SET
  relation_type = EXCLUDED.relation_type,
  notes = EXCLUDED.notes;

INSERT INTO project_metrics (id, project_id, metric_id, target_description, target_value, unit, notes, metadata)
VALUES
  ('pmetric-wetland-water-clarity', 'project-wetland-construida', 'metric-water-clarity', 'Melhorar a clareza da agua tratada', NULL, 'Secchi depth', 'Meta depende do afluente e do desenho hidraulico.', '{}'::jsonb),
  ('pmetric-wetland-oxygen', 'project-wetland-construida', 'metric-dissolved-oxygen', 'Elevar oxigenio dissolvido na saida', NULL, 'mg/L', 'Especialmente relevante em zonas de polimento final.', '{}'::jsonb),
  ('pmetric-coral-survival', 'project-restauracao-de-coral', 'metric-restoration-survival-rate', 'Sobrevivencia de fragmentos transplantados', 70, 'percent', 'Exemplo de meta inicial em cenarios favoraveis.', '{}'::jsonb),
  ('pmetric-coral-richness', 'project-restauracao-de-coral', 'metric-species-richness', 'Recuperar diversidade funcional no recife restaurado', NULL, 'count', 'Foco em especies estruturais e associadas.', '{}'::jsonb),
  ('pmetric-reef-biomass', 'project-recife-artificial', 'metric-aboveground-biomass', 'Aumentar biomassa associada ao recife artificial', NULL, 'qualitative', 'Usado como proxy de colonizacao e abrigo.', '{}'::jsonb),
  ('pmetric-agroforestry-canopy', 'project-agrofloresta-multiestrato', 'metric-canopy-cover', 'Expandir cobertura de dossel funcional', NULL, 'percent', 'Relaciona producao de biomassa e microclima.', '{}'::jsonb),
  ('pmetric-biosphere-npp', 'project-biosfera-fechada', 'metric-net-primary-productivity', 'Manter producao primaria suficiente ao ciclo fechado', NULL, 'gC/m2/year', 'Necessario para estabilidade material do sistema.', '{}'::jsonb),
  ('pmetric-urban-connectivity', 'project-parque-urbano-restaurado', 'metric-habitat-connectivity', 'Melhorar conectividade de fragmentos e corredores', NULL, 'index', 'Integra manchas de vegetacao e drenagem.', '{}'::jsonb),
  ('pmetric-urban-carbon', 'project-ecossistema-urbano-melhorado', 'metric-soil-organic-carbon', 'Elevar carbono organico do solo urbano restaurado', NULL, 'percent', 'Proxy de regeneracao funcional do solo.', '{}'::jsonb),
  ('pmetric-syntropic-survival', 'project-agricultura-sintropica', 'metric-restoration-survival-rate', 'Sobrevivencia de mudas e especies-chave apos poda e manejo', NULL, 'percent', 'Meta operacional para manejo adaptativo.', '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  project_id = EXCLUDED.project_id,
  metric_id = EXCLUDED.metric_id,
  target_description = EXCLUDED.target_description,
  target_value = EXCLUDED.target_value,
  unit = EXCLUDED.unit,
  notes = EXCLUDED.notes,
  metadata = EXCLUDED.metadata;

INSERT INTO grounding_facts (
  id, domain_id, category, slug, title, fact_text, language, importance, entity_table, entity_id, source_id, citation_key, metadata, verified_at, is_active
)
VALUES
  ('gfact-concept-ecossistema', 'domain-environmental-ecology', 'concept', 'ecossistema', 'Ecossistema', 'Ecossistema e um conjunto dinamico de componentes bioticos e abioticos em interacao, conectado por fluxo de energia, ciclagem de materia e relacoes ecologicas situadas.', 'pt-BR', 5, 'domains', 'domain-environmental-ecology', 'src-odum-barrett-2005', 'ODUM-BARRETT-2005', '{}'::jsonb, NOW(), TRUE),
  ('gfact-concept-nicho-ecologico', 'domain-environmental-ecology', 'concept', 'nicho-ecologico', 'Nicho ecologico', 'Nicho ecologico descreve o conjunto de condicoes, recursos, interacoes e papel funcional de uma especie em um sistema.', 'pt-BR', 4, NULL, NULL, 'src-sara-part1', 'SARA-PART1-2026', '{}'::jsonb, NOW(), TRUE),
  ('gfact-concept-sucessao-primaria', 'domain-environmental-ecology', 'concept', 'sucessao-primaria', 'Sucessao primaria', 'Sucessao primaria ocorre quando a comunidade se estabelece sobre substrato antes sem solo biologicamente estruturado, como rocha nua, cinza vulcanica ou sedimento recente.', 'pt-BR', 4, 'formation_processes', 'formation-successional', 'src-odum-barrett-2005', 'ODUM-BARRETT-2005', '{}'::jsonb, NOW(), TRUE),
  ('gfact-concept-sucessao-secundaria', 'domain-environmental-ecology', 'concept', 'sucessao-secundaria', 'Sucessao secundaria', 'Sucessao secundaria reorganiza a comunidade apos disturbio em area onde solo, propágulos ou memoria ecologica ainda persistem.', 'pt-BR', 4, 'formation_processes', 'formation-successional', 'src-odum-barrett-2005', 'ODUM-BARRETT-2005', '{}'::jsonb, NOW(), TRUE),
  ('gfact-concept-resiliencia-ecologica', 'domain-environmental-ecology', 'concept', 'resiliencia-ecologica', 'Resiliencia ecologica', 'Resiliencia ecologica e a capacidade de absorver disturbios e reorganizar funcoes sem perder identidade sistêmica central.', 'pt-BR', 5, NULL, NULL, 'src-holling-1973', 'HOLLING-1973', '{}'::jsonb, NOW(), TRUE),
  ('gfact-concept-resistencia-ecologica', 'domain-environmental-ecology', 'concept', 'resistencia-ecologica', 'Resistencia ecologica', 'Resistencia ecologica expressa o quanto um sistema muda pouco diante de uma perturbacao.', 'pt-BR', 4, NULL, NULL, 'src-holling-1973', 'HOLLING-1973', '{}'::jsonb, NOW(), TRUE),
  ('gfact-concept-niveis-troficos', 'domain-environmental-ecology', 'concept', 'niveis-troficos', 'Niveis troficos', 'Niveis troficos organizam organismos conforme a origem imediata da energia e materia consumida, de produtores a consumidores e decompositores.', 'pt-BR', 4, NULL, NULL, 'src-odum-barrett-2005', 'ODUM-BARRETT-2005', '{}'::jsonb, NOW(), TRUE),
  ('gfact-concept-ciclos-biogeoquimicos', 'domain-environmental-ecology', 'concept', 'ciclos-biogeoquimicos', 'Ciclos biogeoquimicos', 'Ciclos biogeoquimicos descrevem a circulacao de agua, carbono, nitrogenio, fosforo e outros elementos entre atmosfera, biosfera, litosfera e hidrosfera.', 'pt-BR', 4, NULL, NULL, 'src-odum-barrett-2005', 'ODUM-BARRETT-2005', '{}'::jsonb, NOW(), TRUE),
  ('gfact-concept-bioma', 'domain-environmental-ecology', 'concept', 'bioma', 'Bioma', 'Bioma e uma grande unidade ecologica definida por clima, formas dominantes de vegetacao e estrategias ecologicas recorrentes em escala ampla.', 'pt-BR', 4, 'biomes', 'biome-tropical-rain-forest', 'src-whittaker-1975', 'WHITTAKER-1975', '{}'::jsonb, NOW(), TRUE),
  ('gfact-concept-ecorregiao', 'domain-environmental-ecology', 'concept', 'ecorregiao', 'Ecorregiao', 'Ecorregiao e uma unidade espacial relativamente homogenea em clima, biota, geologia e historia ecologica, menor que um bioma e util para planejamento.', 'pt-BR', 4, NULL, NULL, 'src-olson-2001', 'OLSON-2001', '{}'::jsonb, NOW(), TRUE),
  ('gfact-concept-ecossistema-artificial', 'domain-environmental-ecology', 'concept', 'ecossistema-artificial', 'Ecossistema artificial', 'Ecossistema artificial e um sistema ecologico construído ou fortemente moldado por intervencao humana, ainda assim dependente de energia, materia e interacoes biologicas reais.', 'pt-BR', 4, 'artificial_projects', 'project-wetland-construida', 'src-sara-analytical-report', 'SARA-ANALYTICAL-2026', '{}'::jsonb, NOW(), TRUE),
  ('gfact-concept-restauracao-ecologica', 'domain-environmental-ecology', 'concept', 'restauracao-ecologica', 'Restauracao ecologica', 'Restauracao ecologica busca recuperar composicao, estrutura, funcao e trajetorias historicamente plausiveis de um ecossistema degradado.', 'pt-BR', 5, 'restoration_methods', 'method-ecological-restoration', 'src-ipbes-2019', 'IPBES-2019', '{}'::jsonb, NOW(), TRUE),
  ('gfact-concept-rewilding', 'domain-environmental-ecology', 'concept', 'rewilding', 'Rewilding', 'Rewilding prioriza restauracao de processos ecologicos, conectividade e autonomia biotica com reducao de controle humano direto.', 'pt-BR', 4, 'restoration_methods', 'method-urban-rewilding', 'src-sara-analytical-report', 'SARA-ANALYTICAL-2026', '{}'::jsonb, NOW(), TRUE),
  ('gfact-concept-agrofloresta', 'domain-environmental-ecology', 'concept', 'agrofloresta', 'Agrofloresta', 'Agrofloresta integra producao e diversidade vegetal estratificada, aproximando manejo humano de dinamicas sucessional e ecossistemica.', 'pt-BR', 4, 'artificial_projects', 'project-agrofloresta-multiestrato', 'src-sara-analytical-report', 'SARA-ANALYTICAL-2026', '{}'::jsonb, NOW(), TRUE),
  ('gfact-concept-biosfera-fechada', 'domain-environmental-ecology', 'concept', 'biosfera-fechada', 'Biosfera fechada', 'Biosfera fechada e um sistema quase fechado de reciclagem de materia e controle de energia usado para estudar suporte de vida e equilibrio ecologico.', 'pt-BR', 4, 'artificial_projects', 'project-biosfera-fechada', 'src-sara-analytical-report', 'SARA-ANALYTICAL-2026', '{}'::jsonb, NOW(), TRUE),
  ('gfact-concept-digital-twin-biodiversidade', 'domain-environmental-ecology', 'concept', 'digital-twin-de-biodiversidade', 'Digital twin de biodiversidade', 'Digital twin de biodiversidade combina observacao, modelos e simulacao para espelhar dinamicamente um sistema biologico real e apoiar decisao.', 'pt-BR', 4, 'modeling_approaches', 'model-digital-twin', 'src-sara-analytical-report', 'SARA-ANALYTICAL-2026', '{}'::jsonb, NOW(), TRUE)
ON CONFLICT (id) DO UPDATE SET
  domain_id = EXCLUDED.domain_id,
  category = EXCLUDED.category,
  slug = EXCLUDED.slug,
  title = EXCLUDED.title,
  fact_text = EXCLUDED.fact_text,
  language = EXCLUDED.language,
  importance = EXCLUDED.importance,
  entity_table = EXCLUDED.entity_table,
  entity_id = EXCLUDED.entity_id,
  source_id = EXCLUDED.source_id,
  citation_key = EXCLUDED.citation_key,
  metadata = EXCLUDED.metadata,
  verified_at = EXCLUDED.verified_at,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

INSERT INTO grounding_facts (
  id, domain_id, category, slug, title, fact_text, language, importance, entity_table, entity_id, source_id, citation_key, metadata, verified_at, is_active
)
VALUES
  ('gfact-ecosystem-floresta-tropical-umida', 'domain-environmental-ecology', 'ecosystem', 'floresta-tropical-umida', 'Floresta tropical umida', 'Florestas tropicais umidas concentram alta biomassa, grande diversidade e forte estratificacao vertical sob clima quente e muito úmido.', 'pt-BR', 5, 'ecosystems', 'ecosystem-floresta-tropical-umida', 'src-sara-part1', 'SARA-PART1-2026', '{}'::jsonb, NOW(), TRUE),
  ('gfact-ecosystem-floresta-tropical-seca', 'domain-environmental-ecology', 'ecosystem', 'floresta-tropical-seca', 'Floresta tropical seca', 'Florestas tropicais secas mantem alta sazonalidade hidrica e estrategias de deciduidade, dormencia e uso eficiente de agua.', 'pt-BR', 4, 'ecosystems', 'ecosystem-floresta-tropical-seca', 'src-sara-part1', 'SARA-PART1-2026', '{}'::jsonb, NOW(), TRUE),
  ('gfact-ecosystem-savana-tropical', 'domain-environmental-ecology', 'ecosystem', 'savana-tropical', 'Savana tropical', 'Savanas tropicais combinam gramíneas dominantes, arvores esparsas, fogo recorrente e herbivoria em mosaicos sazonais.', 'pt-BR', 4, 'ecosystems', 'ecosystem-savana-tropical', 'src-sara-part1', 'SARA-PART1-2026', '{}'::jsonb, NOW(), TRUE),
  ('gfact-ecosystem-cerrado', 'domain-environmental-ecology', 'ecosystem', 'cerrado', 'Cerrado', 'O cerrado e uma savana neotropical de solos acidos, fogo recorrente e elevada diversidade funcional entre campos, savanas e matas de galeria.', 'pt-BR', 5, 'ecosystems', 'ecosystem-cerrado', 'src-sara-part1', 'SARA-PART1-2026', '{}'::jsonb, NOW(), TRUE),
  ('gfact-ecosystem-caatinga', 'domain-environmental-ecology', 'ecosystem', 'caatinga', 'Caatinga', 'A caatinga e um ecossistema semiarido tropical com chuvas irregulares, flora xerofitica e forte pulso ecologico apos precipitações.', 'pt-BR', 5, 'ecosystems', 'ecosystem-caatinga', 'src-sara-part1', 'SARA-PART1-2026', '{}'::jsonb, NOW(), TRUE),
  ('gfact-ecosystem-mata-atlantica', 'domain-environmental-ecology', 'ecosystem', 'mata-atlantica', 'Mata Atlantica', 'A Mata Atlantica e um complexo florestal umido, altamente biodiverso e hoje severamente fragmentado, com grande endemismo.', 'pt-BR', 5, 'ecosystems', 'ecosystem-mata-atlantica', 'src-sara-part1', 'SARA-PART1-2026', '{}'::jsonb, NOW(), TRUE),
  ('gfact-ecosystem-pampa', 'domain-environmental-ecology', 'ecosystem', 'pampa', 'Pampa', 'O pampa e um ecossistema campestre subtropical de gramíneas e ervas, sensivel a conversao de uso do solo e simplificacao estrutural.', 'pt-BR', 4, 'ecosystems', 'ecosystem-pampa', 'src-sara-part1', 'SARA-PART1-2026', '{}'::jsonb, NOW(), TRUE),
  ('gfact-ecosystem-pantanal', 'domain-environmental-ecology', 'ecosystem', 'pantanal', 'Pantanal', 'O pantanal e uma grande planicie inundavel cuja ecologia depende do pulso anual de inundacao, da conectividade hidrologica e da heterogeneidade de habitats.', 'pt-BR', 5, 'ecosystems', 'ecosystem-pantanal', 'src-sara-part1', 'SARA-PART1-2026', '{}'::jsonb, NOW(), TRUE),
  ('gfact-ecosystem-taiga', 'domain-environmental-ecology', 'ecosystem', 'taiga', 'Taiga', 'A taiga e uma floresta boreal fria, de decomposicao lenta e grande estoque de carbono em solos e turfeiras associadas.', 'pt-BR', 4, 'ecosystems', 'ecosystem-taiga', 'src-sara-part1', 'SARA-PART1-2026', '{}'::jsonb, NOW(), TRUE),
  ('gfact-ecosystem-tundra', 'domain-environmental-ecology', 'ecosystem', 'tundra', 'Tundra', 'A tundra apresenta vegetacao baixa, permafrost frequente e alta sensibilidade a mudancas climaticas e liberação de carbono do solo.', 'pt-BR', 4, 'ecosystems', 'ecosystem-tundra', 'src-sara-part1', 'SARA-PART1-2026', '{}'::jsonb, NOW(), TRUE),
  ('gfact-ecosystem-pradaria-estepe', 'domain-environmental-ecology', 'ecosystem', 'pradaria-estepe', 'Pradaria e estepe', 'Pradarias e estepes sao ecossistemas campestres temperados em que gramíneas, herbivoria e disturbios regulares sustentam a estrutura dominante.', 'pt-BR', 4, 'ecosystems', 'ecosystem-pradaria-estepe', 'src-sara-part1', 'SARA-PART1-2026', '{}'::jsonb, NOW(), TRUE),
  ('gfact-ecosystem-chaparral', 'domain-environmental-ecology', 'ecosystem', 'chaparral', 'Chaparral', 'Chaparral e um arbustal mediterraneo adaptado a veroes secos, fogo recorrente e rebrota rapida.', 'pt-BR', 4, 'ecosystems', 'ecosystem-chaparral', 'src-sara-part1', 'SARA-PART1-2026', '{}'::jsonb, NOW(), TRUE),
  ('gfact-ecosystem-deserto-quente', 'domain-environmental-ecology', 'ecosystem', 'deserto-quente', 'Deserto quente', 'Desertos quentes possuem limitacao hidrica extrema, produtividade muito baixa e forte dependencia de microhabitats.', 'pt-BR', 4, 'ecosystems', 'ecosystem-deserto-quente', 'src-sara-part1', 'SARA-PART1-2026', '{}'::jsonb, NOW(), TRUE),
  ('gfact-ecosystem-deserto-frio', 'domain-environmental-ecology', 'ecosystem', 'deserto-frio', 'Deserto frio', 'Desertos frios combinam aridez com inverno severo e crescimento biologico concentrado em janelas curtas.', 'pt-BR', 4, 'ecosystems', 'ecosystem-deserto-frio', 'src-sara-part1', 'SARA-PART1-2026', '{}'::jsonb, NOW(), TRUE),
  ('gfact-ecosystem-manguezal', 'domain-environmental-ecology', 'ecosystem', 'manguezal', 'Manguezal', 'Manguezais sao ecossistemas costeiros intertidais, halofiticos e sedimentares que funcionam como berçario, filtro biogeoquimico e protecao costeira.', 'pt-BR', 5, 'ecosystems', 'ecosystem-manguezal', 'src-sara-part1', 'SARA-PART1-2026', '{}'::jsonb, NOW(), TRUE),
  ('gfact-ecosystem-estuario', 'domain-environmental-ecology', 'ecosystem', 'estuario', 'Estuario', 'Estuarios sao zonas de mistura entre aguas doces e marinhas, com grande produtividade, transformacao quimica e variabilidade fisica.', 'pt-BR', 4, 'ecosystems', 'ecosystem-estuario', 'src-sara-part1', 'SARA-PART1-2026', '{}'::jsonb, NOW(), TRUE),
  ('gfact-ecosystem-rio', 'domain-environmental-ecology', 'ecosystem', 'rio', 'Rio', 'Rios sao ecossistemas loticos em que fluxo, conectividade longitudinal e transporte de materia estruturam a vida aquatica.', 'pt-BR', 4, 'ecosystems', 'ecosystem-rio', 'src-sara-part1', 'SARA-PART1-2026', '{}'::jsonb, NOW(), TRUE),
  ('gfact-ecosystem-lago', 'domain-environmental-ecology', 'ecosystem', 'lago', 'Lago', 'Lagos sao ecossistemas lenticos com gradientes verticais de luz, mistura e nutrientes que afetam produtividade e qualidade da agua.', 'pt-BR', 4, 'ecosystems', 'ecosystem-lago', 'src-sara-part1', 'SARA-PART1-2026', '{}'::jsonb, NOW(), TRUE),
  ('gfact-ecosystem-recife-de-coral', 'domain-environmental-ecology', 'ecosystem', 'recife-de-coral', 'Recife de coral', 'Recifes de coral sao ecossistemas marinhos biogenicos de alta diversidade, dependentes de aguas claras, quentes e quimica carbonatada adequada.', 'pt-BR', 5, 'ecosystems', 'ecosystem-recife-de-coral', 'src-sara-part1', 'SARA-PART1-2026', '{}'::jsonb, NOW(), TRUE),
  ('gfact-ecosystem-oceano-pelagico', 'domain-environmental-ecology', 'ecosystem', 'oceano-pelagico', 'Oceano pelagico', 'O oceano pelagico cobre grande parte do planeta e acopla producao fitoplanctonica, circulacao oceanica e bomba biologica de carbono.', 'pt-BR', 4, 'ecosystems', 'ecosystem-oceano-pelagico', 'src-sara-part1', 'SARA-PART1-2026', '{}'::jsonb, NOW(), TRUE),
  ('gfact-ecosystem-caverna-subterranea', 'domain-environmental-ecology', 'ecosystem', 'caverna-subterranea', 'Caverna e subterraneo', 'Ecossistemas subterraneos operam sob baixa ou nenhuma luz, forte especializacao biotica e dependencia de subsidios externos ou quimiossintese.', 'pt-BR', 4, 'ecosystems', 'ecosystem-caverna-subterranea', 'src-sara-part1', 'SARA-PART1-2026', '{}'::jsonb, NOW(), TRUE)
ON CONFLICT (id) DO UPDATE SET
  domain_id = EXCLUDED.domain_id,
  category = EXCLUDED.category,
  slug = EXCLUDED.slug,
  title = EXCLUDED.title,
  fact_text = EXCLUDED.fact_text,
  language = EXCLUDED.language,
  importance = EXCLUDED.importance,
  entity_table = EXCLUDED.entity_table,
  entity_id = EXCLUDED.entity_id,
  source_id = EXCLUDED.source_id,
  citation_key = EXCLUDED.citation_key,
  metadata = EXCLUDED.metadata,
  verified_at = EXCLUDED.verified_at,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

INSERT INTO grounding_facts (
  id, domain_id, category, slug, title, fact_text, language, importance, entity_table, entity_id, source_id, citation_key, metadata, verified_at, is_active
)
VALUES
  ('gfact-abiotic-temperature', 'domain-environmental-ecology', 'abiotic-factor', 'temperature', 'Temperature', 'Temperatura controla metabolismo, estacionalidade, limites fisiologicos e distribuições geograficas.', 'pt-BR', 4, 'abiotic_factors', 'abiotic-temperature', 'src-sara-part1', 'SARA-PART1-2026', '{}'::jsonb, NOW(), TRUE),
  ('gfact-abiotic-precipitation', 'domain-environmental-ecology', 'abiotic-factor', 'precipitation', 'Precipitation', 'Precipitacao regula disponibilidade de agua, produtividade e regime de disturbios em muitos ecossistemas.', 'pt-BR', 4, 'abiotic_factors', 'abiotic-precipitation', 'src-sara-part1', 'SARA-PART1-2026', '{}'::jsonb, NOW(), TRUE),
  ('gfact-abiotic-humidity', 'domain-environmental-ecology', 'abiotic-factor', 'humidity', 'Humidity', 'Umidade atmosferica afeta perda de agua, risco de fogo, fenologia e conforto fisiologico.', 'pt-BR', 3, 'abiotic_factors', 'abiotic-humidity', 'src-sara-part1', 'SARA-PART1-2026', '{}'::jsonb, NOW(), TRUE),
  ('gfact-abiotic-light', 'domain-environmental-ecology', 'abiotic-factor', 'light', 'Light', 'Luz define a janela de producao primaria e influencia comportamento, crescimento e estratificacao vertical.', 'pt-BR', 4, 'abiotic_factors', 'abiotic-light', 'src-sara-part1', 'SARA-PART1-2026', '{}'::jsonb, NOW(), TRUE),
  ('gfact-abiotic-salinity', 'domain-environmental-ecology', 'abiotic-factor', 'salinity', 'Salinity', 'Salinidade impõe filtro fisiologico importante em zonas costeiras, estuarios e ambientes marinhos.', 'pt-BR', 4, 'abiotic_factors', 'abiotic-salinity', 'src-sara-part1', 'SARA-PART1-2026', '{}'::jsonb, NOW(), TRUE),
  ('gfact-abiotic-ph', 'domain-environmental-ecology', 'abiotic-factor', 'ph', 'pH', 'pH influencia solubilidade de nutrientes, toxicidade e composição microbiana e vegetal.', 'pt-BR', 3, 'abiotic_factors', 'abiotic-ph', 'src-sara-part1', 'SARA-PART1-2026', '{}'::jsonb, NOW(), TRUE),
  ('gfact-abiotic-nutrients', 'domain-environmental-ecology', 'abiotic-factor', 'nutrients', 'Nutrients', 'Nutrientes como nitrogenio e fosforo limitam ou ampliam produtividade e podem induzir eutrofizacao.', 'pt-BR', 4, 'abiotic_factors', 'abiotic-nutrients', 'src-sara-part1', 'SARA-PART1-2026', '{}'::jsonb, NOW(), TRUE),
  ('gfact-abiotic-soil', 'domain-environmental-ecology', 'abiotic-factor', 'soil', 'Soil', 'Solo integra textura, estrutura, carbono, fertilidade e agua disponivel, sendo central em ecossistemas terrestres.', 'pt-BR', 4, 'abiotic_factors', 'abiotic-soil', 'src-sara-part1', 'SARA-PART1-2026', '{}'::jsonb, NOW(), TRUE),
  ('gfact-abiotic-topography', 'domain-environmental-ecology', 'abiotic-factor', 'topography', 'Topography', 'Topografia redistribui agua, luz, temperatura e sedimentos em micro e macroescala.', 'pt-BR', 3, 'abiotic_factors', 'abiotic-topography', 'src-sara-part1', 'SARA-PART1-2026', '{}'::jsonb, NOW(), TRUE),
  ('gfact-abiotic-hydrology', 'domain-environmental-ecology', 'abiotic-factor', 'hydrology', 'Hydrology', 'Hidrologia organiza conectividade, residencia da agua, pulsos e subsidios em sistemas aquaticos e zonas umidas.', 'pt-BR', 5, 'abiotic_factors', 'abiotic-hydrology', 'src-sara-part1', 'SARA-PART1-2026', '{}'::jsonb, NOW(), TRUE),
  ('gfact-abiotic-hydroperiod', 'domain-environmental-ecology', 'abiotic-factor', 'hydroperiod', 'Hydroperiod', 'Hidroperiodo descreve duracao, frequencia e sazonalidade do alagamento, decisivo em zonas umidas.', 'pt-BR', 4, 'abiotic_factors', 'abiotic-hydroperiod', 'src-sara-part1', 'SARA-PART1-2026', '{}'::jsonb, NOW(), TRUE),
  ('gfact-abiotic-conductivity', 'domain-environmental-ecology', 'abiotic-factor', 'conductivity', 'Conductivity', 'Condutividade serve como indicador rapido de carga ionica e mistura de aguas.', 'pt-BR', 3, 'abiotic_factors', 'abiotic-conductivity', 'src-sara-part1', 'SARA-PART1-2026', '{}'::jsonb, NOW(), TRUE),
  ('gfact-abiotic-substrate', 'domain-environmental-ecology', 'abiotic-factor', 'substrate', 'Substrate', 'Substrato determina ancoragem, estabilidade, disponibilidade de microhabitats e regime de trocas fisicas.', 'pt-BR', 3, 'abiotic_factors', 'abiotic-substrate', 'src-sara-part1', 'SARA-PART1-2026', '{}'::jsonb, NOW(), TRUE)
ON CONFLICT (id) DO UPDATE SET
  domain_id = EXCLUDED.domain_id,
  category = EXCLUDED.category,
  slug = EXCLUDED.slug,
  title = EXCLUDED.title,
  fact_text = EXCLUDED.fact_text,
  language = EXCLUDED.language,
  importance = EXCLUDED.importance,
  entity_table = EXCLUDED.entity_table,
  entity_id = EXCLUDED.entity_id,
  source_id = EXCLUDED.source_id,
  citation_key = EXCLUDED.citation_key,
  metadata = EXCLUDED.metadata,
  verified_at = EXCLUDED.verified_at,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

INSERT INTO grounding_facts (
  id, domain_id, category, slug, title, fact_text, language, importance, entity_table, entity_id, source_id, citation_key, metadata, verified_at, is_active
)
VALUES
  ('gfact-formation-glacial-postglacial', 'domain-environmental-ecology', 'formation-process', 'glacial-postglacial', 'Glacial and post-glacial formation', 'Processos glaciais e pos-glaciais deixam legados de relevo, substrato, drenagem e carbono que ainda estruturam ecossistemas frios.', 'pt-BR', 4, 'formation_processes', 'formation-glacial-postglacial', 'src-holdridge-1967', 'HOLDRIDGE-1967', '{}'::jsonb, NOW(), TRUE),
  ('gfact-formation-volcanic', 'domain-environmental-ecology', 'formation-process', 'volcanic', 'Volcanic formation', 'Processos vulcanicos geram substratos jovens e sucessao primaria em escalas que variam de anos a seculos.', 'pt-BR', 3, 'formation_processes', 'formation-volcanic', 'src-sara-part1', 'SARA-PART1-2026', '{}'::jsonb, NOW(), TRUE),
  ('gfact-formation-sedimentary', 'domain-environmental-ecology', 'formation-process', 'sedimentary', 'Sedimentary formation', 'Acumulacao e consolidacao sedimentar moldam solos, deltas, planicies e ambientes bentonicos.', 'pt-BR', 3, 'formation_processes', 'formation-sedimentary', 'src-sara-part1', 'SARA-PART1-2026', '{}'::jsonb, NOW(), TRUE),
  ('gfact-formation-fluvial', 'domain-environmental-ecology', 'formation-process', 'fluvial', 'Fluvial formation', 'Processos fluviais erodem, transportam e depositam sedimentos, configurando canais, margens e planicies inundaveis.', 'pt-BR', 4, 'formation_processes', 'formation-fluvial', 'src-sara-part1', 'SARA-PART1-2026', '{}'::jsonb, NOW(), TRUE),
  ('gfact-formation-marine-coastal', 'domain-environmental-ecology', 'formation-process', 'marine-coastal', 'Marine coastal formation', 'Processos marinho-costeiros unem ondas, marés e sedimentos na configuracao de praias, estuarios, manguezais e recifes.', 'pt-BR', 4, 'formation_processes', 'formation-marine-coastal', 'src-sara-part1', 'SARA-PART1-2026', '{}'::jsonb, NOW(), TRUE),
  ('gfact-formation-successional', 'domain-environmental-ecology', 'formation-process', 'successional', 'Successional formation', 'Sucessao organiza colonizacao, substituicao de especies e trajetorias de recuperacao apos disturbios.', 'pt-BR', 4, 'formation_processes', 'formation-successional', 'src-odum-barrett-2005', 'ODUM-BARRETT-2005', '{}'::jsonb, NOW(), TRUE),
  ('gfact-formation-anthropic-restorative', 'domain-environmental-ecology', 'formation-process', 'anthropic-restorative', 'Anthropic restorative formation', 'Intervencoes restaurativas podem reconfigurar hidrologia, substrato e composição biotica para reabrir trajetorias ecologicas.', 'pt-BR', 4, 'formation_processes', 'formation-anthropic-restorative', 'src-sara-analytical-report', 'SARA-ANALYTICAL-2026', '{}'::jsonb, NOW(), TRUE)
ON CONFLICT (id) DO UPDATE SET
  domain_id = EXCLUDED.domain_id,
  category = EXCLUDED.category,
  slug = EXCLUDED.slug,
  title = EXCLUDED.title,
  fact_text = EXCLUDED.fact_text,
  language = EXCLUDED.language,
  importance = EXCLUDED.importance,
  entity_table = EXCLUDED.entity_table,
  entity_id = EXCLUDED.entity_id,
  source_id = EXCLUDED.source_id,
  citation_key = EXCLUDED.citation_key,
  metadata = EXCLUDED.metadata,
  verified_at = EXCLUDED.verified_at,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

INSERT INTO grounding_facts (
  id, domain_id, category, slug, title, fact_text, language, importance, entity_table, entity_id, source_id, citation_key, metadata, verified_at, is_active
)
VALUES
  ('gfact-project-wetland-construida', 'domain-environmental-ecology', 'artificial-project', 'wetland-construida', 'Wetland construida', 'Wetlands construidas sao sistemas projetados para combinar tratamento, amortecimento hidrologico e habitat sob desenho controlado.', 'pt-BR', 4, 'artificial_projects', 'project-wetland-construida', 'src-sara-analytical-report', 'SARA-ANALYTICAL-2026', '{}'::jsonb, NOW(), TRUE),
  ('gfact-project-restauracao-de-coral', 'domain-environmental-ecology', 'artificial-project', 'restauracao-de-coral', 'Restauracao de coral', 'Restauracao de coral usa viveiros, fragmentacao e transplante para recuperar cobertura e complexidade de recifes impactados.', 'pt-BR', 4, 'artificial_projects', 'project-restauracao-de-coral', 'src-sara-analytical-report', 'SARA-ANALYTICAL-2026', '{}'::jsonb, NOW(), TRUE),
  ('gfact-project-recife-artificial', 'domain-environmental-ecology', 'artificial-project', 'recife-artificial', 'Recife artificial', 'Recifes artificiais fornecem substrato e rugosidade para colonizacao, mas nao equivalem automaticamente a recifes naturais.', 'pt-BR', 4, 'artificial_projects', 'project-recife-artificial', 'src-sara-analytical-report', 'SARA-ANALYTICAL-2026', '{}'::jsonb, NOW(), TRUE),
  ('gfact-project-agrofloresta-multiestrato', 'domain-environmental-ecology', 'artificial-project', 'agrofloresta-multiestrato', 'Agrofloresta multiestrato', 'Agroflorestas multiestrato combinam producao e estrutura vertical inspirada em sucessao ecológica e complementaridade funcional.', 'pt-BR', 4, 'artificial_projects', 'project-agrofloresta-multiestrato', 'src-sara-analytical-report', 'SARA-ANALYTICAL-2026', '{}'::jsonb, NOW(), TRUE),
  ('gfact-project-biosfera-fechada', 'domain-environmental-ecology', 'artificial-project', 'biosfera-fechada', 'Biosfera fechada', 'Biosferas fechadas permitem estudar reciclabilidade de materia, estabilidade biologica e suporte de vida em sistemas controlados.', 'pt-BR', 4, 'artificial_projects', 'project-biosfera-fechada', 'src-sara-analytical-report', 'SARA-ANALYTICAL-2026', '{}'::jsonb, NOW(), TRUE),
  ('gfact-project-parque-urbano-restaurado', 'domain-environmental-ecology', 'artificial-project', 'parque-urbano-restaurado', 'Parque urbano restaurado', 'Parques urbanos restaurados integram funcao ecologica, uso publico e restauracao hidrologica e vegetacional.', 'pt-BR', 3, 'artificial_projects', 'project-parque-urbano-restaurado', 'src-sara-analytical-report', 'SARA-ANALYTICAL-2026', '{}'::jsonb, NOW(), TRUE),
  ('gfact-project-ecossistema-urbano-melhorado', 'domain-environmental-ecology', 'artificial-project', 'ecossistema-urbano-melhorado', 'Ecossistema urbano melhorado', 'Ecossistemas urbanos melhorados usam infraestrutura verde-azul para ampliar sombra, infiltração e conectividade.', 'pt-BR', 3, 'artificial_projects', 'project-ecossistema-urbano-melhorado', 'src-sara-analytical-report', 'SARA-ANALYTICAL-2026', '{}'::jsonb, NOW(), TRUE),
  ('gfact-project-permacultura', 'domain-environmental-ecology', 'artificial-project', 'permacultura', 'Permacultura', 'Permacultura aplica design sistêmico para integrar producao, ciclagem e habitacao em bases ecologicamente inspiradas.', 'pt-BR', 3, 'artificial_projects', 'project-permacultura', 'src-sara-analytical-report', 'SARA-ANALYTICAL-2026', '{}'::jsonb, NOW(), TRUE),
  ('gfact-project-agricultura-sintropica', 'domain-environmental-ecology', 'artificial-project', 'agricultura-sintropica', 'Agricultura sintropica', 'Agricultura sintropica usa adensamento, poda e sucessao para regenerar solo e produzir biomassa em sistemas cultivados.', 'pt-BR', 4, 'artificial_projects', 'project-agricultura-sintropica', 'src-sara-analytical-report', 'SARA-ANALYTICAL-2026', '{}'::jsonb, NOW(), TRUE)
ON CONFLICT (id) DO UPDATE SET
  domain_id = EXCLUDED.domain_id,
  category = EXCLUDED.category,
  slug = EXCLUDED.slug,
  title = EXCLUDED.title,
  fact_text = EXCLUDED.fact_text,
  language = EXCLUDED.language,
  importance = EXCLUDED.importance,
  entity_table = EXCLUDED.entity_table,
  entity_id = EXCLUDED.entity_id,
  source_id = EXCLUDED.source_id,
  citation_key = EXCLUDED.citation_key,
  metadata = EXCLUDED.metadata,
  verified_at = EXCLUDED.verified_at,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

INSERT INTO grounding_facts (
  id, domain_id, category, slug, title, fact_text, language, importance, entity_table, entity_id, source_id, citation_key, metadata, verified_at, is_active
)
VALUES
  ('gfact-model-agent-based', 'domain-environmental-ecology', 'modeling-approach', 'agent-based-modeling', 'Agent-based modeling', 'Modelagem baseada em agentes representa entidades autonomas e interacoes locais para investigar dinamicas emergentes em sistemas ecologicos.', 'pt-BR', 4, 'modeling_approaches', 'model-agent-based', 'src-grimm-railsback-2005', 'GRIMM-RAILSBACK-2005', '{}'::jsonb, NOW(), TRUE),
  ('gfact-model-procedural-terrain', 'domain-environmental-ecology', 'modeling-approach', 'procedural-terrain-generation', 'Procedural terrain generation', 'Geracao procedural de terreno cria cenarios e gradientes espaciais sinteticos, util para simular paisagens sob regras ambientais.', 'pt-BR', 3, 'modeling_approaches', 'model-procedural-terrain', 'src-sara-part1', 'SARA-PART1-2026', '{}'::jsonb, NOW(), TRUE),
  ('gfact-model-perlin-simplex', 'domain-environmental-ecology', 'modeling-approach', 'perlin-simplex', 'Perlin and Simplex noise', 'Ruido de Perlin e variantes como Simplex ajudam a representar heterogeneidade espacial continua em campos ambientais.', 'pt-BR', 3, 'modeling_approaches', 'model-perlin-simplex', 'src-perlin-1985', 'PERLIN-1985', '{}'::jsonb, NOW(), TRUE),
  ('gfact-model-voronoi', 'domain-environmental-ecology', 'modeling-approach', 'voronoi-bioregions', 'Voronoi bioregions', 'Abordagens baseadas em Voronoi ajudam a particionar o espaco em regioes de influencia para bioregioes, nucleos e mosaicos.', 'pt-BR', 3, 'modeling_approaches', 'model-voronoi-bioregions', 'src-okabe-2000', 'OKABE-2000', '{}'::jsonb, NOW(), TRUE),
  ('gfact-model-lsystems', 'domain-environmental-ecology', 'modeling-approach', 'l-systems', 'L-systems', 'L-systems modelam crescimento iterativo de plantas e estruturas ramificadas com regras formais.', 'pt-BR', 3, 'modeling_approaches', 'model-l-systems', 'src-prusinkiewicz-1990', 'PRUSINKIEWICZ-1990', '{}'::jsonb, NOW(), TRUE),
  ('gfact-model-cellular-automata', 'domain-environmental-ecology', 'modeling-approach', 'cellular-automata', 'Cellular automata', 'Automatos celulares usam regras locais discretas para explorar sucessao, fogo, propagacao e ocupacao espacial.', 'pt-BR', 3, 'modeling_approaches', 'model-cellular-automata', 'src-sara-part1', 'SARA-PART1-2026', '{}'::jsonb, NOW(), TRUE),
  ('gfact-model-rl', 'domain-environmental-ecology', 'modeling-approach', 'rl-ecological-prioritization', 'RL for ecological prioritization', 'RL pode apoiar priorizacao adaptativa de restauracao, monitoramento e alocacao de recursos sob incerteza.', 'pt-BR', 3, 'modeling_approaches', 'model-rl-prioritization', 'src-sutton-barto-2018', 'SUTTON-BARTO-2018', '{}'::jsonb, NOW(), TRUE),
  ('gfact-model-digital-twin', 'domain-environmental-ecology', 'modeling-approach', 'biodiversity-digital-twin', 'Biodiversity digital twin', 'Digital twins conectam dados observados e modelos para testar cenarios e comunicar mudancas ecologicas.', 'pt-BR', 4, 'modeling_approaches', 'model-digital-twin', 'src-sara-analytical-report', 'SARA-ANALYTICAL-2026', '{}'::jsonb, NOW(), TRUE),
  ('gfact-model-generative-ai', 'domain-environmental-ecology', 'modeling-approach', 'generative-ai-for-ecology', 'Generative AI for ecology support', 'IA generativa pode apoiar interfaces, sumarizacao e explicacao, mas deve permanecer condicionada por dados grounded e regras cientificas.', 'pt-BR', 4, 'modeling_approaches', 'model-generative-ai-support', 'src-sara-analytical-report', 'SARA-ANALYTICAL-2026', '{}'::jsonb, NOW(), TRUE),
  ('gfact-model-simplified-climate', 'domain-environmental-ecology', 'modeling-approach', 'simplified-climate-simulation', 'Simplified climate simulation', 'Modelos climaticos simplificados ajudam em biome mapping e cenarios exploratorios, desde que explicitamente limitados.', 'pt-BR', 3, 'modeling_approaches', 'model-simplified-climate', 'src-sara-part1', 'SARA-PART1-2026', '{}'::jsonb, NOW(), TRUE)
ON CONFLICT (id) DO UPDATE SET
  domain_id = EXCLUDED.domain_id,
  category = EXCLUDED.category,
  slug = EXCLUDED.slug,
  title = EXCLUDED.title,
  fact_text = EXCLUDED.fact_text,
  language = EXCLUDED.language,
  importance = EXCLUDED.importance,
  entity_table = EXCLUDED.entity_table,
  entity_id = EXCLUDED.entity_id,
  source_id = EXCLUDED.source_id,
  citation_key = EXCLUDED.citation_key,
  metadata = EXCLUDED.metadata,
  verified_at = EXCLUDED.verified_at,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

INSERT INTO grounding_facts (
  id, domain_id, category, slug, title, fact_text, language, importance, entity_table, entity_id, source_id, citation_key, metadata, verified_at, is_active
)
VALUES
  ('gfact-species-panthera-onca', 'domain-environmental-ecology', 'species', 'panthera-onca', 'Panthera onca', 'A onca-pintada e um predador de topo neotropical cuja presenca frequentemente sinaliza conectividade e disponibilidade de habitat.', 'pt-BR', 4, 'species', 'species-panthera-onca', 'src-sara-part1', 'SARA-PART1-2026', '{}'::jsonb, NOW(), TRUE),
  ('gfact-species-rhizophora-mangle', 'domain-environmental-ecology', 'species', 'rhizophora-mangle', 'Rhizophora mangle', 'Rhizophora mangle e uma especie engenheira de manguezal que estabiliza sedimentos e amplia habitat para juvenis de fauna aquatica.', 'pt-BR', 4, 'species', 'species-rhizophora-mangle', 'src-sara-part1', 'SARA-PART1-2026', '{}'::jsonb, NOW(), TRUE),
  ('gfact-species-caryocar-brasiliense', 'domain-environmental-ecology', 'species', 'caryocar-brasiliense', 'Caryocar brasiliense', 'Caryocar brasiliense e uma arvore emblemática do cerrado, importante para alimento, estrutura e interacoes mutualisticas.', 'pt-BR', 4, 'species', 'species-caryocar-brasiliense', 'src-sara-part1', 'SARA-PART1-2026', '{}'::jsonb, NOW(), TRUE),
  ('gfact-species-bertholletia-excelsa', 'domain-environmental-ecology', 'species', 'bertholletia-excelsa', 'Bertholletia excelsa', 'Bertholletia excelsa depende de polinizadores e dispersores especializados e simboliza conectividade de florestas tropicais umidas.', 'pt-BR', 4, 'species', 'species-bertholletia-excelsa', 'src-sara-part1', 'SARA-PART1-2026', '{}'::jsonb, NOW(), TRUE),
  ('gfact-species-acropora-palmata', 'domain-environmental-ecology', 'species', 'acropora-palmata', 'Acropora palmata', 'Acropora palmata e um coral construtor crucial para a rugosidade e a integridade de recifes rasos no Atlantico tropical.', 'pt-BR', 4, 'species', 'species-acropora-palmata', 'src-sara-part1', 'SARA-PART1-2026', '{}'::jsonb, NOW(), TRUE),
  ('gfact-species-sphagnum-fuscum', 'domain-environmental-ecology', 'species', 'sphagnum-fuscum', 'Sphagnum fuscum', 'Sphagnum fuscum contribui para acúmulo de carbono, retenção de agua e desenvolvimento de turfeiras frias.', 'pt-BR', 3, 'species', 'species-sphagnum-fuscum', 'src-sara-part1', 'SARA-PART1-2026', '{}'::jsonb, NOW(), TRUE),
  ('gfact-species-phragmites-australis', 'domain-environmental-ecology', 'species', 'phragmites-australis', 'Phragmites australis', 'Phragmites australis pode ser estabilizador de margens e filtro biologico, mas algumas linhagens tornam-se dominantes ou invasoras.', 'pt-BR', 3, 'species', 'species-phragmites-australis', 'src-sara-part1', 'SARA-PART1-2026', '{}'::jsonb, NOW(), TRUE)
ON CONFLICT (id) DO UPDATE SET
  domain_id = EXCLUDED.domain_id,
  category = EXCLUDED.category,
  slug = EXCLUDED.slug,
  title = EXCLUDED.title,
  fact_text = EXCLUDED.fact_text,
  language = EXCLUDED.language,
  importance = EXCLUDED.importance,
  entity_table = EXCLUDED.entity_table,
  entity_id = EXCLUDED.entity_id,
  source_id = EXCLUDED.source_id,
  citation_key = EXCLUDED.citation_key,
  metadata = EXCLUDED.metadata,
  verified_at = EXCLUDED.verified_at,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

INSERT INTO grounding_facts (
  id, domain_id, category, slug, title, fact_text, language, importance, entity_table, entity_id, source_id, citation_key, doi, url, publisher, authors, year, metadata, verified_at, is_active
)
VALUES
  ('gfact-reference-odum', 'domain-environmental-ecology', 'reference', 'odum-barrett-2005', 'Fundamentals of Ecology', 'Fonte base para definicao operacional de ecossistema, energia, materia e organizacao sistêmica.', 'pt-BR', 4, 'sources', 'src-odum-barrett-2005', 'src-odum-barrett-2005', 'ODUM-BARRETT-2005', NULL, 'https://www.cengage.com/c/fundamentals-of-ecology-5e-odum/', 'Thomson Brooks/Cole', '["Eugene P. Odum","Gary W. Barrett"]'::jsonb, 2005, '{}'::jsonb, NOW(), TRUE),
  ('gfact-reference-whittaker', 'domain-environmental-ecology', 'reference', 'whittaker-1975', 'Communities and Ecosystems', 'Referencia classica para biomas, gradientes e ecologia de comunidades.', 'pt-BR', 3, 'sources', 'src-whittaker-1975', 'src-whittaker-1975', 'WHITTAKER-1975', NULL, NULL, 'Macmillan', '["Robert H. Whittaker"]'::jsonb, 1975, '{}'::jsonb, NOW(), TRUE),
  ('gfact-reference-holdridge', 'domain-environmental-ecology', 'reference', 'holdridge-1967', 'Life Zone Ecology', 'Fonte base para zonas de vida e relacoes entre biotemperatura, precipitacao e vegetacao potencial.', 'pt-BR', 3, 'sources', 'src-holdridge-1967', 'src-holdridge-1967', 'HOLDRIDGE-1967', NULL, 'https://books.google.com/books?id=7sM1AAAAIAAJ', 'Tropical Science Center', '["Leslie R. Holdridge"]'::jsonb, 1967, '{}'::jsonb, NOW(), TRUE),
  ('gfact-reference-kottek', 'domain-environmental-ecology', 'reference', 'kottek-2006', 'Koppen-Geiger update', 'Atualizacao moderna muito utilizada para classificacao climatica global.', 'pt-BR', 3, 'sources', 'src-kottek-2006', 'src-kottek-2006', 'KOTTEK-2006', '10.1127/0941-2948/2006/0130', 'https://doi.org/10.1127/0941-2948/2006/0130', 'Meteorologische Zeitschrift', '["Markus Kottek","J. Grieser","C. Beck","B. Rudolf","F. Rubel"]'::jsonb, 2006, '{}'::jsonb, NOW(), TRUE),
  ('gfact-reference-olson', 'domain-environmental-ecology', 'reference', 'olson-2001', 'Terrestrial Ecoregions of the World', 'Referencia central para ecorregioes terrestres e leitura espacial da biodiversidade.', 'pt-BR', 3, 'sources', 'src-olson-2001', 'src-olson-2001', 'OLSON-2001', '10.1641/0006-3568(2001)051[0933:TEOTWA]2.0.CO;2', 'https://doi.org/10.1641/0006-3568(2001)051[0933:TEOTWA]2.0.CO;2', 'BioScience', '["David M. Olson","Eric Dinerstein","Eric D. Wikramanayake","Neil D. Burgess","George V. N. Powell","Emma C. Underwood","Jennifer A. D''amico","Itoua Illanga","Hedao P. Strand","John C. Morrison","Colby J. Loucks","Thomas F. Allnutt","Taylor H. Ricketts","Yongsheng Kura","John F. Lamoreux","Wesley W. Wettengel","Prashant Hedao","Kenneth R. Kassem"]'::jsonb, 2001, '{}'::jsonb, NOW(), TRUE),
  ('gfact-reference-holling', 'domain-environmental-ecology', 'reference', 'holling-1973', 'Resilience and Stability of Ecological Systems', 'Fonte classica para distinguir resiliencia de estabilidade.', 'pt-BR', 3, 'sources', 'src-holling-1973', 'src-holling-1973', 'HOLLING-1973', '10.1146/annurev.es.04.110173.000245', 'https://doi.org/10.1146/annurev.es.04.110173.000245', 'Annual Review of Ecology and Systematics', '["C. S. Holling"]'::jsonb, 1973, '{}'::jsonb, NOW(), TRUE),
  ('gfact-reference-ipbes', 'domain-environmental-ecology', 'reference', 'ipbes-2019', 'IPBES 2019', 'Fonte de referencia para ameaças globais, restauracao e servicos ecossistemicos.', 'pt-BR', 4, 'sources', 'src-ipbes-2019', 'src-ipbes-2019', 'IPBES-2019', '10.5281/zenodo.3831673', 'https://doi.org/10.5281/zenodo.3831673', 'IPBES', '["IPBES"]'::jsonb, 2019, '{}'::jsonb, NOW(), TRUE)
ON CONFLICT (id) DO UPDATE SET
  domain_id = EXCLUDED.domain_id,
  category = EXCLUDED.category,
  slug = EXCLUDED.slug,
  title = EXCLUDED.title,
  fact_text = EXCLUDED.fact_text,
  language = EXCLUDED.language,
  importance = EXCLUDED.importance,
  entity_table = EXCLUDED.entity_table,
  entity_id = EXCLUDED.entity_id,
  source_id = EXCLUDED.source_id,
  citation_key = EXCLUDED.citation_key,
  doi = EXCLUDED.doi,
  url = EXCLUDED.url,
  publisher = EXCLUDED.publisher,
  authors = EXCLUDED.authors,
  year = EXCLUDED.year,
  metadata = EXCLUDED.metadata,
  verified_at = EXCLUDED.verified_at,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

INSERT INTO fact_links (id, fact_id, linked_fact_id, relation_type, notes, metadata)
VALUES
  ('flink-ecossistema-bioma', 'gfact-concept-ecossistema', 'gfact-concept-bioma', 'related', 'Ecossistema e bioma operam em escalas diferentes mas articuladas.', '{}'::jsonb),
  ('flink-ecossistema-ecorregiao', 'gfact-concept-ecossistema', 'gfact-concept-ecorregiao', 'related', 'Ecorregiao ajuda a situar ecossistemas em recortes espaciais de planejamento.', '{}'::jsonb),
  ('flink-restauracao-wetland', 'gfact-concept-restauracao-ecologica', 'gfact-project-wetland-construida', 'implemented-by', 'Wetland construida pode operacionalizar metas de restauracao funcional em contexto hidrologico.', '{}'::jsonb),
  ('flink-restauracao-coral', 'gfact-concept-restauracao-ecologica', 'gfact-project-restauracao-de-coral', 'implemented-by', 'Projetos de coral operacionalizam restauracao em sistemas recifais.', '{}'::jsonb),
  ('flink-digital-twin-ia', 'gfact-concept-digital-twin-biodiversidade', 'gfact-model-generative-ai', 'modeled-by', 'IA generativa pode atuar como camada secundaria de interface em torno de um digital twin.', '{}'::jsonb),
  ('flink-manguezal-salinidade', 'gfact-ecosystem-manguezal', 'gfact-abiotic-salinity', 'applies-to', 'Manguezais dependem de gradientes de salinidade e maré.', '{}'::jsonb),
  ('flink-recife-temperatura', 'gfact-ecosystem-recife-de-coral', 'gfact-abiotic-temperature', 'applies-to', 'Temperatura e crítica para o desempenho de recifes coralinos.', '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  fact_id = EXCLUDED.fact_id,
  linked_fact_id = EXCLUDED.linked_fact_id,
  relation_type = EXCLUDED.relation_type,
  notes = EXCLUDED.notes,
  metadata = EXCLUDED.metadata;
