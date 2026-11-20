import assert from "node:assert/strict";
import test from "node:test";
import {mergeSpeciesCatalog,SpeciesCatalogService} from "./species-catalog.service";
import {listCatalogSpecies} from "./simulation/fauna-definition.service";
import type {SpeciesRow} from "./grounding/ecological-grounding.repository";
import {INVADER_PROFILES} from "./simulation/invasive-scenario.service";

const record=(name:string,id=name):SpeciesRow=>({id,scientific_name:name,common_name:name,native_range:null,
  conservation_status:null,trophic_role_label:null,trophic_level:null,intraspecific_notes:null,ecosystem_slugs:[]});
const scientific=[{...record("Panthera onca","db-onca"),common_name:"Onça-pintada",conservation_status:"Registro científico existente",ecosystem_slugs:["pantanal"]},
  {...record("Caryocar brasiliense","db-pequi"),ecosystem_slugs:["cerrado"],trophic_role_slug:"primary-producer"}];
const stats={totalFacts:90,activeFacts:90,categoryCounts:{species:7},ecosystemCount:21,sourceCount:15};
function service(database:SpeciesRow[]=scientific) {
  return new SpeciesCatalogService({listSpecies:async({limit,offset})=>({rows:database.slice(offset,offset+limit),total:database.length}),
    getDomainCoverageStats:async()=>structuredClone(stats)});
}

test("Catalog union exposes every simulation profile and scientific species without duplicating taxa",()=>{
  const simulation=listCatalogSpecies(),before=structuredClone(simulation),dbBefore=structuredClone(scientific);
  const rows=mergeSpeciesCatalog(scientific,simulation);
  assert.equal(rows.length,new Set([...simulation.map(s=>s.scientificName.toLowerCase()),...scientific.map(s=>s.scientific_name.toLowerCase())]).size);
  assert.deepEqual(rows.flatMap(r=>r.simulation_profile_ids).sort(),simulation.map(s=>s.id).sort());
  const onca=rows.find(s=>s.scientific_name==="Panthera onca")!;
  assert.deepEqual(onca.catalog_sources,["grounding","simulation"]);
  assert.equal(onca.id,"db-onca");assert.equal(onca.conservation_status,scientific[0]!.conservation_status);
  const puma=rows.filter(s=>s.scientific_name==="Puma concolor");
  assert.equal(puma.length,1);assert.ok(puma[0]!.simulation_profile_ids.includes("puma-andino"));assert.equal(puma[0]!.simulation_profile_ids.length,2);
  assert.deepEqual(simulation,before);assert.deepEqual(scientific,dbBefore);
  for(const row of rows.filter(s=>s.catalog_sources.length===1&&s.catalog_sources[0]==="simulation")) {
    assert.equal(row.conservation_status,null);assert.equal(row.native_range,null);assert.deepEqual(row.ecosystem_slugs,[]);
  }
});

test("Stable pagination covers the union exactly once and retains totals on empty pages",async()=>{
  const catalog=service(),all=await catalog.list({limit:1000,offset:0});const paged=[];
  for(let offset=0;offset<all.total;offset+=12){const p=await catalog.list({limit:12,offset});assert.equal(p.total,all.total);paged.push(...p.rows);}
  assert.deepEqual(paged,all.rows);assert.equal(new Set(paged.map(r=>r.id)).size,all.total);
  assert.deepEqual(await catalog.list({limit:12,offset:all.total+12}),{rows:[],total:all.total});
});

test("Search finds common names, scientific names and merged regional profile names",async()=>{
  for(const search of ["onca-pintada","ONÇA-PINTADA","Panthera onca"]){
    const result=await service().list({search,limit:12,offset:0});assert.equal(result.total,1);assert.equal(result.rows[0]!.scientific_name,"Panthera onca");
  }
  const andino=await service().list({search:"Puma-andino",limit:12,offset:0});
  assert.equal(andino.total,1);assert.equal(andino.rows[0]!.scientific_name,"Puma concolor");
  assert.equal((await service().list({search:"espécie inexistente",limit:12,offset:0})).total,0);
});

test("Habitat and trophic filters apply before pagination across both sources",async()=>{
  const cerrado=await service().list({ecosystemSlug:"cerrado",limit:1000,offset:0});
  const savanna=await service().list({ecosystemSlug:"savana-tropical",limit:1000,offset:0});
  assert.deepEqual(cerrado,savanna);assert.ok(cerrado.rows.some(s=>s.scientific_name==="Caryocar brasiliense"));
  assert.ok(cerrado.rows.every(s=>s.ecosystem_slugs.includes("cerrado")||s.simulation_biomes.includes("savana-tropical")||s.invasion_presets.includes("cerrado")));
  const polar=await service().list({ecosystemSlug:"oceano-polar",limit:1000,offset:0});
  assert.ok(polar.total>0);assert.ok(polar.rows.every(s=>s.simulation_biomes.includes("oceano-polar")));
  const producers=await service().list({trophicRole:"primary-producer",limit:12,offset:0});
  assert.equal(producers.total,1);assert.equal(producers.rows[0]!.scientific_name,"Caryocar brasiliense");
});

test("All bioinvasion profiles are discoverable, including invaders absent from the native simulation catalog",async()=>{
  const catalog=service(),all=await catalog.list({limit:1000,offset:0});
  for(const profile of INVADER_PROFILES){
    const species=all.rows.find(s=>s.scientific_name===profile.scientificName);
    assert.ok(species,profile.scientificName);
    assert.ok(species.catalog_sources.includes("bioinvasion"));
    assert.ok(species.invasion_profile_names.includes(profile.displayName));
    assert.deepEqual(species.invasion_presets,[...new Set(profile.compatiblePresets)].sort((a,b)=>a.localeCompare(b,"pt-BR")));
  }
  const boar=await catalog.list({search:"javali",limit:12,offset:0});
  assert.equal(boar.total,1);assert.equal(boar.rows[0]!.scientific_name,"Sus scrofa");
  assert.deepEqual(boar.rows[0]!.catalog_sources,["bioinvasion"]);assert.equal(boar.rows[0]!.conservation_status,null);
  assert.equal((await catalog.coverage()).speciesCatalog.bioinvasionProfiles,INVADER_PROFILES.length);
});

test("Scientific source pagination is fully read and coverage does not inflate grounded facts",async()=>{
  const database=Array.from({length:215},(_,i)=>record(`Test taxon ${i}`,`db-${i}`));
  const catalog=service(database),coverage=await catalog.coverage();
  assert.equal(coverage.speciesCatalog.scientificRecords,215);
  assert.equal(coverage.categoryCounts.species,7);assert.equal(coverage.totalFacts,90);
  assert.equal(coverage.speciesCatalog.simulationProfiles,listCatalogSpecies().length);
  assert.equal((await catalog.list({search:"Test taxon 214",limit:12,offset:0})).total,1);
});
