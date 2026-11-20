import React,{act} from "react";
import {createRoot,type Root} from "react-dom/client";
import {afterEach,expect,it,vi} from "vitest";
import {EcologyCatalogSection} from "../features/ecology/EcologyCatalogSection";
import {ecologyApi,type SpeciesRow} from "../services/api/ecology";

vi.mock("../services/api/ecology",()=>({ecologyApi:{listEcosystems:vi.fn(),listSpecies:vi.fn(),getCoverage:vi.fn()}}));
let root:Root|undefined;let element:HTMLDivElement;
const species=(name:string):SpeciesRow=>({id:name,scientific_name:name,common_name:name,native_range:null,
 conservation_status:null,trophic_role_label:null,trophic_level:null,ecosystem_slugs:[],catalog_sources:["simulation"],
 simulation_biomes:["pantanal","savana-tropical","mata-atlantica","floresta-tropical-umida"]});
afterEach(async()=>{if(root)await act(async()=>root?.unmount());element?.remove();vi.resetAllMocks();});
async function mount(){
 Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
 vi.mocked(ecologyApi.listEcosystems).mockResolvedValue({data:[],meta:{page:1,pageSize:12,total:0}});
 element=document.createElement("div");document.body.appendChild(element);root=createRoot(element);
 await act(async()=>root!.render(<EcologyCatalogSection/>));
}
async function click(label:string){
 const button=[...element.querySelectorAll("button")].find(b=>b.textContent?.trim()===label);
 expect(button).toBeTruthy();await act(async()=>button!.click());
}
async function search(value:string){
 const input=element.querySelector("input")!;
 await act(async()=>{
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")!.set!.call(input,value);
  input.dispatchEvent(new Event("input",{bubbles:true}));
 });
 await act(async()=>element.querySelector("form")!.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true})));
}

it("shows full totals, every habitat and source, and makes the final species page reachable",async()=>{
 const first={...species("Panthera onca"),catalog_sources:["grounding","simulation"] as const};
 vi.mocked(ecologyApi.listSpecies).mockResolvedValueOnce({data:[{...first,catalog_sources:[...first.catalog_sources]}],meta:{page:1,pageSize:12,total:13}})
  .mockResolvedValueOnce({data:[species("Última espécie")],meta:{page:2,pageSize:12,total:13}});
 await mount();await click("Espécies");
 expect(element.textContent).toContain("13 espécies no catálogo completo");
 expect(element.textContent).toContain("Registro científico");expect(element.textContent).toContain("Na simulação");
 expect(element.textContent).toContain("floresta-tropical-umida");
 await click("Próxima");
 expect(vi.mocked(ecologyApi.listSpecies).mock.calls.at(-1)?.[0]).toMatchObject({page:2,pageSize:12});
 expect(element.textContent).toContain("Última espécie");expect(element.textContent).toContain("Página 2 de 2");
 expect([...element.querySelectorAll("button")].find(b=>b.textContent?.trim()==="Próxima")?.disabled).toBe(true);
});

it("searches from page one and allows recovery after an empty search",async()=>{
 vi.mocked(ecologyApi.listSpecies).mockResolvedValueOnce({data:[species("Animal inicial")],meta:{page:1,pageSize:12,total:135}})
  .mockResolvedValueOnce({data:[],meta:{page:1,pageSize:12,total:0}})
  .mockResolvedValueOnce({data:[species("Puma concolor")],meta:{page:1,pageSize:12,total:1}});
 await mount();await click("Espécies");await search("inexistente");
 expect(element.textContent).toContain("Nenhuma espécie");expect(element.querySelector("form")).toBeTruthy();
 await search("puma");
 expect(ecologyApi.listSpecies).toHaveBeenLastCalledWith({page:1,pageSize:12,search:"puma"});
 expect(element.textContent).toContain("Puma concolor");
});

it("coverage distinguishes full species counts from the unchanged seven scientific facts",async()=>{
 vi.mocked(ecologyApi.getCoverage).mockResolvedValue({data:{totalFacts:90,activeFacts:90,categoryCounts:{species:7},
  speciesCatalog:{total:135,scientificRecords:7,simulationProfiles:130,simulationSpecies:129,sharedSpecies:1}}});
 await mount();await click("Cobertura");
 const cards=[...element.querySelectorAll(".coverage-stat")].map(c=>c.textContent);
 expect(cards).toContain("135Espécies no catálogo completo");
 expect(cards).toContain("130Perfis de simulação");
 expect(cards).toContain("7Fatos científicos · species");
});
