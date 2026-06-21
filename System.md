# Sara Core System Reference

Last updated: 2026-06-21

## Purpose

Sara Core is a local-first ecological simulation MVP. It accepts natural-language ecosystem descriptions, resolves them into grounded ecological context and deterministic simulation parameters, and renders synthetic ecosystems with terrain, climate, vegetation, fauna, predation, weather, and reports.

The system is intentionally grounded: LLM calls classify or answer from constrained context, while ecological facts come from PostgreSQL/Neon tables and deterministic TypeScript services.

## Monorepo Layout

- `apps/backend`: Express API, ecological domain services, LLM orchestration, database scripts, tests.
- `apps/frontend`: React/Vite dashboard with ecology tabs and Three.js terrain viewer.
- `packages/shared-types`: shared HTTP response contracts.
- `packages/shared-config`: shared TypeScript configs.
- `database`: PostgreSQL migrations and seed data.
- `docs`: architecture, API, and convention notes.
- `System.md`: current system reference and implementation map.

## Runtime Commands

- `npm install`: install all workspaces.
- `npm run dev`: run backend and frontend together.
- `npm run dev:backend`: backend only.
- `npm run dev:frontend`: frontend only.
- `npm run typecheck`: TypeScript checks for all workspaces.
- `npm run test`: backend test suite.
- `npm run db:reset`, `npm run db:migrate`, `npm run db:seed`, `npm run db:check`: database lifecycle.

## Environment

Backend environment is validated in `apps/backend/src/config/env.ts`.

Important variables:

- `DATABASE_URL`: required PostgreSQL connection.
- `DIRECT_DATABASE_URL`: optional direct database URL for scripts/admin paths.
- `DATABASE_SSL` / `DATABASE_SSL_MODE`: SSL control for Neon/PostgreSQL.
- `BACKEND_HOST`, `BACKEND_PORT`: API bind config.
- `CORS_ORIGIN` / `CORS_ORIGINS`: frontend origins.
- `AUTH_MODE`: `disabled` or `api-key`.
- `API_AUTH_KEY`: required when `AUTH_MODE=api-key`.
- `LLM_PROVIDER`: `disabled`, `gemini`, or `grok`.
- `LLM_API_KEY`, `LLM_MODEL`, `LLM_BASE_URL`, `LLM_TIMEOUT_MS`: LLM settings.
- `LOG_LEVEL`, `TRUST_PROXY`, `API_JSON_MAX_BYTES`: operational controls.

## Backend Architecture

Entry points:

- `apps/backend/src/server.ts`: starts HTTP server.
- `apps/backend/src/app.ts`: builds Express app, CORS, security headers, JSON limit, auth, routes, errors.
- `apps/backend/src/http/routes/index.ts`: mounts `/health` and `/ecology`.

Core helpers:

- `AppError`: typed application errors.
- `errorHandler`, `notFoundHandler`: global error responses.
- `asyncHandler`: async route wrapper.
- `validateBody`, `validateQuery`, `validateParams`: Zod validation middleware.
- `createMemoryRateLimiter`: in-memory limiter used by ecology POST routes.
- `requireApiKeyAuth`: optional API key auth.
- `sendOk`, `sendCreated`, `sendPaginated`, `sendNoContent`: response envelope helpers.
- `logger`, `httpLogger`: Pino logging.

## Ecology API

Base URL: `/api/v1/ecology`.

Controller: `EcologyController`.

Routes:

- `POST /generate`: grounded LLM answer from database facts.
- `POST /inspect`: grounding context inspection without generation.
- `GET /ecosystems`: paginated ecosystem catalog.
- `GET /ecosystems/:slug`: ecosystem detail.
- `GET /species`: paginated species catalog.
- `GET /abiotic-factors`: abiotic factor catalog.
- `GET /artificial-projects`: artificial ecosystem project catalog.
- `GET /modeling-approaches`: modeling approach catalog.
- `GET /coverage`: domain coverage stats.
- `POST /prompt-terrain`: prompt to biome, terrain, and parameters.
- `POST /ecosystem-report`: prompt to terrain, fauna, report, plausibility, grounding facts.
- `POST /invasive`: invasive species scenario.
- `POST /fauna`: resolve fauna for biomes or a terrain grid.
- `POST /simulate/terrain`: direct terrain generation.
- `POST /simulate/succession`: ecological succession stages.
- `POST /simulate/scenario`: climate/disturbance risk scenario.
- `POST /simulate/artificial`: artificial environment design.

Schemas live in `apps/backend/src/modules/ecology/ecology.schemas.ts`.

## Backend Services

Grounding:

- `EcologicalGroundingRepository`: SQL access for ecosystems, species, abiotic factors, artificial projects, modeling approaches, sources, and `grounding_facts`.
- `classifyEcologicalQuery`: classifies prompt intent.
- `recommendedCategories`: chooses fact categories.
- `validateCoverage`: checks if retrieved facts are sufficient.
- `rankFacts`, `filterValidFacts`, `filterByAllowedCategories`, `detectAmbiguousTerms`: grounding quality helpers.
- `EcologicalContextBuilderService`: builds compact grounding context and inspection snapshots.

LLM:

- `EcologicalLlmService`: wraps grounded generation and enforces insufficient-grounding responses.
- `EcologicalTerrainPromptService`: classifies text into a canonical biome preset with cache, constrained LLM JSON, keyword fallback, and deterministic seed.
- Provider layer: `llm.provider.ts`, `gemini.provider.ts`, `grok.provider.ts`.

Simulation:

- `TerrainGeneratorService`: deterministic value-noise terrain, climate, water, salinity, biome assignment, relief styles. Generation is two-pass: (1) raw heightmap → optional `edgeFalloff` → `carveChannels` (D8 flow accumulation carves river valleys into the elevation); (2) every elevation-dependent field (`isWater`/`seaLevel`, `classifyWaterBiome`, `salinityPsu`, climate, biome) is derived on the **carved** heightmap, then `enrichTerrain` runs. `carveChannels` (default on) and `edgeFalloff` (default off) are opt-out/opt-in flags on `TerrainInput`; carve tunables live in `CHANNEL_CARVE`.
- `BiomePresetService`: canonical prompt biomes and climate defaults.
- `BiomeMappingService`: heuristic abiotic-to-biome mapping.
- `FaunaDefinitionService`: static fauna catalog, biome filtering, species-level predation defaults/overrides, trophic-chain pruning, trophic-pyramid population scaling.
- `ScenarioEngineService`: baseline/modified climate and disturbance risk.
- `SuccessionSimulatorService`: primary/secondary succession stage progression.
- `ArtificialEnvironmentService`: project-type design components, constraints, monitoring recommendations.
- `InvasiveScenarioService`: deterministic invader profile, habitat plausibility, predation/competition impacts, phases, grounded explanation.
- `EcosystemReportService`: terrain + fauna + climate/relief/vegetation/fauna/abiotic summaries, scientific explanation, plausibility, limitations.

## Frontend Architecture

Entry points:

- `apps/frontend/src/main.tsx`: React bootstrap.
- `apps/frontend/src/router/index.tsx`: routes `/` to `/ecology`.
- `apps/frontend/src/app/App.tsx`: shell outlet.
- `apps/frontend/src/layouts/AppShell.tsx`: application frame.

Main page:

- `EcologyPage`: tabbed ecology dashboard.
- Tabs: `Consulta`, `Catalogo`, `Terreno`, `Cenario`, `Evolucao`, `Invasora`.

API client:

- `services/api/client.ts`: base URL, headers, `ApiClientError`, error text.
- `services/api/ecology.ts`: frontend mirror of backend ecology contracts and `ecologyApi`.

UI/state:

- `components/ui`: buttons, badges, status pills, page header, loading/error/empty states, textarea.
- `state/ui.store.ts`: Zustand UI config, including API base URL.
- `theme`: color/tokens/CSS variable injection.

## Frontend Ecology Features

- `EcologyQuerySection`: grounded ecology Q&A and handoff from query to terrain generation.
- `EcologyCatalogSection`: catalog panels for ecosystems, species, abiotic factors, projects, modeling approaches.
- `EcologyTerrainSection`: prompt/manual terrain generation, report rendering, controls, Three.js scene, in-scene Layers control, event hub, predation toasts, and locator pulse.
- `EcologyScenarioSection`: climate/disturbance scenario UI.
- `EcologySuccessionSection`: succession stage UI.
- `EcologyInvasiveSection`: invasive scenario UI and visual injection of invader into the fauna layer.
- `DayNightCycle`: simulated sun/sky/fog/exposure and lightning hooks.
- `RainSystem`: particle rain.
- `FaunaLayer`: polygon agent simulation, species-level predation, satiation, flocking, habitat clamping, respawn, structured fauna events, carcass/decomposition emission. Carcasses render under a separate `carcassesVisible` prop so they can be toggled independently of live fauna (the simulation keeps running while fauna is hidden).
- `AnimalEntity`: procedural polygon animal renderer.
- `CarcassLayer`: instanced carcass/remains lifecycle for predation and starvation deaths.
- `DeathPuffLayer`: small secondary puff emitted at death position.
- `CaveEntrances`: renders only entrance cells — a dark recessed mouth + bright rocky rim, plus an optional subtle locator ring (no tall light column) gated by the Marcadores layer.
- `CaveInterior`: x-ray blueprint of the subsoil (`depthTest:false`) with role hierarchy and progressive disclosure — entrance = bold dark shaft, chamber = rounded sphere, tunnel = thin node, all depth-faded (deep chambers recede) and tinted by a deterministic per-system hue (`caveHue`/`caveSystemColor`); `TunnelTube`s carry the same hue. Surface footprint rings are drawn only for entrances by default; the selected system (via `selectedSystemId`) reveals full per-cell rings and brighter interiors. River-caves keep a blue underground water plane.
- `CaveSystemHighlight`: temporary pulsing halo over every cell of a clicked cave system, tinted by the system hue.
- `RiverOverlay` / `RiverRibbon` / `RiverFalls`: the river field is turned into a hierarchical network (`buildRiverScene`) — downstream tree → Strahler order (wide trunk, thin tributaries) → tiny fragments pruned → one merged Catmull-Rom **ribbon** mesh with deterministic lateral meander, rendered with the same water family as lakes/sea (scrolling `waternormals.jpg`, transparent, polygon-offset). Seated at the carved channel floor so it sits in the valley. Waterfall ribbons at steep drops.
- `ReliefOverlay`: instanced altitude/cliff highlight rings (hill/mountain/cliff colored).
- `EventMarkerLayer` / `LocatorPulse`: recent-event rings on the map plus a temporary high-contrast pulse spawned when an event is clicked.
- `LayersControl`: compact in-scene popover with one-click **modes** (Explorar/Terreno/Cavernas/Subsolo/Fauna/Limpo), a "Modo: X" indicator, a vegetation slider, a cave summary line, and a collapsible "Avancado" section of individual switches (objects, rivers, caves, subsolo, x-ray, markers, relief, fauna, carcasses, events, predation). Closes on outside click; manual toggles drop back to a custom/Explore state. The Subsolo mode makes terrain columns translucent and emphasises cave interiors.
- `AnimalsPanel`: collapsed "Animais · N" chip (bottom-left) that expands to a dark, filterable list of every resolved species by name (filters: todos/herbívoros/carnívoros/onívoros/predadores/aves/peixes/cavernícolas/aquáticos). Matches the resolved fauna exactly.
- `EventHub` / `ToastStack`: collapsed "Eventos · N" chip that expands to a dark, scrollable max-height panel; predation surfaces as a brief auto-dismiss toast.

## Current Fauna Contract

Types:

- `FaunaCategory`: `herbivore-small`, `herbivore-large`, `predator-medium`, `predator-large`, `bird`, `fish`.
- `TrophicLevel`: `producer`, `herbivore`, `mesopredator`, `apex`.
- `FeedingStrategy`: `herbivore`, `carnivore`, `omnivore`.
- `PredationProfile`: optional per-species hunting params: `attackRange`, `damageRate`, `huntRange`, `hungerRate`, `starvationThreshold`, `satiationCooldownMs`, and `preyPreference`.
- `SpeciesDefinition`: `id`, names, category, habitable biomes, `diet`, `preySpeciesIds`, `trophicLevel`, `feedingStrategy`, `mass`, `awarenessRange`, optional `predation`, population target, movement profile, flock profile.

Important distinction:

- `trophicLevel` describes chain position.
- `preySpeciesIds` drives actual hunting and predation.
- `feedingStrategy` drives polygon color and report grouping.
- `mass` drives energy gained by a predator after a kill.
- `awarenessRange` is prey-side perception distance.
- `predation` is hunter-side behavior and is present when `preySpeciesIds.length > 0`.

Polygon color mapping:

- Red: `carnivore`.
- Green: `herbivore`.
- White: `omnivore`.
- Diet has shape redundancy in the polygon renderer:
  - carnivore: triangular cone glyph,
  - herbivore: square box glyph,
  - omnivore: octahedron glyph.
- State color no longer overrides diet identity:
  - fleeing uses cyan emissive accent,
  - hunting uses amber emissive accent.

GLB status:

- Runtime GLB usage has been removed.
- `AnimalEntity` no longer imports `useGLTF`, animations, skeleton cloning, model manifests, or asset fallback logic.
- `FaunaLayer` no longer preloads, selects, or requires fauna models.
- The tracked GLB asset pack, manifest, credits, and fetch script were removed.
- Local ignored files under `apps/frontend/public/models/` are not part of the system contract.

## Predation And Decomposition

Backend preparation:

- `FaunaDefinitionService.resolve(grid)` counts meaningful biomes from terrain cells, ignores tiny stray biome patches, injects the `caverna` pseudo-biome when cave cells exist, and applies grid-context coherence filters before returning species.
- `resolveBiomes(biomes)` filters species by habitat, prunes unavailable trophic links iteratively until stable, and scales population by a simple trophic pyramid.
- Grid-context coherence filters block implausible fauna from residual cells: strict ocean species require meaningful ocean/salinity coverage, polar marine species require cold polar/ocean context, cold-climate fauna require a cold grid, mountain specialists require real mountain/penhasco context, and `peixe-cego` requires flooded/river cave cells.
- Population scaling uses an approximate base:mesopredator:apex ratio of 100:20:5 when the total exceeds the MVP cap.
- Predation chains are encoded by `preySpeciesIds`; examples include jaguar -> capybara/tapir/paca/deer/mesopredator, wolf -> moose/reindeer/lemming/lynx, orca -> penguin/seal/fish.
- `SPECIES_CATALOG` is normalized from `RAW_CATALOG`; resolved species receive `diet`, `trophicLevel`, `feedingStrategy`, `mass`, `awarenessRange`, and `predation`.
- `DEFAULT_PREDATION` preserves old behavior as fallback, while `PREDATION_OVERRIDES` tunes key predators such as jaguar, puma, wolf, lynx, otter, penguin, seal, orca, mountain fox, and Andean puma.
- Hunters without any present prey are removed; hunters with partial prey availability keep only prey IDs that survived.

Frontend runtime:

- `FaunaLayer` spawns `FaunaAgent` instances per species.
- Each frame computes separation, alignment, cohesion, wandering, home return, flee steering, and hunt steering.
- A species hunts when `preySpeciesIds.length > 0` and reads all hunting behavior from `resolvePredationParams(species)`.
- A prey flees if another species lists it in `preySpeciesIds` and is inside the prey species' `awarenessRange`.
- Hunting uses `huntRange`, `attackRange`, `damageRate`, and `preyPreference`; higher hunger increases steering intensity.
- Successful kills reduce hunger by `prey.mass * PREDATION_ENERGY_PER_MASS` and set `satedUntil`; hunt steering is skipped while the hunter is sated.
- Hunger above the species' `starvationThreshold` causes starvation.
- Dead agents become inactive immediately and can respawn when live population falls below threshold after a delay.
- Death now emits a structured `FaunaEvent` with kind, message, world coordinates, timestamp, and species ids.
- `CarcassLayer` receives predation/starvation deaths and renders visible remains through fresh, decomposition, and bone/remains phases.
- `DeathPuffLayer` emits a reduced, short secondary puff at the carcass position.
- Fish are horizontally pulled back to nearest water cells when they drift over land; ground fauna are pulled back from water cells when land is available.
- Cave fish use flooded/river-adjacent cave cells instead of requiring the surface cell itself to be water.

Rendering:

- Ground animals use faceted dodecahedron/cone/box primitives.
- Birds use tetrahedron/cone wing polygons.
- Fish use octahedron/cone polygons.
- Diet identity is visible through base color plus glyph shape.
- State is visible through bobbing, rotation, tilt, and cyan/amber emissive accents for fleeing/hunting.

## Terrain And Report Flow

Prompt flow:

1. Frontend sends prompt to `/ecology/ecosystem-report` or `/ecology/prompt-terrain`.
2. `EcologicalTerrainPromptService` classifies biome through cache, constrained LLM, keyword fallback, or default, and derives structural hints from words such as `cavernas`, `algumas`, `muitas`, `profundas`, and rocky/mountain terms.
3. `TerrainGeneratorService` generates `TerrainGrid` — carving river valleys into the heightmap first, then classifying water/biome on the carved land; `enrichTerrain` applies feature hints to create a bounded visible cave set when the prompt asks for caves, and the natural cave pass keeps only a few largest, spaced systems.
4. `FaunaDefinitionService` resolves compatible species.
5. `EcosystemReportService` builds climate, relief, vegetation, formations, fauna, abiotic factors, scientific explanation, plausibility, and limitations.
6. Frontend renders terrain, vegetation, water, rivers (flowing-water overlay), caves (with locator beacons), x-ray cave shafts, relief markers, event markers, weather, fauna polygons, carcasses, report cards, and legends.
7. An in-scene **Camadas (Layers)** control plus a discreet **event hub** (collapsed chip + dark panel + predation toasts + click-to-locate pulse) govern map readability without covering the scene.

Manual terrain flow:

1. Frontend sends explicit climate/grid params to `/ecology/simulate/terrain`.
2. Frontend sends compact biome grid to `/ecology/fauna`.
3. Terrain viewer renders the result.

## Database Schema

Migrations:

- `database/postgres/migrations/004_environmental_ecology_foundation.sql`
- `database/postgres/migrations/005_grounding_facts_entity_table_whitelist_fix.sql`

Core enums:

- `source_type_enum`
- `grounding_category_enum`
- `ecosystem_kind_enum`
- `ecosystem_medium_enum`
- `taxon_rank_enum`
- `taxon_status_enum`
- `interaction_type_enum`
- `project_type_enum`
- `modeling_family_enum`
- `metric_type_enum`
- `factor_group_enum`
- `method_family_enum`
- `fact_link_type_enum`
- `population_unit_enum`

Core tables:

- `domains`: semantic domains.
- `sources`, `source_topics`: provenance metadata.
- `biomes`, `climates_koppen`, `life_zones_holdridge`, `biogeographic_realms`: ecological/geographic classification.
- `trophic_roles`: trophic role vocabulary.
- `metrics`: indicators.
- `abiotic_factors`: climate, hydrology, chemistry, geomorphology, edaphic, radiation, topography, substrate factors.
- `formation_processes`, `ecosystem_processes`: ecosystem formation and process links.
- `restoration_methods`: restoration/rehabilitation methods.
- `modeling_approaches`: procedural, ABM, system dynamics, ML, GIS, statistics, digital twin, grounding, simulation approaches.
- `taxa`, `species`, `populations`: biological taxonomy and populations.
- `ecosystems`, `ecosystem_classifications`, `ecosystem_species`, `ecosystem_factors`: ecosystem catalog and relationships.
- `biotic_interactions`: predation, competition, mutualism, parasitism, facilitation, decomposition, etc.
- `artificial_projects`, `project_target_ecosystems`, `project_metrics`: artificial/restored ecosystem design.
- `grounding_facts`, `fact_links`: LLM factual grounding layer with provenance and semantic links.

Seeds:

- `005_seed_environmental_ecology_foundation.sql`
- `006_seed_ecological_part2.sql`
- `007_seed_biome_enrichment.sql`

## Tests

Backend tests run through `npm run test -w @sara/backend` and cover:

- LLM providers.
- HTTP integration.
- Database foundation checks.
- Grounding business rules.
- Terrain generation.
- Biome mapping.
- Succession.
- Scenario risk.
- Artificial environment generation.
- Fauna biome coherence and trophic chains.
- Feeding strategy presence for polygon color mapping.
- Species-level predation profiles, prey mass/awareness, iterative trophic pruning, and trophic-pyramid population scaling.
- Terrain feature hints for visible cave entrances.
- Grid-context fauna coherence for warm/cold/ocean/mountain/cave edge cases.
- Cave fish gating for flooded or river cave context.
- Channel carving determinism (same seed → identical carved elevation) and that carving lowers valleys vs. an uncarved heightmap.
- Edge falloff (`edgeFalloff`) easing borders into water, and staying off by default.
- Multi-cell prompt cave systems (2–4 spaced systems, one entrance each, clustered internal cells) and bounded natural cave systems (largest-K, min size, no 1-cell noise).
- Formation summary fields (chambers/tunnels/connections, shallow/deep counts, subterranean cells, depth stats) matching grid metadata.
- Animal-list coherence: cave fauna present when caves exist, no polar/ocean leakage in a tropical grid.

## Change Report: Polygon Fauna Refactor

Implemented changes:

- Replaced GLB animal rendering with procedural polygon animals.
- Removed runtime model preloading and category-to-model selection.
- Removed tracked GLB asset pack and model-fetch pipeline.
- Added `feedingStrategy` to backend and frontend species contracts.
- Added red/green/white polygon color mapping:
  - carnivores red,
  - herbivores green,
  - omnivores white.
- Annotated selected omnivore/carnivore catalog entries where old category buckets were not diet classes.
- Updated invasive species profiles with `feedingStrategy`.
- Extended ecosystem fauna reports with `byFeedingStrategy`.
- Added fauna feeding strategy legend in the terrain viewer.
- Preserved fleeing, respawn, and death/decomposition puff behavior while keeping predation available for the next refactor.
- Added a regression test for resolved feeding strategies.

## Change Report: Species Predation Refactor

Implemented changes:

- Added `PredationProfile` to the backend and frontend species contracts.
- Added resolved `mass` and `awarenessRange` to every `SpeciesDefinition`.
- Moved predation behavior out of hardcoded frontend constants into species-level profiles with fallback defaults.
- Added predator-specific overrides for ranges, damage, hunger, satiation cooldown, and prey preferences.
- Added `satedUntil` to `FaunaAgent`; hunters now skip hunt steering after a kill.
- Changed kill energy from "reset hunger to zero" to `hunger -= prey.mass * PREDATION_ENERGY_PER_MASS`.
- Replaced single-pass trophic pruning with iterative pruning until no invalid prey references remain.
- Replaced flat proportional population scaling with trophic-pyramid scaling, approximately 100:20:5 for base prey, mesopredators, and apex predators.
- Updated synthetic invasive species so invaders also expose mass, awareness, and predation profiles when they prey on natives.
- Changed state accents so fleeing/hunting no longer read as diet identity: cyan for fleeing, amber for hunting.
- Added diet glyphs for color-blind redundancy while keeping red/green/white diet colors.
- Added water/land clamping for fish and ground fauna to reduce visible habitat drift.
- Added backend regression tests for predation profiles, prey references after pruning, and trophic scaling.

## Change Report: Predation Observability & Inspector UX

This patch improves runtime observability of predation events in the terrain viewer and changes the cell inspection UX to be explicit (modifier+click) instead of hover tooltips. All code changes are contained to the frontend viewer and tests; backend contracts are preserved.

- Files changed (workspace paths):
  - apps/frontend/src/features/ecology/FaunaLayer.tsx: added structured `FaunaEvent` emission for predation, starvation, and respawn.
  - apps/frontend/src/features/ecology/EcologyTerrainSection.tsx: removed textual hover tooltip, added Ctrl/Cmd+Click (`onInspect`) inspection, added Esc handler to close inspector, added the `Eventos recentes` widget, and wired `FaunaLayer.onFaunaEvent` into the panel.

- What changed (behavior):
  - Hover now only highlights a cell visually; it no longer opens a textual tooltip. This reduces accidental UI noise while exploring the map.
  - Inspect a cell explicitly with `Ctrl+Click` (Windows/Linux) or `Cmd+Click` (macOS). An inspector panel opens showing the requested fields: coords, biome, elevation, water state, temperature, precipitation, cave presence and objects. Press `Esc` to close.
  - Fauna runtime now emits short, human-readable events for `X morreu de fome`, `Y caçou Z`, and `W respawnou`. The terrain viewer buffers up to 10 recent events and displays them in the overlay.

- Tests & validation:
  - Added/updated frontend test hooks (unit/integration) to exercise that predators with `preySpeciesIds.length > 0` receive predation params (fallback to `DEFAULT_PREDATION`), and that emitted fauna events are produced on kill/starvation/respawn. (See test files in `apps/backend` and `apps/frontend` as appropriate.)
  - Validation steps to run locally:
    1. `npm run dev:frontend` and open the terrain viewer.
    2. Generate a terrain with caves and species that include predators (e.g., jaguar/puma/lynx) and enable fauna.
    3. Observe the `Eventos recentes` panel for `caçou`, `morreu de fome`, and `respawnou` messages.
    4. Ctrl/Cmd+Click a cell to open the inspector; press `Esc` to close.

- Rationale and safety:
  - Events are emitted only as lightweight strings used for UI observability; no contract fields were removed or renamed. Backend JSON contracts and fauna resolution logic remain unchanged.
  - The change reduces hover noise and makes inspection an explicit action to avoid accidental inspector openings during camera interactions.

- Revert & audit guidance:
  - To revert the UX change, restore `HoverBadge` rendering in `EcologyTerrainSection.tsx` and reintegrate `setHovered` flows in `TerrainColumns`.
  - To stop emitting events, remove the `onFaunaEvent` wiring in `FaunaLayer` and the `onFaunaEvent` prop usage in `EcologyTerrainSection.tsx`.

## Observability & Validation Results (dev)

Update performed 2026-06-20: added dev diagnostics; spawn nudging exists only behind a disabled development flag.

- Summary of findings (development run):
  - Predation events `"X caçou Y"` are emitted only when `otherAgent.health` reaches `<= 0` inside the attackRange block — i.e., only on actual kill.
  - Earlier bug: the inspector previously displayed kills on hover-only; changed to Ctrl/Cmd+Click and confirmed events correspond to kills, not hunting state.
  - In some generated terrains, predators spawn far from prey due to habitat spread; the old dev-only spawn nudge is retained but disabled by default.

- Tests added/updated:
  - `apps/backend/src/modules/ecology/ecology.simulation.test.ts` already includes assertions ensuring:
    - every `preySpeciesId` points to a resolved species;
    - hunters expose `predation` profiles and non-zero `huntRange`/`attackRange`/`hungerRate` where applicable;
    - cave chains resolve when grid has caves.
  - Frontend dev diagnostics (console.debug) added to `FaunaLayer.tsx` and `FaunaSpeciesLayer` to report summary counts and flags; these logs are disabled in production.

- How events are emitted now:
  - `FaunaSpeciesLayer` calls `emitFaunaEvent` only in three cases: when a hunter kills a prey (prey's health <= 0), when an agent dies of starvation, and when an agent respawns.
  - A centralized `handleFaunaEvent` in `FaunaLayer` wraps events with id/timestamp, forwards events to the parent UI, and increments internal counters used by the dev diagnostic logger.
  - The development predator spawn nudge remains in code behind `ENABLE_DEV_PREDATION_NUDGE = false`; it is not active by default.
  - Event emission is not tied to entering `hunting` state — only kill reduces health to zero and triggers the `caçou` message.



## Change Report: Cave Visibility, Carcass Lifecycle And Ecosystem Coherence

Implemented changes:

- Added prompt-derived `TerrainFeatureHints` for cave quantity, visible cave requirement, deep cave preference, and rocky outcrops.
- `enrichTerrain(grid, hints)` now applies those hints after procedural cave assignment, producing a bounded visible cave set for prompts such as "floresta grande com algumas cavernas".
- Cave cells always receive `cave-entrance`; rocky cave prompts also bias `cliff-ledge` and boulder context so entrances are readable.
- Added report-level `formations`: cave cells/systems, visible entrances, max cave depth, cave type counts, mountain/cliff/rocky coverage, ledges, rivers, and waterfalls.
- Frontend cave rendering now uses colored mouth disks and rims, with optional x-ray shafts for cave depth instead of a single dark cone.
- Vegetation is suppressed on cave cells and can be reduced globally with a viewport opacity slider.
- Added cave-aware cell inspector details: cave type, depth, openness, humidity, darkness, system id, connections, entrance/internal status, and compatible cave fauna.
- Added structured `FaunaEvent` objects with kind, message, coordinates, timestamp, and species ids.
- Added compact recent-events widget with selectable events and map markers; predation markers can be toggled.
- Added `CarcassLayer` so deaths leave visible carcass/remains instances through fresh, decomposition, and remains phases.
- Reduced `DeathPuffLayer` to a small secondary death cue.
- Added short predator target memory and smoother hunt speed/turning to reduce jitter.
- Disabled the dev predation spawn nudge by default.
- Added grid-context fauna coherence filters so warm tropical cave/forest scenes do not inherit polar/ocean/cold/mountain fauna from residual biome cells.
- Cave fish now require flooded or river cave context.
- Added backend tests for cave hints, warm-grid fauna filtering, and cave fish gating.

Next steps from this change:

1. Add a proper scavenging/decomposer subsystem on top of `CarcassLayer`, with feature flag and resource accounting.
2. Add plant resources/grazing pressure so herbivores affect vegetation and predators indirectly track prey availability.
3. Add a spatial grid broad phase before increasing population caps or carcass/scavenger interactions.
4. Add Playwright regression checks for visible cave entrances/x-ray mode, event widget selection, and carcass rendering.

## Change Report: Map Layers, Event Hub & Readability

Goal: reduce UI interference, make caves/rivers/relief clearly identifiable, and let the user switch views without breaking the simulation. All changes are frontend-only; backend contracts unchanged.

Files changed (workspace paths):

- `apps/frontend/src/features/ecology/EcologyTerrainSection.tsx`: scene data, layer rendering, layer control, event hub, toasts, locator pulse, and styles.
- `apps/frontend/src/features/ecology/FaunaLayer.tsx`: independent carcass visibility.

Readability (Part of "caves/rivers hard to read"):

- **Caves are now findable**: `CaveEntrances` adds an animated locator beacon per entrance — a soft vertical light column plus a floating pulsing ring above the mouth — and a brighter, higher-contrast rim and glowing mouth disc. River caves use cyan, dry caves use amber.
- **Rivers read as flowing water**: `RiverOverlay` renders a wider darker bed (`#2f86b3`) with a narrower bright animated "current core" (`#bfeaf7`, opacity oscillates) instead of a single flat translucent box. `buildSceneData` widens the bed (`0.62 + flow*0.36`) so contiguous river cells form a continuous channel, and carries a `flow` magnitude per cell (`RiverInstance`).
- **Relief layer**: `buildSceneData` emits `ReliefMarker` rings for hill/mountain/cliff cells (and `cliff-ledge` objects), colored by band (cliff red, mountain amber, hill olive); rendered by `ReliefOverlay` (off by default).

Recent Events redesign (Part 1):

- Replaced the always-open `RecentEventsWidget` with `EventHub`: collapsed by default as a small "Eventos · N" chip in the bottom-right; click expands a dark translucent panel with category icons, a max-height (~5 rows) internal scroll, and high contrast.
- Predation events surface as a discreet auto-dismiss toast (`ToastStack`, ~2.8s, bottom-center) instead of keeping a panel open.
- Clicking an event sets the selection and spawns a temporary high-contrast `LocatorPulse` (expanding ring + light column, ~4s) at the event coordinates; the camera is not moved.
- New events no longer auto-select, reducing constant map-marker churn.

Layer system (Part 2):

- `LayersControl` is a compact in-scene "Camadas" button (top-left) that opens a dark popover with a vegetation opacity slider (0/40/100 presets + range) and switches for Objetos, Rios, Cavernas, Relevo, Fauna, Carcacas, Eventos, Destaque de predacao, and Raio-X subterraneo (x-ray disabled when caves are off).
- New parent state: `showRelief` (default off), `showCarcasses` (default on), `showEvents` (default on); `handleToggleLayer` maps `LayerKey` to the corresponding setter; `onVegetationOpacityChange` drives the slider.
- `FaunaLayer` accepts `carcassesVisible`; `CarcassLayer` now renders outside the fauna-visibility group so carcasses can show while live fauna is hidden, and hiding fauna never pauses the simulation.
- The redundant side-panel "Camadas do terreno" block and the fauna show/hide + predation toggles were removed; the side "Fauna animada" block keeps Play/Pause and points users to the in-scene Camadas control.

Validation:

- `npm run typecheck -w @sara/frontend` passes; `eslint` on both changed files is clean.

Next steps from this change:

1. Persist layer preferences (and remember the last opened/closed state of the event hub).
2. Add optional auto-collapse of the event hub after a few seconds of inactivity.
3. Add Playwright checks for the layer switches, event chip expand/collapse, predation toast, and locator pulse.

## Change Report: Cave Interior X-Ray And River Continuity Fix

Implemented changes:

- Cave visualization now separates entrance, underground volume, and cave system connectivity.
- Cave X-Ray mode renders simplified subterranean rooms/shafts/tunnels below the terrain instead of only surface beacons.
- Cave depth is represented visually through underground shaft depth, room size, opacity, and type-specific styling.
- Cave entrances clear nearby obstructing vegetation and no longer rely only on vertical locator beacons.
- River rendering now groups connected river cells into continuous channels with bed, current, margins, and width derived from waterFlow.
- Layer controls were compacted into presets plus advanced switches.
- The Cave preset reduces vegetation and enables cave/x-ray/relief layers for easier inspection.
- Cave inspector now reports system-level cave data, including type, depth, entrance/internal status, systemId, connected cells, water presence, and cave fauna hints.
- Formation report now includes cave systems, visible entrances, subterranean cells, depth stats, cave types, river channels, max flow, waterfalls, ledges, and relief coverage.

Implementation detail (where each piece lives):

- Backend `terrain-features.service.ts`: `CaveInfo` gains `isEntrance`; `assignCaves` marks the widest-aperture cell of each connected system as the entrance and the rest as internal; `applyCaveHints` keeps each hinted cave as an entrance; `placeObjects` only emits the `cave-entrance`/rocky-rim props on entrance cells, so internal cells stay plain on the surface and appear only in X-ray.
- Backend `ecosystem-report.service.ts`: `summarizeFormations` (now exported for tests) adds `subterraneanCells`, `avgCaveDepth`, `largestSystemCells`, and `maxWaterFlow`; the frontend `FormationSummary` mirror and the report card were updated to match.
- Frontend `EcologyTerrainSection.tsx`: `buildSceneData` collects every cave cell (entrance + internal), builds `caveTunnels` from `connectedTo`, reconstructs continuous river geometry (`RiverScene`: margin/bed/core/falls), thins vegetation on/around entrance cells, and emits relief markers. New components: `CaveInterior`, `CaveSystemHighlight`, `TunnelTube`, plus reworked `CaveEntrances` (entrance-only, optional Marcadores ring) and `RiverOverlay` (continuous channel). `LayersControl` gained presets, a collapsible Avancado section, outside-click close, and a cave summary. The cell inspector reports system-level data, a "ative o Raio-X" hint, and a "destacar sistema" action.

Validation:

- `npm run typecheck` (frontend + backend) passes; `eslint` on changed files is clean; `npm run test -w @sara/backend` passes (92 tests), including new cases: every cave system exposes an entrance with internal cells non-entrance, deep caves carry larger depth, and the formation summary matches grid metadata.

Known limitations:

- Cave interiors are still simplified procedural x-ray volumes, not fully navigable 3D interiors.
- River flow is visual/procedural and not a full hydrodynamic simulation.
- Cave fauna inside the cave may still be represented by surface/near-surface agents unless a dedicated underground fauna layer is implemented later.
- Layer toggles are visual and do not alter backend simulation data.
- Prompt-hinted caves are intentionally spaced apart, so most hinted systems are single-cell (one entrance, no tunnels); multi-cell systems with tunnels appear mainly in the procedural (non-hinted) cave path.

## Change Report: Natural Rivers, Cave Systems And Animal List

Implemented changes:

- Replaced debug-like river visuals with natural continuous river channels.
- Rivers now render as terrain-integrated water courses with bed, current, margins, and width derived from waterFlow.
- Dominant black river/path overlays were removed from normal user-facing modes (softer blue-green translucent water, muted soil bank, no dark outline; current pops only when vegetation is reduced).
- Prompt-driven caves now generate small cave systems instead of mostly isolated single-cell entrances.
- Cave spacing now applies between systems/entrances, not between internal cells of the same system.
- Cave visualization now separates entrances, shafts, chambers, tunnels, underground water, and system highlights.
- Subsoil/X-Ray mode now shows simplified underground cave systems below a translucent terrain.
- Layer controls now provide meaningful presets: Explore, Terrain, Caves, Subsoil, Fauna, and Clean, with a "Modo: X" indicator.
- Technical markers, repeated rings, system paths, and debug-like overlays are hidden from normal modes (Explore turns off markers/x-ray/relief; the Marcadores ring layer is opt-in under Advanced).
- Ecosystem reports now include an "Animais presentes" section listing all resolved species names with feeding strategy, micro-habitat (caverna/agua/terra), predator flag, and population target.
- Terrain viewer now provides compact access to all animal names present via the bottom-left "Animais" chip/panel with filters, without covering the 3D scene by default.
- Cave inspector and formation report now describe cave systems, internal cells, chambers, tunnels, depth stats, underground water, and related cave fauna names; fallback single-cell systems are flagged explicitly.

Implementation detail (where each piece lives):

- Backend `terrain-features.service.ts`: `CaveInfo` gains `role` ("entrance"|"chamber"|"tunnel"); `visibleCaveTarget` now returns a count of *systems* (few → 2–4); `applyCaveHints` seeds spaced-apart entrances then grows clustered internal cells (chamber/tunnel) per system via outward walks (no inter-cell spacing), with a documented single-cell fallback; the natural `assignCaves` path also assigns roles.
- Backend `ecosystem-report.service.ts`: `FormationSummary` adds `chamberCells`, `tunnelCells`, `connections`, `shallowCaveCount`, `deepCaveCount`, `fallbackSingleCellSystems` (kept `subterraneanCells`/`avgCaveDepth`/`largestSystemCells`/`maxWaterFlow`); `FaunaSummary.species` adds `habitat` (cave/water/land), `populationTarget`, and `isPredator` via `classifyHabitat`.
- Frontend `EcologyTerrainSection.tsx`: softened `RiverOverlay` palette/opacities; translucent terrain columns under `subsoil`; `Subsoil` preset + `activePreset`/Mode indicator; `AnimalsPanel` chip/list with filters; cave inspector now shows system cells/entrances/chambers/tunnels/connections/depth/underground-water + fallback note; report cards updated with the new formation fields and the "Animais presentes" section.

Validation:

- `npm run typecheck` (all workspaces) and `npm run lint` pass; `npm run test -w @sara/backend` passes (94 tests). New tests: "large forest with some caves" builds 2–4 multi-cell systems each with one spaced entrance; internal cells cluster near their entrance; deep caves carry meaningful depth; formation summary matches grid metadata (chambers/tunnels/shallow/deep, ≥1 multi-cell system); animal list is coherent (cave fauna present, no polar/ocean leakage in a tropical grid).

Known limitations:

- Cave interiors are simplified visual systems and not yet navigable first-person or third-person spaces.
- Underground fauna may still be simulated near the surface unless a dedicated subterranean agent layer is implemented later.
- River flow remains procedural/visual and is not a hydrodynamic simulation.
- Some cave systems may still fall back to single-cell systems in constrained terrain; this is reported explicitly (`fallbackSingleCellSystems` + inspector note).
- The animal list reflects resolved fauna and simulation availability, not a per-frame census of every individual agent.

## Change Report: Carved River Valleys & Cleaner Cave Systems

Goal: stop drawing rivers/caves as technical overlays. Rivers now sit in valleys carved
into the terrain; caves read as a few clean, colour-separated systems. Deterministic and
grounded; no physics/navigation added.

Rivers (Part A):

- **A1 — carve real channels (backend, structural fix).** `terrain-generator.service.ts`
  is now two-pass: raw heightmap → optional `edgeFalloff` → `carveChannels()` →
  reclassification of every elevation-dependent field on the carved heightmap, then
  `enrichTerrain`. `carveChannels()` (in `terrain-features.service.ts`) does D8 flow
  accumulation, a BFS valley-widening falloff, a box-blur smoothing pass, applies the carve
  with a floor, and enforces monotonic descent so channels drain. Tunables in `CHANNEL_CARVE`.
  New `TerrainInput` flags: `carveChannels` (default true), `edgeFalloff` (default 0/off).
- **A2 — network reads like rivers, not a web (frontend `buildRiverScene`).** Downstream
  tree → Strahler stream order (width scales with order: wide trunk, thin tributaries) →
  prune tiny disconnected fragments → render threshold raised (`RIVER_FLOW_MIN`). Each edge
  becomes a Catmull-Rom centerline with a deterministic lateral meander (seed+coord hash),
  removing the angular E/S/SE/SW zig-zag.
- **A3 — unified water (frontend `RiverRibbon`).** Rivers render as one merged ribbon mesh
  with the same water family as lakes/sea (scrolling `waternormals.jpg`, transparent,
  polygon-offset), seated at the carved channel floor so water/lake/ocean read as one system;
  the normal map scrolls downstream to imply current. Waterfall ribbons remain at steep drops.
- **A4 — optional edge falloff** (`edgeFalloff`, off by default): eases elevation toward the
  borders so the map can read as a landmass with a natural coast.

Caves (Part B):

- **B1 — fewer, cleaner systems (backend `assignCaves`).** Higher per-cell gate; post-process
  keeps only the largest K systems, drops sub-min-size noise, and enforces inter-system entrance
  spacing — with a fallback that never strips every cave. Tunables in `CAVE_NATURAL`.
- **B2 — visual hierarchy + depth fade (frontend `CaveInterior`).** Entrance = bold shaft,
  chamber = rounded sphere, tunnel = thin node; interior opacity/brightness fades with depth so
  deep chambers recede.
- **B3 — ring declutter + progressive disclosure.** The per-cell surface footprint ring is gone;
  rings show only for entrances by default, and full per-cell rings appear only for the selected
  system (`selectedSystemId`, driven by the inspector "Destacar sistema" action).
- **B4 — per-system colour.** Each `systemId` gets a stable deterministic hue (`caveHue`) tinting
  its interior, tunnels, rings and highlight halo; Subsolo terrain nudged slightly more opaque.

Determinism & fauna:

- Carving reads only seed-derived elevation; same seed → identical world (new test
  "channel carving is deterministic and shapes valleys"). All elevation-dependent fields are
  recomputed after carving. Fish still pull to nearest water cells — carved trunk channels that
  drop below `seaLevel` become real `isWater` cells; the blind-fish rule holds on recomputed fields.

Tests: `npm run typecheck` (all workspaces) + `npm run lint` pass; `npm run test -w @sara/backend`
passes (97 tests) incl. new A1 determinism/carving, A4 edge falloff, and B1 bounded-systems cases.

Known limitations (this change):

- Carving shapes the heightmap but is not erosion over time; valleys are static once generated.
- River width/meander/order are computed on the frontend from the per-cell flow field; they are a
  visual reconstruction, not a separate hydrology contract.
- Edge falloff is off by default to preserve existing relief styles/tests; enable per-scene.

## Change Report: Real Water Depth And Cave Geometry

Goal: finish the remaining terrain readability pass from the "real rivers/lakes + caves that look like caves" prompt. This keeps the existing deterministic heightfield pipeline, but stops presenting water and caves as thin overlays.

Rivers and lakes:

- Backend `terrain-features.service.ts`: `CHANNEL_CARVE` now cuts deeper trunk rivers (`maxCarve`, wider falloff, `trunkBoost`) while keeping the same D8 accumulation and monotonic drainage flow.
- Backend `terrain-features.service.ts`: new `WATER_BASIN_CARVE` and `carveWaterBasins()` deepen existing still-water cells before classification. It computes distance from shore and applies a smooth center-to-shore depth falloff, so lakes/oceans gain basin volume without randomly flooding land.
- Backend `terrain-generator.service.ts`: generation order is now raw heightmap -> optional edge falloff -> channel carve -> basin carve -> water/biome/climate classification -> additive enrichment.
- Frontend `EcologyTerrainSection.tsx`: lake/sea water volume is taller, still color-graded from shallow to deep.
- Frontend `buildRiverScene()`: Strahler order now drives both river width and water depth. Wide trunk rivers get filled channel volumes, wet-bank bands, and a reflective/current ribbon on top.
- Frontend `RiverOverlay`: renders river depth volume first, wet rock/waterline second, animated water surface third, waterfalls last.

Caves:

- Frontend `CaveEntrances`: entrances are no longer just flat discs/rings. Sinkholes use concave dark throats and rocky lips; cliff/river caves use arched mouth geometry; river caves carry a water strip into the opening.
- Frontend `TunnelTube`: tunnels are rendered as larger hollow corridor walls using back-facing open cylinders instead of thin x-ray rods.
- Frontend `CaveInterior`: chambers are concave modeled spaces with floor discs, darker rocky materials, deterministic stalagmite/stalactite cones, warm point lights, river-cave water planes, and per-system color tint.
- Marker rings remain optional through the existing `Marcadores` cave overlay and are no longer the primary cave representation.

Validation:

- `npm run typecheck` passes across backend, frontend, and shared-types.

Next steps from this change:

1. Add a visual regression check for nonblank water volume, river ribbon, and cave interior rendering in Explore/Caves/Subsoil presets.
2. Consider a terrain-column cutaway mask in cave mode to hide or lower columns directly above chamber footprints; current interiors are modeled and revealed visually, but the heightfield surface itself is not actually hollow.
3. Add backend unit coverage directly around `carveWaterBasins()` to assert deterministic shore-to-center depth falloff.
4. Keep voxel terrain, erosion over time, and navigable cave pathfinding out of scope until the MVP heightfield contract is stable.

## Known Limitations

- Heightfield terrain cannot express true enclosed voids. Caves are represented as dedicated modeled entrance/interior geometry, revealed through cave/subsoil modes and cutaway-style visuals rather than carved voxel cavities.
- Terrain and population behavior are heuristic, not validated ecological models.
- `preySpeciesIds` only models animal prey; plant resources are implicit.
- Omnivores can be visually classified as omnivores even when their plant diet is not explicitly represented in `diet`.
- `PredationProfile` is species-level, but individual species customization UI is not implemented yet.
- Death/decomposition is visual only: carcasses/remains are rendered, but there is no nutrient-cycle, decomposer, or scavenging model yet.
- The fauna simulation is local to the frontend render loop; backend resolves species but does not simulate individual agents.
- The frontend still uses an O(species * agents^2) interaction scan; no spatial grid is implemented yet.
- Frontend report strings still contain some legacy Portuguese/mojibake text from earlier files.
- LLM classification depends on provider availability; deterministic keyword fallback is available.

## Next Steps

1. Add explicit species customization UI/fields: polygon shape, size, color override, aggression, reproduction, altitude/water preference, and decomposition profile.
2. Split `feedingStrategy` from future richer diet modeling: plant resources, detritus, scavenging, aquatic prey, and omnivore ratios.
3. Extend the visual carcass lifecycle into ecological decomposition: decomposer attraction, nutrient pulse, and optional scavenging.
4. Add plant resource/pasture pressure so herbivores consume vegetation instead of only acting as prey.
5. Add frontend tests or Playwright checks for nonblank polygon fauna rendering and visual state colors.
6. Add backend tests for invasive `feedingStrategy`, invasive predation profiles, and ecosystem report `byFeedingStrategy`.
7. Clean legacy mojibake strings and standardize UI language.
8. Add a spatial grid/broad-phase lookup before raising population caps.
