import { Router } from "express";
import { asyncHandler } from "../../core/http/async-handler";
import { validateBody, validateQuery } from "../../core/middleware/validate";
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
} from "./ecology.schemas";

export const ecologyRoutes = Router();

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
