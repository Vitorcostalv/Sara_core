import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Bug, MapPin, WarningCircle } from "@phosphor-icons/react";
import { Button, EmptyState, ErrorState, LoadingBlock, StatusPill } from "../../components/ui";
import { getApiErrorMessage } from "../../services/api/client";
import { ecologyApi } from "../../services/api/ecology";
import type {
  InvasiveScenarioResult,
  PlausibilityRating,
  SpeciesDefinition,
  TerrainCell,
} from "../../services/api/ecology";
import { buildCompactFaunaGrid, TerrainView } from "./EcologyTerrainSection";
import type { FaunaEvent } from "./FaunaLayer";
import { getOfflineInvasiveSnapshot, saveLastScenario } from "../../demo/offline";

const RATING_LABEL: Record<PlausibilityRating, string> = {
  alto: "Alto",
  medio: "Medio",
  baixo: "Baixo",
};

const RATING_TONE: Record<PlausibilityRating, "success" | "warning" | "error"> = {
  alto: "success",
  medio: "warning",
  baixo: "error",
};

const EFFECT_LABEL: Record<string, string> = {
  predation: "Predacao",
  competition: "Competicao",
  "habitat-alteration": "Alteracao de habitat",
  disease: "Doenca",
  "resource-pressure": "Pressao sobre recursos",
  none: "Sem impacto direto",
};

interface InvasionLocationOption {
  id: string;
  label: string;
  locationText: string;
  description: string;
}

interface InvasiveSpeciesOption {
  id: string;
  label: string;
  scientificName: string;
  speciesText: string;
}

const INVASION_LOCATIONS: InvasionLocationOption[] = [
  { id: "cerrado", label: "Cerrado brasileiro", locationText: "cerrado brasileiro", description: "Savana tropical com estação seca, campos e vegetação arbustiva." },
  { id: "caatinga", label: "Caatinga semiárida", locationText: "caatinga semiárida", description: "Ambiente quente e seco, com recursos hídricos limitados." },
  { id: "amazonia", label: "Floresta Amazônica", locationText: "floresta amazônica com rios", description: "Floresta tropical úmida, densa e conectada por rios." },
  { id: "mata-atlantica", label: "Mata Atlântica", locationText: "mata atlântica úmida", description: "Floresta úmida costeira com alta biodiversidade." },
  { id: "pantanal", label: "Pantanal", locationText: "pantanal com planícies alagadas", description: "Mosaico sazonal de áreas terrestres e alagadas." },
  { id: "pampa", label: "Pampa", locationText: "pampa com campos sulinos", description: "Campos abertos subtropicais do sul brasileiro." },
  { id: "pradaria", label: "Pradaria", locationText: "pradaria de campos abertos", description: "Planície dominada por gramíneas e herbívoros." },
  { id: "mangue", label: "Manguezal", locationText: "manguezal costeiro", description: "Zona úmida costeira sujeita às marés." },
  { id: "floresta-tropical", label: "Floresta tropical", locationText: "floresta tropical quente e úmida", description: "Ambiente florestal tropical genérico e úmido." },
  { id: "floresta-temperada", label: "Floresta temperada", locationText: "floresta temperada", description: "Floresta sazonal de clima moderado." },
  { id: "mediterraneo", label: "Ambiente mediterrâneo", locationText: "ambiente mediterrâneo com vegetação arbustiva", description: "Verões secos e vegetação arbustiva resistente." },
  { id: "deserto", label: "Deserto quente", locationText: "deserto quente e árido", description: "Ambiente árido com calor e baixa disponibilidade de água." },
  { id: "deserto-frio", label: "Deserto frio", locationText: "deserto frio e seco", description: "Estepe fria e árida, sem condições polares." },
  { id: "tundra", label: "Tundra", locationText: "tundra com permafrost", description: "Planície fria, aberta e sem árvores." },
  { id: "taiga", label: "Taiga", locationText: "taiga de floresta boreal", description: "Floresta boreal fria dominada por coníferas." },
  { id: "montanha", label: "Região montanhosa", locationText: "região montanhosa de altitude", description: "Relevo elevado, encostas e variação de altitude." },
  { id: "montanha-nevada", label: "Montanha nevada", locationText: "montanha nevada com picos alpinos", description: "Alta montanha fria com neve permanente." },
  { id: "oceano", label: "Oceano aberto", locationText: "oceano aberto com ilhas", description: "Ambiente marinho dominante com águas profundas e ilhas." },
  { id: "antartida", label: "Região polar antártica", locationText: "antártida com mar gelado", description: "Calota polar, gelo marinho e temperaturas extremas." },
];

const INVASIVE_SPECIES_OPTIONS: InvasiveSpeciesOption[] = [
  { id: "javali", label: "Javali", scientificName: "Sus scrofa", speciesText: "javali" },
  { id: "leao", label: "Leão", scientificName: "Panthera leo", speciesText: "leão" },
  { id: "lobo-cinzento", label: "Lobo-cinzento", scientificName: "Canis lupus", speciesText: "lobo-cinzento" },
  { id: "tigre", label: "Tigre", scientificName: "Panthera tigris", speciesText: "tigre" },
  { id: "coelho-europeu", label: "Coelho-europeu", scientificName: "Oryctolagus cuniculus", speciesText: "coelho-europeu" },
  { id: "tilapia-do-nilo", label: "Tilápia-do-nilo", scientificName: "Oreochromis niloticus", speciesText: "tilápia-do-nilo" },
  { id: "bufalo-asiatico", label: "Búfalo-asiático", scientificName: "Bubalus bubalis", speciesText: "búfalo-asiático" },
  { id: "cabra-domestica", label: "Cabra-doméstica", scientificName: "Capra hircus", speciesText: "cabra-doméstica" },
  { id: "lebre-europeia", label: "Lebre-europeia", scientificName: "Lepus europaeus", speciesText: "lebre-europeia" },
  { id: "tucunare", label: "Tucunaré", scientificName: "Cichla ocellaris", speciesText: "tucunaré" },
  { id: "ra-touro", label: "Rã-touro", scientificName: "Lithobates catesbeianus", speciesText: "rã-touro" },
  { id: "caramujo-gigante-africano", label: "Caramujo-gigante-africano", scientificName: "Lissachatina fulica", speciesText: "caramujo-gigante-africano" },
  { id: "mexilhao-dourado", label: "Mexilhão-dourado", scientificName: "Limnoperna fortunei", speciesText: "mexilhão-dourado" },
  { id: "gato-feral", label: "Gato-doméstico feral", scientificName: "Felis catus", speciesText: "gato feral" },
  { id: "cao-feral", label: "Cão feral", scientificName: "Canis lupus familiaris", speciesText: "cão feral" },
  { id: "rato-preto", label: "Rato-preto", scientificName: "Rattus rattus", speciesText: "rato-preto" },
  { id: "peixe-leao", label: "Peixe-leão", scientificName: "Pterois volitans", speciesText: "peixe-leão" },
  { id: "carpa-comum", label: "Carpa-comum", scientificName: "Cyprinus carpio", speciesText: "carpa-comum" },
  { id: "esquilo-cinzento", label: "Esquilo-cinzento", scientificName: "Sciurus carolinensis", speciesText: "esquilo-cinzento" },
  { id: "vison-americano", label: "Vison-americano", scientificName: "Neogale vison", speciesText: "vison-americano" },
  { id: "pardal-domestico", label: "Pardal-doméstico", scientificName: "Passer domesticus", speciesText: "pardal-doméstico" },
];

function locationById(id: string) {
  return INVASION_LOCATIONS.find((location) => location.id === id);
}

export function EcologyInvasiveSection({ initialOfflineScenarioId }: { initialOfflineScenarioId?: string | null } = {}) {
  const [selectedSpeciesId, setSelectedSpeciesId] = useState("javali");
  const [selectedLocationId, setSelectedLocationId] = useState("cerrado");
  const [result, setResult] = useState<InvasiveScenarioResult | null>(null);
  const [faunaSpecies, setFaunaSpecies] = useState<SpeciesDefinition[]>([]);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offlineDisclosure, setOfflineDisclosure] = useState<string | null>(null);
  const simulatedTimeRef = useRef(12);
  const [inspected, setInspected] = useState<TerrainCell | null>(null);
  const [faunaEvents, setFaunaEvents] = useState<FaunaEvent[]>([]);

  const selectedSpecies =
    INVASIVE_SPECIES_OPTIONS.find((species) => species.id === selectedSpeciesId) ??
    INVASIVE_SPECIES_OPTIONS[0]!;
  const availableLocations = INVASION_LOCATIONS;
  const selectedLocation =
    locationById(selectedLocationId) ??
    availableLocations[0]!;

  const clearCurrentSimulation = () => {
    setResult(null);
    setFaunaSpecies([]);
    setFaunaEvents([]);
    setInspected(null);
    setPhaseIndex(0);
    setError(null);
    setOfflineDisclosure(null);
  };

  const selectSpecies = (speciesId: string) => {
    const species =
      INVASIVE_SPECIES_OPTIONS.find((option) => option.id === speciesId) ??
      INVASIVE_SPECIES_OPTIONS[0]!;
    setSelectedSpeciesId(species.id);
    clearCurrentSimulation();
  };

  const selectLocation = (locationId: string) => {
    setSelectedLocationId(locationId);
    clearCurrentSimulation();
  };

  const submit = async () => {
    if (!selectedSpecies || !selectedLocation) {
      setError("Selecione a espécie invasora e o cenário.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setResult(null);
    setFaunaSpecies([]);
    setPhaseIndex(0);

    try {
      const response = await ecologyApi.invasive({
        speciesText: selectedSpecies.speciesText,
        locationText: selectedLocation.locationText,
      });
      const data = response.data;
      setResult(data);
      setOfflineDisclosure(null);
      saveLastScenario({ scenarioId: "invasao-javali-cerrado", mode: "live", invasiveResult: data });

      let natives: SpeciesDefinition[] = [];
      try {
        // Use the complete grid so the backend can discard residual biomes and enforce
        // climate/salinity constraints. Passing only the raw biome list can reintroduce
        // incompatible fauna from a handful of outlier cells (for example, polar species).
        const faunaResponse = await ecologyApi.fauna({ grid: buildCompactFaunaGrid(data.terrain) });
        natives = faunaResponse.data.species;
      } catch (faunaRequestError) {
        setFaunaSpecies([]);
        setError(`O cenário foi gerado, mas a fauna nativa não pôde ser carregada: ${getApiErrorMessage(faunaRequestError)}`);
        return;
      }
      if (natives.length === 0) {
        setFaunaSpecies([]);
        setError("O cenário foi gerado, mas nenhuma fauna nativa compatível foi encontrada. A invasora não será exibida sozinha.");
        return;
      }
      setFaunaSpecies([...natives, data.invader]);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setIsLoading(false);
    }
  };

  const openOfflineJavali = () => {
    const snapshot = getOfflineInvasiveSnapshot();
    setSelectedSpeciesId("javali");
    setSelectedLocationId("cerrado");
    setResult(snapshot.result);
    setFaunaSpecies([snapshot.result.invader]);
    setPhaseIndex(0);
    setError(null);
    setOfflineDisclosure(snapshot.meta.disclosure);
    saveLastScenario({ scenarioId: "invasao-javali-cerrado", mode: "offline", invasiveResult: snapshot.result });
  };

  useEffect(() => {
    if (initialOfflineScenarioId === "invasao-javali-cerrado") openOfflineJavali();
  }, [initialOfflineScenarioId]);

  const phase = result?.phases[phaseIndex];
  const impactById = useMemo(() => {
    const map = new Map<string, InvasiveScenarioResult["nativeImpacts"][number]>();
    for (const impact of result?.nativeImpacts ?? []) map.set(impact.speciesId, impact);
    return map;
  }, [result]);
  const impactedNatives = (result?.nativeImpacts ?? []).filter((i) => i.effect !== "none");

  return (
    <div className="page-stack">
      <style>{`
        .invasive-grid { display: grid; gap: 0.7rem; grid-template-columns: 1fr 1fr; }
        .invasive-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
        .invasive-table th, .invasive-table td { text-align: left; padding: 0.4rem 0.5rem; border-bottom: 1px solid rgba(125,88,55,0.12); }
        .invasive-deltas { display: grid; gap: 0.3rem; margin-top: 0.5rem; }
        .invasive-delta-row { display: flex; align-items: center; justify-content: space-between; gap: 0.6rem; padding: 0.42rem 0.5rem; border-radius: 0.45rem; background: rgba(125,88,55,0.055); font-size: 0.84rem; }
        .invasive-delta-row--invader { border: 1px solid rgba(176,58,46,0.18); background: rgba(176,58,46,0.08); }
        .invasive-delta-row__name { display: grid; gap: 0.05rem; }
        .invasive-delta-row__name small { color: #8b6245; font-size: 0.65rem; }
        .invasive-delta-row__value { display: grid; justify-items: end; gap: 0.03rem; font-weight: 700; }
        .invasive-delta-row__value small { font-size: 0.62rem; font-weight: 500; }
        .invasive-scrubber { width: 100%; accent-color: #9c6f3d; }
        .invasive-phase-head { display: flex; align-items: baseline; gap: 0.6rem; flex-wrap: wrap; }
        .invasive-phase-tabs { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0.35rem; margin: 0.7rem 0; }
        .invasive-phase-tab { display: grid; gap: 0.1rem; min-width: 0; padding: 0.48rem 0.38rem; border: 1px solid rgba(125,88,55,0.16); border-radius: 0.5rem; background: rgba(255,248,237,0.7); color: #6b4a34; font: inherit; font-size: 0.68rem; cursor: pointer; }
        .invasive-phase-tab small { color: #94745d; font-size: 0.58rem; }
        .invasive-phase-tab.is-active { border-color: rgba(156,111,61,0.62); background: rgba(156,111,61,0.15); color: #4f301d; box-shadow: inset 0 -2px 0 #9c6f3d; }
        .invasive-population-labels { display: flex; justify-content: space-between; gap: 1rem; margin-top: 0.7rem; color: #85664f; font-size: 0.66rem; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; }
        .invasive-impact-reason { display: block; margin-top: 0.18rem; color: #80644e; font-size: 0.74rem; line-height: 1.4; }
        .invasive-selector-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
          align-items: center;
          gap: 0.85rem;
          margin-top: 1rem;
        }
        .invasive-selector-card {
          display: grid;
          gap: 0.55rem;
          min-height: 9.5rem;
          padding: 0.9rem;
          border: 1px solid rgba(125, 88, 55, 0.16);
          border-radius: 0.85rem;
          background: rgba(255, 248, 237, 0.76);
        }
        .invasive-selector-card__head {
          display: flex;
          align-items: center;
          gap: 0.6rem;
        }
        .invasive-selector-card__number {
          display: grid;
          place-items: center;
          width: 1.75rem;
          height: 1.75rem;
          flex: 0 0 auto;
          border-radius: 50%;
          background: #6d4931;
          color: #fff8ed;
          font-size: 0.75rem;
          font-weight: 700;
        }
        .invasive-selector-card__head strong {
          display: block;
          color: #553622;
          font-size: 0.88rem;
        }
        .invasive-selector-card__head span:last-child {
          display: block;
          color: #896c55;
          font-size: 0.72rem;
        }
        .invasive-select {
          width: 100%;
          min-height: 2.8rem;
          cursor: pointer;
          font-weight: 650;
        }
        .invasive-selector-card__detail {
          margin: 0;
          color: #765942;
          font-size: 0.76rem;
          line-height: 1.45;
        }
        .invasive-selector-card__detail em { color: #4f3828; }
        .invasive-selector-arrow {
          display: grid;
          place-items: center;
          width: 2.4rem;
          height: 2.4rem;
          border-radius: 50%;
          background: rgba(109, 73, 49, 0.1);
          color: #765037;
        }
        .invasive-selection-summary {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          margin-top: 0.8rem;
          padding: 0.65rem 0.8rem;
          border-left: 3px solid #9c6f3d;
          border-radius: 0.45rem;
          background: rgba(156, 111, 61, 0.08);
          color: #66442e;
          font-size: 0.82rem;
        }
        .invasive-selection-summary svg { flex: 0 0 auto; color: #9c6f3d; }
        .invasive-selection-summary strong { color: #4c301f; }
        .invasive-consequence-intro {
          margin: 0;
          color: #654833;
          font-size: 0.86rem;
          line-height: 1.55;
        }
        .invasive-chains { display: grid; gap: 0.6rem; margin-top: 0.75rem; }
        .invasive-chain {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          overflow-x: auto;
          padding: 0.65rem;
          border: 1px solid rgba(125, 88, 55, 0.13);
          border-radius: 0.7rem;
          background: linear-gradient(90deg, rgba(145, 103, 63, 0.08), rgba(103, 132, 77, 0.07));
          scrollbar-width: thin;
        }
        .invasive-chain__step {
          flex: 0 0 auto;
          max-width: 12rem;
          padding: 0.36rem 0.5rem;
          border-radius: 0.45rem;
          background: rgba(255, 251, 244, 0.92);
          color: #5b402d;
          font-size: 0.72rem;
          line-height: 1.3;
          box-shadow: 0 2px 7px rgba(87, 58, 35, 0.08);
        }
        .invasive-chain svg { flex: 0 0 auto; color: #9c6f3d; }
        .invasive-vector-grid { display: grid; gap: 0.45rem; margin-top: 0.75rem; grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .invasive-vector { padding: 0.55rem; border-radius: 0.55rem; background: rgba(125, 88, 55, 0.055); }
        .invasive-vector__head { display: flex; justify-content: space-between; gap: 0.5rem; color: #5c402c; font-size: 0.72rem; }
        .invasive-vector__head strong:last-child { color: #9b4b34; }
        .invasive-vector__track { height: 0.3rem; margin-top: 0.35rem; overflow: hidden; border-radius: 999px; background: rgba(91, 63, 43, 0.12); }
        .invasive-vector__fill { display: block; height: 100%; border-radius: inherit; background: #b05a3c; }
        .invasive-vector__fill.is-positive { background: #b17a32; }
        .invasive-vector small { display: block; margin-top: 0.28rem; color: #82664f; font-size: 0.63rem; line-height: 1.35; }
        @media (max-width: 720px) {
          .invasive-grid { grid-template-columns: 1fr; }
          .invasive-selector-grid { grid-template-columns: 1fr; }
          .invasive-selector-card { min-height: 0; }
          .invasive-selector-arrow { transform: rotate(90deg); justify-self: center; }
          .invasive-selection-summary { align-items: flex-start; }
          .invasive-phase-tabs { grid-template-columns: 1fr 1fr; }
          .invasive-vector-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <section className="signal-panel signal-panel--llm">
        <div className="signal-panel__header">
          <div>
            <h3>Especie introduzida ou invasora</h3>
            <p>
              Combine livremente qualquer espécie catalogada com qualquer cenário. O sistema
              avalia se a invasão é plausível — inclusive quando a combinação é incompatível — e
              mostra o resultado no visualizador 3D.
            </p>
          </div>
          {result ? (
            <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
              {result.invaderProfile.scenarioType ? (
                <StatusPill tone={result.invaderProfile.scenarioType === "hypothetical-introduction" ? "neutral" : "warning"}>
                  {result.invaderProfile.scenarioType === "hypothetical-introduction" ? "Introducao hipotetica" : "Invasora documentada"}
                </StatusPill>
              ) : null}
              <StatusPill tone={result.invaderProfile.survives ? "warning" : "neutral"}>
                {result.invaderProfile.survives ? "Estabelecimento plausivel" : "Estabelecimento improvavel"}
              </StatusPill>
            </div>
          ) : null}
        </div>

        <div className="invasive-selector-grid">
          <label className="invasive-selector-card" htmlFor="invasive-species-select">
            <span className="invasive-selector-card__head">
              <span className="invasive-selector-card__number">1</span>
              <span>
                <strong>Espécie introduzida ou invasora</strong>
                <span>{INVASIVE_SPECIES_OPTIONS.length} perfis disponíveis</span>
              </span>
            </span>
            <select
              id="invasive-species-select"
              className="ui-input invasive-select"
              value={selectedSpecies.id}
              onChange={(event) => selectSpecies(event.target.value)}
            >
              {INVASIVE_SPECIES_OPTIONS.map((species) => (
                <option key={species.id} value={species.id}>
                  {species.label}
                </option>
              ))}
            </select>
            <span className="invasive-selector-card__detail">
              Nome científico: <em>{selectedSpecies.scientificName}</em>
            </span>
          </label>

          <span className="invasive-selector-arrow" aria-hidden="true">
            <ArrowRight weight="bold" />
          </span>

          <label className="invasive-selector-card" htmlFor="invasive-location-select">
            <span className="invasive-selector-card__head">
              <span className="invasive-selector-card__number">2</span>
              <span>
                <strong>Cenário da invasão</strong>
                <span>{INVASION_LOCATIONS.length} locais · sem restrição por espécie</span>
              </span>
            </span>
            <select
              id="invasive-location-select"
              className="ui-input invasive-select"
              value={selectedLocation.id}
              onChange={(event) => selectLocation(event.target.value)}
            >
              {availableLocations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.label}
                </option>
              ))}
            </select>
            <span className="invasive-selector-card__detail">{selectedLocation.description}</span>
          </label>
        </div>

        <div className="invasive-selection-summary" aria-live="polite">
          <MapPin weight="duotone" />
          <span>
            Cenário selecionado: <strong>{selectedSpecies.label} no {selectedLocation.label}</strong>
          </span>
        </div>

        <div className="form-actions">
          <Button variant="primary" onClick={() => void submit()} disabled={isLoading}>
            <Bug weight="duotone" />
            {isLoading ? "Simulando..." : "Simular cenário selecionado"}
          </Button>
          <Button variant="secondary" onClick={openOfflineJavali} disabled={isLoading}>
            Abrir demonstração offline
          </Button>
        </div>
      </section>

      {offlineDisclosure ? (
        <div className="signal-message signal-message--warning">
          <WarningCircle weight="duotone" />
          <div>
            <strong>Modo de demonstracao offline</strong>
            <span>{offlineDisclosure}</span>
          </div>
        </div>
      ) : null}

      {isLoading ? <LoadingBlock label="Avaliando a invasao..." /> : null}

      {error && !isLoading ? (
        <ErrorState title="Falha na simulacao" message={error} onRetry={() => void submit()} />
      ) : null}

      {!result && !error && !isLoading ? (
        <EmptyState
          icon={<Bug weight="duotone" />}
          title="Nenhuma simulação ainda"
          description="Escolha uma espécie e um cenário nos menus acima para avaliar a invasão."
        />
      ) : null}

      {result && !isLoading ? (
        <>
          {faunaSpecies.length > 0 ? (
            <TerrainView
              grid={result.terrain}
              faunaSpecies={faunaSpecies}
              faunaPaused={false}
              faunaSpeedMultiplier={1}
              showFauna
              showObjects
              showCaves
              showRivers
              rainEnabled={false}
              rainIntensity={0}
              simulatedTimeRef={simulatedTimeRef}
              onFaunaCountUpdate={() => {}}
              inspected={inspected}
              setInspected={setInspected}
              faunaEvents={faunaEvents}
              setFaunaEvents={setFaunaEvents}
              invasiveSpeciesIds={[result.invader.id]}
              invasiveOverlay={{
                invaderSpeciesId: result.invader.id,
                invaderName: result.invaderProfile.displayName,
                invaderScientificName: result.invaderProfile.scientificName,
                scenarioType: result.invaderProfile.scenarioType,
                phaseLabel: phase?.label,
                impactMechanisms:
                  (result.impactMechanisms?.map((entry) => entry.label) as string[] | undefined) ??
                  Array.from(
                    new Set(
                      result.nativeImpacts
                        .map((entry) => EFFECT_LABEL[entry.effect] ?? entry.effect)
                        .filter(Boolean),
                    ),
                  ),
                affectedSpecies: result.nativeImpacts.map((entry) => ({
                  speciesId: entry.speciesId,
                  commonName: entry.commonName,
                  effect: EFFECT_LABEL[entry.effect] ?? entry.effect,
                  populationDelta: entry.populationDelta,
                })),
                simulatedNotes:
                  result.simulationScope?.simulated ?? [
                    "presenca visual da invasora",
                    "interacao local com fauna nativa",
                    "eventos de predacao e fuga",
                  ],
                explanationOnlyNotes:
                  result.simulationScope?.explanationOnly ?? [
                    "efeitos ecossistemicos de longo prazo",
                  ],
              }}
            />
          ) : null}

          <div className="invasive-grid">
            <section className="signal-panel">
              <div className="signal-panel__header">
                <div>
                  <h3>Plausibilidade</h3>
                  <p>
                    {result.invaderProfile.displayName} ({result.invaderProfile.scientificName})
                  </p>
                </div>
                <StatusPill tone={RATING_TONE[result.plausibility.overall]}>
                  {RATING_LABEL[result.plausibility.overall]}
                </StatusPill>
              </div>
              <table className="invasive-table">
                <thead>
                  <tr>
                    <th>Criterio</th>
                    <th>Nota</th>
                    <th>Detalhe</th>
                  </tr>
                </thead>
                <tbody>
                  {result.plausibility.criteria.map((c) => (
                    <tr key={c.label}>
                      <td>{c.label}</td>
                      <td>
                        <StatusPill tone={RATING_TONE[c.rating]}>{RATING_LABEL[c.rating]}</StatusPill>
                      </td>
                      <td>{c.detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p style={{ fontSize: "0.78rem", opacity: 0.7, marginTop: "0.5rem" }}>
                {result.plausibility.caveat}
              </p>
            </section>

            <section className="signal-panel">
              <div className="signal-panel__header">
                <div>
                  <h3>Linha do tempo do cenario</h3>
                  <p>Selecione uma fase para comparar as populações projetadas.</p>
                </div>
              </div>
              <div className="invasive-phase-tabs" aria-label="Fases da invasão">
                {result.phases.map((entry, index) => (
                  <button
                    key={`${entry.label}-${entry.tSeconds}`}
                    type="button"
                    className={`invasive-phase-tab${phaseIndex === index ? " is-active" : ""}`}
                    aria-pressed={phaseIndex === index}
                    onClick={() => setPhaseIndex(index)}
                  >
                    <strong>{entry.label}</strong>
                    <small>t ~ {entry.tSeconds}s</small>
                  </button>
                ))}
              </div>
              <input
                type="range"
                className="invasive-scrubber"
                min={0}
                max={result.phases.length - 1}
                step={1}
                value={phaseIndex}
                onChange={(e) => setPhaseIndex(Number(e.target.value))}
                aria-label="Percorrer fases da invasão"
              />
              {phase ? (
                <>
                  <div className="invasive-phase-head">
                    <strong>{phase.label}</strong>
                    <span style={{ opacity: 0.7 }}>t ~ {phase.tSeconds}s</span>
                  </div>
                  <div className="invasive-population-labels">
                    <span>Espécie</span>
                    <span>População</span>
                  </div>
                  <div className="invasive-deltas">
                    <div className="invasive-delta-row invasive-delta-row--invader">
                      <span className="invasive-delta-row__name">
                        <strong>{result.invaderProfile.displayName}</strong>
                        <small>{result.invaderProfile.scenarioType === "hypothetical-introduction" ? "introdução hipotética" : "espécie invasora"}</small>
                      </span>
                      <span className="invasive-delta-row__value">
                        {phase.invaderPop}
                        <small>{phaseIndex === 0 ? "introduzidos" : `+${phase.invaderPop - result.phases[0]!.invaderPop} desde a introdução`}</small>
                      </span>
                    </div>
                    {Object.entries(phase.nativeDeltas).length === 0 ? (
                      <span style={{ fontSize: "0.84rem", opacity: 0.7 }}>
                        Sem impacto projetado sobre os nativos nesta fase.
                      </span>
                    ) : (
                      Object.entries(phase.nativeDeltas).map(([id, delta]) => {
                        const impact = impactById.get(id);
                        const baseline = impact?.baselinePopulation ?? Math.max(1, Math.abs(impact?.populationDelta ?? delta) * 3);
                        const projectedPopulation = Math.max(0, baseline + delta);
                        return (
                          <div key={id} className="invasive-delta-row">
                            <span className="invasive-delta-row__name">
                              <strong>{impact?.commonName ?? id}</strong>
                              <small>nativa · base {baseline}</small>
                            </span>
                            <span className="invasive-delta-row__value" style={{ color: delta < 0 ? "#b03a2e" : "#6d4b35" }}>
                              {projectedPopulation}
                              <small>{delta === 0 ? "sem alteração" : `${delta} nesta fase`}</small>
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              ) : null}
            </section>
          </div>

          <section className="signal-panel">
            <div className="signal-panel__header">
              <div>
                <h3>Impacto sobre os nativos</h3>
                <p>Efeito do invasor sobre cada especie nativa do local.</p>
              </div>
            </div>
            {impactedNatives.length === 0 ? (
              <div className="signal-message signal-message--neutral">
                <WarningCircle weight="duotone" />
                <div>
                  <span>Nenhum impacto direto projetado.</span>
                </div>
              </div>
            ) : (
              <div className="summary-list">
                {impactedNatives.map((impact) => (
                  <div key={impact.speciesId}>
                    <strong>{impact.commonName}</strong>
                    <span>
                      {EFFECT_LABEL[impact.effect] ?? impact.effect} · delta populacao {impact.populationDelta}
                    </span>
                    {impact.reason ? (
                      <small className="invasive-impact-reason">Base da projeção: {impact.reason}</small>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="signal-panel">
            <div className="signal-panel__header">
              <div>
                <h3>Mecanismos de impacto</h3>
                <p>Mecanismos ecologicos nomeados, definidos por servicos deterministicos (nao pela IA).</p>
              </div>
              <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                {result.establishmentPlausibility ? (
                  <StatusPill
                    tone={
                      result.establishmentPlausibility.label === "alta"
                        ? "success"
                        : result.establishmentPlausibility.label === "moderada"
                          ? "warning"
                          : "error"
                    }
                  >
                    Estabelecimento: {result.establishmentPlausibility.score}/100
                  </StatusPill>
                ) : null}
                {result.spreadPressure ? (
                  <StatusPill
                    tone={
                      result.spreadPressure === "alta"
                        ? "error"
                        : result.spreadPressure === "moderada"
                          ? "warning"
                          : "neutral"
                    }
                  >
                    Dispersao: {result.spreadPressure}
                  </StatusPill>
                ) : null}
              </div>
            </div>
            {result.impactMechanisms && result.impactMechanisms.length > 0 ? (
              <div className="summary-list">
                {result.impactMechanisms.map((m) => (
                  <div key={m.kind}>
                    <strong>{m.label}</strong>{" "}
                    <StatusPill
                      tone={m.severity === "alta" ? "error" : m.severity === "moderada" ? "warning" : "neutral"}
                    >
                      {m.severity}
                    </StatusPill>
                    <span>{m.description}</span>
                    {m.targets && m.targets.length > 0 ? (
                      <span style={{ opacity: 0.75 }}>Alvos: {m.targets.join(", ")}</span>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className="signal-message signal-message--neutral">
                <WarningCircle weight="duotone" />
                <div>
                  <span>
                    Nenhum mecanismo de impacto identificado — a especie provavelmente nao se
                    estabelece neste bioma.
                  </span>
                </div>
              </div>
            )}

            {result.consequences ? (
              <div style={{ marginTop: "1rem" }}>
                <h4 style={{ marginBottom: "0.35rem" }}>Consequencias em cadeia</h4>
                <p className="invasive-consequence-intro">{result.consequences.summary}</p>
                {result.consequences.causalChains.length > 0 ? (
                  <div className="invasive-chains">
                    {result.consequences.causalChains.map((chain, chainIndex) => (
                      <div className="invasive-chain" key={`${chain[0]}-${chainIndex}`}>
                        {chain.map((step, stepIndex) => (
                          <Fragment key={`${step}-${stepIndex}`}>
                            {stepIndex > 0 ? <ArrowRight size={14} weight="bold" aria-hidden="true" /> : null}
                            <span className="invasive-chain__step">{step}</span>
                          </Fragment>
                        ))}
                      </div>
                    ))}
                  </div>
                ) : null}
                {result.consequences.impactVectors.length > 0 ? (
                  <div className="invasive-vector-grid" aria-label="Indices relativos de impacto">
                    {result.consequences.impactVectors.map((vector) => (
                      <div className="invasive-vector" key={vector.key} title={vector.detail}>
                        <div className="invasive-vector__head">
                          <strong>{vector.label}</strong>
                          <strong>{vector.value > 0 ? "+" : ""}{vector.value}</strong>
                        </div>
                        <div className="invasive-vector__track" aria-hidden="true">
                          <span
                            className={`invasive-vector__fill${vector.value > 0 ? " is-positive" : ""}`}
                            style={{ width: `${Math.min(100, Math.abs(vector.value))}%` }}
                          />
                        </div>
                        <small>{vector.detail}</small>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            {result.affectedResources && result.affectedResources.length > 0 ? (
              <p style={{ fontSize: "0.84rem", marginTop: "0.5rem" }}>
                <strong>Recursos afetados:</strong>{" "}
                {result.affectedResources.map((r) => r.label).join(", ")}
              </p>
            ) : null}

            {((result.uncertainties?.length ?? 0) > 0 || (result.mvpAssumptions?.length ?? 0) > 0) ? (
              <div className="stack-sm" style={{ marginTop: "0.6rem" }}>
                {(result.uncertainties ?? []).map((u) => (
                  <div key={u} className="signal-message signal-message--warning">
                    <WarningCircle weight="duotone" />
                    <div>
                      <span>Incerteza: {u}</span>
                    </div>
                  </div>
                ))}
                {(result.mvpAssumptions ?? []).map((a) => (
                  <div key={a} className="signal-message signal-message--neutral">
                    <div>
                      <span>Premissa: {a}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </section>

          <section className="signal-panel">
            <div className="signal-panel__header">
              <div>
                <h3>Explicacao cientifica</h3>
                <p>Avaliacao grounded nos fatos do banco.</p>
              </div>
              <StatusPill tone={result.explanation.coverage === "sufficient" ? "success" : "warning"}>
                {result.explanation.coverage === "sufficient" ? "Cobertura suficiente" : "Cobertura limitada"}
              </StatusPill>
            </div>
            <p>{result.explanation.text}</p>

            {result.explanation.facts.length > 0 ? (
              <div className="stack-sm" style={{ marginTop: "0.6rem" }}>
                {result.explanation.facts.map((fact) => (
                  <div key={`${fact.title}-${fact.citationKey ?? ""}`} className="answer-card">
                    <div className="answer-card__meta">
                      <StatusPill tone="neutral">{fact.category}</StatusPill>
                      {fact.citationKey ? <StatusPill tone="info">{fact.citationKey}</StatusPill> : null}
                      {fact.year ? <StatusPill tone="neutral">{fact.year}</StatusPill> : null}
                    </div>
                    <strong>{fact.title}</strong>
                    <p>{fact.text}</p>
                  </div>
                ))}
              </div>
            ) : null}

            {result.limitations.length > 0 ? (
              <div className="stack-sm" style={{ marginTop: "0.6rem" }}>
                {result.limitations.map((limitation) => (
                  <div key={limitation} className="signal-message signal-message--warning">
                    <WarningCircle weight="duotone" />
                    <div>
                      <span>{limitation}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </section>
        </>
      ) : null}
    </div>
  );
}
