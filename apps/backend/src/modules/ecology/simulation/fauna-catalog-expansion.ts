import type { RawSpecies, FaunaCategory, FeedingStrategy, TaxonGroup, HabitatType } from "./fauna-definition.service";

// Biome membership is deliberately conservative. See docs/ecology/fauna-curation.md.
// Speeds, mass, populations and flock distances are simulation parameters, not field measurements.
type Entry = [
  id: string, name: string, scientificName: string, category: FaunaCategory,
  biomes: string[], feeding: FeedingStrategy, taxon: TaxonGroup,
  prey?: string[], primary?: HabitatType[],
];

// Second batch: birds recorded in Cerrado mosaics by ICMBio's PNB guide.
// Conservative inclusion only; forest species require gallery/woodland cells.
// Fine-scale ranges and seasonal movement are outside this biome model.
const CERRADO_BIRDS: [string, string, string, FeedingStrategy, HabitatType[]][] = [
  ["papagaio-verdadeiro", "Papagaio-verdadeiro", "Amazona aestiva", "herbivore", ["forest", "canopy"]],
  ["papagaio-galego", "Papagaio-galego", "Alipiopsitta xanthops", "herbivore", ["grassland", "forest"]],
  ["periquito-rei", "Periquito-rei", "Eupsittula aurea", "herbivore", ["grassland", "forest"]],
  ["periquito-encontro-amarelo", "Periquito-de-encontro-amarelo", "Brotogeris chiriri", "herbivore", ["forest", "canopy"]],
  ["maracana-pequena", "Maracanã-pequena", "Diopsittaca nobilis", "herbivore", ["forest", "canopy"]],
  ["maitaca-verde", "Maitaca-verde", "Pionus maximiliani", "herbivore", ["forest", "canopy"]],
  ["rolinha-roxa", "Rolinha-roxa", "Columbina talpacoti", "herbivore", ["grassland"]],
  ["pombao", "Pombão", "Patagioenas picazuro", "herbivore", ["grassland", "forest"]],
  ["juriti-pupu", "Juriti-pupu", "Leptotila verreauxi", "herbivore", ["forest"]],
  ["fogo-apagou", "Fogo-apagou", "Columbina squammata", "herbivore", ["grassland"]],
  ["canario-da-terra", "Canário-da-terra", "Sicalis flaveola", "herbivore", ["grassland"]],
  ["tiziu", "Tiziu", "Volatinia jacarina", "herbivore", ["grassland"]],
  ["coleirinho", "Coleirinho", "Sporophila caerulescens", "herbivore", ["grassland"]],
  ["baiano", "Baiano", "Sporophila nigricollis", "herbivore", ["grassland"]],
  ["bico-de-pimenta", "Bico-de-pimenta", "Saltatricula atricollis", "omnivore", ["grassland"]],
  ["curio", "Curió", "Sporophila angolensis", "herbivore", ["grassland", "riverbank"]],
  ["patativa", "Patativa", "Sporophila plumbea", "herbivore", ["grassland"]],
  ["bigodinho", "Bigodinho", "Sporophila lineola", "herbivore", ["grassland"]],
  ["cigarra-do-campo", "Cigarra-do-campo", "Neothraupis fasciata", "omnivore", ["grassland"]],
  ["tico-tico", "Tico-tico", "Zonotrichia capensis", "omnivore", ["grassland"]],
  ["sanhaco-cinzento", "Sanhaço-cinzento", "Thraupis sayaca", "omnivore", ["forest", "canopy"]],
  ["sanhaco-do-coqueiro", "Sanhaço-do-coqueiro", "Thraupis palmarum", "omnivore", ["forest", "canopy"]],
  ["sabia-laranjeira", "Sabiá-laranjeira", "Turdus rufiventris", "omnivore", ["forest"]],
  ["sabia-do-campo", "Sabiá-do-campo", "Mimus saturninus", "omnivore", ["grassland"]],
  ["sabia-barranco", "Sabiá-barranco", "Turdus leucomelas", "omnivore", ["forest"]],
  ["gralha-canca", "Gralha-cancã", "Cyanocorax cyanopogon", "omnivore", ["forest", "grassland"]],
  ["trinca-ferro", "Trinca-ferro", "Saltator similis", "omnivore", ["forest"]],
  ["sai-azul", "Saí-azul", "Dacnis cayana", "omnivore", ["forest", "canopy"]],
  ["saira-amarela", "Saíra-amarela", "Tangara cayana", "omnivore", ["forest", "canopy"]],
  ["sai-andorinha", "Saí-andorinha", "Tersina viridis", "omnivore", ["forest", "canopy"]],
];

const ENTRIES: Entry[] = [
  ["preguica-tres-dedos", "Preguiça-de-três-dedos", "Bradypus variegatus", "herbivore-small", ["floresta-tropical-umida", "mata-atlantica"], "herbivore", "mamífero", [], ["canopy"]],
  ["preguica-dois-dedos", "Preguiça-de-dois-dedos", "Choloepus didactylus", "herbivore-small", ["floresta-tropical-umida"], "herbivore", "mamífero", [], ["canopy"]],
  ["macaco-de-cheiro", "Macaco-de-cheiro", "Saimiri sciureus", "herbivore-small", ["floresta-tropical-umida"], "omnivore", "mamífero", [], ["canopy"]],
  ["uacari-branco", "Uacari-branco", "Cacajao calvus", "herbivore-small", ["floresta-tropical-umida"], "omnivore", "mamífero", [], ["canopy"]],
  ["macaco-aranha", "Macaco-aranha-preto", "Ateles paniscus", "herbivore-small", ["floresta-tropical-umida"], "herbivore", "mamífero", [], ["canopy"]],
  ["arara-caninde", "Arara-canindé", "Ara ararauna", "bird", ["floresta-tropical-umida", "savana-tropical", "pantanal"], "herbivore", "ave"],
  ["arara-vermelha", "Arara-vermelha-grande", "Ara chloropterus", "bird", ["floresta-tropical-umida", "savana-tropical", "pantanal"], "herbivore", "ave"],
  ["jacamim", "Jacamim-de-costas-cinzentas", "Psophia crepitans", "bird", ["floresta-tropical-umida"], "omnivore", "ave", [], ["forest"]],
  ["mico-leao-dourado", "Mico-leão-dourado", "Leontopithecus rosalia", "herbivore-small", ["mata-atlantica"], "omnivore", "mamífero", [], ["canopy"]],
  ["muriqui-do-sul", "Muriqui-do-sul", "Brachyteles arachnoides", "herbivore-small", ["mata-atlantica"], "herbivore", "mamífero", [], ["canopy"]],
  ["jacutinga", "Jacutinga", "Aburria jacutinga", "bird", ["mata-atlantica"], "herbivore", "ave"],
  ["jacu-guacu", "Jacu-guaçu", "Penelope obscura", "bird", ["mata-atlantica"], "herbivore", "ave"],
  ["saira-sete-cores", "Saíra-sete-cores", "Tangara seledon", "bird", ["mata-atlantica"], "omnivore", "ave"],
  ["preguica-de-coleira", "Preguiça-de-coleira", "Bradypus torquatus", "herbivore-small", ["mata-atlantica"], "herbivore", "mamífero", [], ["canopy"]],
  ["esquilo-brasileiro", "Esquilo-brasileiro", "Guerlinguetus brasiliensis", "herbivore-small", ["mata-atlantica", "floresta-tropical-umida"], "herbivore", "mamífero", [], ["forest", "canopy"]],
  ["tamandua-bandeira", "Tamanduá-bandeira", "Myrmecophaga tridactyla", "herbivore-large", ["savana-tropical", "pantanal", "floresta-tropical-umida"], "carnivore", "mamífero", ["formiga-cortadeira"]],
  ["tamandua-mirim", "Tamanduá-mirim", "Tamandua tetradactyla", "herbivore-small", ["floresta-tropical-umida", "mata-atlantica", "savana-tropical", "caatinga"], "carnivore", "mamífero", ["formiga-cortadeira"]],
  ["tatu-canastra", "Tatu-canastra", "Priodontes maximus", "herbivore-large", ["floresta-tropical-umida", "savana-tropical", "pantanal"], "carnivore", "mamífero", ["formiga-cortadeira"]],
  ["tatu-bola", "Tatu-bola-do-nordeste", "Tolypeutes tricinctus", "herbivore-small", ["caatinga", "savana-tropical"], "omnivore", "mamífero", ["formiga-cortadeira"]],
  ["tatu-peba", "Tatu-peba", "Euphractus sexcinctus", "herbivore-small", ["savana-tropical", "caatinga", "pantanal"], "omnivore", "mamífero"],
  ["caititu", "Caititu", "Pecari tajacu", "herbivore-large", ["floresta-tropical-umida", "mata-atlantica", "savana-tropical", "caatinga", "pantanal"], "omnivore", "mamífero"],
  ["cachorro-do-mato", "Cachorro-do-mato", "Cerdocyon thous", "predator-medium", ["mata-atlantica", "savana-tropical", "caatinga", "pantanal"], "omnivore", "mamífero", ["prea", "tatu-peba"]],
  ["raposa-do-campo", "Raposa-do-campo", "Lycalopex vetulus", "predator-medium", ["savana-tropical"], "omnivore", "mamífero", ["formiga-cortadeira", "prea"]],
  ["teiu", "Teiú", "Salvator merianae", "herbivore-small", ["mata-atlantica", "savana-tropical", "caatinga", "pantanal"], "omnivore", "réptil"],
  ["cascavel", "Cascavel", "Crotalus durissus", "predator-medium", ["savana-tropical", "caatinga", "pradaria-estepe"], "carnivore", "réptil", ["prea"]],
  ["gralha-do-campo", "Gralha-do-campo", "Cyanocorax cristatellus", "bird", ["savana-tropical"], "omnivore", "ave", [], ["grassland", "forest"]],
  ["codorna-amarela", "Codorna-amarela", "Nothura maculosa", "bird", ["savana-tropical", "pradaria-estepe"], "omnivore", "ave", [], ["grassland"]],
  ["perdiz", "Perdiz", "Rhynchotus rufescens", "bird", ["savana-tropical", "pradaria-estepe"], "omnivore", "ave", [], ["grassland"]],
  ["avoante", "Avoante", "Zenaida auriculata", "bird", ["caatinga", "savana-tropical", "pradaria-estepe"], "herbivore", "ave"],
  // Restricted to humid forest enclaves of the Caatinga, not generic dry scrub.
  ["soldadinho-do-araripe", "Soldadinho-do-araripe", "Antilophia bokermanni", "bird", ["caatinga"], "omnivore", "ave", [], ["forest", "riverbank"]],
  ["bigua", "Biguá", "Nannopterum brasilianum", "bird", ["pantanal", "lago", "manguezal"], "carnivore", "ave", ["lambari", "curimbata"], ["wetland", "riverbank"]],
  ["colhereiro", "Colhereiro", "Platalea ajaja", "bird", ["pantanal", "manguezal"], "carnivore", "ave", [], ["wetland", "riverbank"]],
  ["guara", "Guará", "Eudocimus ruber", "bird", ["manguezal"], "carnivore", "ave", ["caranguejo-uca", "aratu-vermelho"], ["wetland", "riverbank"]],
  ["caranguejo-uca", "Caranguejo-uçá", "Ucides cordatus", "herbivore-small", ["manguezal"], "herbivore", "invertebrado", [], ["wetland", "riverbank"]],
  ["aratu-vermelho", "Aratu-vermelho", "Goniopsis cruentata", "herbivore-small", ["manguezal"], "omnivore", "invertebrado", [], ["wetland", "riverbank"]],
  ["lambari", "Lambari-do-rabo-amarelo", "Astyanax lacustris", "fish", ["lago", "pantanal", "savana-tropical", "mata-atlantica"], "omnivore", "peixe", [], ["lake", "riverbank"]],
  ["curimbata", "Curimbatá", "Prochilodus lineatus", "fish", ["lago", "pantanal"], "herbivore", "peixe", [], ["lake", "riverbank"]],
  ["dourado", "Dourado", "Salminus brasiliensis", "fish", ["pantanal"], "carnivore", "peixe", ["lambari", "curimbata"], ["riverbank"]],
  ["pintado", "Pintado", "Pseudoplatystoma corruscans", "fish", ["pantanal"], "carnivore", "peixe", ["lambari", "curimbata"], ["riverbank"]],
  // Amazon basin only: generic lake/pantanal must not introduce this species elsewhere.
  ["tambaqui", "Tambaqui", "Colossoma macropomum", "fish", ["floresta-tropical-umida"], "omnivore", "peixe", [], ["lake", "riverbank"]],
];

ENTRIES.push(...CERRADO_BIRDS.map(([id, name, scientific, feeding, primary]): Entry =>
  [id, name, scientific, "bird", ["savana-tropical"], feeding, "ave", [], primary]));

export const ADDITIONAL_SPECIES: RawSpecies[] = ENTRIES.map(
  ([id, commonName, scientificName, category, habitableBiomes, feedingStrategy, taxonGroup, preySpeciesIds = [], primary]) => ({
    id, commonName, scientificName, category, habitableBiomes, feedingStrategy, taxonGroup, preySpeciesIds,
    trophicLevel: feedingStrategy === "carnivore" || preySpeciesIds.length > 0 ? "mesopredator" : "herbivore",
    populationTarget: category === "fish" ? 5 : 3,
    mass: id.startsWith("preguica") ? 0.25 : undefined,
    movementProfile: {
      maxSpeed: id.startsWith("preguica") ? 0.3 : category === "fish" ? 2.3 : 1.8,
      turnRate: 2.5, fleeMultiplier: 2,
    },
    flockProfile: { formsFlocks: category === "fish" || category === "bird", flockRadius: 3, separationDistance: 0.7 },
    habitatProfile: {
      ...(primary ? { primary } : {}),
      waterDependency: category === "fish" || ["bigua", "colhereiro", "guara", "soldadinho-do-araripe", "caranguejo-uca", "aratu-vermelho"].includes(id) ? "high" : "low",
    },
  }),
);
