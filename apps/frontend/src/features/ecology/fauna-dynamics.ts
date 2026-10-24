import { biomeFamily, FAMILY_RESOURCES, type ResourceType } from "@sara/shared-types";

/** Educational time/energy units, not calibrated field rates. */
export const STEP_SECONDS = 1 / 30;
export type PopulationMode = "ecological" | "demonstration";

export class SimulationClock {
  private remainder = 0;
  advance(delta: number, speed: number, step: (dt: number) => void) {
    // Ignore tab-resume gaps; retain the backlog of ordinary slow frames.
    if (!Number.isFinite(delta) || delta <= 0 || delta > 1) return;
    this.remainder += delta * Math.max(0, speed);
    let steps = 0;
    while (this.remainder + 1e-9 >= STEP_SECONDS && steps < 60) {
      step(STEP_SECONDS);
      this.remainder -= STEP_SECONDS;
      steps++;
    }
  }
  reset() { this.remainder = 0; }
}

export function shouldHunt(hunger: number, threshold: number, satedUntil: number, now: number, pursuing: boolean) {
  return now >= satedUntil && hunger >= threshold * (pursuing ? 0.2 : 0.38);
}

export function pursuitSeconds(distance: number, speed: number) {
  return Math.min(1.2, distance / Math.max(0.1, speed) * 0.5);
}

export function canCross(from: {isWater: boolean; elevation: number}, to: {isWater: boolean; elevation: number}, kind: "ground" | "bird" | "fish") {
  if (kind === "bird") return true;
  if (kind === "fish") return from.isWater && to.isWater;
  return !to.isWater && Math.abs(to.elevation - from.elevation) <= 0.16;
}

export function canBreed(living: number, capacity: number, healthyParents: number, elapsed: number, foodAvailable: boolean) {
  return living >= 2 && living < capacity && healthyParents >= 2 && elapsed >= 35 && foodAvailable;
}

/** Finite, regenerating food shared by every species visiting the same cell. */
export class FoodPatch {
  private stock = new Map<ResourceType, number>();
  private updatedAt = 0;
  private capacity: Partial<Record<ResourceType, number>>;
  constructor(biome: string, cave = false) {
    const family = biomeFamily(biome);
    this.capacity = { ...(family ? FAMILY_RESOURCES[family] : {}), ...(cave ? FAMILY_RESOURCES.cave : {}) };
    // Carrion must come from an actual death, not spontaneous regeneration.
    delete this.capacity.carnica;
    for (const [resource, abundance] of Object.entries(this.capacity)) this.stock.set(resource as ResourceType, abundance!);
  }
  private regenerate(now: number) {
    const elapsed = Math.max(0, now - this.updatedAt);
    this.updatedAt = now;
    this.stock.set("carnica", (this.stock.get("carnica") ?? 0) * Math.exp(-elapsed / 35));
    for (const [resource, capacity] of Object.entries(this.capacity)) {
      const r = resource as ResourceType;
      this.stock.set(r, Math.min(capacity!, (this.stock.get(r) ?? 0) + elapsed * capacity! * 0.012));
    }
  }
  available(needs: ResourceType[], now: number) {
    this.regenerate(now);
    return needs.some(resource => (this.stock.get(resource) ?? 0) > 0.02);
  }
  consume(needs: ResourceType[], amount: number, now: number) {
    this.regenerate(now);
    let remaining = amount;
    for (const resource of needs) {
      const stock = this.stock.get(resource) ?? 0;
      const taken = Math.min(stock, remaining);
      this.stock.set(resource, stock - taken);
      remaining -= taken;
    }
    return amount - remaining;
  }
  addCarrion(amount: number) { this.stock.set("carnica", Math.min(2, (this.stock.get("carnica") ?? 0) + amount)); }
}
