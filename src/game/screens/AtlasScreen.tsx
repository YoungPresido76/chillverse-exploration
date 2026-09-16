import { Lock } from "lucide-react";
import { MAPS, clearedCount, getMap } from "../maps";
import { sfxPlay, unlockAudio } from "../audio";
import { useGame } from "../store";
import { player } from "../player";
import { percentToWorld, getTerrainHeight } from "../terrain";

export function AtlasScreen() {
  const xp = useGame((s) => s.xp);
  const energy = Math.round(useGame((s) => s.energy));
  const artifacts = useGame((s) => s.artifacts.length);
  const chamberStates = useGame((s) => s.chamberStates);
  const isUnlocked = useGame((s) => s.isUnlocked);
  const setScreen = useGame((s) => s.setScreen);
  const setActiveMap = useGame((s) => s.setActiveMap);
  const muted = useGame((s) => s.muted);
  const toggleMute = useGame((s) => s.toggleMute);

  const enter = (id: number) => {
    if (!isUnlocked(id)) {
      sfxPlay.deny();
      return;
    }
    unlockAudio();
    sfxPlay.enter();
    const map = getMap(id);
    const [x, z] = percentToWorld(map.entry.x, map.entry.y);
    player.x = x;
    player.z = z;
    player.y = getTerrainHeight(x, z);
    player.yaw = 0;
    player.speed = 0;
    setActiveMap(id);
    setScreen("explore");
  };

  return (
    <div className="relative flex h-dvh w-full flex-col overflow-hidden bg-bg text-fg">
      <img src="/maps/atlas.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-80" />
      <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/70 to-bg/35" />

      <header className="relative z-10 flex items-center justify-between gap-3 px-4 py-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <button
          type="button"
          className="min-h-11 rounded-lg border border-border bg-surface/80 px-3 text-sm"
          onClick={() => setScreen("title")}
        >
          Title
        </button>
        <div className="text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">World atlas</p>
          <h1 className="text-lg font-semibold">Choose a map</h1>
        </div>
        <button
          type="button"
          className="min-h-11 rounded-lg border border-border bg-surface/80 px-3 text-sm"
          onClick={() => setScreen("journal")}
        >
          Journal
        </button>
      </header>

      <div className="relative z-10 mx-4 mb-3 flex flex-wrap items-center justify-center gap-3 font-mono text-xs text-dim">
        <span>{xp.toLocaleString()} XP</span>
        <span>{energy} energy</span>
        <span>{artifacts} relics</span>
        <button type="button" className="underline-offset-2 hover:underline" onClick={toggleMute}>
          {muted ? "Sound off" : "Sound on"}
        </button>
      </div>

      <div className="relative z-10 mx-auto grid w-full max-w-4xl flex-1 grid-cols-1 gap-3 overflow-y-auto px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:grid-cols-2">
        {MAPS.map((map) => {
          const unlocked = isUnlocked(map.id);
          const states = chamberStates[String(map.id)] ?? {};
          const cleared = clearedCount(map, states);
          return (
            <button
              key={map.id}
              type="button"
              onClick={() => enter(map.id)}
              className="group relative min-h-[180px] overflow-hidden rounded-xl border border-border bg-surface text-left"
            >
              <img src={map.portrait} alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
              <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/40 to-transparent" />
              {!unlocked ? (
                <div className="absolute inset-0 flex items-center justify-center bg-bg/50">
                  <div className="flex items-center gap-2 rounded-full bg-surface/90 px-3 py-1.5 text-xs text-muted">
                    <Lock className="size-3.5" />
                    {map.xpRequired.toLocaleString()} XP
                  </div>
                </div>
              ) : null}
              <div className="relative flex h-full flex-col justify-end p-4">
                <div className="mb-2 h-10 w-10 overflow-hidden">
                  <img src={map.shrine} alt="" className="h-10 w-10 pixelated" />
                </div>
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">Tier {map.tier}</p>
                <h2 className="text-xl font-semibold" style={{ color: map.color }}>
                  {map.name}
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-dim">{map.blurb}</p>
                <p className="mt-2 font-mono text-[11px] text-fg">
                  {cleared} / {map.chambers.length} sites
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
