import { Router } from "express";
import { asyncHandler } from "../../core/http/async-handler";
import { validateBody, validateQuery } from "../../core/middleware/validate";
import { createMemoryRateLimiter } from "../../core/middleware/rate-limit";
import { ecologyController } from "./ecology.controller";
import {
  ecologyGroundedQuerySchema,
  ecologyListEcosystemsSchema,
  ecologyListSpeciesSchema,
  ecologyTerrainSchema,
  ecologySuccessionSchema,
  ecologyScenarioSchema,
  ecologyArtificialEnvSchema,
  ecologyInspectSchema,
  ecologyFaunaSchema,
  ecologyPromptTerrainSchema,
  ecologyEcosystemReportSchema,
  ecologyInvasiveSchema,
} from "./ecology.schemas";

export const ecologyRoutes = Router();

// Rate limit nas rotas de IA/simulação (POST). Catálogo (GET) fica livre.
const aiRateLimit = createMemoryRateLimiter({
  keyPrefix: "ecology",
  windowMs: 60_000,
  maxRequests: 30,
});
ecologyRoutes.use((req, res, next) => {
  if (req.method === "POST") {
    aiRateLimit(req, res, next);
    return;
  }
  next();
});

// ─── Grounded LLM ─────────────────────────────────────────────────────────────
ecologyRoutes.post(
  "/generate",
  validateBody(ecologyGroundedQuerySchema),
  asyncHandler(ecologyController.generate.bind(ecologyController))
);

ecologyRoutes.post(
  "/inspect",
  validateBody(ecologyInspectSchema),
  asyncHandler(ecologyController.inspect.bind(ecologyController))
);

// ─── Catalog ──────────────────────────────────────────────────────────────────
ecologyRoutes.get(
  "/ecosystems",
  validateQuery(ecologyListEcosystemsSchema),
  asyncHandler(ecologyController.listEcosystems.bind(ecologyController))
);

ecologyRoutes.get(
  "/ecosystems/:slug",
  asyncHandler(ecologyController.getEcosystem.bind(ecologyController))
);

ecologyRoutes.get(
  "/species",
  validateQuery(ecologyListSpeciesSchema),
  asyncHandler(ecologyController.listSpecies.bind(ecologyController))
);

ecologyRoutes.get(
  "/abiotic-factors",
  asyncHandler(ecologyController.listAbioticFactors.bind(ecologyController))
);

ecologyRoutes.get(
  "/artificial-projects",
  asyncHandler(ecologyController.listArtificialProjects.bind(ecologyController))
);

ecologyRoutes.get(
  "/modeling-approaches",
  asyncHandler(ecologyController.listModelingApproaches.bind(ecologyController))
);

ecologyRoutes.get(
  "/coverage",
  asyncHandler(ecologyController.getDomainCoverage.bind(ecologyController))
);

ecologyRoutes.post(
  "/prompt-terrain",
  validateBody(ecologyPromptTerrainSchema),
  asyncHandler(ecologyController.promptTerrain.bind(ecologyController))
);

ecologyRoutes.post(
  "/ecosystem-report",
  validateBody(ecologyEcosystemReportSchema),
  asyncHandler(ecologyController.ecosystemReport.bind(ecologyController))
);

ecologyRoutes.post(
  "/invasive",
  validateBody(ecologyInvasiveSchema),
  asyncHandler(ecologyController.invasive.bind(ecologyController))
);

// ─── Fauna ────────────────────────────────────────────────────────────────────
ecologyRoutes.post(
  "/fauna",
  validateBody(ecologyFaunaSchema),
  asyncHandler(ecologyController.fauna.bind(ecologyController))
);

// ─── Simulation ───────────────────────────────────────────────────────────────
ecologyRoutes.post(
  "/simulate/terrain",
  validateBody(ecologyTerrainSchema),
  asyncHandler(ecologyController.simulateTerrain.bind(ecologyController))
);

ecologyRoutes.post(
  "/simulate/succession",
  validateBody(ecologySuccessionSchema),
  asyncHandler(ecologyController.simulateSuccession.bind(ecologyController))
);

ecologyRoutes.post(
  "/simulate/scenario",
  validateBody(ecologyScenarioSchema),
  asyncHandler(ecologyController.simulateScenario.bind(ecologyController))
);

ecologyRoutes.post(
  "/simulate/artificial",
  validateBody(ecologyArtificialEnvSchema),
  asyncHandler(ecologyController.simulateArtificialEnv.bind(ecologyController))
);
