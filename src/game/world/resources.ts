import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

export type AnimatedExtra = { update: (t: number) => void };

export class ResourceBag {
  geos = new Set<THREE.BufferGeometry>();
  mats = new Set<THREE.Material>();
  texs = new Set<THREE.Texture>();

  geo<T extends THREE.BufferGeometry>(g: T): T {
    this.geos.add(g);
    return g;
  }

  mat<T extends THREE.Material>(m: T): T {
    this.mats.add(m);
    return m;
  }

  tex<T extends THREE.Texture>(t: T): T {
    this.texs.add(t);
    return t;
  }

  dispose() {
    this.geos.forEach((g) => g.dispose());
    this.mats.forEach((m) => m.dispose());
    this.texs.forEach((t) => t.dispose());
    this.geos.clear();
    this.mats.clear();
    this.texs.clear();
  }
}

const _pos = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _scale = new THREE.Vector3();
const _euler = new THREE.Euler();
const _mat = new THREE.Matrix4();

export class MeshBatcher {
  private buckets = new Map<THREE.Material, THREE.BufferGeometry[]>();

  add(
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    x: number,
    y: number,
    z: number,
    sx = 1,
    sy = 1,
    sz = 1,
    rx = 0,
    ry = 0,
    rz = 0,
  ) {
    const g = geo.clone();
    _pos.set(x, y, z);
    _euler.set(rx, ry, rz);
    _quat.setFromEuler(_euler);
    _scale.set(sx, sy, sz);
    _mat.compose(_pos, _quat, _scale);
    g.applyMatrix4(_mat);
    const list = this.buckets.get(mat);
    if (list) list.push(g);
    else this.buckets.set(mat, [g]);
  }

  flush(group: THREE.Group, bag: ResourceBag, shadows = true) {
    for (const [mat, geos] of this.buckets) {
      const merged = mergeGeometries(geos, false);
      geos.forEach((g) => g.dispose());
      if (!merged) continue;
      bag.geo(merged);
      const mesh = new THREE.Mesh(merged, mat);
      mesh.castShadow = shadows;
      mesh.receiveShadow = shadows;
      group.add(mesh);
    }
    this.buckets.clear();
  }
}

const dummy = new THREE.Object3D();

export function setInstance(
  mesh: THREE.InstancedMesh,
  index: number,
  x: number,
  y: number,
  z: number,
  sx = 1,
  sy = 1,
  sz = 1,
  rx = 0,
  ry = 0,
  rz = 0,
) {
  dummy.position.set(x, y, z);
  dummy.rotation.set(rx, ry, rz);
  dummy.scale.set(sx, sy, sz);
  dummy.updateMatrix();
  mesh.setMatrixAt(index, dummy.matrix);
}

export function makeInstances(
  group: THREE.Group,
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  count: number,
  fill: (mesh: THREE.InstancedMesh, dummyObj: THREE.Object3D) => void,
  shadows = true,
) {
  if (count <= 0) return null;
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  mesh.castShadow = shadows;
  mesh.receiveShadow = shadows;
  fill(mesh, dummy);
  mesh.instanceMatrix.needsUpdate = true;
  group.add(mesh);
  return mesh;
}
