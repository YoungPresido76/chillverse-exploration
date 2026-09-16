import * as THREE from "three";
import type { MapDef, RegionStyle } from "../types";
import { FIND_CATALOG, type FindDef } from "./finds";
import {
  REGION_HALF,
  createSeededRandom,
  detailNoise,
  getTerrainHeight,
  percentToWorld,
} from "../terrain";

export type PathKind = "dirt" | "stone" | "wood" | "crystal" | "cavern" | "void";
export type SurfaceKind = PathKind | "grass" | "water" | "rock";

export type PathSample = {
  x: number;
  y: number;
  z: number;
  tx: number;
  tz: number;
  rx: number;
  rz: number;
  t: number;
  kind: PathKind;
};

export type LandmarkSpec = {
  chamberId: number;
  name: string;
  x: number;
  y: number;
  z: number;
  radius: number;
  t: number;
  index: number;
};

export type SubZone = {
  id: string;
  name: string;
  t0: number;
  t1: number;
  color: string;
  lowColor: string;
  heightBias: number;
  roughness: number;
};

export type WaterBody = { x: number; z: number; r: number };

export type WorldFindSpec = FindDef & {
  mapId: number;
  x: number;
  y: number;
  z: number;
};

export type HeroSpec = {
  x: number;
  y: number;
  z: number;
  kind: "tree" | "fortress" | "submerged" | "floating";
};

export type WorldLayout = {
  map: MapDef;
  seed: number;
  samples: PathSample[];
  landmarks: LandmarkSpec[];
  zones: SubZone[];
  finds: WorldFindSpec[];
  hero: HeroSpec;
  water: WaterBody[];
  pathWidth: number;
  wilderness: number;
  curve: THREE.CatmullRomCurve3;
  height: (x: number, z: number) => number;
  walkable: (x: number, z: number) => boolean;
  surface: (x: number, z: number) => SurfaceKind;
  nearestPath: (x: number, z: number) => { dist: number; sample: PathSample; index: number };
  zoneAtT: (t: number) => SubZone;
  zoneAt: (x: number, z: number) => SubZone;
};

const SAMPLE_COUNT = 96;

const ZONES: Record<number, SubZone[]> = {
  1: [
    { id: "entry", name: "Entry Meadow", t0: 0, t1: 0.18, color: "#4fd18a", lowColor: "#245c3c", heightBias: 0.04, roughness: 0.22 },
    { id: "forest", name: "Old Forest", t0: 0.18, t1: 0.38, color: "#2d7a4e", lowColor: "#143624", heightBias: 0.22, roughness: 0.48 },
    { id: "thorn", name: "Thornwood", t0: 0.38, t1: 0.56, color: "#5a6b38", lowColor: "#2a3218", heightBias: 0.16, roughness: 0.4 },
    { id: "wet", name: "Wetland", t0: 0.56, t1: 0.74, color: "#3a8a72", lowColor: "#1a4a40", heightBias: -0.28, roughness: 0.18 },
    { id: "root", name: "Ancient Root", t0: 0.74, t1: 1, color: "#3d5c32", lowColor: "#1a2814", heightBias: 0.38, roughness: 0.55 },
  ],
  2: [
    { id: "shore", name: "Lakeshore", t0: 0, t1: 0.18, color: "#4f8aa8", lowColor: "#1e4458", heightBias: -0.08, roughness: 0.2 },
    { id: "ember", name: "Ember Fields", t0: 0.18, t1: 0.4, color: "#c45a32", lowColor: "#5a2414", heightBias: 0.18, roughness: 0.36 },
    { id: "obsidian", name: "Obsidian Shore", t0: 0.4, t1: 0.58, color: "#3a4250", lowColor: "#161820", heightBias: -0.12, roughness: 0.22 },
    { id: "ashen", name: "Ashen Ruins", t0: 0.58, t1: 0.78, color: "#6a5348", lowColor: "#2a201c", heightBias: 0.28, roughness: 0.42 },
    { id: "pyro", name: "Pyroclast Zone", t0: 0.78, t1: 1, color: "#a03a28", lowColor: "#3a1410", heightBias: 0.45, roughness: 0.5 },
  ],
  3: [
    { id: "salt", name: "Salt Shore", t0: 0, t1: 0.2, color: "#8a7aa8", lowColor: "#2a2438", heightBias: -0.1, roughness: 0.24 },
    { id: "kelp", name: "Kelp Tunnels", t0: 0.2, t1: 0.42, color: "#2a5a48", lowColor: "#10241c", heightBias: 0.12, roughness: 0.38 },
    { id: "court", name: "Drowned Courts", t0: 0.42, t1: 0.62, color: "#4a3a68", lowColor: "#1a1428", heightBias: 0.08, roughness: 0.3 },
    { id: "abyss", name: "Abyss Reach", t0: 0.62, t1: 0.82, color: "#1a2040", lowColor: "#080818", heightBias: -0.18, roughness: 0.28 },
    { id: "throne", name: "Throne Deep", t0: 0.82, t1: 1, color: "#6a48a0", lowColor: "#241438", heightBias: 0.22, roughness: 0.4 },
  ],
  4: [
    { id: "cloud", name: "Cloud Vestibule", t0: 0, t1: 0.2, color: "#3a3450", lowColor: "#12101c", heightBias: 0, roughness: 0.1 },
    { id: "star", name: "Star Road", t0: 0.2, t1: 0.42, color: "#2a2448", lowColor: "#0c0a18", heightBias: 0, roughness: 0.1 },
    { id: "sanctum", name: "Sanctum Drift", t0: 0.42, t1: 0.62, color: "#241838", lowColor: "#0a0814", heightBias: 0, roughness: 0.08 },
    { id: "ether", name: "Ether Rise", t0: 0.62, t1: 0.82, color: "#3a2a20", lowColor: "#140e0c", heightBias: 0, roughness: 0.12 },
    { id: "apex", name: "The Apex", t0: 0.82, t1: 1, color: "#4a3a18", lowColor: "#1a1408", heightBias: 0, roughness: 0.1 },
  ],
};

const HERO_KIND: Record<number, HeroSpec["kind"]> = {
  1: "tree",
  2: "fortress",
  3: "submerged",
  4: "floating",
};

let activeLayout: WorldLayout | null = null;

export function setActiveLayout(layout: WorldLayout | null) {
  activeLayout = layout;
}

export function getActiveLayout() {
  return activeLayout;
}

function zoneAtT(zones: SubZone[], t: number) {
  return zones.find((z) => t >= z.t0 && t <= z.t1) ?? zones[zones.length - 1]!;
}

function waterFor(map: MapDef): WaterBody[] {
  if (map.style === "lakeside") return [{ x: 5.2, z: -5.4, r: 7.4 }, { x: -6, z: 4, r: 3.2 }];
  if (map.style === "meadow") return [{ x: 4.2, z: 7.4, r: 2.6 }];
  if (map.style === "cavern") return [{ x: -8.5, z: 14, r: 3.4 }, { x: 6, z: -4, r: 2.2 }];
  return [];
}

function inWater(x: number, z: number, water: WaterBody[]) {
  for (const w of water) {
    if (Math.hypot(x - w.x, z - w.z) < w.r) return w;
  }
  return null;
}

function pathKind(style: RegionStyle, t: number, wet: boolean): PathKind {
  if (wet) return "wood";
  if (style === "space") return "void";
  if (style === "cavern") return t > 0.74 ? "crystal" : "cavern";
  if (style === "lakeside") return t > 0.78 ? "stone" : "stone";
  return "dirt";
}

function rawHeight(x: number, z: number, style: RegionStyle, zone: SubZone, water: WaterBody[]) {
  if (style === "space") return 0;
  let h = getTerrainHeight(x, z) + zone.heightBias + detailNoise(x, z) * zone.roughness;
  const body = inWater(x, z, water);
  if (body) {
    const d = Math.hypot(x - body.x, z - body.z);
    const k = 1 - d / body.r;
    h = THREE.MathUtils.lerp(h, -0.9, k * k);
  }
  const edge = Math.max(Math.abs(x), Math.abs(z)) / REGION_HALF;
  if (style === "meadow" && edge > 0.8) h += (edge - 0.8) * 9;
  if (style === "cavern" && edge > 0.68) {
    const t = (edge - 0.68) / 0.32;
    h += t * t * 11;
  }
  if (style === "lakeside" && edge > 0.86) h += (edge - 0.86) * 7;
  return h;
}

export function buildWorldLayout(map: MapDef): WorldLayout {
  const seed = map.id * 7919 + 13;
  const random = createSeededRandom(seed);
  const zones = ZONES[map.id] ?? ZONES[1]!;
  const water = waterFor(map);
  const pathWidth = map.style === "space" ? 1.95 : 1.32;
  const wilderness = map.style === "space" ? 2.2 : map.style === "cavern" ? 5.5 : map.style === "lakeside" ? 6.3 : 7.3;

  const stops: Array<[number, number]> = [
    percentToWorld(map.entry.x, map.entry.y),
    ...map.chambers.map((c) => percentToWorld(c.x, c.y)),
  ];

  const controls: THREE.Vector3[] = [];
  for (let i = 0; i < stops.length; i++) {
    const [x, z] = stops[i]!;
    const tGuess = i / Math.max(1, stops.length - 1);
    controls.push(new THREE.Vector3(x, rawHeight(x, z, map.style, zoneAtT(zones, tGuess), water), z));
    if (i < stops.length - 1) {
      const [x2, z2] = stops[i + 1]!;
      const mx = (x + x2) / 2;
      const mz = (z + z2) / 2;
      const dx = x2 - x;
      const dz = z2 - z;
      const len = Math.hypot(dx, dz) || 1;
      const offset = (random() - 0.5) * Math.min(5.2, len * 0.42);
      const ox = mx + (-dz / len) * offset;
      const oz = mz + (dx / len) * offset;
      const midT = (i + 0.5) / Math.max(1, stops.length - 1);
      controls.push(new THREE.Vector3(ox, rawHeight(ox, oz, map.style, zoneAtT(zones, midT), water), oz));
    }
  }

  const curve = new THREE.CatmullRomCurve3(controls, false, "catmullrom", 0.38);
  const pts = curve.getSpacedPoints(SAMPLE_COUNT);
  const samples: PathSample[] = [];

  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]!;
    const t = i / (pts.length - 1);
    const tan = curve.getTangentAt(t);
    let tx = tan.x;
    let tz = tan.z;
    const tlen = Math.hypot(tx, tz) || 1;
    tx /= tlen;
    tz /= tlen;
    let rx = -tz;
    let rz = tx;
    const rlen = Math.hypot(rx, rz) || 1;
    rx /= rlen;
    rz /= rlen;
    const zone = zoneAtT(zones, t);
    const y = rawHeight(p.x, p.z, map.style, zone, water);
    const wet = Boolean(inWater(p.x, p.z, water));
    samples.push({
      x: p.x,
      y: map.style === "space" ? 0 : y,
      z: p.z,
      tx,
      tz,
      rx,
      rz,
      t,
      kind: pathKind(map.style, t, wet),
    });
  }

  const nearestPath = (x: number, z: number) => {
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i < samples.length; i++) {
      const s = samples[i]!;
      const d = (x - s.x) * (x - s.x) + (z - s.z) * (z - s.z);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    return { dist: Math.sqrt(bestD), sample: samples[best]!, index: best };
  };

  const landmarks: LandmarkSpec[] = map.chambers.map((chamber, index) => {
    const [x, z] = percentToWorld(chamber.x, chamber.y);
    const near = nearestPath(x, z);
    const last = index === map.chambers.length - 1;
    return {
      chamberId: chamber.id,
      name: chamber.name,
      x,
      y: near.sample.y,
      z,
      radius: last ? 6.1 : 4.55,
      t: near.sample.t,
      index,
    };
  });

  const height = (x: number, z: number) => {
    const zone = zoneAtT(zones, nearestPath(x, z).sample.t);
    let h = rawHeight(x, z, map.style, zone, water);
    const np = nearestPath(x, z);
    if (np.dist < 2.5) {
      const k = 1 - np.dist / 2.5;
      h += (np.sample.y - h) * k * k;
    }
    for (const lm of landmarks) {
      const d = Math.hypot(x - lm.x, z - lm.z);
      if (d < lm.radius) {
        const k = 1 - d / lm.radius;
        h += (lm.y - h) * k * k;
      }
    }
    return h;
  };

  const walkable = (x: number, z: number) => {
    const bound = REGION_HALF - 0.85;
    if (Math.abs(x) > bound || Math.abs(z) > bound) return false;
    const np = nearestPath(x, z);
    const inLm = landmarks.some((lm) => Math.hypot(x - lm.x, z - lm.z) < lm.radius + 0.7);
    if (map.style === "space") return np.dist < pathWidth * 0.92 || inLm;
    const body = inWater(x, z, water);
    if (body) {
      const d = Math.hypot(x - body.x, z - body.z);
      if (d < body.r - 0.35) {
        return np.sample.kind === "wood" && np.dist < pathWidth * 0.72;
      }
    }
    if (inLm) return true;
    return np.dist < wilderness;
  };

  const surface = (x: number, z: number): SurfaceKind => {
    const np = nearestPath(x, z);
    if (inWater(x, z, water) && !(np.sample.kind === "wood" && np.dist < pathWidth * 0.72)) return "water";
    if (np.dist < pathWidth * 0.7) return np.sample.kind;
    if (map.style === "cavern") return "rock";
    if (map.style === "space") return "void";
    return "grass";
  };

  const finds: WorldFindSpec[] = [];
  const catalog = FIND_CATALOG[map.id] ?? [];
  catalog.forEach((def, i) => {
    const t = 0.12 + i * 0.16;
    const near = nearestPath(
      curve.getPointAt(THREE.MathUtils.clamp(t, 0, 1)).x,
      curve.getPointAt(THREE.MathUtils.clamp(t, 0, 1)).z,
    );
    const side = i % 2 === 0 ? 1 : -1;
    let dist = 4.1 + random() * 1.6;
    let x = near.sample.x + near.sample.rx * dist * side;
    let z = near.sample.z + near.sample.rz * dist * side;
    let guard = 0;
    while (!walkable(x, z) && guard < 8) {
      dist *= 0.72;
      x = near.sample.x + near.sample.rx * dist * side;
      z = near.sample.z + near.sample.rz * dist * side;
      guard += 1;
    }
    if (!walkable(x, z)) return;
    finds.push({
      ...def,
      mapId: map.id,
      x,
      y: height(x, z),
      z,
    });
  });

  const last = landmarks[landmarks.length - 1]!;
  const lastNear = nearestPath(last.x, last.z);
  const hero: HeroSpec = {
    kind: HERO_KIND[map.id] ?? "tree",
    x: last.x + lastNear.sample.tx * 3.8,
    y: last.y,
    z: last.z + lastNear.sample.tz * 3.8,
  };

  const layout: WorldLayout = {
    map,
    seed,
    samples,
    landmarks,
    zones,
    finds,
    hero,
    water,
    pathWidth,
    wilderness,
    curve,
    height,
    walkable,
    surface,
    nearestPath,
    zoneAtT: (t) => zoneAtT(zones, t),
    zoneAt: (x, z) => zoneAtT(zones, nearestPath(x, z).sample.t),
  };
  return layout;
}
