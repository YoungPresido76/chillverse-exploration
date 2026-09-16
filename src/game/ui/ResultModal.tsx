import { getMap } from "../maps";
import { useGame } from "../store";

export function ResultModal() {
  const result = useGame((s) => s.result);
  const dismiss = useGame((s) => s.dismissResult);
  if (!result) return null;
  const map = getMap(result.mapId);
  const chamber = map.chambers.find((c) => c.id === result.chamberId);
  if (!chamber) return null;

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-bg/55 p-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-5 text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">Site cleared</p>
        <h2 className="mt-2 text-xl font-semibold text-fg">{chamber.name}</h2>
        <p className="mt-2 text-sm leading-relaxed text-dim">{result.lore}</p>
        <p className="mt-4 font-mono text-sm text-accent">+{result.xp.toLocaleString()} XP</p>
        {result.artifactName ? (
          <div className="mt-4 flex flex-col items-center gap-2">
            <img
              src={`/sprites/artifact-${chamber.relicIcon}.png`}
              alt=""
              className="h-16 w-16 pixelated"
            />
            <p className="text-sm font-medium text-fg">{result.artifactName}</p>
            <p className="text-xs text-muted">Added to journal</p>
          </div>
        ) : (
          <p className="mt-3 text-xs text-muted">No relic this time — the path is still yours.</p>
        )}
        <button
          type="button"
          className="mt-5 min-h-12 w-full rounded-lg bg-fg text-sm font-semibold text-accent-fg"
          onClick={dismiss}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
