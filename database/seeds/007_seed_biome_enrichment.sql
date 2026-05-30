-- Seed 007 — Biome enrichment grounding facts
-- Adiciona fatos detalhados por bioma para:
--   cerrado, manguezal, caatinga, pantanal, mata-atlantica,
--   floresta-tropical-umida, recife-de-coral, tundra
-- Cada bioma recebe fatos nas categorias:
--   concept, formation-process, abiotic-factor, species, artificial-project, reference
-- Todos os fatos são vinculados ao ecossistema via entity_table='ecosystems'
-- para receber prioridade de ordenação quando o bioma for consultado.
-- Idempotente via ON CONFLICT.

-- ─── Sources ──────────────────────────────────────────────────────────────────

INSERT INTO sources (
  id, domain_id, citation_key, title, source_type, publisher, authors, year, doi, url, language, abstract_text, metadata, is_active
)
VALUES
  (
    'src-ratter-1997',
    'domain-environmental-ecology',
    'RATTER-1997',
    'The Brazilian cerrado vegetation and threats to its biodiversity',
    'article',
    'Annals of Botany',
    '["J.A. Ratter","J.F. Ribeiro","S. Bridgewater"]'::jsonb,
    1997,
    '10.1006/anbo.1997.0469',
    NULL,
    'en',
    'Caracterizacao fitofisionomica abrangente do cerrado e analise das ameacas a sua biodiversidade; referencia base para planos de conservacao.',
    '{}'::jsonb,
    TRUE
  ),
  (
    'src-schaeffer-novelli-1990',
    'domain-environmental-ecology',
    'SCHAEFFER-NOVELLI-1990',
    'Guia para estudo das áreas de manguezal: estrutura, função e flora',
    'report',
    'Caribbean Ecological Research',
    '["Y. Schaeffer-Novelli","G. Cintron-Molero"]'::jsonb,
    1990,
    NULL,
    NULL,
    'pt-BR',
    'Manual de referencia para caracterizacao e monitoramento de manguezais; base metodologica para projetos de restauracao no Brasil.',
    '{}'::jsonb,
    TRUE
  ),
  (
    'src-leal-2003',
    'domain-environmental-ecology',
    'LEAL-2003',
    'Ecologia e conservação da caatinga',
    'book',
    'Editora Universitaria da UFPE',
    '["I.R. Leal","M. Tabarelli","J.M.C. Silva"]'::jsonb,
    2003,
    NULL,
    NULL,
    'pt-BR',
    'Obra de referencia sobre biodiversidade, ameacas e estrategias de conservacao do bioma caatinga; amplamente citada em planos de manejo do semiarido brasileiro.',
    '{}'::jsonb,
    TRUE
  ),
  (
    'src-junk-1989',
    'domain-environmental-ecology',
    'JUNK-1989',
    'The flood pulse concept in river-floodplain systems',
    'article',
    'Canadian Journal of Fisheries and Aquatic Sciences',
    '["W.J. Junk","P.B. Bayley","R.E. Sparks"]'::jsonb,
    1989,
    NULL,
    NULL,
    'en',
    'Conceito fundamental para compreender a dinamica ecologica de planicies de inundacao como o Pantanal; base teorica para gestao do regime hidrico.',
    '{}'::jsonb,
    TRUE
  ),
  (
    'src-galindo-2005',
    'domain-environmental-ecology',
    'GALINDO-2005',
    'The Atlantic Forest of South America: Biodiversity Status, Threats and Outlook',
    'book',
    'Island Press',
    '["C. Galindo-Leal","I.G. Camara"]'::jsonb,
    2005,
    NULL,
    NULL,
    'en',
    'Obra abrangente sobre biodiversidade, estado de conservacao e perspectivas da Mata Atlantica; base para planos de restauracao e priorizacao de areas criticas.',
    '{}'::jsonb,
    TRUE
  ),
  (
    'src-tersteege-2013',
    'domain-environmental-ecology',
    'TERSTEEGE-2013',
    'Hyperdominance in the Amazonian tree flora',
    'article',
    'Science',
    '["H. ter Steege","N.C.A. Pitman","D. Sabatier"]'::jsonb,
    2013,
    '10.1126/science.1243092',
    NULL,
    'en',
    'Demonstra que 227 especies hiperdominantes respondem por 50% dos individuos arboreos amazonicos; implicacoes criticas para conservacao e modelagem de diversidade.',
    '{}'::jsonb,
    TRUE
  ),
  (
    'src-hoegh-guldberg-2007',
    'domain-environmental-ecology',
    'HOEGH-GULDBERG-2007',
    'Coral reefs under rapid climate change and ocean acidification',
    'article',
    'Science',
    '["O. Hoegh-Guldberg","P.J. Mumby","A.J. Hooten"]'::jsonb,
    2007,
    '10.1126/science.1152509',
    NULL,
    'en',
    'Analise seminal sobre ameacas combinadas do aquecimento e acidificacao oceanica aos recifes de coral; projeta colapso se aquecimento global exceder 2 graus C.',
    '{}'::jsonb,
    TRUE
  ),
  (
    'src-chapin-2000',
    'domain-environmental-ecology',
    'CHAPIN-2000',
    'Arctic and Boreal Ecosystems of Western North America as Components of the Climate System',
    'article',
    'Global Change Biology',
    '["F.S. Chapin III","A.D. McGuire","J. Randerson"]'::jsonb,
    2000,
    '10.1046/j.1365-2486.2000.06022.x',
    NULL,
    'en',
    'Analise das interacoes entre ecossistemas arcticos e boreais e o sistema climatico global; base para modelos de feedback entre permafrost e aquecimento.',
    '{}'::jsonb,
    TRUE
  )
ON CONFLICT (citation_key) DO UPDATE SET
  title      = EXCLUDED.title,
  is_active  = EXCLUDED.is_active;

-- ─── Grounding facts ──────────────────────────────────────────────────────────
-- Padrão de slugs: {bioma}-{categoria-curta}
-- entity_table = 'ecosystems', entity_id = 'ecosystem-{slug}'
-- para receber prioridade máxima em queries filtradas pelo bioma.

INSERT INTO grounding_facts (
  id, domain_id, category, slug, title, fact_text, language, importance,
  entity_table, entity_id, source_id, citation_key, metadata, verified_at, is_active
)
VALUES

-- ══════════════════════════════════════════════════════════════════════════════
-- CERRADO
-- ══════════════════════════════════════════════════════════════════════════════

  (
    'gfact-cerrado-conceito',
    'domain-environmental-ecology',
    'concept',
    'cerrado-conceito',
    'Cerrado — Savana Neotropical Brasileira',
    'O cerrado é o segundo maior bioma do Brasil (~24% do território nacional) e a savana mais biodiversa do mundo, com mais de 12.000 espécies de plantas vasculares e alta taxa de endemismo (~44%). É considerado hotspot global de biodiversidade. O fogo é fator ecológico estruturante: incêndios naturais e controlados removem biomassa acumulada, liberam nutrientes e estimulam o rebroto de espécies pirofíticas com cascas espessas, xilopódios e raízes profundas.',
    'pt-BR', 5, 'ecosystems', 'ecosystem-cerrado',
    'src-ratter-1997', 'RATTER-1997',
    '{}'::jsonb, NOW(), TRUE
  ),
  (
    'gfact-cerrado-formacao',
    'domain-environmental-ecology',
    'formation-process',
    'cerrado-formacao',
    'Cerrado — Formação Geológica e Pedológica',
    'O cerrado ocupa o Planalto Central Brasileiro em solos antigos do Terciário (Latossolos profundos, álicos, pH 4,5–5,5, baixa fertilidade natural). A vegetação adaptou-se ao tripé: solos distróficos, sazonalidade hídrica intensa (estação seca de 5–6 meses) e regime milenar de queimadas. Xilopódios (órgãos subterrâneos de reserva) e sistema radicular de até 15 m permitem acesso ao lençol freático e rebroto pós-fogo.',
    'pt-BR', 4, 'ecosystems', 'ecosystem-cerrado',
    'src-ratter-1997', 'RATTER-1997',
    '{}'::jsonb, NOW(), TRUE
  ),
  (
    'gfact-cerrado-fator-hidrico',
    'domain-environmental-ecology',
    'abiotic-factor',
    'cerrado-fator-hidrico',
    'Cerrado — Sazonalidade Hídrica e Solo',
    'O cerrado opera sob clima Aw (Köppen): estação chuvosa (outubro–março) com 75–80% da precipitação anual de 1.000–1.800 mm e estação seca (abril–setembro) com déficit hídrico intenso. Temperatura média anual 22–27°C. Solos Latossolos profundos com alta capacidade de infiltração. O gradiente de umidade do solo ao longo do ano determina a fitofisionomia local: campo limpo, campo cerrado, cerrado sensu stricto, cerradão.',
    'pt-BR', 5, 'ecosystems', 'ecosystem-cerrado',
    'src-ratter-1997', 'RATTER-1997',
    '{}'::jsonb, NOW(), TRUE
  ),
  (
    'gfact-cerrado-especies',
    'domain-environmental-ecology',
    'species',
    'cerrado-especies',
    'Cerrado — Espécies-Chave',
    'Espécies estruturais do cerrado: Pequi (Caryocar brasiliense) — recurso alimentar crítico para fauna e populações tradicionais; Buriti (Mauritia flexuosa) — indicador de veredas e nascentes; Ipê-amarelo (Handroanthus ochraceus) — floração massiva pós-seca. Fauna: Lobo-guará (Chrysocyon brachyurus — NT), Tamanduá-bandeira (Myrmecophaga tridactyla — VU), Ema (Rhea americana) dispersora de sementes, Seriema (Cariama cristata). Taxa de endemismo floral supera 44%.',
    'pt-BR', 5, 'ecosystems', 'ecosystem-cerrado',
    'src-ratter-1997', 'RATTER-1997',
    '{}'::jsonb, NOW(), TRUE
  ),
  (
    'gfact-cerrado-restauracao',
    'domain-environmental-ecology',
    'artificial-project',
    'cerrado-restauracao',
    'Cerrado — Restauração Ecológica',
    'Técnicas de restauração do cerrado incluem: muvuca de sementes (mistura de >60 espécies semeadas diretamente em pastagens degradadas), recuperação de veredas e matas de galeria com espécies ripárias, reintrodução de regime de fogo manejado (queima prescrita), e implantação de corredores ecológicos para conectar fragmentos. O Programa Cerrado Sustentável (MMA/GEF) financia projetos em larga escala. Desafio: estima-se que apenas 2–3% da área degradada do cerrado está em restauração ativa.',
    'pt-BR', 4, 'ecosystems', 'ecosystem-cerrado',
    'src-sara-analytical-report', 'SARA-ANALYTICAL-2026',
    '{}'::jsonb, NOW(), TRUE
  ),
  (
    'gfact-cerrado-referencia',
    'domain-environmental-ecology',
    'reference',
    'cerrado-referencia',
    'Cerrado — Referência Bibliográfica Principal',
    'Ratter JA, Ribeiro JF, Bridgewater S. 1997. The Brazilian cerrado vegetation and threats to its biodiversity. Annals of Botany 80(3):223–230. DOI: 10.1006/anbo.1997.0469. — Caracterização fitofisionômica abrangente do cerrado e análise das ameaças à sua biodiversidade; base para planos de conservação e restauração do bioma.',
    'pt-BR', 4, 'ecosystems', 'ecosystem-cerrado',
    'src-ratter-1997', 'RATTER-1997',
    '{}'::jsonb, NOW(), TRUE
  ),

-- ══════════════════════════════════════════════════════════════════════════════
-- MANGUEZAL
-- ══════════════════════════════════════════════════════════════════════════════

  (
    'gfact-manguezal-conceito',
    'domain-environmental-ecology',
    'concept',
    'manguezal-conceito',
    'Manguezal — Ecossistema de Transição Costeira',
    'Manguezais são ecossistemas costeiros de transição entre os ambientes terrestre e marinho, ocorrendo em zonas entremarés de costas tropicais e subtropicais (entre 25°N e 25°S). São ecossistemas de altíssima produtividade primária (~2–3 t C/ha/ano) e funcionam como berçário para 70–90% das espécies de peixes e camarões de importância comercial. O Brasil detém ~26% dos manguezais do mundo (~1,3 milhão ha), concentrados no litoral Norte e Nordeste.',
    'pt-BR', 5, 'ecosystems', 'ecosystem-manguezal',
    'src-schaeffer-novelli-1990', 'SCHAEFFER-NOVELLI-1990',
    '{}'::jsonb, NOW(), TRUE
  ),
  (
    'gfact-manguezal-formacao',
    'domain-environmental-ecology',
    'formation-process',
    'manguezal-formacao',
    'Manguezal — Formação e Dinâmica Costeira',
    'Manguezais formam-se em costas abrigadas com baixa energia de ondas, deposição contínua de sedimentos finos (lodo argiloso) e influência de marés. A sucessão inicia com colonização por Rhizophora nos canais de maré (raízes-escora capturam sedimento), seguida por Avicennia e Laguncularia nas zonas internas. São sistemas dinâmicos — avançam com deposição sedimentar ou recuam com erosão e elevação do nível do mar. Cada milímetro de sedimento acumulado pode representar décadas de crescimento.',
    'pt-BR', 4, 'ecosystems', 'ecosystem-manguezal',
    'src-schaeffer-novelli-1990', 'SCHAEFFER-NOVELLI-1990',
    '{}'::jsonb, NOW(), TRUE
  ),
  (
    'gfact-manguezal-fator-abiotico',
    'domain-environmental-ecology',
    'abiotic-factor',
    'manguezal-fator-abiotico',
    'Manguezal — Fatores Abióticos',
    'Manguezais operam sob gradiente de salinidade variável (0–35 PSU), solos anóxicos ricos em matéria orgânica (sulfetos, H₂S), regime de marés semidiurnas (12,4h) que controla transporte de nutrientes e propágulos. Temperatura da água: 20–32°C. pH do sedimento: 6,0–7,5. A inundação pelo regime de marés é o modulador primário da zonação de espécies vegetais e da distribuição de fauna bentônica (caranguejos, ostras, poliquetas).',
    'pt-BR', 5, 'ecosystems', 'ecosystem-manguezal',
    'src-schaeffer-novelli-1990', 'SCHAEFFER-NOVELLI-1990',
    '{}'::jsonb, NOW(), TRUE
  ),
  (
    'gfact-manguezal-especies',
    'domain-environmental-ecology',
    'species',
    'manguezal-especies',
    'Manguezal — Espécies-Chave',
    'Flora dominante: Rhizophora mangle (mangue-vermelho, raízes-escora), Avicennia germinans (siriúba, pneumatóforos verticais), Laguncularia racemosa (mangue-branco, lenticelas). Fauna: Ucides cordatus (caranguejo-uçá — espécie-bandeira da pesca artesanal, produção de 40.000 t/ano), Crassostrea rhizophorae (ostra-do-mangue), Guará (Eudocimus ruber) — predador de invertebrados. Mais de 200 espécies de aves e dezenas de espécies de peixes juvenis dependem do manguezal como habitat crítico.',
    'pt-BR', 5, 'ecosystems', 'ecosystem-manguezal',
    'src-schaeffer-novelli-1990', 'SCHAEFFER-NOVELLI-1990',
    '{}'::jsonb, NOW(), TRUE
  ),
  (
    'gfact-manguezal-restauracao',
    'domain-environmental-ecology',
    'artificial-project',
    'manguezal-restauracao',
    'Manguezal — Restauração Hidrológica',
    'Restauração de manguezais emprega preferencialmente restauração hidrológica passiva (remoção de barragens e aterros que impedem o fluxo de marés) em vez de replantio direto — taxa de sucesso 80% vs. 30–40%. Técnicas ativas incluem reintrodução de propágulos de Rhizophora em canais e transplante de plântulas de Avicennia em zonas internas. No Brasil: Projeto Manguezal (IBAMA-SP), Restauração do Manguezal do Cais do Porto (RJ). Lei 12.651/2012 proíbe supressão de manguezal independente do estágio de regeneração.',
    'pt-BR', 4, 'ecosystems', 'ecosystem-manguezal',
    'src-sara-analytical-report', 'SARA-ANALYTICAL-2026',
    '{}'::jsonb, NOW(), TRUE
  ),
  (
    'gfact-manguezal-referencia',
    'domain-environmental-ecology',
    'reference',
    'manguezal-referencia',
    'Manguezal — Referência Bibliográfica Principal',
    'Schaeffer-Novelli Y, Cintrón-Molero G. 1990. Guia para estudo das áreas de manguezal: estrutura, função e flora. Caribbean Ecological Research. — Manual de referência para caracterização e monitoramento de manguezais brasileiros; base metodológica para projetos de restauração e inventários de biodiversidade.',
    'pt-BR', 4, 'ecosystems', 'ecosystem-manguezal',
    'src-schaeffer-novelli-1990', 'SCHAEFFER-NOVELLI-1990',
    '{}'::jsonb, NOW(), TRUE
  ),

-- ══════════════════════════════════════════════════════════════════════════════
-- CAATINGA
-- ══════════════════════════════════════════════════════════════════════════════

  (
    'gfact-caatinga-conceito',
    'domain-environmental-ecology',
    'concept',
    'caatinga-conceito',
    'Caatinga — Único Bioma Exclusivamente Brasileiro',
    'A caatinga é o único bioma exclusivamente brasileiro (~11% do território nacional, ~844.000 km²), cobrindo o semiárido nordestino e norte de Minas Gerais. Caracteriza-se por vegetação decídua ou semidecídua adaptada a déficit hídrico severo (< 800 mm/ano, irregulares). Abriga mais de 1.500 espécies vegetais (318 endêmicas), 591 de aves, 178 de répteis e 150 de mamíferos. Contrariando o mito de "bioma pobre", apresenta biodiversidade comparável a outros biomas tropicais quando estudado adequadamente.',
    'pt-BR', 5, 'ecosystems', 'ecosystem-caatinga',
    'src-leal-2003', 'LEAL-2003',
    '{}'::jsonb, NOW(), TRUE
  ),
  (
    'gfact-caatinga-formacao',
    'domain-environmental-ecology',
    'formation-process',
    'caatinga-formacao',
    'Caatinga — Formação Geológica e Climática',
    'A caatinga ocupa a Depressão Sertaneja e a Chapada do Araripe, em rochas cristalinas do Pré-Cambriano com solos rasos (Luvissolos, Neossolos Litólicos). A aridez atual resultou da posição geográfica (9°S–17°S) e da topografia que bloqueia massas de ar úmidas. Inselbergs (afloramentos rochosos) criam microhabitats distintos com flora rupícola única. A sazonalidade intensa e a irregularidade interanual (ENSO) moldaram adaptações fisiológicas únicas: caducifolia, esclerofilia, crassulescência e sistemas radiculares tuberosos.',
    'pt-BR', 4, 'ecosystems', 'ecosystem-caatinga',
    'src-leal-2003', 'LEAL-2003',
    '{}'::jsonb, NOW(), TRUE
  ),
  (
    'gfact-caatinga-fator-abiotico',
    'domain-environmental-ecology',
    'abiotic-factor',
    'caatinga-fator-abiotico',
    'Caatinga — Fatores Abióticos e Clima Semiárido',
    'A caatinga opera sob temperatura média de 25–30°C com amplitudes diárias de até 15°C. Precipitação escassa (300–1.000 mm/ano) e altamente variável interanualmente (coeficiente de variação ~50%). Evapotranspiração potencial (1.500–2.000 mm/ano) supera em dobro a precipitação. Solos rasos (Luvissolos, Neossolos), pH 6,5–7,5, com afloramentos rochosos. Estação seca de 7–11 meses força a caducifolia generalizada — a caatinga perde 100% das folhas na seca, recuperando-as em dias após as primeiras chuvas.',
    'pt-BR', 5, 'ecosystems', 'ecosystem-caatinga',
    'src-leal-2003', 'LEAL-2003',
    '{}'::jsonb, NOW(), TRUE
  ),
  (
    'gfact-caatinga-especies',
    'domain-environmental-ecology',
    'species',
    'caatinga-especies',
    'Caatinga — Espécies Estruturais e Adaptações',
    'Espécies estruturais: Catingueira (Poincianella pyramidalis — dominante), Juazeiro (Ziziphus joazeiro — sempreverde, fonte de alimento e sombra na seca), Umbu (Spondias tuberosa — xilopódio de até 80 kg armazena água), Mandacaru (Cereus jamacaru — cacto-coluna, fonte de água para fauna). Fauna: Asa-branca (Zenaida auriculata — migratória sazonal), Preá (Galea spixii), Onça-parda (Puma concolor — VU). A abelha Apis mellifera é vetor de polinização crítico em anos de chuva.',
    'pt-BR', 5, 'ecosystems', 'ecosystem-caatinga',
    'src-leal-2003', 'LEAL-2003',
    '{}'::jsonb, NOW(), TRUE
  ),
  (
    'gfact-caatinga-restauracao',
    'domain-environmental-ecology',
    'artificial-project',
    'caatinga-restauracao',
    'Caatinga — Conservação e Recuperação no Semiárido',
    'Projetos de recuperação da caatinga incluem: cisterna-calçadão para captação de água de chuva (1 milhão de cisternas pelo Programa 1 Milhão de Cisternas/P1MC), revegetação com espécies nativas em áreas degradadas por desmatamento e pastejo excessivo, implantação de SAFs adaptados ao semiárido (Mandacaru-Palma-Leguminosas), criação de corredores ecológicos (CEPF-Caatinga). A Rede de Sementes da Caatinga coordena bancos regionais para restauração. Apenas ~1% da área de caatinga está em restauração ativa.',
    'pt-BR', 4, 'ecosystems', 'ecosystem-caatinga',
    'src-sara-analytical-report', 'SARA-ANALYTICAL-2026',
    '{}'::jsonb, NOW(), TRUE
  ),
  (
    'gfact-caatinga-referencia',
    'domain-environmental-ecology',
    'reference',
    'caatinga-referencia',
    'Caatinga — Referência Bibliográfica Principal',
    'Leal IR, Tabarelli M, Silva JMC (eds). 2003. Ecologia e conservação da caatinga. Editora Universitária da UFPE, Recife. — Obra de referência cobrindo biodiversidade, ameaças e estratégias de conservação do bioma caatinga; amplamente citada em planos de manejo do semiárido brasileiro.',
    'pt-BR', 4, 'ecosystems', 'ecosystem-caatinga',
    'src-leal-2003', 'LEAL-2003',
    '{}'::jsonb, NOW(), TRUE
  ),

-- ══════════════════════════════════════════════════════════════════════════════
-- PANTANAL
-- ══════════════════════════════════════════════════════════════════════════════

  (
    'gfact-pantanal-conceito',
    'domain-environmental-ecology',
    'concept',
    'pantanal-conceito',
    'Pantanal — Maior Planície de Inundação do Mundo',
    'O Pantanal é a maior planície de inundação tropical contínua do mundo (~150.000 km²), Patrimônio Natural Mundial UNESCO (2000) e Reserva da Biosfera. Seu funcionamento é regido pelo pulso de inundação anual do Rio Paraguai: cheia (novembro–março) e seca (abril–outubro). A inundação deposita sedimentos férteis e conecta habitats que na seca ficam isolados, criando mosaico dinâmico de alta biodiversidade — mais de 3.500 espécies de plantas, 650 de aves, 325 de peixes e 90 de mamíferos.',
    'pt-BR', 5, 'ecosystems', 'ecosystem-pantanal',
    'src-junk-1989', 'JUNK-1989',
    '{}'::jsonb, NOW(), TRUE
  ),
  (
    'gfact-pantanal-formacao',
    'domain-environmental-ecology',
    'formation-process',
    'pantanal-formacao',
    'Pantanal — Bacia Sedimentar e Pulso Hidrológico',
    'O Pantanal ocupa uma bacia sedimentar tectônica em subsidência ativa (~7 mm/ano), com sedimentos transportados pelos rios Paraguai, Cuiabá, Taquari e afluentes desde o Quaternário. O relevo plano (< 1 m/km de declividade) retém a água de chuva e das cheias. A subsidência mantém a planície abaixo do nível de defluxo efetivo dos rios, garantindo o regime de inundação lenta e prolongada que caracteriza o ecossistema. Rios meândricos mudam de leito frequentemente, criando lagoas (baías) de diversas profundidades.',
    'pt-BR', 4, 'ecosystems', 'ecosystem-pantanal',
    'src-junk-1989', 'JUNK-1989',
    '{}'::jsonb, NOW(), TRUE
  ),
  (
    'gfact-pantanal-fator-abiotico',
    'domain-environmental-ecology',
    'abiotic-factor',
    'pantanal-fator-abiotico',
    'Pantanal — Pulso Hidrológico e Condições Abióticas',
    'O Pantanal opera sob temperatura média de 25–27°C, precipitação de 1.000–1.400 mm/ano na planície. O pulso de inundação do Rio Paraguai tem amplitude de 3–5 m, cobrindo até 80% da área na cheia máxima. Solos Gleissolos e Planossolos hidromórficos, pH 6–7. A conectividade hídrica sazonal entre campos, florestas ripárias, baías e capões é o principal modulador da biodiversidade: na cheia os peixes acessam planícies inundadas para reprodução, na seca concentram-se em baías residuais.',
    'pt-BR', 5, 'ecosystems', 'ecosystem-pantanal',
    'src-junk-1989', 'JUNK-1989',
    '{}'::jsonb, NOW(), TRUE
  ),
  (
    'gfact-pantanal-especies',
    'domain-environmental-ecology',
    'species',
    'pantanal-especies',
    'Pantanal — Espécies-Bandeira e Biodiversidade',
    'O Pantanal abriga a maior concentração de jacarés do mundo (Caiman crocodilus yacare, ~10 milhões). Espécies-bandeira: Arara-azul (Anodorhynchus hyacinthinus — EN, recuperada de <3.000 para >5.000 ind. graças ao Projeto Arara Azul), Tuiuiú (Jabiru mycteria — símbolo do Pantanal), Tamanduá-bandeira (Myrmecophaga tridactyla — VU), Lontra-gigante (Pteronura brasiliensis — EN). Ictiofauna rica com ~350 spp., incluindo Dourado (Salminus brasiliensis) e Pintado (Pseudoplatystoma corruscans) — base da pesca esportiva e comercial.',
    'pt-BR', 5, 'ecosystems', 'ecosystem-pantanal',
    'src-junk-1989', 'JUNK-1989',
    '{}'::jsonb, NOW(), TRUE
  ),
  (
    'gfact-pantanal-conservacao',
    'domain-environmental-ecology',
    'artificial-project',
    'pantanal-conservacao',
    'Pantanal — Conservação e Ameaças',
    'O Pantanal enfrenta drenagem para agropecuária, sedimentação por desmatamento no Planalto e projetos de barragens. Projetos de conservação: Programa Pantanal (MMA/GEF), Corredor de Biodiversidade do Pantanal, Pagamento por Serviços Ambientais (PSA) com fazendeiros. A manutenção do pulso de inundação natural é a principal prioridade de gestão — qualquer intervenção hídrica (barragem, drenagem) altera a conectividade sazonal que estrutura toda a cadeia trófica. Monitoramento via satélite por EMBRAPA-Pantanal rastreia inundações mensalmente.',
    'pt-BR', 4, 'ecosystems', 'ecosystem-pantanal',
    'src-sara-analytical-report', 'SARA-ANALYTICAL-2026',
    '{}'::jsonb, NOW(), TRUE
  ),
  (
    'gfact-pantanal-referencia',
    'domain-environmental-ecology',
    'reference',
    'pantanal-referencia',
    'Pantanal — Referência Bibliográfica Principal',
    'Junk WJ, Bayley PB, Sparks RE. 1989. The flood pulse concept in river-floodplain systems. Canadian Journal of Fisheries and Aquatic Sciences 106:110–127. — Conceito fundamental para compreender a dinâmica ecológica de planícies de inundação; base teórica para gestão do regime hídrico do Pantanal e de outros sistemas fluviais tropicais.',
    'pt-BR', 4, 'ecosystems', 'ecosystem-pantanal',
    'src-junk-1989', 'JUNK-1989',
    '{}'::jsonb, NOW(), TRUE
  ),

-- ══════════════════════════════════════════════════════════════════════════════
-- MATA ATLÂNTICA
-- ══════════════════════════════════════════════════════════════════════════════

  (
    'gfact-mata-atlantica-conceito',
    'domain-environmental-ecology',
    'concept',
    'mata-atlantica-conceito',
    'Mata Atlântica — Hotspot Global de Biodiversidade',
    'A Mata Atlântica é um hotspot global de biodiversidade com mais de 20.000 espécies de plantas (8.000 endêmicas), 2.000 vertebrados (700 endêmicos) e alto grau de fragmentação — restam apenas ~12,5% da cobertura original em fragmentos isolados. Originalmente cobria ~1,3 milhão km²; hoje ~160.000 km² remanescentes. Abriga 70% da população brasileira e é vital para abastecimento de água das maiores metrópoles (SP, RJ, BH). Reconhecida como Reserva da Biosfera UNESCO e Patrimônio Nacional pela CF/88.',
    'pt-BR', 5, 'ecosystems', 'ecosystem-mata-atlantica',
    'src-galindo-2005', 'GALINDO-2005',
    '{}'::jsonb, NOW(), TRUE
  ),
  (
    'gfact-mata-atlantica-formacao',
    'domain-environmental-ecology',
    'formation-process',
    'mata-atlantica-formacao',
    'Mata Atlântica — Formação e Gradiente Latitudinal',
    'A Mata Atlântica formou-se sobre o Escudo Cristalino Atlântico (rochas pré-cambrianas), moldada pela Serra do Mar que intercepta massas de ar úmidas do Atlântico Sul. Refugios florestais pleistocênicos isolados impulsionaram especiação intensa. A diversidade fitofisionômica (floresta ombrófila densa, floresta estacional, restinga, campos de altitude, floresta com araucárias) reflete gradiente latitudinal de 3.300 km (5°N–30°S). Neblina e precipitação horizontal nas encostas da Serra do Mar são fontes adicionais de umidade.',
    'pt-BR', 4, 'ecosystems', 'ecosystem-mata-atlantica',
    'src-galindo-2005', 'GALINDO-2005',
    '{}'::jsonb, NOW(), TRUE
  ),
  (
    'gfact-mata-atlantica-fator-abiotico',
    'domain-environmental-ecology',
    'abiotic-factor',
    'mata-atlantica-fator-abiotico',
    'Mata Atlântica — Regime Pluviométrico e Gradiente Altitudinal',
    'A Mata Atlântica ocorre sob clima úmido a superúmido: precipitação de 1.200–4.000 mm/ano (Serra do Mar ultrapassa 4.500 mm — uma das maiores precipitações do Brasil). Temperatura média de 18–24°C nas planícies costeiras, com gradiente altitudinal marcado (< 10°C acima de 1.800 m — campos de altitude). Sem estação seca prolongada na faixa litorânea. Solos Cambissolos e Latossolos nas encostas; Espodossolos de restinga nas planícies costeiras. Fragmentação reduz zona tampão hídrica e amplifica efeitos de borda.',
    'pt-BR', 5, 'ecosystems', 'ecosystem-mata-atlantica',
    'src-galindo-2005', 'GALINDO-2005',
    '{}'::jsonb, NOW(), TRUE
  ),
  (
    'gfact-mata-atlantica-especies',
    'domain-environmental-ecology',
    'species',
    'mata-atlantica-especies',
    'Mata Atlântica — Endemismos e Espécies Ameaçadas',
    'Espécies endêmicas críticas: Mico-leão-dourado (Leontopithecus rosalia — EN, < 2.500 ind.), Muriqui-do-norte (Brachyteles hypoxanthus — CR, ~1.000 ind.), Araucária (Araucaria angustifolia — EN, < 3% da área original). Flora: Palmito-juçara (Euterpe edulis — ameaçada por extração ilegal), Jequitibá-rosa (Cariniana legalis). Orquídeas (1.600 spp.) e Bromélias são indicadores de qualidade da floresta. O muriqui é o maior primata das Américas e indicador-chave de integridade florestal.',
    'pt-BR', 5, 'ecosystems', 'ecosystem-mata-atlantica',
    'src-galindo-2005', 'GALINDO-2005',
    '{}'::jsonb, NOW(), TRUE
  ),
  (
    'gfact-mata-atlantica-restauracao',
    'domain-environmental-ecology',
    'artificial-project',
    'mata-atlantica-restauracao',
    'Mata Atlântica — Pacto pela Restauração',
    'O Pacto pela Restauração da Mata Atlântica (PRMA) meta: 15 milhões de ha restaurados até 2050. Técnicas: nucleação (poleiros artificiais, transposição de solo com propágulos), plantio de mudas em SAF, regeneração natural assistida (remoção de gramíneas exóticas). Corredor de Biodiversidade da Serra do Mar conecta fragmentos entre SP, RJ e ES. A Lei da Mata Atlântica (Lei 11.428/2006) proíbe supressão de estágios avançados. Iniciativas privadas como REDD+ Mata Atlântica e Carbono Florestal financiam restauração via créditos de carbono.',
    'pt-BR', 4, 'ecosystems', 'ecosystem-mata-atlantica',
    'src-sara-analytical-report', 'SARA-ANALYTICAL-2026',
    '{}'::jsonb, NOW(), TRUE
  ),
  (
    'gfact-mata-atlantica-referencia',
    'domain-environmental-ecology',
    'reference',
    'mata-atlantica-referencia',
    'Mata Atlântica — Referência Bibliográfica Principal',
    'Galindo-Leal C, Câmara IG (eds). 2005. The Atlantic Forest of South America: Biodiversity Status, Threats and Outlook. Island Press, Washington DC. — Obra de referência abrangente sobre biodiversidade, estado de conservação e perspectivas da Mata Atlântica; base para planos de restauração, priorização de áreas críticas e políticas de conservação.',
    'pt-BR', 4, 'ecosystems', 'ecosystem-mata-atlantica',
    'src-galindo-2005', 'GALINDO-2005',
    '{}'::jsonb, NOW(), TRUE
  ),

-- ══════════════════════════════════════════════════════════════════════════════
-- FLORESTA TROPICAL ÚMIDA (AMAZÔNIA)
-- ══════════════════════════════════════════════════════════════════════════════

  (
    'gfact-floresta-tropical-conceito',
    'domain-environmental-ecology',
    'concept',
    'floresta-tropical-conceito',
    'Floresta Tropical Úmida — Biodiversidade e Ciclo Hidrológico',
    'As florestas tropicais úmidas (bioma Amazônia, ~5,5 milhões km²) são os ecossistemas terrestres mais biodiversos do planeta: >50.000 spp. de plantas vasculares, ~2,5 milhões de artrópodes, 3.000 spp. de peixes de água doce, 1.300 spp. de aves. O ciclo hidrológico interno ("rios voadores") transporta ~20 bilhões de toneladas de água/dia via evapotranspiração, regulando chuvas no Brasil central e na região platina. Biomassa aérea estoca 150–200 t C/ha — um dos maiores estoques terrestres de carbono.',
    'pt-BR', 5, 'ecosystems', 'ecosystem-floresta-tropical-umida',
    'src-tersteege-2013', 'TERSTEEGE-2013',
    '{}'::jsonb, NOW(), TRUE
  ),
  (
    'gfact-floresta-tropical-formacao',
    'domain-environmental-ecology',
    'formation-process',
    'floresta-tropical-formacao',
    'Floresta Tropical Úmida — Refugia Pleistocênicos e Geologia',
    'A Amazônia atual resultou da expansão florestal em ciclos glaciais e interglaciais. No Último Máximo Glacial (21.000 AP) a floresta retraiu a refugia isolados, impulsionando especiação alopátrica — principal mecanismo de geração da hiperdiversidade. A formação geológica é dominada pelo Escudo Guianense (norte) e Escudo Brasileiro (sul), com a Bacia Sedimentar Amazônica no centro. Rios de água branca (Solimões — rico em nutrientes, sedimento andino) e água preta (Negro — ácido, pobre em nutrientes, rico em húmus) criam mosaicos de hábitat.',
    'pt-BR', 4, 'ecosystems', 'ecosystem-floresta-tropical-umida',
    'src-tersteege-2013', 'TERSTEEGE-2013',
    '{}'::jsonb, NOW(), TRUE
  ),
  (
    'gfact-floresta-tropical-fator-abiotico',
    'domain-environmental-ecology',
    'abiotic-factor',
    'floresta-tropical-fator-abiotico',
    'Floresta Tropical Úmida — Solo Pobre e Ciclagem Rápida',
    'A floresta tropical úmida amazônica opera sob precipitação de 1.800–3.500 mm/ano com distribuição relativamente uniforme (sem estação seca > 3 meses consecutivos). Temperatura média 25–28°C, amplitude anual < 5°C. Solos predominantemente Latossolos lixiviados (Oxisols) de baixa fertilidade — >90% dos nutrientes estão na biomassa viva, retornando via decomposição rápida mediada por fungos micorrízicos. O solo mineral em si é praticamente estéril; a floresta sustenta-se em ciclos biogeoquímicos extremamente fechados.',
    'pt-BR', 5, 'ecosystems', 'ecosystem-floresta-tropical-umida',
    'src-tersteege-2013', 'TERSTEEGE-2013',
    '{}'::jsonb, NOW(), TRUE
  ),
  (
    'gfact-floresta-tropical-especies',
    'domain-environmental-ecology',
    'species',
    'floresta-tropical-especies',
    'Floresta Tropical Úmida — Espécies Hiperdominantes e Chave',
    'Das ~16.000 spp. arbóreas amazônicas, apenas 227 espécies "hiperdominantes" representam 50% dos indivíduos (ter Steege et al. 2013). Espécies-chave: Castanha-do-pará (Bertholletia excelsa — VU, dispersão exclusiva por cutia Dasyprocta spp.), Seringueira (Hevea brasiliensis), Açaí (Euterpe oleracea — base da bioeconomia). Fauna estruturadora: Onça-pintada (Panthera onca — reguladora trófica), Ariranha (Pteronura brasiliensis — EN), Tucanos (Ramphastos spp. — dispersores de sementes grandes). Sobreposição de diversidade funcional garante resiliência.',
    'pt-BR', 5, 'ecosystems', 'ecosystem-floresta-tropical-umida',
    'src-tersteege-2013', 'TERSTEEGE-2013',
    '{}'::jsonb, NOW(), TRUE
  ),
  (
    'gfact-floresta-tropical-conservacao',
    'domain-environmental-ecology',
    'artificial-project',
    'floresta-tropical-conservacao',
    'Floresta Tropical Úmida — Conservação e REDD+',
    'Estratégias de conservação amazônica: Sistema Nacional de UCs com ~45% da Amazônia protegida em TIs e UCs, monitoramento por satélite PRODES/DETER (INPE) — alertas de desmatamento em tempo real, REDD+ como mecanismo econômico de conservação florestal. O Programa Arco Verde recupera áreas nos 36 municípios prioritários. Desafio: o ponto de inflexão ("tipping point") é estimado em 20–25% de desmatamento total; atualmente ~18% da Amazônia foi desmatada, próximo ao limiar de regime shift para savana.',
    'pt-BR', 4, 'ecosystems', 'ecosystem-floresta-tropical-umida',
    'src-sara-analytical-report', 'SARA-ANALYTICAL-2026',
    '{}'::jsonb, NOW(), TRUE
  ),
  (
    'gfact-floresta-tropical-referencia',
    'domain-environmental-ecology',
    'reference',
    'floresta-tropical-referencia',
    'Floresta Tropical Úmida — Referência Bibliográfica Principal',
    'ter Steege H et al. 2013. Hyperdominance in the Amazonian tree flora. Science 342(6156):1243092. DOI: 10.1126/science.1243092. — Demonstra que 227 espécies hiperdominantes respondem por 50% dos indivíduos arbóreos amazônicos; com implicações críticas para conservação prioritária, modelagem de diversidade e políticas de proteção florestal.',
    'pt-BR', 4, 'ecosystems', 'ecosystem-floresta-tropical-umida',
    'src-tersteege-2013', 'TERSTEEGE-2013',
    '{}'::jsonb, NOW(), TRUE
  ),

-- ══════════════════════════════════════════════════════════════════════════════
-- RECIFE DE CORAL
-- ══════════════════════════════════════════════════════════════════════════════

  (
    'gfact-recife-coral-conceito',
    'domain-environmental-ecology',
    'concept',
    'recife-coral-conceito',
    'Recife de Coral — Florestas do Mar',
    'Recifes de coral cobrem < 1% dos oceanos mas abrigam ~25% de todas as espécies marinhas conhecidas (estimativa: 1–8 milhões de espécies ainda não descritas). São construídos por corais hermatípicos (Scleractinia) em simbiose obrigatória com zooxantelas (dinoflagelados fotossintetizantes que fornecem 70–90% da energia do coral via fotossíntese). A estrutura calcária (aragonita) acumula-se em milênios a taxas de 0,5–2 cm/ano. Proveem serviços ecossistêmicos para ~500 milhões de pessoas: pesca, proteção costeira e turismo.',
    'pt-BR', 5, 'ecosystems', 'ecosystem-recife-de-coral',
    'src-hoegh-guldberg-2007', 'HOEGH-GULDBERG-2007',
    '{}'::jsonb, NOW(), TRUE
  ),
  (
    'gfact-recife-coral-formacao',
    'domain-environmental-ecology',
    'formation-process',
    'recife-coral-formacao',
    'Recife de Coral — Formação e Geologia',
    'Os recifes de coral brasileiros (franjeantes e de banco) formaram-se sobre fundações rochosas arqueanas expostas na plataforma continental. A formação atual iniciou no Holoceno (< 8.000 AP) após a última deglaciação. Os recifes de Abrolhos (BA) são os maiores do Atlântico Sul, com estruturas únicas em cogumelo (chapeirões) de até 20 m de altura, resultantes do crescimento diferencial coral-alga. A taxa de calcificação é ~10 kg CaCO₃/m²/ano em condições saudáveis. Acidificação oceânica atual reduz calcificação em ~20%.',
    'pt-BR', 4, 'ecosystems', 'ecosystem-recife-de-coral',
    'src-hoegh-guldberg-2007', 'HOEGH-GULDBERG-2007',
    '{}'::jsonb, NOW(), TRUE
  ),
  (
    'gfact-recife-coral-fator-abiotico',
    'domain-environmental-ecology',
    'abiotic-factor',
    'recife-coral-fator-abiotico',
    'Recife de Coral — Janela de Condições Abióticas',
    'Recifes de coral desenvolvem-se em águas oligotróficas quentes (23–29°C), salinidade 34–36 PSU, baixa turbidez (luz penetra até 30–50 m), pH 8,1–8,3. O branqueamento ocorre quando temperatura supera 1°C acima do máximo histórico por > 4 semanas (índice Degree Heating Weeks, DHW > 8°C-semanas). A acidificação oceânica (pH atual ~8,06 vs. 8,16 pré-industrial, queda de 0,1 unidades = 26% mais ácido) reduz saturação de aragonita e enfraquece a calcificação. Projeções para 2°C de aquecimento: 99% dos recifes sofrerão branqueamento anual.',
    'pt-BR', 5, 'ecosystems', 'ecosystem-recife-de-coral',
    'src-hoegh-guldberg-2007', 'HOEGH-GULDBERG-2007',
    '{}'::jsonb, NOW(), TRUE
  ),
  (
    'gfact-recife-coral-especies',
    'domain-environmental-ecology',
    'species',
    'recife-coral-especies',
    'Recife de Coral — Espécies Construtoras e Estruturadoras',
    'Corais-construtores brasileiros: Montastraea cavernosa (coral-estrela, dominante), Siderastrea stellata (coral-bolobol, resistente), Mussismilia harttii (coral-cérebro, endêmica — EN). Espécies funcionais: Peixe-papagaio (Sparisoma spp.) — bioerosão de coral morto e produção de areia carbonática; Ouriço-do-mar (Diadema antillarum) — herbivoría que controla algas competidoras; Meros (Epinephelus spp.) — predadores estruturadores da cadeia trófica. A perda do ouriço (doença 1983 no Caribe) causou colapso de recifes por dominância algal.',
    'pt-BR', 5, 'ecosystems', 'ecosystem-recife-de-coral',
    'src-hoegh-guldberg-2007', 'HOEGH-GULDBERG-2007',
    '{}'::jsonb, NOW(), TRUE
  ),
  (
    'gfact-recife-coral-restauracao',
    'domain-environmental-ecology',
    'artificial-project',
    'recife-coral-restauracao',
    'Recife de Coral — Coral Gardening e Técnicas de Restauração',
    'Restauração de recifes usa: coral gardening (fragmentação e cultivo ex situ em viveiros submersos, reintrodução em recifes degradados — taxa de sucesso 60–80%), probióticos para resistência ao branqueamento, transplante de genótipos termorresistentes (coral assisted evolution), remoção de macroalgas competidoras. No Brasil: monitoramento do Banco dos Abrolhos (IESB/CI), Projeto Recifes Costeiros (ICMBio). A Iniciativa Internacional de Recifes de Coral (ICRI) coordena estratégias globais de conservação.',
    'pt-BR', 4, 'ecosystems', 'ecosystem-recife-de-coral',
    'src-sara-analytical-report', 'SARA-ANALYTICAL-2026',
    '{}'::jsonb, NOW(), TRUE
  ),
  (
    'gfact-recife-coral-referencia',
    'domain-environmental-ecology',
    'reference',
    'recife-coral-referencia',
    'Recife de Coral — Referência Bibliográfica Principal',
    'Hoegh-Guldberg O et al. 2007. Coral reefs under rapid climate change and ocean acidification. Science 318(5857):1737–1742. DOI: 10.1126/science.1152509. — Análise seminal sobre ameaças combinadas do aquecimento e acidificação oceânica; projeta colapso de recifes se aquecimento global exceder 2°C, base para políticas de conservação marinha e metas climáticas do Acordo de Paris.',
    'pt-BR', 4, 'ecosystems', 'ecosystem-recife-de-coral',
    'src-hoegh-guldberg-2007', 'HOEGH-GULDBERG-2007',
    '{}'::jsonb, NOW(), TRUE
  ),

-- ══════════════════════════════════════════════════════════════════════════════
-- TUNDRA
-- ══════════════════════════════════════════════════════════════════════════════

  (
    'gfact-tundra-conceito',
    'domain-environmental-ecology',
    'concept',
    'tundra-conceito',
    'Tundra — Bioma Ártico e Permafrost',
    'A tundra é o bioma terrestre mais frio (~10% da superfície terrestre), distribuído nas zonas circumpolares árticas e subárticas e em zonas alpinas. Caracteriza-se por permafrost (solo permanentemente congelado a poucos cm de profundidade), vegetação rasteira de musgos, líquens, gramíneas e arbustos anões, e ausência de árvores. A estação de crescimento dura apenas 2–3 meses com fotoperíodo longo (sol de meia-noite). A tundra é o ecossistema terrestre que aquece mais rapidamente (2–4× a média global — amplificação ártica).',
    'pt-BR', 5, 'ecosystems', 'ecosystem-tundra',
    'src-chapin-2000', 'CHAPIN-2000',
    '{}'::jsonb, NOW(), TRUE
  ),
  (
    'gfact-tundra-formacao',
    'domain-environmental-ecology',
    'formation-process',
    'tundra-formacao',
    'Tundra — Formação Pós-Glacial e Permafrost',
    'A tundra ártica formou-se após a retirada das geleiras do Pleistoceno (< 10.000 AP), colonizando solos expostos por pioneiros liquênicos e musgos. O permafrost originou-se durante glaciações quando temperaturas persistentemente abaixo de 0°C congelaram o subsolo — em algumas áreas a mais de 1.000 m de profundidade. O descongelamento do permafrost induzido pelo aquecimento global libera CH₄ (30× mais potente que CO₂ em 20 anos) e CO₂ estocados há milênios — feedback positivo ao clima potencialmente catastrófico que pode liberar até 1,7 trilhões de toneladas de C.',
    'pt-BR', 4, 'ecosystems', 'ecosystem-tundra',
    'src-chapin-2000', 'CHAPIN-2000',
    '{}'::jsonb, NOW(), TRUE
  ),
  (
    'gfact-tundra-fator-abiotico',
    'domain-environmental-ecology',
    'abiotic-factor',
    'tundra-fator-abiotico',
    'Tundra — Permafrost, Temperatura e Nutrientes',
    'A tundra opera sob temperatura média anual de -10°C a -4°C, precipitação escassa de 150–400 mm/ano (equivalente a semiárido, sem evapotranspiração significativa). O permafrost bloqueia a drenagem: 90% dos solos ficam saturados no verão, formando lagos rasos e pântanos. Camada ativa (active layer) de 30–100 cm descongela no verão. Deposição de nitrogênio é limitante (< 1 g N/m²/ano). Produtividade primária líquida: ~100–150 g C/m²/ano — ~10× menor que florestas tropicais. Solos Gelissolos com alto teor de matéria orgânica congelada (turbas criocongeladas).',
    'pt-BR', 5, 'ecosystems', 'ecosystem-tundra',
    'src-chapin-2000', 'CHAPIN-2000',
    '{}'::jsonb, NOW(), TRUE
  ),
  (
    'gfact-tundra-especies',
    'domain-environmental-ecology',
    'species',
    'tundra-especies',
    'Tundra — Flora e Fauna Adaptadas ao Frio',
    'Flora dominante: Sphagnum spp. (turfa — estoca ~30% do carbono terrestre), Eriophorum vaginatum (capim-de-algodão — indicador de degelo), Vaccinium myrtillus (mirtilo-ártico), Dryas octopetala, Salix arctica (salgueiro-anão). Fauna: Rena/Caribu (Rangifer tarandus — migração de até 5.000 km), Lemming (Lemmus lemmus — ciclos de 3–5 anos impulsionam predadores como a coruja-das-neves), Raposa-ártica (Vulpes lagopus — pelagem branca no inverno), Boi-almiscarado (Ovibos moschatus). Mais de 50 spp. de aves migratórias dependem da tundra para reprodução.',
    'pt-BR', 5, 'ecosystems', 'ecosystem-tundra',
    'src-chapin-2000', 'CHAPIN-2000',
    '{}'::jsonb, NOW(), TRUE
  ),
  (
    'gfact-tundra-monitoramento',
    'domain-environmental-ecology',
    'artificial-project',
    'tundra-monitoramento',
    'Tundra — Monitoramento Climático e Impactos Antrópicos',
    'A tundra é alvo de monitoramento intensivo via redes internacionais: ITEX (International Tundra Experiment — experimentos de aquecimento artificial), CALM (Circumpolar Active Layer Monitoring — espessura do permafrost), e LTER sites árticos. Impactos da exploração de petróleo no Ártico (ex. Alasca, Sibéria) são mitigados por tubulações elevadas (para preservar permafrost) e regulamentação de perfuração sazonal. A "arctitização" (shrubification — expansão de arbustos Betula e Salix) é monitorada como indicador de aquecimento e modifica o albedo da superfície (feedback adicional ao clima).',
    'pt-BR', 4, 'ecosystems', 'ecosystem-tundra',
    'src-sara-analytical-report', 'SARA-ANALYTICAL-2026',
    '{}'::jsonb, NOW(), TRUE
  ),
  (
    'gfact-tundra-referencia',
    'domain-environmental-ecology',
    'reference',
    'tundra-referencia',
    'Tundra — Referência Bibliográfica Principal',
    'Chapin FS III et al. 2000. Arctic and Boreal Ecosystems of Western North America as Components of the Climate System. Global Change Biology 6(S1):211–223. DOI: 10.1046/j.1365-2486.2000.06022.x. — Análise das interações entre ecossistemas árticos/boreais e o sistema climático global; base para modelos de feedback entre descongelamento do permafrost e aquecimento global.',
    'pt-BR', 4, 'ecosystems', 'ecosystem-tundra',
    'src-chapin-2000', 'CHAPIN-2000',
    '{}'::jsonb, NOW(), TRUE
  )

ON CONFLICT (domain_id, category, slug) DO UPDATE SET
  title      = EXCLUDED.title,
  fact_text  = EXCLUDED.fact_text,
  importance = EXCLUDED.importance,
  entity_table = EXCLUDED.entity_table,
  entity_id  = EXCLUDED.entity_id,
  source_id  = EXCLUDED.source_id,
  citation_key = EXCLUDED.citation_key,
  is_active  = EXCLUDED.is_active,
  updated_at = NOW();
