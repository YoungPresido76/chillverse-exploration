export const REGION_SIZE = 44;
export const REGION_HALF = REGION_SIZE / 2;
export const TERRAIN_SEGMENTS = 56;

export function createSeededRandom(seed: number) {
  let state = seed | 0;
  return function random() {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function getTerrainHeight(x: number, z: number) {
  return (
    Math.sin(x * 0.15) * 0.55 +
    Math.cos(z * 0.18) * 0.45 +
    Math.sin((x + z) * 0.09) * 0.85 +
    Math.cos((x - z) * 0.05) * 0.3
  );
}

export function detailNoise(x: number, z: number) {
  return (
    Math.sin(x * 0.31 + z * 0.17) * 0.42 +
    Math.cos(x * 0.11 - z * 0.23) * 0.28 +
    Math.sin(x * 0.53 - z * 0.41) * 0.14
  );
}

export function percentToWorld(xPercent: number, yPercent: number): [number, number] {
  const x = (xPercent / 100) * REGION_SIZE - REGION_HALF;
  const z = (yPercent / 100) * REGION_SIZE - REGION_HALF;
  return [x, z];
}

export function scatterPoints(
  count: number,
  seed: number,
  exclusionPoints: Array<[number, number]>,
  exclusionRadius: number,
  margin = 3,
): Array<[number, number]> {
  const random = createSeededRandom(seed);
  const bound = REGION_HALF - margin;
  const points: Array<[number, number]> = [];
  const maxAttempts = count * 20;
  let attempts = 0;
  while (points.length < count && attempts < maxAttempts) {
    attempts += 1;
    const x = (random() * 2 - 1) * bound;
    const z = (random() * 2 - 1) * bound;
    const tooClose = exclusionPoints.some(([ex, ez]) => {
      const dx = x - ex;
      const dz = z - ez;
      return Math.sqrt(dx * dx + dz * dz) < exclusionRadius;
    });
    if (!tooClose) points.push([x, z]);
  }
  return points;
}
