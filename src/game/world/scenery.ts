import * as THREE from "three";
import { createSeededRandom } from "../terrain";
import { useGame } from "../store";
import type { WorldFindSpec, WorldLayout } from "./layout";
import {
  MeshBatcher,
  ResourceBag,
  makeInstances,
  setInstance,
  type AnimatedExtra,
} from "./resources";

type Kit = ReturnType<typeof makeKit>;

function makeKit(bag: ResourceBag, tint: string) {
  const std = (color: string, extras: THREE.MeshStandardMaterialParameters = {}) =>
    bag.mat(
      new THREE.MeshStandardMaterial({
        color,
        flatShading: true,
        roughness: 0.9,
        metalness: 0.04,
        ...extras,
      }),
    );
  return {
    trunkGeo: bag.geo(new THREE.CylinderGeometry(0.12, 0.18, 1.15, 6)),
    foliageGeo: bag.geo(new THREE.ConeGeometry(0.85, 1.9, 7)),
    rockGeo: bag.geo(new THREE.DodecahedronGeometry(0.45, 0)),
    grassGeo: bag.geo(new THREE.ConeGeometry(0.12, 0.55, 5).translate(0, 0.28, 0)),
    reedGeo: bag.geo(new THREE.CylinderGeometry(0.025, 0.04, 1.1, 4).translate(0, 0.55, 0)),
    crystalGeo: bag.geo(new THREE.ConeGeometry(0.14, 1.35, 5)),
    postGeo: bag.geo(new THREE.CylinderGeometry(0.08, 0.1, 1.4, 6)),
    boxGeo: bag.geo(new THREE.BoxGeometry(1, 1, 1)),
    cylGeo: bag.geo(new THREE.CylinderGeometry(0.5, 0.5, 1, 8)),
    coneGeo: bag.geo(new THREE.ConeGeometry(0.5, 1, 6)),
    icoGeo: bag.geo(new THREE.IcosahedronGeometry(0.5, 0)),
    torusGeo: bag.geo(new THREE.TorusGeometry(0.7, 0.08, 6, 12)),
    discGeo: bag.geo(new THREE.CircleGeometry(1, 16)),
    trunkMat: std("#2b1d14"),
    foliageMat: std(new THREE.Color(tint).lerp(new THREE.Color("#1d5c3f"), 0.45).getStyle()),
    darkFoliage: std("#1a3a28"),
    thornFoliage: std("#3a4a22"),
    rockMat: std("#4b4a55"),
    darkRock: std("#2a2430"),
    ashRock: std("#5a4a42"),
    grassMat: std("#3a8a4c", { roughness: 0.7 }),
    reedMat: std("#3a5c38"),
    stoneMat: std("#6a6860"),
    woodMat: std("#4a301c"),
    crystalMat: std("#bfe8ff", {
      emissive: "#7fd4ff",
      emissiveIntensity: 0.7,
      transparent: true,
      opacity: 0.9,
      roughness: 0.15,
      metalness: 0.22,
    }),
    glowMat: std(tint, { emissive: tint, emissiveIntensity: 0.85, roughness: 0.35 }),
    emberMat: std("#ff7a3a", { emissive: "#ff5a18", emissiveIntensity: 1.1, roughness: 0.4 }),
    saltMat: std("#d8d0e8", { emissive: "#c0b0ff", emissiveIntensity: 0.25 }),
    voidMat: std("#221c2c", { emissive: tint, emissiveIntensity: 0.3, metalness: 0.18 }),
    clearingMat: std("#5a4630", { roughness: 1 }),
    waterMat: bag.mat(
      new THREE.MeshStandardMaterial({
        color: "#8fd4ef",
        transparent: true,
        opacity: 0.78,
        roughness: 0.12,
        metalness: 0.18,
        emissive: "#0d3a52",
        emissiveIntensity: 0.28,
      }),
    ),
  };
}

function addWater(group: THREE.Group, layout: WorldLayout, kit: Kit, extras: AnimatedExtra[], bag: ResourceBag) {
  if (!layout.water.length) return;
  const tex = bag.tex(makeWaterRipple());
  kit.waterMat.map = tex;
  extras.push({
    update: (t) => {
      tex.offset.y = t * 0.018;
      tex.offset.x = Math.sin(t * 0.07) * 0.04;
    },
  });
  for (const w of layout.water) {
    const mesh = new THREE.Mesh(new THREE.CircleGeometry(w.r, 28), kit.waterMat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(w.x, layout.height(w.x, w.z) + 0.22, w.z);
    mesh.receiveShadow = true;
    group.add(mesh);
  }
}

function makeWaterRipple() {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#2f7fb0";
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = "rgba(255,255,255,0.28)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 10; i++) {
    ctx.beginPath();
    const y = (i / 10) * 128;
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(32, y + 10, 96, y - 10, 128, y);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function windify(mat: THREE.MeshStandardMaterial, extras: AnimatedExtra[]) {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = { value: 0 };
    extras.push({
      update: (t) => {
        shader.uniforms.uTime.value = t;
      },
    });
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nuniform float uTime;")
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        float wind = sin(uTime * 1.35 + transformed.x * 0.65 + transformed.z * 0.5);
        transformed.x += wind * 0.1 * max(transformed.y, 0.0);`,
      );
  };
}

function addVegetation(group: THREE.Group, layout: WorldLayout, kit: Kit, extras: AnimatedExtra[]) {
  const random = createSeededRandom(layout.seed + 40);
  const style = layout.map.style;
  if (style === "space") return;

  const treePts: Array<[number, number, number, number, string]> = [];
  const rockPts: Array<[number, number, number, number]> = [];
  const grassPts: Array<[number, number, number]> = [];
  const reedPts: Array<[number, number, number]> = [];

  const attempts = 420;
  for (let i = 0; i < attempts; i++) {
    const x = (random() * 2 - 1) * 20;
    const z = (random() * 2 - 1) * 20;
    if (!layout.walkable(x, z)) continue;
    const np = layout.nearestPath(x, z);
    const inLm = layout.landmarks.some((lm) => Math.hypot(x - lm.x, z - lm.z) < lm.radius * 0.72);
    if (inLm) continue;
    const zone = layout.zoneAt(x, z);
    const y = layout.height(x, z);
    if (np.dist > 2.5 && np.dist < layout.wilderness - 0.4 && treePts.length < 36 && random() > 0.45) {
      const kind = zone.id === "thorn" ? "thorn" : zone.id === "forest" || zone.id === "root" ? "dark" : "leaf";
      treePts.push([x, y, z, 0.75 + random() * 0.55, kind]);
    }
    if (np.dist > 1.6 && rockPts.length < 22 && random() > 0.7) {
      rockPts.push([x, y, z, 0.5 + random() * 0.7]);
    }
    if (np.dist > 1.3 && np.dist < 4.2 && grassPts.length < 140 && style !== "cavern" && random() > 0.25) {
      grassPts.push([x, y, z]);
    }
    if ((zone.id === "wet" || zone.id === "shore" || zone.id === "kelp") && reedPts.length < 40 && random() > 0.55) {
      reedPts.push([x, y, z]);
    }
  }

  if (style !== "cavern") {
    makeInstances(group, kit.trunkGeo, kit.trunkMat, treePts.length, (mesh) => {
      treePts.forEach(([x, y, z, s], i) => setInstance(mesh, i, x, y + 0.55 * s, z, s, s, s, 0, i, 0));
    });
    const leaf = treePts.filter((p) => p[4] === "leaf");
    const dark = treePts.filter((p) => p[4] === "dark");
    const thorn = treePts.filter((p) => p[4] === "thorn");
    const plant = (pts: typeof leaf, mat: THREE.Material) =>
      makeInstances(group, kit.foliageGeo, mat, pts.length, (mesh) => {
        pts.forEach(([x, y, z, s], i) => setInstance(mesh, i, x, y + 1.5 * s, z, s, s, s, 0, i * 0.4, 0));
      });
    plant(leaf, kit.foliageMat);
    plant(dark, kit.darkFoliage);
    plant(thorn, kit.thornFoliage);
  }

  makeInstances(group, kit.rockGeo, style === "lakeside" ? kit.ashRock : kit.rockMat, rockPts.length, (mesh) => {
    rockPts.forEach(([x, y, z, s], i) => setInstance(mesh, i, x, y + 0.18 * s, z, s, s * 0.75, s, 0.2, i, 0.15));
  });

  if (grassPts.length) {
    windify(kit.grassMat, extras);
    makeInstances(group, kit.grassGeo, kit.grassMat, grassPts.length, (mesh) => {
      grassPts.forEach(([x, y, z], i) => {
        const s = 0.7 + (i % 5) * 0.12;
        setInstance(mesh, i, x, y, z, s, s, s, 0, i, 0);
      });
    }, false);
  }
  if (reedPts.length) {
    windify(kit.reedMat, extras);
    makeInstances(group, kit.reedGeo, kit.reedMat, reedPts.length, (mesh) => {
      reedPts.forEach(([x, y, z], i) => setInstance(mesh, i, x, y, z, 1, 0.8 + (i % 4) * 0.15, 1, 0.05, i, 0.04));
    }, false);
  }

  if (style === "cavern") {
    const mushPts = rockPts.slice(0, 16);
    makeInstances(group, kit.icoGeo, kit.glowMat, mushPts.length, (mesh) => {
      mushPts.forEach(([x, y, z], i) => setInstance(mesh, i, x, y + 0.42, z, 0.35, 0.28, 0.35, 0, i, 0));
    });
  }
}

function addZoneAccents(group: THREE.Group, layout: WorldLayout, kit: Kit, bag: ResourceBag) {
  const batch = new MeshBatcher();
  const style = layout.map.style;
  for (let i = 6; i < layout.samples.length - 6; i += 7) {
    const sample = layout.samples[i]!;
    const zone = layout.zoneAtT(sample.t);
    const side = i % 2 === 0 ? 1 : -1;
    const offset = layout.pathWidth * 1.7 + (i % 3) * 0.35;
    const x = sample.x + sample.rx * offset * side;
    const z = sample.z + sample.rz * offset * side;
    const y = layout.height(x, z);
    if (style === "meadow") {
      const mat = zone.id === "wet" ? kit.reedMat : zone.id === "thorn" ? kit.thornFoliage : kit.grassMat;
      batch.add(kit.grassGeo, mat, x, y, z, 0.9, 0.8 + (i % 4) * 0.12, 0.9, 0, i * 0.3, 0);
    } else if (style === "lakeside") {
      const hot = zone.id === "ember" || zone.id === "pyro";
      batch.add(hot ? kit.crystalGeo : kit.rockGeo, hot ? kit.emberMat : kit.ashRock, x, y + 0.25, z, 0.5, 0.75, 0.5, 0, i * 0.2, 0);
    } else if (style === "cavern") {
      batch.add(kit.crystalGeo, zone.id === "abyss" ? kit.glowMat : kit.saltMat, x, y + 0.5, z, 0.35, 0.7, 0.35, 0, i * 0.4, 0);
    } else {
      batch.add(kit.icoGeo, zone.id === "ether" ? kit.glowMat : kit.voidMat, x, y + 0.18, z, 0.28, 0.16, 0.28, 0, i * 0.25, 0);
    }
  }
  batch.flush(group, bag);
}

function addZoneTransitionMarkers(group: THREE.Group, layout: WorldLayout, kit: Kit, bag: ResourceBag) {
  const batch = new MeshBatcher();
  for (const zone of layout.zones.slice(0, -1)) {
    const s = layout.samples[Math.floor(zone.t1 * (layout.samples.length - 1))]!;
    const y = layout.height(s.x, s.z);
    const left = [s.x + s.rx * 1.9, y, s.z + s.rz * 1.9] as const;
    const right = [s.x - s.rx * 1.9, y, s.z - s.rz * 1.9] as const;
    if (layout.map.style === "meadow") {
      batch.add(kit.postGeo, kit.woodMat, left[0], left[1] + 0.55, left[2], 0.7, 1, 0.7);
      batch.add(kit.postGeo, kit.woodMat, right[0], right[1] + 0.55, right[2], 0.7, 1, 0.7);
    } else if (layout.map.style === "lakeside") {
      batch.add(kit.rockGeo, kit.ashRock, left[0], left[1] + 0.35, left[2], 0.8, 1.2, 0.8);
      batch.add(kit.rockGeo, kit.ashRock, right[0], right[1] + 0.2, right[2], 0.6, 0.8, 0.6);
    } else if (layout.map.style === "cavern") {
      batch.add(kit.crystalGeo, kit.glowMat, left[0], left[1] + 0.6, left[2], 0.5, 1.5, 0.5);
      batch.add(kit.crystalGeo, kit.saltMat, right[0], right[1] + 0.45, right[2], 0.45, 1.1, 0.45);
    } else {
      batch.add(kit.icoGeo, kit.glowMat, left[0], left[1] + 0.28, left[2], 0.35, 0.2, 0.35);
      batch.add(kit.icoGeo, kit.voidMat, right[0], right[1] + 0.22, right[2], 0.3, 0.18, 0.3);
    }
  }
  batch.flush(group, bag);
}

function addBoundaries(group: THREE.Group, layout: WorldLayout, kit: Kit) {
  const style = layout.map.style;
  const step = 1.55;
  const extent = layout.map.style === "space" ? 25 : 26;
  const pts: Array<[number, number, number, number]> = [];
  for (let x = -extent; x <= extent; x += step) {
    for (let z = -extent; z <= extent; z += step) {
      if (layout.walkable(x, z)) continue;
      const neighbor =
        layout.walkable(x + step, z) ||
        layout.walkable(x - step, z) ||
        layout.walkable(x, z + step) ||
        layout.walkable(x, z - step);
      if (!neighbor) continue;
      if (layout.water.some((w) => Math.hypot(x - w.x, z - w.z) < w.r + 0.4)) continue;
      pts.push([x, layout.height(x, z), z, 0.85 + ((x * 13 + z * 7) % 9) / 12]);
    }
  }
  const max = Math.min(pts.length, 120);
  if (style === "space") {
    makeInstances(group, kit.icoGeo, kit.voidMat, max, (mesh) => {
      for (let i = 0; i < max; i++) {
        const [x, y, z, s] = pts[i]!;
        setInstance(mesh, i, x, y + 0.4 + (i % 5) * 0.15, z, s, s * 0.6, s, 0, i, 0);
      }
    });
    return;
  }
  if (style === "cavern") {
    makeInstances(group, kit.rockGeo, kit.darkRock, max, (mesh) => {
      for (let i = 0; i < max; i++) {
        const [x, y, z, s] = pts[i]!;
        const sc = 1.4 * s;
        setInstance(mesh, i, x, y + 0.4 * sc, z, sc, sc * 1.3, sc, 0.2, i, 0.1);
      }
    });
    return;
  }
  if (style === "lakeside") {
    makeInstances(group, kit.rockGeo, kit.ashRock, max, (mesh) => {
      for (let i = 0; i < max; i++) {
        const [x, y, z, s] = pts[i]!;
        setInstance(mesh, i, x, y + 0.35 * s, z, s * 1.3, s, s * 1.3, 0, i, 0);
      }
    });
    return;
  }
  makeInstances(group, kit.trunkGeo, kit.trunkMat, max, (mesh) => {
    for (let i = 0; i < max; i++) {
      const [x, y, z, s] = pts[i]!;
      setInstance(mesh, i, x, y + 0.7 * s, z, s, s * 1.15, s, 0, i, 0);
    }
  });
  makeInstances(group, kit.foliageGeo, kit.darkFoliage, max, (mesh) => {
    for (let i = 0; i < max; i++) {
      const [x, y, z, s] = pts[i]!;
      setInstance(mesh, i, x, y + 1.7 * s, z, s * 1.15, s * 1.15, s * 1.15, 0, i * 0.3, 0);
    }
  });
}

function addBoundaryLandforms(group: THREE.Group, layout: WorldLayout, kit: Kit, bag: ResourceBag) {
  const batch = new MeshBatcher();
  const style = layout.map.style;
  for (const boundary of layout.boundaries) {
    for (let i = -4; i <= 4; i++) {
      const tangentX = Math.cos(boundary.angle) * i * 1.2;
      const tangentZ = Math.sin(boundary.angle) * i * 1.2;
      const x = boundary.x + tangentX;
      const z = boundary.z + tangentZ;
      const y = layout.height(x, z);
      if (style === "space") {
        batch.add(kit.icoGeo, kit.voidMat, x, y + 0.5 + (i & 1) * 0.18, z, 0.9, 0.65, 0.9, 0.1, i, 0);
      } else if (style === "cavern" || style === "lakeside") {
        batch.add(kit.rockGeo, style === "lakeside" ? kit.ashRock : kit.darkRock, x, y + 0.45, z, 1.15, 1.45, 1.15, 0.1, i, 0.08);
      } else {
        batch.add(kit.trunkGeo, kit.trunkMat, x, y + 0.75, z, 0.8, 1.4, 0.8, 0, i, 0);
        batch.add(kit.foliageGeo, kit.darkFoliage, x, y + 1.9, z, 1.05, 1.2, 1.05, 0, i * 0.4, 0);
      }
    }
  }
  batch.flush(group, bag);
}

function addLandmarkPocketProps(group: THREE.Group, layout: WorldLayout, kit: Kit, bag: ResourceBag) {
  const batch = new MeshBatcher();
  for (const lm of layout.landmarks) {
    const count = lm.index === layout.landmarks.length - 1 ? 10 : 7;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + lm.index * 0.63;
      const radius = lm.pocketRadius * (0.62 + (i % 3) * 0.055);
      const x = lm.x + Math.cos(angle) * radius;
      const z = lm.z + Math.sin(angle) * radius;
      const y = layout.height(x, z);
      if (layout.map.style === "meadow") {
        batch.add(kit.grassGeo, i % 2 ? kit.grassMat : kit.thornFoliage, x, y, z, 1.2, 1.2 + (i % 3) * 0.2, 1.2, 0, angle, 0);
      } else if (layout.map.style === "lakeside") {
        batch.add(kit.rockGeo, i % 2 ? kit.ashRock : kit.darkRock, x, y + 0.22, z, 0.55, 0.4, 0.55, 0.1, angle, 0);
      } else if (layout.map.style === "cavern") {
        batch.add(kit.crystalGeo, kit.saltMat, x, y + 0.5, z, 0.45, 0.7, 0.45, 0, angle, 0);
      } else {
        batch.add(kit.icoGeo, kit.voidMat, x, y + 0.18, z, 0.35, 0.2, 0.35, 0, angle, 0);
      }
    }
  }
  batch.flush(group, bag);
}

function addAuthoredLandmarkDetails(group: THREE.Group, layout: WorldLayout, kit: Kit, bag: ResourceBag) {
  const batch = new MeshBatcher();
  const style = layout.map.style;
  for (const lm of layout.landmarks) {
    const near = layout.nearestPath(lm.x, lm.z).sample;
    const forward = new THREE.Vector2(near.tx, near.tz);
    const side = new THREE.Vector2(near.rx, near.rz);
    const entrance = new THREE.Vector2(lm.x, lm.z).addScaledVector(forward, -1.65);
    const flank = (d: number, s: number) => new THREE.Vector2(lm.x, lm.z).addScaledVector(forward, d).addScaledVector(side, s);
    const ey = layout.height(entrance.x, entrance.y);
    if (style === "meadow") {
      batch.add(kit.postGeo, kit.woodMat, entrance.x - side.x * 1.25, ey + 0.7, entrance.y - side.y * 1.25, 0.75, 0.9, 0.75);
      batch.add(kit.postGeo, kit.woodMat, entrance.x + side.x * 1.25, ey + 0.7, entrance.y + side.y * 1.25, 0.75, 0.9, 0.75);
      batch.add(kit.boxGeo, kit.woodMat, entrance.x, ey + 1.4, entrance.y, 2.9, 0.22, 0.25);
      const p = flank(1.5, 2.35); batch.add(kit.boxGeo, kit.stoneMat, p.x, layout.height(p.x, p.y) + 0.22, p.y, 0.9, 0.45, 0.65);
      const q = flank(2.1, -2.2); batch.add(kit.grassGeo, kit.glowMat, q.x, layout.height(q.x, q.y), q.y, 1.3, 1.8, 1.3);
    } else if (style === "lakeside") {
      batch.add(kit.boxGeo, kit.ashRock, entrance.x - side.x * 1.3, ey + 0.9, entrance.y - side.y * 1.3, 0.5, 1.8, 0.5);
      batch.add(kit.boxGeo, kit.ashRock, entrance.x + side.x * 1.3, ey + 0.65, entrance.y + side.y * 1.3, 0.5, 1.3, 0.5);
      batch.add(kit.boxGeo, kit.ashRock, entrance.x, ey + 1.75, entrance.y, 2.8, 0.3, 0.45);
      const p = flank(1.3, 2.6); batch.add(kit.icoGeo, kit.emberMat, p.x, layout.height(p.x, p.y) + 0.9, p.y, 1.3, 1.3, 1.3);
      const q = flank(2.2, -2.4); batch.add(kit.boxGeo, kit.darkRock, q.x, layout.height(q.x, q.y) + 0.18, q.y, 1.4, 0.35, 0.7);
    } else if (style === "cavern") {
      batch.add(kit.crystalGeo, kit.saltMat, entrance.x - side.x * 1.15, ey + 0.7, entrance.y - side.y * 1.15, 0.65, 1.7, 0.65);
      batch.add(kit.crystalGeo, kit.saltMat, entrance.x + side.x * 1.15, ey + 0.5, entrance.y + side.y * 1.15, 0.55, 1.25, 0.55);
      batch.add(kit.torusGeo, kit.glowMat, entrance.x, ey + 1.55, entrance.y, 1.7, 1.7, 1.7, Math.PI / 2);
      const p = flank(1.6, 2.5); batch.add(kit.boxGeo, kit.stoneMat, p.x, layout.height(p.x, p.y) + 0.38, p.y, 1.1, 0.75, 0.8);
      const q = flank(2.2, -2.2); batch.add(kit.crystalGeo, kit.glowMat, q.x, layout.height(q.x, q.y) + 0.6, q.y, 0.65, 1.5, 0.65);
    } else {
      batch.add(kit.boxGeo, kit.voidMat, entrance.x - side.x * 1.25, ey + 0.85, entrance.y - side.y * 1.25, 0.24, 1.7, 0.24);
      batch.add(kit.boxGeo, kit.voidMat, entrance.x + side.x * 1.25, ey + 0.85, entrance.y + side.y * 1.25, 0.24, 1.7, 0.24);
      batch.add(kit.torusGeo, kit.glowMat, entrance.x, ey + 1.7, entrance.y, 1.65, 1.65, 1.65, Math.PI / 2);
      const p = flank(1.6, 2.5); batch.add(kit.icoGeo, kit.glowMat, p.x, layout.height(p.x, p.y) + 0.35, p.y, 0.55, 0.35, 0.55);
      const q = flank(2.3, -2.1); batch.add(kit.boxGeo, kit.voidMat, q.x, layout.height(q.x, q.y) + 0.2, q.y, 1.3, 0.22, 0.65);
    }
  }
  batch.flush(group, bag);
}

function addLandmarks(group: THREE.Group, layout: WorldLayout, kit: Kit, bag: ResourceBag) {
  const batch = new MeshBatcher();
  for (const lm of layout.landmarks) {
    const disc = new THREE.Mesh(kit.discGeo, kit.clearingMat);
    disc.rotation.x = -Math.PI / 2;
    disc.position.set(lm.x, lm.y + 0.03, lm.z);
    disc.scale.setScalar(lm.radius * 0.72);
    disc.receiveShadow = true;
    group.add(disc);

    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const r = lm.radius * 0.62;
      batch.add(
        kit.rockGeo,
        kit.stoneMat,
        lm.x + Math.cos(a) * r,
        lm.y + 0.12,
        lm.z + Math.sin(a) * r,
        0.45,
        0.28,
        0.45,
        0.2,
        a,
        0.1,
      );
    }

    const i = lm.index;
    const style = layout.map.style;
    if (style === "meadow") meadowLandmark(batch, kit, lm, i);
    else if (style === "lakeside") lakeLandmark(batch, kit, lm, i);
    else if (style === "cavern") cavernLandmark(batch, kit, lm, i);
    else voidLandmark(batch, kit, lm, i);
  }
  batch.flush(group, bag);
}

function meadowLandmark(batch: MeshBatcher, kit: Kit, lm: WorldLayout["landmarks"][0], i: number) {
  const { x, y, z } = lm;
  if (i === 0) {
    batch.add(kit.boxGeo, kit.stoneMat, x - 1.35, y + 1.1, z - 0.9, 0.38, 2.2, 0.38);
    batch.add(kit.boxGeo, kit.stoneMat, x + 1.35, y + 1.1, z - 0.9, 0.38, 2.2, 0.38);
    batch.add(kit.boxGeo, kit.stoneMat, x, y + 2.15, z - 0.9, 3.1, 0.28, 0.4);
  } else if (i === 1) {
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      batch.add(kit.coneGeo, kit.thornFoliage, x + Math.cos(a) * 1.6, y + 0.7, z + Math.sin(a) * 1.6, 0.7, 1.5, 0.7);
    }
  } else if (i === 2) {
    batch.add(kit.cylGeo, kit.stoneMat, x, y + 0.28, z + 1.1, 1.8, 0.35, 1.8);
    batch.add(kit.cylGeo, kit.glowMat, x, y + 0.5, z + 1.1, 0.55, 0.18, 0.55);
  } else if (i === 3) {
    batch.add(kit.torusGeo, kit.woodMat, x, y + 1.3, z, 2.2, 2.2, 2.2, Math.PI / 2, 0, 0);
    batch.add(kit.torusGeo, kit.woodMat, x, y + 1.3, z, 2.2, 2.2, 2.2, Math.PI / 2, Math.PI / 2, 0);
  } else {
    batch.add(kit.cylGeo, kit.stoneMat, x, y + 0.35, z, 1.4, 0.4, 1.4);
    batch.add(kit.icoGeo, kit.glowMat, x, y + 0.95, z, 0.7, 0.7, 0.7);
  }
}

function lakeLandmark(batch: MeshBatcher, kit: Kit, lm: WorldLayout["landmarks"][0], i: number) {
  const { x, y, z } = lm;
  if (i === 0) {
    batch.add(kit.torusGeo, kit.ashRock, x, y + 1.4, z - 0.8, 2.4, 2.6, 1.1, Math.PI / 2.4, 0, 0);
  } else if (i === 1) {
    batch.add(kit.boxGeo, kit.ashRock, x - 1.6, y + 0.7, z, 0.28, 1.4, 2.6);
    batch.add(kit.boxGeo, kit.ashRock, x + 1.6, y + 0.7, z, 0.28, 1.4, 2.6);
    batch.add(kit.boxGeo, kit.ashRock, x, y + 1.35, z - 1.3, 3.4, 0.25, 0.28);
  } else if (i === 2) {
    batch.add(kit.boxGeo, kit.darkRock, x - 1.2, y + 0.28, z + 1.2, 1.1, 0.22, 0.4);
    batch.add(kit.boxGeo, kit.darkRock, x + 1.2, y + 0.28, z + 1.2, 1.1, 0.22, 0.4);
    batch.add(kit.crystalGeo, kit.crystalMat, x, y + 0.8, z + 1.6, 1, 1.1, 1);
  } else if (i === 3) {
    batch.add(kit.boxGeo, kit.ashRock, x + 1.8, y + 1.1, z, 1.6, 2.2, 1.6);
  } else {
    batch.add(kit.coneGeo, kit.emberMat, x, y + 1.1, z + 1.4, 1.4, 2.2, 1.4);
    batch.add(kit.crystalGeo, kit.emberMat, x + 0.7, y + 0.9, z + 0.9, 0.7, 1.2, 0.7, 0, 0.4, 0.2);
  }
}

function cavernLandmark(batch: MeshBatcher, kit: Kit, lm: WorldLayout["landmarks"][0], i: number) {
  const { x, y, z } = lm;
  if (i === 0) {
    for (let k = 0; k < 5; k++) {
      batch.add(kit.icoGeo, kit.saltMat, x + Math.cos(k) * 1.3, y + 0.35, z + Math.sin(k) * 1.3, 0.7, 0.5, 0.7);
    }
  } else if (i === 1) {
    for (let k = 0; k < 7; k++) {
      batch.add(kit.reedGeo, kit.reedMat, x + Math.cos(k * 0.9) * 1.5, y, z + Math.sin(k * 0.9) * 1.5, 1.2, 1.8, 1.2);
    }
  } else if (i === 2) {
    batch.add(kit.cylGeo, kit.stoneMat, x - 1.4, y + 1.3, z, 0.35, 2.6, 0.35);
    batch.add(kit.cylGeo, kit.stoneMat, x + 1.4, y + 0.9, z + 0.4, 0.3, 1.8, 0.3, 0.2, 0, 0.15);
  } else if (i === 3) {
    batch.add(kit.torusGeo, kit.glowMat, x, y + 1.6, z, 2.4, 2.4, 2.4, Math.PI / 2, 0, 0);
  } else {
    batch.add(kit.boxGeo, kit.stoneMat, x, y + 0.55, z + 1.3, 1.1, 0.7, 1.1);
    batch.add(kit.boxGeo, kit.stoneMat, x, y + 1.15, z + 1.55, 0.7, 0.55, 0.35);
  }
}

function voidLandmark(batch: MeshBatcher, kit: Kit, lm: WorldLayout["landmarks"][0], i: number) {
  const { x, y, z } = lm;
  batch.add(kit.cylGeo, kit.voidMat, x, y - 0.05, z, 3.2, 0.28, 3.2);
  if (i === 0) batch.add(kit.icoGeo, kit.glowMat, x, y + 1.4, z, 1.1, 0.7, 1.1);
  else if (i === 1) {
    batch.add(kit.boxGeo, kit.voidMat, x - 1.5, y + 1.1, z, 0.2, 2.2, 0.2);
    batch.add(kit.boxGeo, kit.voidMat, x + 1.5, y + 1.1, z, 0.2, 2.2, 0.2);
  } else if (i === 2) batch.add(kit.torusGeo, kit.glowMat, x, y + 1.5, z, 1.8, 1.8, 1.8, Math.PI / 2, 0, 0);
  else if (i === 3) batch.add(kit.coneGeo, kit.glowMat, x, y + 2.1, z, 0.8, 3.4, 0.8);
  else batch.add(kit.icoGeo, kit.glowMat, x, y + 1.6, z, 1.4, 1.4, 1.4);
}

function addHero(group: THREE.Group, layout: WorldLayout, kit: Kit, extras: AnimatedExtra[], bag: ResourceBag) {
  const batch = new MeshBatcher();
  const { x, y, z, kind } = layout.hero;
  if (kind === "tree") {
    batch.add(kit.cylGeo, kit.trunkMat, x, y + 6.2, z, 2.6, 12.4, 2.6);
    batch.add(kit.foliageGeo, kit.darkFoliage, x, y + 13.2, z, 8.5, 7.2, 8.5);
    batch.add(kit.foliageGeo, kit.foliageMat, x + 1.4, y + 11.4, z - 1.1, 6.4, 5.2, 6.4, 0.1, 0.4, 0);
    batch.add(kit.foliageGeo, kit.darkFoliage, x - 1.6, y + 10.6, z + 1.2, 5.8, 4.8, 5.8, -0.08, 1.1, 0);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      batch.add(kit.coneGeo, kit.trunkMat, x + Math.cos(a) * 1.6, y + 0.5, z + Math.sin(a) * 1.6, 1.4, 1.1, 2.6, Math.PI / 2.4, a, 0);
    }
  } else if (kind === "fortress") {
    batch.add(kit.boxGeo, kit.ashRock, x, y + 2.4, z, 5.2, 4.8, 4.4);
    batch.add(kit.cylGeo, kit.ashRock, x - 2.4, y + 3.6, z - 1.6, 1.6, 7.2, 1.6);
    batch.add(kit.cylGeo, kit.ashRock, x + 2.3, y + 3.2, z + 1.4, 1.4, 6.4, 1.4);
    batch.add(kit.boxGeo, kit.emberMat, x - 0.8, y + 2.2, z + 2.2, 0.35, 0.5, 0.12);
    batch.add(kit.boxGeo, kit.emberMat, x + 0.9, y + 2.6, z + 2.2, 0.35, 0.5, 0.12);
    batch.add(kit.boxGeo, kit.darkRock, x, y + 5.1, z, 5.6, 0.4, 4.8);
  } else if (kind === "submerged") {
    batch.add(kit.torusGeo, kit.stoneMat, x, y + 3.2, z, 6.5, 6.5, 6.5, Math.PI / 2, 0, 0);
    batch.add(kit.torusGeo, kit.saltMat, x, y + 2.4, z, 5.2, 5.2, 5.2, 0.4, 0.6, 0);
    batch.add(kit.icoGeo, kit.glowMat, x, y + 2.6, z, 2.2, 2.2, 2.2);
    batch.add(kit.coneGeo, kit.saltMat, x + 2.4, y + 2.8, z, 1.3, 5.4, 1.3);
    batch.add(kit.coneGeo, kit.saltMat, x - 2.1, y + 2.2, z + 1.6, 1.1, 4.4, 1.1);
  } else {
    const rings: THREE.Mesh[] = [];
    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(
        bag.geo(new THREE.TorusGeometry(2.2 + i * 0.7, 0.08, 6, 20)),
        kit.glowMat,
      );
      ring.position.set(x, y + 6.5, z);
      ring.rotation.set(i * 0.7, i * 1.1, i * 0.4);
      group.add(ring);
      rings.push(ring);
    }
    batch.add(kit.icoGeo, kit.glowMat, x, y + 6.5, z, 2.4, 2.4, 2.4);
    extras.push({
      update: (t) => {
        rings.forEach((r, i) => {
          r.rotation.x += 0.12 * (i + 1) * 0.016;
          r.rotation.y = t * (0.18 + i * 0.07);
        });
      },
    });
  }
  batch.flush(group, bag);
}

function addFinds(group: THREE.Group, layout: WorldLayout, kit: Kit, extras: AnimatedExtra[], _bag: ResourceBag) {
  const bobbers: THREE.Object3D[] = [];
  layout.finds.forEach((find) => {
    const node = buildFindMesh(find, kit);
    node.position.set(find.x, find.y + 0.35, find.z);
    node.userData.findId = find.id;
    const halo = new THREE.Mesh(kit.discGeo, kit.glowMat);
    halo.rotation.x = -Math.PI / 2;
    halo.position.set(0, -0.3, 0);
    halo.scale.setScalar(0.55);
    node.add(halo);
    group.add(node);
    bobbers.push(node);
  });
  extras.push({
    update: (t) => {
      const collected = new Set(useGame.getState().worldFinds);
      bobbers.forEach((b, i) => {
        const find = layout.finds[i];
        if (!find) return;
        const hidden = collected.has(find.id);
        b.visible = !hidden;
        if (hidden) return;
        b.position.y = find.y + 0.38 + Math.sin(t * 1.6 + i) * 0.08;
        b.rotation.y = t * 0.4 + i;
      });
    },
  });
}

function buildFindMesh(find: WorldFindSpec, kit: Kit) {
  const g = new THREE.Group();
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, y: number, s: [number, number, number] = [1, 1, 1]) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.y = y;
    m.scale.set(...s);
    m.castShadow = true;
    g.add(m);
  };
  switch (find.kind) {
    case "carving":
      add(kit.boxGeo, kit.stoneMat, 0.2, [0.9, 0.55, 0.18]);
      break;
    case "camp":
      add(kit.cylGeo, kit.woodMat, 0.08, [0.9, 0.18, 0.9]);
      add(kit.icoGeo, kit.emberMat, 0.4, [0.45, 0.55, 0.45]);
      break;
    case "plant":
      add(kit.reedGeo, kit.reedMat, 0, [1.2, 1.1, 1.2]);
      add(kit.icoGeo, kit.glowMat, 0.7, [0.4, 0.4, 0.4]);
      break;
    case "object":
      add(kit.boxGeo, kit.woodMat, 0.18, [0.5, 0.35, 0.38]);
      break;
    case "statue":
      add(kit.cylGeo, kit.stoneMat, 0.15, [0.7, 0.3, 0.7]);
      add(kit.boxGeo, kit.stoneMat, 0.7, [0.4, 0.9, 0.35]);
      add(kit.icoGeo, kit.stoneMat, 1.25, [0.35, 0.4, 0.35]);
      break;
    case "fossil":
      add(kit.torusGeo, kit.ashRock, 0.2, [0.7, 0.7, 0.35]);
      break;
    case "crystal":
      add(kit.crystalGeo, kit.crystalMat, 0.5, [1, 1, 1]);
      add(kit.crystalGeo, kit.crystalMat, 0.35, [0.6, 0.7, 0.6]);
      break;
    default:
      add(kit.icoGeo, kit.glowMat, 0.45, [0.55, 0.55, 0.55]);
  }
  return g;
}

function addLife(group: THREE.Group, layout: WorldLayout, extras: AnimatedExtra[], bag: ResourceBag) {
  const style = layout.map.style;
  const count = style === "space" ? 90 : 42;
  const positions = new Float32Array(count * 3);
  const random = createSeededRandom(layout.seed + 9);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (random() * 2 - 1) * 18;
    positions[i * 3 + 1] = 1 + random() * 7;
    positions[i * 3 + 2] = (random() * 2 - 1) * 18;
  }
  const geo = bag.geo(new THREE.BufferGeometry());
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const color =
    style === "cavern" ? "#8a7bff" : style === "lakeside" ? "#ffb070" : style === "space" ? "#c98bff" : layout.map.color;
  const mat = bag.mat(
    new THREE.PointsMaterial({
      color,
      size: style === "space" ? 0.28 : 0.16,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  const pts = new THREE.Points(geo, mat);
  group.add(pts);
  extras.push({
    update: (t) => {
      pts.rotation.y = t * 0.015;
      const arr = geo.attributes.position.array as Float32Array;
      for (let i = 0; i < count; i++) {
        arr[i * 3 + 1] = ((positions[i * 3 + 1]! + Math.sin(t * 0.4 + i) * 0.25 + 20) % 8) + 0.6;
      }
      geo.attributes.position.needsUpdate = true;
    },
  });

  if (style === "space") {
    const stars = bag.geo(new THREE.BufferGeometry());
    const sp = new Float32Array(500 * 3);
    for (let i = 0; i < 500; i++) {
      const u = random();
      const v = random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const r = 70 * (0.7 + random() * 0.3);
      sp[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      sp[i * 3 + 1] = Math.abs(r * Math.cos(phi)) * 0.6 + 4;
      sp[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    stars.setAttribute("position", new THREE.BufferAttribute(sp, 3));
    group.add(
      new THREE.Points(
        stars,
        bag.mat(
          new THREE.PointsMaterial({
            color: "#dfe8ff",
            size: 0.55,
            transparent: true,
            opacity: 0.9,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
          }),
        ),
      ),
    );
  }

  if (style === "cavern") {
    const dripGeo = bag.geo(new THREE.ConeGeometry(0.22, 1.4, 6));
    const dripMat = bag.mat(new THREE.MeshStandardMaterial({ color: "#1a1220", flatShading: true, roughness: 0.95 }));
    makeInstances(group, dripGeo, dripMat, 14, (mesh) => {
      for (let i = 0; i < 14; i++) {
        const s = layout.samples[Math.floor((i / 14) * layout.samples.length)]!;
        setInstance(mesh, i, s.x + ((i % 3) - 1) * 1.4, 8.5 + (i % 4) * 0.4, s.z, 1, 1, 1, Math.PI, i, 0);
      }
    }, false);
  }
}

function addZoneParticles(group: THREE.Group, layout: WorldLayout, extras: AnimatedExtra[], bag: ResourceBag) {
  const count = layout.map.style === "space" ? 80 : 28;
  const positions = new Float32Array(count * 3);
  const random = createSeededRandom(layout.seed + 91);
  for (let i = 0; i < count; i++) {
    const sample = layout.samples[Math.floor(random() * layout.samples.length)]!;
    const spread = 2.2 + random() * 4.5;
    positions[i * 3] = sample.x + (random() * 2 - 1) * spread;
    positions[i * 3 + 1] = sample.y + 0.55 + random() * (layout.map.style === "space" ? 5.5 : 2.8);
    positions[i * 3 + 2] = sample.z + (random() * 2 - 1) * spread;
  }
  const geo = bag.geo(new THREE.BufferGeometry());
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const mat = bag.mat(
    new THREE.PointsMaterial({
      color: layout.map.style === "meadow" ? "#b7f59a" : layout.map.style === "lakeside" ? "#ffb36b" : layout.map.style === "cavern" ? "#a892ff" : "#e6d4ff",
      size: layout.map.style === "space" ? 0.18 : 0.11,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  const points = new THREE.Points(geo, mat);
  group.add(points);
  extras.push({
    update: (t) => {
      points.rotation.y = t * 0.025;
      points.position.y = Math.sin(t * 0.35) * 0.12;
    },
  });
}

export function addScenery(
  group: THREE.Group,
  layout: WorldLayout,
  bag: ResourceBag,
  extras: AnimatedExtra[],
) {
  const kit = makeKit(bag, layout.map.color);
  addWater(group, layout, kit, extras, bag);
  addVegetation(group, layout, kit, extras);
  addZoneAccents(group, layout, kit, bag);
  addZoneTransitionMarkers(group, layout, kit, bag);
  addBoundaries(group, layout, kit);
  addBoundaryLandforms(group, layout, kit, bag);
  addLandmarks(group, layout, kit, bag);
  addLandmarkPocketProps(group, layout, kit, bag);
  addAuthoredLandmarkDetails(group, layout, kit, bag);
  addHero(group, layout, kit, extras, bag);
  addFinds(group, layout, kit, extras, bag);
  addLife(group, layout, extras, bag);
  addZoneParticles(group, layout, extras, bag);
}
