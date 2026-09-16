import { ENERGY_REGEN_PER_SEC, SAVE_KEY, SAVE_VERSION, MAX_ENERGY } from "./maps";
import type { SaveData } from "./types";

export function defaultSave(): SaveData {
  return {
    version: SAVE_VERSION,
    xp: 0,
    energy: 140,
    energyAt: Date.now(),
    chamberStates: {},
    artifacts: [],
    discoveries: [],
    worldFinds: [],
    muted: false,
    hasSave: false,
  };
}

function migrate(raw: SaveData): SaveData {
  const base = defaultSave();
  return {
    ...base,
    ...raw,
    version: SAVE_VERSION,
    chamberStates: raw.chamberStates ?? {},
    artifacts: raw.artifacts ?? [],
    discoveries: raw.discoveries ?? [],
    worldFinds: raw.worldFinds ?? [],
  };
}

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return defaultSave();
    const parsed = JSON.parse(raw) as SaveData;
    return migrate(parsed);
  } catch {
    return defaultSave();
  }
}

export function writeSave(data: SaveData) {
  try {
    const blob: SaveData = { ...data, hasSave: true, version: SAVE_VERSION };
    localStorage.setItem(SAVE_KEY, JSON.stringify(blob));
  } catch {
    // private mode / quota — keep playing in memory
  }
}

export function liveEnergy(energy: number, energyAt: number, now = Date.now()) {
  const gained = ((now - energyAt) / 1000) * ENERGY_REGEN_PER_SEC;
  return Math.max(0, Math.min(MAX_ENERGY, energy + gained));
}
