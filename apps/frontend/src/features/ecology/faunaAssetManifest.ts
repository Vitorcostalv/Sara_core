import type { FaunaCategory } from "../../services/api/ecology";

/**
 * Single source of truth for fauna 3D assets.
 *
 * Each entry maps a model key → a CC0/CC-BY asset (geometry + animation clips + attribution).
 * `faunaModels.ts` derives the runtime model table and the category→model index from here, and
 * `faunaCredits.ts` derives the attribution list — so licence data can never drift from the assets.
 *
 * Adding a new species' model is just adding an entry here; the dev script `npm run models:fetch`
 * downloads only entries that declare a `url` whose local file is still missing (idempotent), and
 * the runtime falls back to a procedural impostor (AnimalEntity) if a GLB is absent.
 */
export interface FaunaAsset {
  /** File name under public/models/fauna/. */
  file: string;
  /** Categories this model can represent (used to build CATEGORY_TO_MODELS). */
  categories: FaunaCategory[];
  license: "CC0" | "CC-BY";
  author: string;
  source: string;
  sourceUrl: string;
  /** Optional direct GLB URL. Only fetched by the dev script when the local file is missing. */
  url?: string;
  scaleFactor: number;
  rotationOffsetY: number;
  clips: {
    idle: string;
    walk: string | null;
    run: string | null;
    attack: string | null;
    flyOrSwim: string | null;
  };
}

// The curated base pack ships committed in the repo (Quaternius — CC0). New species can be added
// with a `url` and pulled on demand instead of bloating the repository with hundreds of GLBs.
const QUATERNIUS = {
  author: "Quaternius",
  license: "CC0",
  source: "Quaternius — Animated Animals",
  sourceUrl: "https://quaternius.com/packs/animatedanimals.html",
} as const;

export const FAUNA_ASSET_MANIFEST: Record<string, FaunaAsset> = {
  Deer:      { ...QUATERNIUS, file: "Deer.glb",      categories: ["herbivore-large"], scaleFactor: 0.10,   rotationOffsetY: 0,            clips: { idle: "Idle", walk: "Walk", run: "Run",    attack: null,     flyOrSwim: null   } },
  MuleDeer:  { ...QUATERNIUS, file: "MuleDeer.glb",  categories: ["herbivore-large"], scaleFactor: 0.085,  rotationOffsetY: Math.PI,      clips: { idle: "Idle", walk: "Walk", run: "Run",    attack: null,     flyOrSwim: null   } },
  Horse:     { ...QUATERNIUS, file: "Horse.glb",     categories: ["herbivore-large"], scaleFactor: 0.075,  rotationOffsetY: 0,            clips: { idle: "Idle", walk: "Walk", run: "Gallop", attack: null,     flyOrSwim: null   } },
  Cow:       { ...QUATERNIUS, file: "Cow.glb",       categories: ["herbivore-large"], scaleFactor: 0.075,  rotationOffsetY: Math.PI / 2,  clips: { idle: "Idle", walk: "Walk", run: null,     attack: null,     flyOrSwim: null   } },
  Capybara:  { ...QUATERNIUS, file: "Capybara.glb",  categories: ["herbivore-large"], scaleFactor: 0.10,   rotationOffsetY: Math.PI,      clips: { idle: "Idle", walk: "Walk", run: "Run",    attack: null,     flyOrSwim: null   } },
  Rabbit:    { ...QUATERNIUS, file: "Rabbit.glb",    categories: ["herbivore-small"], scaleFactor: 0.14,   rotationOffsetY: Math.PI,      clips: { idle: "Idle", walk: "Walk", run: "Run",    attack: null,     flyOrSwim: null   } },
  Pig:       { ...QUATERNIUS, file: "Pig.glb",       categories: ["herbivore-small"], scaleFactor: 0.10,   rotationOffsetY: Math.PI / 2,  clips: { idle: "Idle", walk: "Walk", run: "Run",    attack: null,     flyOrSwim: null   } },
  Wolf:      { ...QUATERNIUS, file: "Wolf.glb",      categories: ["predator-medium"], scaleFactor: 0.10,   rotationOffsetY: 0,            clips: { idle: "Idle", walk: "Walk", run: "Run",    attack: "Attack", flyOrSwim: null   } },
  Fox:       { ...QUATERNIUS, file: "Fox.glb",       categories: ["predator-medium"], scaleFactor: 0.12,   rotationOffsetY: Math.PI,      clips: { idle: "Idle", walk: "Walk", run: "Run",    attack: null,     flyOrSwim: null   } },
  Orangutan: { ...QUATERNIUS, file: "Orangutan.glb", categories: ["predator-medium"], scaleFactor: 0.085,  rotationOffsetY: Math.PI,      clips: { idle: "Idle", walk: "Walk", run: null,     attack: "Attack", flyOrSwim: null   } },
  BlackBear: { ...QUATERNIUS, file: "BlackBear.glb", categories: ["predator-large"],  scaleFactor: 0.075,  rotationOffsetY: 0,            clips: { idle: "Idle", walk: "Walk", run: "Run",    attack: "Attack", flyOrSwim: null   } },
  Parrot:    { ...QUATERNIUS, file: "Parrot.glb",    categories: ["bird"],            scaleFactor: 0.0028, rotationOffsetY: 0,            clips: { idle: "Idle", walk: null,   run: null,     attack: null,     flyOrSwim: "Fly"  } },
  Duck:      { ...QUATERNIUS, file: "Duck.glb",      categories: ["bird"],            scaleFactor: 0.0028, rotationOffsetY: -Math.PI / 2, clips: { idle: "Idle", walk: "Walk", run: null,     attack: null,     flyOrSwim: "Fly"  } },
  Goldfish:  { ...QUATERNIUS, file: "Goldfish.glb",  categories: ["fish"],            scaleFactor: 0.0225, rotationOffsetY: -Math.PI / 2, clips: { idle: "Idle", walk: null,   run: null,     attack: null,     flyOrSwim: "Swim" } },
  Crayfish:  { ...QUATERNIUS, file: "Crayfish.glb",  categories: ["fish"],            scaleFactor: 0.0225, rotationOffsetY: -Math.PI / 2, clips: { idle: "Idle", walk: null,   run: null,     attack: "Attack", flyOrSwim: null   } },
};
