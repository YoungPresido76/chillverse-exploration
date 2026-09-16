import * as THREE from "three";
import type { MapDef, RegionStyle } from "../types";
import { REGION_SIZE, TERRAIN_SEGMENTS } from "../terrain";
import { buildWorldLayout, setActiveLayout, type WorldLayout } from "./layout";
import { addPhysicalPath } from "./path";
import { ResourceBag, type AnimatedExtra } from "./resources";
import { addScenery } from "./scenery";

export type { AnimatedExtra };

export function applyAtmosphere(
  scene: THREE.Scene,
  hemi: THREE.HemisphereLight,
  sun: THREE.DirectionalLight,
  style: RegionStyle,
  tier: string,
) {
  const bg = style === "space" ? "#05050b" : style === "cavern" ? "#120e18" : tier;
  scene.background = new THREE.Color(bg);
  scene.fog = new THREE.Fog(
    bg,
    style === "space" ? 24 : style === "cavern" ? 10 : style === "lakeside" ? 15 : 17,
    style === "space" ? 92 : style === "cavern" ? 32 : style === "lakeside" ? 48 : 52,
  );
  sun.color.set("#fff4e0");
  sun.position.set(style === "space" ? -10 : style === "cavern" ? 6 : 12, style === "cavern" ? 14 : 18, style === "lakeside" ? -10 : 8);
  if (style === "cavern") {
    hemi.color.set("#6a5a88");
    hemi.groundColor.set("#1a1220");
    hemi.intensity = 0.48;
    sun.intensity = 0.72;
    sun.color.set("#c8b8ff");
  } else if (style === "space") {
    hemi.color.set("#8a9ad0");
    hemi.groundColor.set("#100818");
    hemi.intensity = 0.32;
    sun.intensity = 0.62;
  } else if (style === "lakeside") {
    hemi.color.set("#d8ecff");
    hemi.groundColor.set("#3a2418");
    hemi.intensity = 0.62;
    sun.intensity = 1.05;
    sun.color.set("#ffe0c0");
  } else {
    hemi.color.set("#d8ffe8");
    hemi.groundColor.set("#2a4a28");
    hemi.intensity = 0.7;
    sun.intensity = 1.12;
  }
}

function addTerrain(group: THREE.Group, layout: WorldLayout, bag: ResourceBag) {
  if (layout.map.style === "space") return;
  const geometry = bag.geo(new THREE.PlaneGeometry(REGION_SIZE, REGION_SIZE, TERRAIN_SEGMENTS, TERRAIN_SEGMENTS));
  geometry.rotateX(-Math.PI / 2);
  const position = geometry.attributes.position;
  const colors = new Float32Array(position.count * 3);
  const tmp = new THREE.Color();
  const worn = new THREE.Color("#3a2a18");
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const z = position.getZ(i);
    const h = layout.height(x, z);
    position.setY(i, h);
    const zone = layout.zoneAt(x, z);
    const t = layout.nearestPath(x, z).sample.t;
    const zoneIndex = layout.zones.indexOf(zone);
    const nextZone = layout.zones[Math.min(layout.zones.length - 1, zoneIndex + 1)] ?? zone;
    const blend = zoneIndex >= 0 && nextZone !== zone
      ? THREE.MathUtils.smoothstep(t, zone.t1 - 0.045, zone.t1 + 0.045)
      : 0;
    const np = layout.nearestPath(x, z);
    tmp.set(zone.lowColor).lerp(new THREE.Color(zone.color), THREE.MathUtils.clamp((h + 1.2) / 3.2, 0, 1));
    if (blend > 0) {
      const nextColor = new THREE.Color(nextZone.lowColor).lerp(
        new THREE.Color(nextZone.color),
        THREE.MathUtils.clamp((h + 1.2) / 3.2, 0, 1),
      );
      tmp.lerp(nextColor, blend * 0.72);
    }
    if (np.dist < 2.2) tmp.lerp(worn, (1 - np.dist / 2.2) * 0.35);
    colors[i * 3] = tmp.r;
    colors[i * 3 + 1] = tmp.g;
    colors[i * 3 + 2] = tmp.b;
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(
    geometry,
    bag.mat(
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        flatShading: true,
        roughness: 0.92,
        metalness: 0.04,
      }),
    ),
  );
  mesh.receiveShadow = true;
  group.add(mesh);
}

export function buildRegionWorld(map: MapDef): {
  group: THREE.Group;
  extras: AnimatedExtra[];
  layout: WorldLayout;
  dispose: () => void;
} {
  const layout = buildWorldLayout(map);
  setActiveLayout(layout);
  const group = new THREE.Group();
  const extras: AnimatedExtra[] = [];
  const bag = new ResourceBag();
  addTerrain(group, layout, bag);
  addPhysicalPath(group, layout, bag, extras);
  addScenery(group, layout, bag, extras);
  return {
    group,
    extras,
    layout,
    dispose: () => {
      setActiveLayout(null);
      bag.dispose();
    },
  };
}
