import { ecologicalGroundingRepository, type SpeciesRow } from "./grounding/ecological-grounding.repository";
import { listCatalogSpecies, type SpeciesDefinition } from "./simulation/fauna-definition.service";
import { INVADER_PROFILES, type InvaderProfile } from "./simulation/invasive-scenario.service";

export interface CatalogSpeciesRow extends SpeciesRow {
  catalog_sources: Array<"grounding" | "simulation" | "bioinvasion">;
  simulation_profile_ids: string[];
  simulation_names: string[];
  simulation_biomes: string[];
  invasion_profile_names: string[];
  invasion_presets: string[];
  trophic_role_slugs: string[];
}

const key = (text: string) => text.trim().replace(/\s+/g, " ").toLowerCase();
const searchable = (text: string) => key(text).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const unique = (values: string[]) => [...new Set(values)].sort((a,b)=>a.localeCompare(b,"pt-BR"));
const habitatAliases: Record<string,string> = {cerrado:"savana-tropical",amazonia:"floresta-tropical-umida",
  oceano:"oceano-pelagico",mangue:"manguezal",deserto:"deserto-quente",pampa:"pradaria-estepe",pradaria:"pradaria-estepe"};
const roleLabels = {producer:"Produtor",herbivore:"Herbívoro",mesopredator:"Mesopredador",apex:"Predador de topo"};

/** Display union only. Simulation profiles are not inserted as sourced RAG facts. */
export function mergeSpeciesCatalog(database: readonly SpeciesRow[], simulation: readonly SpeciesDefinition[], invasion: readonly InvaderProfile[] = []): CatalogSpeciesRow[] {
  const rows = new Map<string,CatalogSpeciesRow>();
  for(const item of database) {
    const identity=key(item.scientific_name), previous=rows.get(identity);
    if(previous) {previous.ecosystem_slugs=unique([...previous.ecosystem_slugs,...item.ecosystem_slugs]);continue;}
    rows.set(identity,{...item,ecosystem_slugs:[...item.ecosystem_slugs],catalog_sources:["grounding"],
      simulation_profile_ids:[],simulation_names:[],simulation_biomes:[],invasion_profile_names:[],invasion_presets:[],
      trophic_role_slugs:item.trophic_role_slug?[item.trophic_role_slug]:[]});
  }
  for(const species of simulation) {
    const identity=key(species.scientificName);
    let row=rows.get(identity);
    if(!row) {
      row={id:`simulation:${species.id}`,scientific_name:species.scientificName,common_name:species.commonName,
        native_range:null,conservation_status:null,intraspecific_notes:null,
        trophic_role_label:roleLabels[species.trophicLevel],trophic_level:null,ecosystem_slugs:[],
        catalog_sources:[],simulation_profile_ids:[],simulation_names:[],simulation_biomes:[],invasion_profile_names:[],invasion_presets:[],trophic_role_slugs:[]};
      rows.set(identity,row);
    }
    if(!row.catalog_sources.includes("simulation"))row.catalog_sources.push("simulation");
    row.common_name ??= species.commonName;
    row.simulation_profile_ids=unique([...row.simulation_profile_ids,species.id]);
    row.simulation_names=unique([...row.simulation_names,species.commonName]);
    row.simulation_biomes=unique([...row.simulation_biomes,...species.habitableBiomes]);
    row.trophic_role_slugs=unique([...row.trophic_role_slugs,species.feedingStrategy,species.trophicLevel,
      ...(species.trophicLevel==="apex"?["apex-predator"]:[])]);
  }
  for(const profile of invasion) {
    const identity=key(profile.scientificName);
    let row=rows.get(identity);
    if(!row) {
      row={id:`bioinvasion:${identity.replace(/\s+/g,"-")}`,scientific_name:profile.scientificName,common_name:profile.displayName,
        native_range:null,conservation_status:null,intraspecific_notes:null,trophic_role_label:roleLabels[profile.trophicLevel],
        trophic_level:null,ecosystem_slugs:[],catalog_sources:[],simulation_profile_ids:[],simulation_names:[],simulation_biomes:[],
        invasion_profile_names:[],invasion_presets:[],trophic_role_slugs:[]};
      rows.set(identity,row);
    }
    if(!row.catalog_sources.includes("bioinvasion"))row.catalog_sources.push("bioinvasion");
    row.common_name ??= profile.displayName;
    row.invasion_profile_names=unique([...row.invasion_profile_names,profile.displayName]);
    row.invasion_presets=unique([...row.invasion_presets,...profile.compatiblePresets]);
    row.trophic_role_slugs=unique([...row.trophic_role_slugs,profile.feedingStrategy,profile.trophicLevel,
      ...(profile.trophicLevel==="apex"?["apex-predator"]:[])]);
  }
  return [...rows.values()].sort((a,b)=>a.scientific_name.localeCompare(b.scientific_name,"pt-BR")||a.id.localeCompare(b.id));
}

export class SpeciesCatalogService {
  constructor(private readonly repository: Pick<typeof ecologicalGroundingRepository,"listSpecies"|"getDomainCoverageStats"> = ecologicalGroundingRepository) {}

  private async all() {
    const database:SpeciesRow[]=[];
    // The source table is paginated independently. Never merge after slicing
    // the visible page: doing so would repeat/omit profiles between pages.
    for(let offset=0;;offset+=200) {
      const page=await this.repository.listSpecies({limit:200,offset});
      database.push(...page.rows);
      if(!page.rows.length || database.length>=page.total)break;
    }
    const simulation=listCatalogSpecies();
    return {rows:mergeSpeciesCatalog(database,simulation,INVADER_PROFILES),database,simulation};
  }

  async list(filters:{ecosystemSlug?:string;trophicRole?:string;search?:string;limit:number;offset:number}) {
    const {rows}=await this.all();
    const wanted=filters.ecosystemSlug, habitat=wanted?(habitatAliases[wanted]??wanted):undefined;
    const term=filters.search?searchable(filters.search):"";
    const filtered=rows.filter(row=>(!wanted || row.ecosystem_slugs.some(slug=>(habitatAliases[slug]??slug)===habitat) || row.simulation_biomes.includes(habitat!) || row.invasion_presets.some(slug=>(habitatAliases[slug]??slug)===habitat)) &&
      (!filters.trophicRole || row.trophic_role_slugs.includes(filters.trophicRole)) &&
      (!term || searchable([row.scientific_name,row.common_name,...row.simulation_names,...row.invasion_profile_names].join(" ")).includes(term)));
    return {rows:filtered.slice(filters.offset,filters.offset+filters.limit),total:filtered.length};
  }

  async coverage() {
    const [stats,{rows,database,simulation}]=await Promise.all([this.repository.getDomainCoverageStats(),this.all()]);
    return {...stats,speciesCatalog:{total:rows.length,scientificRecords:database.length,
      simulationProfiles:simulation.length,simulationSpecies:rows.filter(r=>r.catalog_sources.includes("simulation")).length,
      sharedSpecies:rows.filter(r=>r.catalog_sources.includes("grounding")&&r.catalog_sources.includes("simulation")).length,
      bioinvasionProfiles:INVADER_PROFILES.length,bioinvasionSpecies:rows.filter(r=>r.catalog_sources.includes("bioinvasion")).length}};
  }
}
export const speciesCatalogService=new SpeciesCatalogService();
