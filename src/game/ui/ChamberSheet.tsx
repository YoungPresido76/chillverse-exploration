import { getMap, isReachable } from "../maps";
import { useGame } from "../store";
import { sfxPlay } from "../audio";

export function ChamberSheet() {
  const map = getMap(useGame((s) => s.activeMapId));
  const selected = useGame((s) => s.selectedChamberId);
  const nearby = useGame((s) => s.nearbyChamberId);
  const energy = useGame((s) => s.energy);
  const states = useGame((s) => s.statesFor(map.id));
  const setSelected = useGame((s) => s.setSelectedChamber);
  const start = useGame((s) => s.startExpedition);
  const chamberId = selected ?? nearby;
  const chamber = map.chambers.find((c) => c.id === chamberId);
  if (!chamber) return null;

  const index = map.chambers.indexOf(chamber);
  const reachable = isReachable(map.chambers, index, states);
  const status = states[String(chamber.id)]?.status ?? "idle";
  const canExplore = reachable && status === "idle" && energy >= chamber.energyCost;
  const open = Boolean(selected) || (Boolean(nearby) && status === "idle" && reachable);

  if (!open) return null;

  return (
    <div className="absolute inset-x-0 bottom-0 z-30 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-8">
      <div className="mx-auto w-full max-w-md rounded-xl border border-border bg-surface p-4 shadow-[0_16px_40px_rgba(0,0,0,0.45)]">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-fg">{chamber.name}</h2>
            <p className="mt-0.5 text-xs text-muted">
              {!reachable ? "Locked · clear the previous site" : status === "running" ? "Expedition in progress" : status === "done" ? "Cleared" : "Ready"}
            </p>
          </div>
          {selected ? (
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-md text-muted"
              onClick={() => setSelected(null)}
              aria-label="Close"
            >
              ×
            </button>
          ) : null}
        </div>
        <p className="mb-3 text-sm leading-relaxed text-dim">{chamber.lore}</p>
        <div className="mb-4 flex flex-wrap gap-4 font-mono text-xs text-fg">
          <span>+{chamber.xpReward.toLocaleString()} XP</span>
          <span>{chamber.energyCost} energy</span>
          {chamber.artifact ? (
            <span className="flex items-center gap-1" style={{ color: map.color }}>
              <img src={`/sprites/artifact-${chamber.relicIcon}.png`} alt="" className="h-5 w-5 pixelated" />
              Relic site
            </span>
          ) : null}
        </div>
        <button
          type="button"
          disabled={!canExplore}
          className="min-h-12 w-full rounded-lg text-sm font-semibold disabled:cursor-not-allowed"
          style={{
            background: canExplore ? map.color : "#2a2a30",
            color: canExplore ? "#0b0b0f" : "#7a7a84",
          }}
          onClick={() => {
            if (!canExplore) {
              sfxPlay.deny();
              return;
            }
            start(map.id, chamber.id);
          }}
        >
          {!reachable
            ? "Locked"
            : status === "running"
              ? "En route"
              : status === "done"
                ? "Cleared"
                : energy < chamber.energyCost
                  ? `Need ${chamber.energyCost} energy`
                  : "Explore"}
        </button>
      </div>
    </div>
  );
}
