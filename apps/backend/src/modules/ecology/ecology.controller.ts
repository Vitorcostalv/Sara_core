import type { Request, Response } from "express";
import { sendOk, sendPaginated } from "../../core/http/response";
import { AppError } from "../../core/errors/app-error";
import { ecologicalLlmService } from "./llm/ecological-llm.service";
import { ecologicalGroundingRepository } from "./grounding/ecological-grounding.repository";
import { ecologicalContextBuilderService } from "./grounding/ecological-context-builder.service";
import { terrainGeneratorService } from "./simulation/terrain-generator.service";
import { successionSimulatorService } from "./simulation/succession-simulator.service";
import { scenarioEngineService } from "./simulation/scenario-engine.service";
import { artificialEnvironmentService } from "./simulation/artificial-environment.service";
import type {
  EcologyGroundedQueryInput,
  EcologyListEcosystemsInput,
  EcologyListSpeciesInput,
  EcologyTerrainInput,
  EcologySuccessionInput,
  EcologyScenarioInput,
  EcologyArtificialEnvInput,
  EcologyInspectInput,
} from "./ecology.schemas";

export class EcologyController {
  // POST /ecology/generate
  async generate(req: Request, res: Response): Promise<void> {
    const payload = req.body as EcologyGroundedQueryInput;
    const result = await ecologicalLlmService.generate({
      prompt: payload.prompt,
      ecosystems: payload.ecosystems,
      categories: payload.categories,
      maxFacts: payload.maxFacts,
      dryRun: payload.dryRun,
      includeInspection: payload.includeInspection,
    });
    sendOk(res, result);
  }

  // GET /ecology/ecosystems
  async listEcosystems(req: Request, res: Response): Promise<void> {
    const q = req.query as unknown as EcologyListEcosystemsInput;
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const { rows, total } = await ecologicalGroundingRepository.listEcosystems({
      medium: q.medium,
      kind: q.kind,
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });
    sendPaginated(res, rows, { page, pageSize }, total);
  }

  // GET /ecology/ecosystems/:slug
  async getEcosystem(req: Request, res: Response): Promise<void> {
    const { slug } = req.params as { slug: string };
    const row = await ecologicalGroundingRepository.findEcosystemBySlug(slug);
    if (!row) {
      throw new AppError("ECOLOGY_ECOSYSTEM_NOT_FOUND", 404, `Ecosystem '${slug}' not found.`);
    }
    sendOk(res, row);
  }

  // GET /ecology/species
  async listSpecies(req: Request, res: Response): Promise<void> {
    const q = req.query as unknown as EcologyListSpeciesInput;
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const { rows, total } = await ecologicalGroundingRepository.listSpecies({
      ecosystemSlug: q.ecosystem,
      trophicRole: q.trophicRole,
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });
    sendPaginated(res, rows, { page, pageSize }, total);
  }

  // GET /ecology/abiotic-factors
  async listAbioticFactors(_req: Request, res: Response): Promise<void> {
    const rows = await ecologicalGroundingRepository.listAbioticFactors();
    sendOk(res, rows);
  }

  // GET /ecology/artificial-projects
  async listArtificialProjects(req: Request, res: Response): Promise<void> {
    const page = parseInt(String(req.query["page"] ?? 1), 10);
    const pageSize = parseInt(String(req.query["pageSize"] ?? 20), 10);
    const { rows, total } = await ecologicalGroundingRepository.listArtificialProjects({
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });
    sendPaginated(res, rows, { page, pageSize }, total);
  }

  // GET /ecology/modeling-approaches
  async listModelingApproaches(_req: Request, res: Response): Promise<void> {
    const rows = await ecologicalGroundingRepository.listModelingApproaches();
    sendOk(res, rows);
  }

  // GET /ecology/coverage
  async getDomainCoverage(_req: Request, res: Response): Promise<void> {
    const stats = await ecologicalGroundingRepository.getDomainCoverageStats();
    sendOk(res, stats);
  }

  // POST /ecology/inspect
  async inspect(req: Request, res: Response): Promise<void> {
    const payload = req.body as EcologyInspectInput;
    const result = await ecologicalContextBuilderService.buildContext({
      prompt: "inspection-mode",
      ecosystems: payload.ecosystems,
      categories: payload.categories,
      maxFacts: payload.maxFacts,
      includeInspection: true,
    });
    sendOk(res, result.inspection ?? result);
  }

  // POST /ecology/simulate/terrain
  async simulateTerrain(req: Request, res: Response): Promise<void> {
    const payload = req.body as EcologyTerrainInput;
    const grid = terrainGeneratorService.generate({
      width: payload.width,
      height: payload.height,
      seed: payload.seed,
      baseTemperatureC: payload.baseTemperatureC,
      basePrecipitationMm: payload.basePrecipitationMm,
      baseHumidityPct: payload.baseHumidityPct,
    });
    sendOk(res, grid);
  }

  // POST /ecology/simulate/succession
  async simulateSuccession(req: Request, res: Response): Promise<void> {
    const payload = req.body as EcologySuccessionInput;
    const result = successionSimulatorService.simulate({
      type: payload.type,
      startingStage: payload.startingStage,
      disturbanceIntensity: payload.disturbanceIntensity,
      ecosystemSlug: payload.ecosystemSlug,
    });
    sendOk(res, result);
  }

  // POST /ecology/simulate/scenario
  async simulateScenario(req: Request, res: Response): Promise<void> {
    const payload = req.body as EcologyScenarioInput;
    const result = scenarioEngineService.simulate({
      ecosystemSlug: payload.ecosystemSlug,
      baseTemperatureC: payload.baseTemperatureC,
      basePrecipitationMmYear: payload.basePrecipitationMmYear,
      deltaTemperatureC: payload.deltaTemperatureC,
      deltaPrecipitationPct: payload.deltaPrecipitationPct,
      disturbanceType: payload.disturbanceType,
      disturbanceIntensity: payload.disturbanceIntensity,
      connectivityIndex: payload.connectivityIndex,
    });
    sendOk(res, result);
  }

  // POST /ecology/simulate/artificial
  async simulateArtificialEnv(req: Request, res: Response): Promise<void> {
    const payload = req.body as EcologyArtificialEnvInput;
    const project = await ecologicalGroundingRepository.findArtificialProjectBySlug(payload.projectSlug);
    if (!project) {
      throw new AppError(
        "ECOLOGY_PROJECT_NOT_FOUND",
        404,
        `Artificial project '${payload.projectSlug}' not found.`
      );
    }
    const result = artificialEnvironmentService.generate(project, payload.scale);
    sendOk(res, result);
  }
}

export const ecologyController = new EcologyController();
