import type { FaunaAgent } from "./AnimalEntity";

export interface FaunaSpatialEntry {
  speciesId: string;
  agent: FaunaAgent;
}

export class FaunaSpatialIndex {
  private readonly buckets = new Map<string, FaunaSpatialEntry[]>();

  private rebuiltForTick = -1;

  constructor(private readonly cellSize: number) {}

  rebuild(registry: Map<string, FaunaAgent[]>, tick: number) {
    if (this.rebuiltForTick === tick) return;
    this.rebuiltForTick = tick;
    this.buckets.clear();

    for (const [speciesId, agents] of registry.entries()) {
      for (const agent of agents) {
        if (!agent.active || agent.state === "dying") continue;
        const key = this.keyFor(agent.position.x, agent.position.z);
        const bucket = this.buckets.get(key);
        const entry = { speciesId, agent };
        if (bucket) bucket.push(entry);
        else this.buckets.set(key, [entry]);
      }
    }
  }

  query(x: number, z: number, radius: number): FaunaSpatialEntry[] {
    const minX = Math.floor((x - radius) / this.cellSize);
    const maxX = Math.floor((x + radius) / this.cellSize);
    const minZ = Math.floor((z - radius) / this.cellSize);
    const maxZ = Math.floor((z + radius) / this.cellSize);
    const results: FaunaSpatialEntry[] = [];

    for (let cellX = minX; cellX <= maxX; cellX += 1) {
      for (let cellZ = minZ; cellZ <= maxZ; cellZ += 1) {
        const bucket = this.buckets.get(`${cellX},${cellZ}`);
        if (!bucket) continue;
        results.push(...bucket);
      }
    }

    return results;
  }

  private keyFor(x: number, z: number) {
    return `${Math.floor(x / this.cellSize)},${Math.floor(z / this.cellSize)}`;
  }
}
