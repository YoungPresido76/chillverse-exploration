import * as THREE from "three";
import type { AnimatedExtra } from "./resources";
import type { PathKind, PathSample, WorldLayout } from "./layout";
import { MeshBatcher, ResourceBag, makeInstances, setInstance } from "./resources";

function noiseTexture(bag: ResourceBag, color: string, speckle: string, size = 64) {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = speckle;
  for (let i = 0; i < size * 6; i++) {
    ctx.globalAlpha = 0.18 + (i % 5) * 0.04;
    ctx.fillRect((i * 13) % size, (i * 29) % size, 1 + (i % 3), 1 + (i % 2));
  }
  ctx.globalAlpha = 1;
  const tex = bag.tex(new THREE.CanvasTexture(c));
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 8);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function plankTexture(bag: ResourceBag) {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#4a301c";
  ctx.fillRect(0, 0, 64, 64);
  const boards = ["#5c3a22", "#6a4428", "#3e2818", "#54341e"];
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = boards[i % boards.length]!;
    ctx.fillRect(0, i * 8, 64, 7);
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath();
    ctx.moveTo(0, i * 8);
    ctx.lineTo(64, i * 8);
    ctx.stroke();
  }
  const tex = bag.tex(new THREE.CanvasTexture(c));
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 6);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function ribbonGeometry(samples: PathSample[], width: number, lift: number) {
  const n = samples.length;
  const positions = new Float32Array(n * 2 * 3);
  const uvs = new Float32Array(n * 2 * 2);
  const indices: number[] = [];
  for (let i = 0; i < n; i++) {
    const s = samples[i]!;
    const hw = width * 0.5;
    positions[i * 6] = s.x - s.rx * hw;
    positions[i * 6 + 1] = s.y + lift;
    positions[i * 6 + 2] = s.z - s.rz * hw;
    positions[i * 6 + 3] = s.x + s.rx * hw;
    positions[i * 6 + 4] = s.y + lift;
    positions[i * 6 + 5] = s.z + s.rz * hw;
    const v = (i / Math.max(1, n - 1)) * n * 0.18;
    uvs[i * 4] = 0;
    uvs[i * 4 + 1] = v;
    uvs[i * 4 + 2] = 1;
    uvs[i * 4 + 3] = v;
    if (i < n - 1) {
      const a = i * 2;
      indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function splitByKind(samples: PathSample[]) {
  const runs: Array<{ kind: PathKind; samples: PathSample[] }> = [];
  for (const s of samples) {
    const last = runs[runs.length - 1];
    if (last && last.kind === s.kind) last.samples.push(s);
    else runs.push({ kind: s.kind, samples: [s] });
  }
  for (const run of runs) {
    if (run.samples.length === 1) {
      const idx = samples.indexOf(run.samples[0]!);
      const extra = samples[idx + 1] ?? samples[idx - 1];
      if (extra) run.samples.push(extra);
    }
  }
  return runs.filter((r) => r.samples.length >= 2);
}

function pathMaterial(kind: PathKind, bag: ResourceBag, tint: string) {
  if (kind === "wood") {
    return bag.mat(
      new THREE.MeshStandardMaterial({
        map: plankTexture(bag),
        color: "#c4a078",
        roughness: 0.92,
        metalness: 0.04,
        flatShading: true,
      }),
    );
  }
  if (kind === "crystal") {
    return bag.mat(
      new THREE.MeshStandardMaterial({
        color: "#bfe8ff",
        emissive: "#6ecfff",
        emissiveIntensity: 0.45,
        roughness: 0.18,
        metalness: 0.2,
        transparent: true,
        opacity: 0.92,
        flatShading: true,
      }),
    );
  }
  if (kind === "void") {
    return bag.mat(
      new THREE.MeshStandardMaterial({
        color: "#1c1626",
        emissive: tint,
        emissiveIntensity: 0.28,
        roughness: 0.55,
        metalness: 0.22,
        flatShading: true,
      }),
    );
  }
  if (kind === "cavern") {
    return bag.mat(
      new THREE.MeshStandardMaterial({
        map: noiseTexture(bag, "#2a2036", "#4a3a58"),
        color: "#8a7aaa",
        roughness: 0.95,
        metalness: 0.06,
        flatShading: true,
      }),
    );
  }
  if (kind === "stone") {
    return bag.mat(
      new THREE.MeshStandardMaterial({
        map: noiseTexture(bag, "#5a6068", "#8a9098"),
        color: "#c8cdd4",
        roughness: 0.88,
        metalness: 0.08,
        flatShading: true,
      }),
    );
  }
  return bag.mat(
    new THREE.MeshStandardMaterial({
      map: noiseTexture(bag, "#6b4a30", "#3e2a18"),
      color: "#d2b08a",
      roughness: 1,
      metalness: 0.02,
      flatShading: true,
    }),
  );
}

export function addPhysicalPath(group: THREE.Group, layout: WorldLayout, bag: ResourceBag, _extras: AnimatedExtra[]) {
  const tint = layout.map.color;
  const runs = splitByKind(layout.samples);
  for (const run of runs) {
    const width = run.kind === "wood" ? layout.pathWidth * 1.12 : layout.pathWidth;
    const lift = run.kind === "wood" ? 0.12 : 0.045;
    const geo = bag.geo(ribbonGeometry(run.samples, width, lift));
    const mesh = new THREE.Mesh(geo, pathMaterial(run.kind, bag, tint));
    mesh.receiveShadow = true;
    group.add(mesh);
  }

  const pebbleGeo = bag.geo(new THREE.DodecahedronGeometry(0.12, 0));
  const pebbleMat = bag.mat(
    new THREE.MeshStandardMaterial({
      color: layout.map.style === "cavern" ? "#3a3048" : "#5a5348",
      flatShading: true,
      roughness: 0.95,
    }),
  );
  const pebbleCount = Math.min(80, Math.floor(layout.samples.length * 0.7));
  makeInstances(group, pebbleGeo, pebbleMat, pebbleCount, (mesh) => {
    let placed = 0;
    for (let i = 2; i < layout.samples.length - 2 && placed < pebbleCount; i += 1) {
      if (i % 2 === 0) continue;
      const s = layout.samples[i]!;
      if (s.kind === "wood" || s.kind === "void") continue;
      const side = placed % 2 === 0 ? 1 : -1;
      const hw = layout.pathWidth * 0.55 + 0.08;
      setInstance(
        mesh,
        placed,
        s.x + s.rx * hw * side,
        s.y + 0.06,
        s.z + s.rz * hw * side,
        0.7 + (placed % 5) * 0.12,
        0.45 + (placed % 3) * 0.1,
        0.7 + (placed % 4) * 0.1,
        0.2,
        placed * 0.7,
        0.1,
      );
      placed += 1;
    }
    mesh.count = placed;
  });

  const woodRuns = runs.filter((r) => r.kind === "wood");
  if (woodRuns.length) {
    const postGeo = bag.geo(new THREE.CylinderGeometry(0.05, 0.06, 0.85, 5));
    const railMat = bag.mat(
      new THREE.MeshStandardMaterial({ color: "#3a2416", flatShading: true, roughness: 0.95 }),
    );
    const batch = new MeshBatcher();
    for (const run of woodRuns) {
      for (let i = 0; i < run.samples.length; i += 2) {
        const s = run.samples[i]!;
        const hw = layout.pathWidth * 0.62;
        batch.add(postGeo, railMat, s.x + s.rx * hw, s.y + 0.5, s.z + s.rz * hw, 1, 1, 1, 0.08, 0, 0);
        batch.add(postGeo, railMat, s.x - s.rx * hw, s.y + 0.5, s.z - s.rz * hw, 1, 1, 1, -0.08, 0, 0);
      }
    }
    batch.flush(group, bag);
  }

  if (layout.map.style === "space") {
    const slabGeo = bag.geo(new THREE.CylinderGeometry(1.15, 1.2, 0.22, 6));
    const slabMat = bag.mat(
      new THREE.MeshStandardMaterial({
        color: "#221c2c",
        emissive: tint,
        emissiveIntensity: 0.22,
        flatShading: true,
        roughness: 0.8,
        metalness: 0.18,
      }),
    );
    const n = Math.floor(layout.samples.length / 2);
    makeInstances(group, slabGeo, slabMat, n, (mesh) => {
      let i = 0;
      for (let s = 0; s < layout.samples.length && i < n; s += 2) {
        const p = layout.samples[s]!;
        setInstance(mesh, i, p.x, p.y - 0.08, p.z, 1.15, 1, 1.15, 0, i * 0.4, 0);
        i += 1;
      }
      mesh.count = i;
    });
  }
}
