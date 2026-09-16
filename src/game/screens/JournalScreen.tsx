import { MAPS, getMap } from "../maps";
import { useGame } from "../store";
import { FIND_CATALOG, getFindDef } from "../world/finds";

export function JournalScreen() {
  const discoveries = useGame((s) => s.discoveries);
  const artifacts = useGame((s) => s.artifacts);
  const worldFinds = useGame((s) => s.worldFinds);
  const xp = useGame((s) => s.xp);
  const setScreen = useGame((s) => s.setScreen);
  const totalNotes = Object.values(FIND_CATALOG).reduce((n, list) => n + list.length, 0);

  return (
    <div className="flex h-dvh flex-col bg-bg text-fg">
      <header className="flex items-center justify-between px-4 py-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <button
          type="button"
          className="min-h-11 rounded-lg border border-border bg-surface px-3 text-sm"
          onClick={() => setScreen("atlas")}
        >
          Atlas
        </button>
        <div className="text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Field journal</p>
          <h1 className="text-lg font-semibold">Discoveries</h1>
        </div>
        <div className="w-16" />
      </header>

      <div className="mx-auto w-full max-w-2xl flex-1 overflow-y-auto px-4 pb-8">
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-medium text-muted">Relics · {artifacts.length}</h2>
          {artifacts.length === 0 ? (
            <p className="text-sm text-dim">No relics yet. Clear shrine sites marked as relic grounds.</p>
          ) : (
            <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {artifacts.map((name) => {
                const chamber = MAPS.flatMap((m) => m.chambers).find((c) => c.relicName === name);
                return (
                  <li key={name} className="rounded-lg border border-border bg-surface p-3 text-center">
                    <img
                      src={`/sprites/artifact-${chamber?.relicIcon ?? 1}.png`}
                      alt=""
                      className="mx-auto h-12 w-12 pixelated"
                    />
                    <p className="mt-2 text-[11px] leading-snug text-fg">{name}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="mb-8">
          <h2 className="mb-3 text-sm font-medium text-muted">
            Field notes · {worldFinds.length} / {totalNotes}
          </h2>
          {worldFinds.length === 0 ? (
            <p className="text-sm text-dim">Leave the main path. The maps keep small secrets off the trail.</p>
          ) : (
            <ol className="space-y-3">
              {[...worldFinds].reverse().map((id) => {
                const def = getFindDef(id);
                if (!def) return null;
                return (
                  <li key={id} className="rounded-lg border border-border bg-surface p-3">
                    <p className="text-sm font-medium text-fg">{def.name}</p>
                    <p className="mt-1 text-xs leading-relaxed text-dim">{def.lore}</p>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-sm font-medium text-muted">
            Sites · {discoveries.length} · {xp.toLocaleString()} XP
          </h2>
          {discoveries.length === 0 ? (
            <p className="text-sm text-dim">Walk a map and explore a shrine to fill these pages.</p>
          ) : (
            <ol className="space-y-3">
              {[...discoveries].reverse().map((d, i) => {
                const map = getMap(d.mapId);
                const chamber = map.chambers.find((c) => c.id === d.chamberId);
                if (!chamber) return null;
                return (
                  <li key={`${d.at}-${i}`} className="rounded-lg border border-border bg-surface p-3">
                    <div className="flex items-start gap-3">
                      <img src={`/sprites/artifact-${chamber.relicIcon}.png`} alt="" className="h-10 w-10 pixelated" />
                      <div>
                        <p className="text-sm font-medium text-fg">{chamber.name}</p>
                        <p className="font-mono text-[10px] text-muted">
                          {map.name} · {d.artifactFound ? "relic recovered" : "surveyed"}
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-dim">{chamber.lore}</p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
