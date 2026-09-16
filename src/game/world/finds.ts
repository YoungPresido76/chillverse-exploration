import type { WorldFindKind } from "../types";

export type FindDef = {
  id: string;
  name: string;
  lore: string;
  kind: WorldFindKind;
};

export const FIND_CATALOG: Record<number, FindDef[]> = {
  1: [
    {
      id: "gf-carving",
      name: "Walking Song",
      lore: "A fallen lintel in the moss. The carved tune still points toward the hollow.",
      kind: "carving",
    },
    {
      id: "gf-camp",
      name: "Cold Camp",
      lore: "Ashes no warmer than the soil. Someone sketched a gate and never finished it.",
      kind: "camp",
    },
    {
      id: "gf-bloom",
      name: "Stillbloom",
      lore: "A flower that only opens when you stop walking. It smells like rain on old wood.",
      kind: "plant",
    },
    {
      id: "gf-charm",
      name: "Lost Gateleaf",
      lore: "A charm dropped between roots. It is lighter than it looks.",
      kind: "object",
    },
    {
      id: "gf-statue",
      name: "Root Watcher",
      lore: "A figure grown from living wood, facing the deep hollow as if it remembers a name.",
      kind: "statue",
    },
    {
      id: "gf-ringstone",
      name: "Ringstone",
      lore: "A circle of low stones sits just beyond the trail. The center is warm despite the shade.",
      kind: "carving",
    },
    {
      id: "gf-feather",
      name: "Green Feather",
      lore: "A feather too large for any meadow bird, pinned beneath a fern by a thorn.",
      kind: "object",
    },
  ],
  2: [
    {
      id: "cl-fossil",
      name: "Glass Ammonite",
      lore: "A spiral sealed in black glass. The lake has been here longer than the keep.",
      kind: "fossil",
    },
    {
      id: "cl-ember",
      name: "Tended Ember",
      lore: "A bowl of coals still breathing. Someone keeps this shore, quietly.",
      kind: "camp",
    },
    {
      id: "cl-mask",
      name: "Cracked Cinder Mask",
      lore: "Half a face of cooled ash. The inside is smooth, as if recently worn.",
      kind: "object",
    },
    {
      id: "cl-lantern",
      name: "Lakeshore Lantern",
      lore: "It lights without oil. The flame leans toward the water, always.",
      kind: "phenomenon",
    },
    {
      id: "cl-shard",
      name: "Obsidian Tear",
      lore: "A shard that holds a second sky. Look too long and the real one feels thinner.",
      kind: "crystal",
    },
    {
      id: "cl-steps",
      name: "Half-Drowned Steps",
      lore: "Stone steps descend into the lake and stop one step short of the waterline.",
      kind: "carving",
    },
    {
      id: "cl-spark",
      name: "Banked Spark",
      lore: "A coal tucked under black sand flares once when you turn toward the keep.",
      kind: "phenomenon",
    },
  ],
  3: [
    {
      id: "uw-salt",
      name: "Wave Salt",
      lore: "Crystals grown in the shape of a tide that has nowhere to go.",
      kind: "crystal",
    },
    {
      id: "uw-idol",
      name: "Kelp Idol",
      lore: "Fronds braided into a seated figure. It faces a tunnel that is not on any map.",
      kind: "statue",
    },
    {
      id: "uw-banner",
      name: "Drowned Banner",
      lore: "Algae has kept the court colors. The vote to stay below still holds.",
      kind: "object",
    },
    {
      id: "uw-pearl",
      name: "Pearl Nest",
      lore: "A clutch of pale orbs in a stone bowl. They hum when your shadow crosses them.",
      kind: "phenomenon",
    },
    {
      id: "uw-fossil",
      name: "Throne Offering",
      lore: "A fossil fish laid before an empty chair. The cavern listens.",
      kind: "fossil",
    },
    {
      id: "uw-dripstone",
      name: "Listening Stone",
      lore: "A stalagmite shaped like an ear. Water taps out a rhythm from somewhere below.",
      kind: "phenomenon",
    },
    {
      id: "uw-rope",
      name: "Old Descent Rope",
      lore: "The rope disappears into a flooded shaft, its knots still dry to the touch.",
      kind: "object",
    },
  ],
  4: [
    {
      id: "vd-bell",
      name: "Silent Bell",
      lore: "It has a clapper and no sound. Ringing it still changes the air.",
      kind: "object",
    },
    {
      id: "vd-chart",
      name: "Arm's-Length Chart",
      lore: "Constellations drawn as if they were furniture. One of them is a door.",
      kind: "carving",
    },
    {
      id: "vd-well",
      name: "Fold Mark",
      lore: "A bruise in space. Dust falls up around it, slowly.",
      kind: "phenomenon",
    },
    {
      id: "vd-letter",
      name: "Unsent Letter",
      lore: "Paper that should not exist here. The last line is only a heading.",
      kind: "object",
    },
    {
      id: "vd-shard",
      name: "Apex Spark",
      lore: "A fragment of the last map. It is warm, like a story you already walked.",
      kind: "crystal",
    },
    {
      id: "vd-shadow",
      name: "Second Shadow",
      lore: "A shadow falls across the platform with no object to cast it. It points toward the apex.",
      kind: "phenomenon",
    },
    {
      id: "vd-thread",
      name: "Loose Horizon",
      lore: "A bright thread hangs in the dark. Pulling it makes the distant structure tilt.",
      kind: "object",
    },
  ],
};

export function getFindDef(id: string): FindDef | undefined {
  for (const list of Object.values(FIND_CATALOG)) {
    const found = list.find((item) => item.id === id);
    if (found) return found;
  }
  return undefined;
}
