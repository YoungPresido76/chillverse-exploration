export type Tier = "I" | "II" | "III" | "IV";
export type RegionStyle = "meadow" | "lakeside" | "cavern" | "space";
export type ChamberStatus = "idle" | "running" | "done";
export type ScreenId = "title" | "atlas" | "explore" | "journal";
export type WorldFindKind =
  | "carving"
  | "object"
  | "plant"
  | "camp"
  | "fossil"
  | "crystal"
  | "statue"
  | "phenomenon";

export type ChamberDef = {
  id: number;
  name: string;
  baseTimeHours: number;
  xpReward: number;
  artifact: boolean;
  energyCost: number;
  x: number;
  y: number;
  lore: string;
  relicName: string;
  relicIcon: number;
};

export type MapDef = {
  id: number;
  name: string;
  tier: Tier;
  xpRequired: number;
  style: RegionStyle;
  color: string;
  blurb: string;
  portrait: string;
  shrine: string;
  entry: { x: number; y: number };
  chambers: ChamberDef[];
};

export type ChamberState = {
  status: ChamberStatus;
  startedAt?: number;
  durationMs?: number;
  artifactFound?: boolean;
};

export type Discovery = {
  mapId: number;
  chamberId: number;
  at: number;
  artifactFound: boolean;
};

export type WorldToast = {
  id: string;
  name: string;
  lore: string;
};

export type SaveData = {
  version: number;
  xp: number;
  energy: number;
  energyAt: number;
  chamberStates: Record<string, Record<string, ChamberState>>;
  artifacts: string[];
  discoveries: Discovery[];
  worldFinds: string[];
  muted: boolean;
  hasSave: boolean;
};

export type ExpeditionResult = {
  mapId: number;
  chamberId: number;
  xp: number;
  artifactName: string | null;
  lore: string;
};
