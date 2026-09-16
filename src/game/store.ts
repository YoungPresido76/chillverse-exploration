import { create } from "zustand";
import {
  MAPS,
  expeditionDurationMs,
  getMap,
  isReachable,
} from "./maps";
import { defaultSave, liveEnergy, loadSave, writeSave } from "./save";
import { sfxPlay, setMuted, unlockAudio } from "./audio";
import { cameraPulse } from "./player";
import { getFindDef } from "./world/finds";
import type { ChamberState, ExpeditionResult, SaveData, ScreenId, WorldToast } from "./types";

const EMPTY_STATES: Record<string, ChamberState> = {};

type GameStore = SaveData & {
  screen: ScreenId;
  activeMapId: number;
  selectedChamberId: number | null;
  nearbyChamberId: number | null;
  nearbyWorldId: string | null;
  zoneName: string;
  worldToast: WorldToast | null;
  result: ExpeditionResult | null;
  hydrated: boolean;
  setScreen: (screen: ScreenId) => void;
  setActiveMap: (id: number) => void;
  setSelectedChamber: (id: number | null) => void;
  setNearbyChamber: (id: number | null) => void;
  setNearbyWorld: (id: string | null) => void;
  setZoneName: (name: string) => void;
  hydrate: () => void;
  persist: () => void;
  currentEnergy: () => number;
  snapshotEnergy: () => void;
  statesFor: (mapId: number) => Record<string, ChamberState>;
  isUnlocked: (mapId: number) => boolean;
  startExpedition: (mapId: number, chamberId: number) => boolean;
  collectWorldFind: (id: string) => boolean;
  tickExpeditions: () => void;
  dismissResult: () => void;
  dismissWorldToast: () => void;
  toggleMute: () => void;
  resetSave: () => void;
};

let saveTimer: number | null = null;

function persistSlice(s: GameStore): SaveData {
  return {
    version: s.version,
    xp: s.xp,
    energy: s.energy,
    energyAt: s.energyAt,
    chamberStates: s.chamberStates,
    artifacts: s.artifacts,
    discoveries: s.discoveries,
    worldFinds: s.worldFinds,
    muted: s.muted,
    hasSave: true,
  };
}

function schedulePersist(get: () => GameStore) {
  if (saveTimer) window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    writeSave(persistSlice(get()));
  }, 600);
}

export const useGame = create<GameStore>((set, get) => ({
  ...defaultSave(),
  screen: "title",
  activeMapId: 1,
  selectedChamberId: null,
  nearbyChamberId: null,
  nearbyWorldId: null,
  zoneName: "",
  worldToast: null,
  result: null,
  hydrated: false,

  setScreen: (screen) => {
    unlockAudio();
    set({ screen, selectedChamberId: null, nearbyWorldId: null });
  },
  setActiveMap: (id) => set({ activeMapId: id, selectedChamberId: null, nearbyWorldId: null, zoneName: "" }),
  setSelectedChamber: (id) => set({ selectedChamberId: id }),
  setNearbyChamber: (id) => {
    if (get().nearbyChamberId === id) return;
    set({ nearbyChamberId: id });
  },
  setNearbyWorld: (id) => {
    if (get().nearbyWorldId === id) return;
    set({ nearbyWorldId: id });
  },
  setZoneName: (name) => {
    if (get().zoneName === name) return;
    set({ zoneName: name });
  },

  hydrate: () => {
    if (get().hydrated) return;
    const loaded = loadSave();
    setMuted(loaded.muted);
    set({ ...loaded, hydrated: true });
  },
  persist: () => schedulePersist(get),

  currentEnergy: () => {
    const s = get();
    return liveEnergy(s.energy, s.energyAt);
  },
  snapshotEnergy: () => {
    const energy = get().currentEnergy();
    set({ energy, energyAt: Date.now() });
  },

  statesFor: (mapId) => get().chamberStates[String(mapId)] ?? EMPTY_STATES,

  isUnlocked: (mapId) => {
    const map = getMap(mapId);
    return get().xp >= map.xpRequired;
  },

  startExpedition: (mapId, chamberId) => {
    unlockAudio();
    const map = getMap(mapId);
    const chamber = map.chambers.find((c) => c.id === chamberId);
    if (!chamber) return false;
    const states = { ...(get().chamberStates[String(mapId)] ?? {}) };
    const index = map.chambers.findIndex((c) => c.id === chamberId);
    if (!isReachable(map.chambers, index, states)) {
      sfxPlay.deny();
      return false;
    }
    if (states[String(chamberId)]?.status && states[String(chamberId)]?.status !== "idle") {
      sfxPlay.deny();
      return false;
    }
    const energy = get().currentEnergy();
    if (energy < chamber.energyCost) {
      sfxPlay.deny();
      return false;
    }
    states[String(chamberId)] = {
      status: "running",
      startedAt: Date.now(),
      durationMs: expeditionDurationMs(chamber.energyCost),
    };
    sfxPlay.start();
    cameraPulse.t = 1;
    set({
      energy: energy - chamber.energyCost,
      energyAt: Date.now(),
      chamberStates: { ...get().chamberStates, [String(mapId)]: states },
      selectedChamberId: null,
    });
    schedulePersist(get);
    return true;
  },

  collectWorldFind: (id) => {
    unlockAudio();
    if (get().worldFinds.includes(id)) return false;
    const def = getFindDef(id);
    if (!def) return false;
    sfxPlay.discover();
    cameraPulse.t = 1;
    set({
      worldFinds: [...get().worldFinds, id],
      nearbyWorldId: null,
      worldToast: { id, name: def.name, lore: def.lore },
    });
    schedulePersist(get);
    return true;
  },

  tickExpeditions: () => {
    const now = Date.now();
    const s = get();
    let changed = false;
    let xpGain = 0;
    let result: ExpeditionResult | null = s.result;
    const artifacts = [...s.artifacts];
    const discoveries = [...s.discoveries];
    const nextStates = { ...s.chamberStates };
    const energy = liveEnergy(s.energy, s.energyAt, now);

    for (const map of MAPS) {
      const states = { ...(nextStates[String(map.id)] ?? {}) };
      let mapChanged = false;
      for (const chamber of map.chambers) {
        const st = states[String(chamber.id)];
        if (st?.status !== "running" || !st.startedAt || !st.durationMs) continue;
        if (now - st.startedAt < st.durationMs) continue;
        const found = chamber.artifact || Math.random() < 0.22;
        states[String(chamber.id)] = { status: "done", artifactFound: found };
        xpGain += chamber.xpReward;
        discoveries.push({
          mapId: map.id,
          chamberId: chamber.id,
          at: now,
          artifactFound: found,
        });
        if (found && !artifacts.includes(chamber.relicName)) artifacts.push(chamber.relicName);
        if (!result) {
          result = {
            mapId: map.id,
            chamberId: chamber.id,
            xp: chamber.xpReward,
            artifactName: found ? chamber.relicName : null,
            lore: chamber.lore,
          };
        }
        mapChanged = true;
        changed = true;
      }
      if (mapChanged) nextStates[String(map.id)] = states;
    }

    if (!changed && Math.abs(energy - s.energy) < 0.05) return;
    if (changed) {
      if (result?.artifactName) sfxPlay.artifact();
      else sfxPlay.complete();
    }
    set({
      energy,
      energyAt: now,
      xp: s.xp + xpGain,
      chamberStates: nextStates,
      artifacts,
      discoveries,
      result,
    });
    if (changed) schedulePersist(get);
  },

  dismissResult: () => set({ result: null }),
  dismissWorldToast: () => set({ worldToast: null }),

  toggleMute: () => {
    const muted = !get().muted;
    setMuted(muted);
    set({ muted });
    schedulePersist(get);
  },

  resetSave: () => {
    const fresh = defaultSave();
    setMuted(false);
    set({
      ...fresh,
      hydrated: true,
      screen: "title",
      activeMapId: 1,
      selectedChamberId: null,
      nearbyChamberId: null,
      nearbyWorldId: null,
      zoneName: "",
      worldToast: null,
      result: null,
    });
    writeSave(fresh);
  },
}));

export function hideOnLeave() {
  const s = useGame.getState();
  writeSave({
    ...persistSlice(s),
    energy: liveEnergy(s.energy, s.energyAt),
    energyAt: Date.now(),
  });
}
