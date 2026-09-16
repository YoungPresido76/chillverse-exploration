import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { getMap, isReachable } from "../maps";
import { attachInput, getMoveAxes, setInjectedKeys } from "../input";
import { INTERACT_RANGE, PLAYER_SPEED, WORLD_FIND_RANGE, cameraPulse, cameraRig, player } from "../player";
import { setAmbience, sfxPlay, stopAmbience } from "../audio";
import { useGame } from "../store";
import { REGION_HALF, getTerrainHeight, percentToWorld } from "../terrain";
import { applyAtmosphere, buildRegionWorld } from "./buildRegion";
import { getActiveLayout } from "./layout";
import type { AnimatedExtra } from "./resources";
import { assetUrl } from "../assets";

const _look = new THREE.Vector3();
const _right = new THREE.Vector3();
const _wish = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _target = new THREE.Vector3();
const _desired = new THREE.Vector3();

type ControlsProbe = {
  getYaw: () => number;
  getSpeed: () => number;
  setKeys: (codes: string[]) => void;
};

declare global {
  interface Window {
    __controlsTest?: ControlsProbe;
  }
}

function RegionContent({ mapId }: { mapId: number }) {
  const map = getMap(mapId);
  const groupRef = useRef<THREE.Group>(null);
  const extrasRef = useRef<AnimatedExtra[]>([]);
  const { scene } = useThree();
  const hemi = useMemo(() => new THREE.HemisphereLight("#d8ffe8", "#2a4a28", 0.7), []);
  const sun = useMemo(() => {
    const light = new THREE.DirectionalLight(0xffffff, 1.1);
    light.position.set(12, 18, 8);
    light.castShadow = true;
    light.shadow.mapSize.set(1024, 1024);
    light.shadow.camera.left = -REGION_HALF;
    light.shadow.camera.right = REGION_HALF;
    light.shadow.camera.top = REGION_HALF;
    light.shadow.camera.bottom = -REGION_HALF;
    return light;
  }, []);

  useEffect(() => {
    scene.add(hemi, sun);
    return () => {
      scene.remove(hemi, sun);
    };
  }, [scene, hemi, sun]);

  useEffect(() => {
    applyAtmosphere(scene, hemi, sun, map.style, map.color);
    const built = buildRegionWorld(map);
    extrasRef.current = built.extras;
    const parent = groupRef.current;
    parent?.add(built.group);
    setAmbience(map.style, built.layout.zones[0]?.id ?? "");
    return () => {
      parent?.remove(built.group);
      built.dispose();
      stopAmbience();
    };
  }, [map, scene, hemi, sun]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    extrasRef.current.forEach((e) => e.update(t));
  });

  return <group ref={groupRef} />;
}

function PixelExplorer() {
  const mesh = useRef<THREE.Sprite>(null);
  const tex = useMemo(() => {
    const loader = new THREE.TextureLoader();
    const t = loader.load(assetUrl("/sprites/explorer.png"));
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.NearestFilter;
    t.colorSpace = THREE.SRGBColorSpace;
    t.repeat.set(0.25, 0.25);
    t.offset.set(0, 0.75);
    return t;
  }, []);

  useEffect(() => () => tex.dispose(), [tex]);

  useFrame(({ clock }) => {
    if (!mesh.current) return;
    mesh.current.position.set(player.x, player.y + 1.05, player.z);
    const col = player.moving ? Math.floor(clock.elapsedTime * 8) % 4 : 0;
    const row = player.dir;
    tex.offset.set(col * 0.25, 1 - (row + 1) * 0.25);
  });

  return (
    <sprite ref={mesh} scale={[1.45, 1.9, 1]}>
      <spriteMaterial map={tex} transparent alphaTest={0.12} toneMapped={false} />
    </sprite>
  );
}

function BillboardSprite({
  url,
  position,
  scale = 1.8,
  chamberId,
  dimmed,
}: {
  url: string;
  position: [number, number, number];
  scale?: number;
  chamberId: number;
  dimmed?: boolean;
}) {
  const tex = useMemo(() => {
    const t = new THREE.TextureLoader().load(url);
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.NearestFilter;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [url]);
  useEffect(() => () => tex.dispose(), [tex]);
  const matRef = useRef<THREE.SpriteMaterial>(null);
  useFrame(({ clock }) => {
    if (matRef.current) {
      matRef.current.opacity = dimmed ? 0.45 : 0.7 + Math.sin(clock.elapsedTime * 2 + chamberId) * 0.15;
    }
  });
  return (
    <sprite position={position} scale={[scale, scale, scale]} userData={{ chamberId }}>
      <spriteMaterial ref={matRef} map={tex} transparent depthWrite={false} toneMapped={false} />
    </sprite>
  );
}

function Chambers({ mapId }: { mapId: number }) {
  const map = getMap(mapId);
  const states = useGame((s) => s.statesFor(mapId));
  const selected = useGame((s) => s.selectedChamberId);
  const setSelected = useGame((s) => s.setSelectedChamber);
  const start = useGame((s) => s.startExpedition);

  return (
    <group>
      {map.chambers.map((chamber, index) => {
        const layout = getActiveLayout();
        const [x, z] = percentToWorld(chamber.x, chamber.y);
        const y = layout ? layout.height(x, z) : getTerrainHeight(x, z);
        const reachable = isReachable(map.chambers, index, states);
        const status = states[String(chamber.id)]?.status ?? "idle";
        const color = !reachable ? "#3a3a42" : status === "running" ? "#f5a623" : status === "done" ? "#3ecfe0" : map.color;
        return (
          <group key={chamber.id} position={[x, y, z]}>
            <mesh
              position={[0, 0.22, 0]}
              castShadow
              receiveShadow
              userData={{ chamberId: chamber.id }}
              onClick={(e) => {
                e.stopPropagation();
                if (!reachable) return;
                setSelected(chamber.id);
              }}
            >
              <cylinderGeometry args={[0.55, 0.7, 0.32, 8]} />
              <meshStandardMaterial color={reachable ? "#1a1a20" : "#26262c"} flatShading roughness={0.9} />
            </mesh>
            <mesh
              position={[0, 1.12, 0]}
              userData={{ chamberId: chamber.id }}
              onClick={(e) => {
                e.stopPropagation();
                if (!reachable) return;
                setSelected(chamber.id);
              }}
            >
              <octahedronGeometry args={[0.4, 0]} />
              <meshStandardMaterial
                color={color}
                emissive={reachable ? color : "#000000"}
                emissiveIntensity={status === "running" ? 0.95 : selected === chamber.id ? 0.8 : reachable ? 0.45 : 0}
                roughness={reachable ? 0.35 : 0.95}
                transparent={!reachable}
                opacity={reachable ? 1 : 0.5}
                flatShading
              />
            </mesh>
            {reachable ? (
              <BillboardSprite
                url={map.shrine}
                position={[0, 2.25, 0]}
                scale={status === "running" ? 2.05 : 1.85}
                chamberId={chamber.id}
                dimmed={status === "done"}
              />
            ) : null}
          </group>
        );
      })}
      <ExpeditionOrb mapId={mapId} />
      <InteractPulse mapId={mapId} start={start} />
    </group>
  );
}

function InteractPulse({
  mapId,
  start,
}: {
  mapId: number;
  start: (mapId: number, chamberId: number) => boolean;
}) {
  const collect = useGame((s) => s.collectWorldFind);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.code !== "KeyE" && e.code !== "Space") return;
      const state = useGame.getState();
      if (state.nearbyChamberId) start(mapId, state.nearbyChamberId);
      else if (state.nearbyWorldId) collect(state.nearbyWorldId);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mapId, start, collect]);
  return null;
}

function ExpeditionOrb({ mapId }: { mapId: number }) {
  const map = getMap(mapId);
  const states = useGame((s) => s.statesFor(mapId));
  const mesh = useRef<THREE.Mesh>(null);
  const running = map.chambers.find((c) => states[String(c.id)]?.status === "running");

  useFrame(({ clock }) => {
    if (!mesh.current || !running) return;
    const index = map.chambers.indexOf(running);
    const state = states[String(running.id)];
    if (!state?.startedAt || !state.durationMs) return;
    const fraction = Math.max(0.04, Math.min(0.96, (Date.now() - state.startedAt) / state.durationMs));
    const layout = getActiveLayout();
    if (layout) {
      const t0 = index > 0 ? layout.landmarks[index - 1]?.t ?? 0 : 0;
      const t1 = layout.landmarks[index]?.t ?? 1;
      const t = THREE.MathUtils.clamp(THREE.MathUtils.lerp(t0, t1, fraction), 0, 1);
      const p = layout.curve.getPointAt(t);
      const y = layout.height(p.x, p.z) + 0.55 + Math.sin(clock.elapsedTime * 2.2) * 0.08;
      mesh.current.position.set(p.x, y, p.z);
      return;
    }
    const from = index > 0 ? map.chambers[index - 1]! : map.entry;
    const fromW = percentToWorld(from.x, from.y);
    const toW = percentToWorld(running.x, running.y);
    const x = THREE.MathUtils.lerp(fromW[0], toW[0], fraction);
    const z = THREE.MathUtils.lerp(fromW[1], toW[1], fraction);
    const y = getTerrainHeight(x, z) + 0.55 + Math.sin(clock.elapsedTime * 2.2) * 0.08;
    mesh.current.position.set(x, y, z);
  });

  if (!running) return null;

  return (
    <mesh ref={mesh}>
      <sphereGeometry args={[0.18, 12, 12]} />
      <meshStandardMaterial color={map.color} emissive={map.color} emissiveIntensity={1.2} roughness={0.3} />
    </mesh>
  );
}

function PlayerController({ mapId }: { mapId: number }) {
  const map = getMap(mapId);
  const setNearby = useGame((s) => s.setNearbyChamber);
  const setNearbyWorld = useGame((s) => s.setNearbyWorld);
  const setZoneName = useGame((s) => s.setZoneName);
  const stepAcc = useRef(0);
  const ambienceZone = useRef("");

  useEffect(() => {
    const layout = getActiveLayout();
    const [x, z] = percentToWorld(map.entry.x, map.entry.y);
    player.x = x;
    player.z = z;
    player.y = layout ? layout.height(x, z) : getTerrainHeight(x, z);
    player.yaw = 0;
    player.speed = 0;
    player.dir = 3;
    cameraRig.azimuth = 0;
    cameraRig.polar = 0.92;
    cameraRig.distance = 16;
  }, [map.entry.x, map.entry.y]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.1);
    const cam = state.camera;
    cam.getWorldDirection(_look);
    _look.y = 0;
    if (_look.lengthSq() < 0.0001) _look.set(0, 0, -1);
    _look.normalize();
    _right.crossVectors(_look, _up).normalize();
    const axes = getMoveAxes();
    _wish.set(0, 0, 0).addScaledVector(_look, axes.y).addScaledVector(_right, axes.x);
    const layout = getActiveLayout();
    if (_wish.lengthSq() > 0.0001) {
      _wish.normalize();
      const nx = player.x + _wish.x * PLAYER_SPEED * dt;
      const nz = player.z + _wish.z * PLAYER_SPEED * dt;
      const bound = REGION_HALF - 1.4;
      const cx = Math.max(-bound, Math.min(bound, nx));
      const cz = Math.max(-bound, Math.min(bound, nz));
      const can = layout ? layout.walkable(cx, cz) : true;
      if (can) {
        player.x = cx;
        player.z = cz;
      } else if (layout?.walkable(cx, player.z)) {
        player.x = cx;
      } else if (layout?.walkable(player.x, cz)) {
        player.z = cz;
      }
      player.yaw = Math.atan2(-_wish.x, -_wish.z);
      player.speed = PLAYER_SPEED;
      player.moving = true;
      const ax = Math.abs(_wish.x);
      const az = Math.abs(_wish.z);
      if (ax > az) player.dir = _wish.x > 0 ? 2 : 1;
      else player.dir = _wish.z > 0 ? 0 : 3;
      stepAcc.current += dt;
      if (stepAcc.current > 0.38) {
        stepAcc.current = 0;
        sfxPlay.step(layout?.surface(player.x, player.z) ?? "dirt");
      }
    } else {
      player.speed = 0;
      player.moving = false;
      stepAcc.current = 0;
    }
    player.y = layout ? layout.height(player.x, player.z) : getTerrainHeight(player.x, player.z);

    let nearest: number | null = null;
    let nearestDist = INTERACT_RANGE;
    const states = useGame.getState().statesFor(mapId);
    map.chambers.forEach((chamber, index) => {
      if (!isReachable(map.chambers, index, states)) return;
      if (states[String(chamber.id)]?.status && states[String(chamber.id)]?.status !== "idle") return;
      const [cx, cz] = percentToWorld(chamber.x, chamber.y);
      const d = Math.hypot(player.x - cx, player.z - cz);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = chamber.id;
      }
    });
    setNearby(nearest);

    const found = useGame.getState().worldFinds;
    let worldId: string | null = null;
    let worldDist = WORLD_FIND_RANGE;
    if (layout && nearest === null) {
      for (const find of layout.finds) {
        if (found.includes(find.id)) continue;
        const d = Math.hypot(player.x - find.x, player.z - find.z);
        if (d < worldDist) {
          worldDist = d;
          worldId = find.id;
        }
      }
    }
    setNearbyWorld(worldId);
    if (layout) {
      const zone = layout.zoneAt(player.x, player.z);
      setZoneName(zone.name);
      if (zone.id !== ambienceZone.current) {
        ambienceZone.current = zone.id;
        setAmbience(map.style, zone.id);
      }
    }

    let approach = 0;
    if (layout) {
      for (const lm of layout.landmarks) {
        const d = Math.hypot(player.x - lm.x, player.z - lm.z);
        approach = Math.max(approach, 1 - Math.min(1, d / (lm.radius + 2.8)));
      }
      if (worldId) approach = Math.max(approach, 0.45);
    }
    cameraPulse.t = Math.max(0, cameraPulse.t - dt * 1.5);

    const { camera } = state;
    _target.set(player.x, player.y + 1.1, player.z);
    const az = cameraRig.azimuth;
    const pol = THREE.MathUtils.clamp(cameraRig.polar - approach * 0.08, 0.35, 1.28);
    const dist = THREE.MathUtils.clamp(
      cameraRig.distance * (1 - 0.18 * approach - 0.1 * cameraPulse.t),
      6,
      34,
    );
    _desired.set(
      _target.x + Math.sin(az) * Math.sin(pol) * dist,
      _target.y + Math.cos(pol) * dist,
      _target.z + Math.cos(az) * Math.sin(pol) * dist,
    );
    const k = 1 - Math.exp(-6.5 * dt);
    camera.position.lerp(_desired, k);
    camera.lookAt(_target);
  });

  return <PixelExplorer />;
}

function CameraLook() {
  const { gl } = useThree();
  useEffect(() => {
    const el = gl.domElement;
    let lastX = 0;
    let lastY = 0;
    let dragging = false;
    const onDown = (e: PointerEvent) => {
      if (e.pointerType === "touch" && e.clientX < window.innerWidth * 0.42) return;
      dragging = true;
      cameraRig.rotating = true;
      lastX = e.clientX;
      lastY = e.clientY;
      el.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      cameraRig.azimuth -= dx * 0.005;
      cameraRig.polar = THREE.MathUtils.clamp(cameraRig.polar - dy * 0.004, 0.35, 1.28);
    };
    const onUp = () => {
      dragging = false;
      cameraRig.rotating = false;
    };
    const onWheel = (e: WheelEvent) => {
      cameraRig.distance = THREE.MathUtils.clamp(cameraRig.distance + e.deltaY * 0.02, 6, 34);
    };
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    el.addEventListener("wheel", onWheel, { passive: true });
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      el.removeEventListener("wheel", onWheel);
    };
  }, [gl]);
  return null;
}

function Scene({ mapId }: { mapId: number }) {
  return (
    <>
      <RegionContent mapId={mapId} />
      <Chambers mapId={mapId} />
      <PlayerController mapId={mapId} />
      <CameraLook />
    </>
  );
}

export function WorldCanvas({ mapId }: { mapId: number }) {
  useEffect(() => {
    const detach = attachInput();
    window.__controlsTest = {
      getYaw: () => player.yaw,
      getSpeed: () => player.speed,
      setKeys: (codes) => setInjectedKeys(codes),
    };
    return () => {
      detach();
      delete window.__controlsTest;
    };
  }, []);

  return (
    <Canvas
      className="h-full w-full touch-none"
      camera={{ position: [0, 12, 18], fov: 42, near: 0.1, far: 400 }}
      shadows
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: false }}
      onCreated={({ gl }) => {
        gl.setClearColor("#0c0c10");
        gl.domElement.style.touchAction = "none";
      }}
    >
      <Scene mapId={mapId} />
    </Canvas>
  );
}
