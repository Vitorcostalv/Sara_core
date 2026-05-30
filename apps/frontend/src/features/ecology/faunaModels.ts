import type { FaunaCategory } from "../../services/api/ecology";

export interface FaunaModelDef {
  file: string;
  scaleFactor: number;
  rotationOffsetY: number;
  animations: {
    idle: string;
    walk: string | null;
    run: string | null;
    attack: string | null;
    flyOrSwim: string | null;
  };
}

export const FAUNA_MODELS: Record<string, FaunaModelDef> = {
  Deer:      { file: "Deer.glb",       scaleFactor: 0.10,  rotationOffsetY: 0,                animations: { idle: "Idle", walk: "Walk", run: "Run",    attack: null,     flyOrSwim: null   } },
  MuleDeer:  { file: "MuleDeer.glb",   scaleFactor: 0.085, rotationOffsetY: Math.PI,          animations: { idle: "Idle", walk: "Walk", run: "Run",    attack: null,     flyOrSwim: null   } },
  Horse:     { file: "Horse.glb",      scaleFactor: 0.075, rotationOffsetY: 0,                animations: { idle: "Idle", walk: "Walk", run: "Gallop", attack: null,     flyOrSwim: null   } },
  Cow:       { file: "Cow.glb",        scaleFactor: 0.075, rotationOffsetY: Math.PI / 2,      animations: { idle: "Idle", walk: "Walk", run: null,     attack: null,     flyOrSwim: null   } },
  Capybara:  { file: "Capybara.glb",   scaleFactor: 0.10,  rotationOffsetY: Math.PI,          animations: { idle: "Idle", walk: "Walk", run: "Run",    attack: null,     flyOrSwim: null   } },
  Rabbit:    { file: "Rabbit.glb",     scaleFactor: 0.14,  rotationOffsetY: Math.PI,          animations: { idle: "Idle", walk: "Walk", run: "Run",    attack: null,     flyOrSwim: null   } },
  Pig:       { file: "Pig.glb",        scaleFactor: 0.10,  rotationOffsetY: Math.PI / 2,      animations: { idle: "Idle", walk: "Walk", run: "Run",    attack: null,     flyOrSwim: null   } },
  Wolf:      { file: "Wolf.glb",       scaleFactor: 0.10,  rotationOffsetY: 0,                animations: { idle: "Idle", walk: "Walk", run: "Run",    attack: "Attack", flyOrSwim: null   } },
  Fox:       { file: "Fox.glb",        scaleFactor: 0.12,  rotationOffsetY: Math.PI,          animations: { idle: "Idle", walk: "Walk", run: "Run",    attack: null,     flyOrSwim: null   } },
  Orangutan: { file: "Orangutan.glb",  scaleFactor: 0.085, rotationOffsetY: Math.PI,          animations: { idle: "Idle", walk: "Walk", run: null,     attack: "Attack", flyOrSwim: null   } },
  BlackBear: { file: "BlackBear.glb",  scaleFactor: 0.075, rotationOffsetY: 0,                animations: { idle: "Idle", walk: "Walk", run: "Run",    attack: "Attack", flyOrSwim: null   } },
  Parrot:    { file: "Parrot.glb",     scaleFactor: 0.0028, rotationOffsetY: 0,                animations: { idle: "Idle", walk: null,   run: null,     attack: null,     flyOrSwim: "Fly"  } },
  Duck:      { file: "Duck.glb",       scaleFactor: 0.0028, rotationOffsetY: -Math.PI / 2,     animations: { idle: "Idle", walk: "Walk", run: null,     attack: null,     flyOrSwim: "Fly"  } },
  Goldfish:  { file: "Goldfish.glb",   scaleFactor: 0.0225, rotationOffsetY: -Math.PI / 2,     animations: { idle: "Idle", walk: null,   run: null,     attack: null,     flyOrSwim: "Swim" } },
  Crayfish:  { file: "Crayfish.glb",   scaleFactor: 0.0225, rotationOffsetY: -Math.PI / 2,     animations: { idle: "Idle", walk: null,   run: null,     attack: "Attack", flyOrSwim: null   } },
};

export const CATEGORY_TO_MODELS: Record<FaunaCategory, string[]> = {
  "herbivore-large":  ["Deer", "MuleDeer", "Horse", "Cow", "Capybara"],
  "herbivore-small":  ["Rabbit", "Pig"],
  "predator-medium":  ["Wolf", "Fox", "Orangutan"],
  "predator-large":   ["BlackBear"],
  "bird":             ["Parrot", "Duck"],
  "fish":             ["Goldfish", "Crayfish"],
};
