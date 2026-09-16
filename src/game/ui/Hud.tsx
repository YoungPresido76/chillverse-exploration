import { Volume2, VolumeX } from "lucide-react";
import { MAX_ENERGY, getMap, isReachable } from "../maps";
import { useGame } from "../store";
import { getFindDef } from "../world/finds";
import { cn } from "@/lib/utils";
import { assetUrl } from "../assets";

export function Hud() {
  const map = getMap(useGame((s) => s.activeMapId));
  const xp = useGame((s) => s.xp);
  const energy = useGame((s) => s.energy);
  const muted = useGame((s) => s.muted);
  const nearby = useGame((s) => s.nearbyChamberId);
  const nearbyWorld = useGame((s) => s.nearbyWorldId);
  const zoneName = useGame((s) => s.zoneName);
  const worldFinds = useGame((s) => s.worldFinds);
  const states = useGame((s) => s.statesFor(map.id));
  const setScreen = useGame((s) => s.setScreen);
  const toggleMute = useGame((s) => s.toggleMute);
  const artifacts = useGame((s) => s.artifacts.length);
  const energyNow = Math.round(energy);
  const running = map.chambers.find((c) => states[String(c.id)]?.status === "running");
  const next = map.chambers.find((c, i) => isReachable(map.chambers, i, states) && (!states[String(c.id)] || states[String(c.id)]?.status === "idle"));
  const nearbyChamber = map.chambers.find((c) => c.id === nearby);
  const find = nearbyWorld ? getFindDef(nearbyWorld) : undefined;
  const collect = useGame((s) => s.collectWorldFind);
  const mapFinds = worldFinds.filter((id) => id.startsWith(map.id === 1 ? "gf-" : map.id === 2 ? "cl-" : map.id === 3 ? "uw-" : "vd-"));

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      <div className="flex items-start justify-between gap-3 p-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <button
          type="button"
          className="pointer-events-auto min-h-11 rounded-lg border border-border bg-surface/85 px-4 text-sm font-medium text-fg"
          onClick={() => setScreen("atlas")}
        >
          Atlas
        </button>
        <div className="flex flex-col items-end gap-2">
          <div
            className="rounded-lg border px-3 py-1.5 text-sm font-semibold"
            style={{ borderColor: map.color, background: "color-mix(in oklab, #0c0c10 78%, transparent)" }}
          >
            {map.name}
            <span className="ml-2 font-mono text-xs text-muted">Tier {map.tier}</span>
            {zoneName ? <p className="mt-0.5 font-mono text-[10px] font-normal tracking-wide text-muted">{zoneName}</p> : null}
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-surface/85 px-3 py-2">
            <img src={assetUrl("/sprites/icon-energy.png")} alt="" className="h-6 w-6 pixelated" />
            <div className="w-28">
              <div className="h-1.5 overflow-hidden rounded-full bg-fg/15">
                <div
                  className="h-full rounded-full bg-accent transition-[width] duration-300"
                  style={{ width: `${(energyNow / MAX_ENERGY) * 100}%` }}
                />
              </div>
              <div className="mt-1 font-mono text-[10px] tracking-wide text-muted">
                {energyNow} / {MAX_ENERGY}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute left-4 top-20 flex flex-col gap-2">
        <StatChip icon={assetUrl("/sprites/icon-relic.png")} label={`${xp.toLocaleString()} XP`} />
        <StatChip icon={assetUrl("/sprites/icon-relic.png")} label={`${artifacts} relics`} />
        <StatChip icon={assetUrl("/sprites/icon-compass.png")} label={`${mapFinds.length} notes`} />
      </div>

      <div className="absolute right-4 top-36 flex flex-col items-end gap-2">
        <button
          type="button"
          className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-surface/85 text-fg"
          onClick={toggleMute}
          aria-label={muted ? "Unmute" : "Mute"}
        >
          {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
        </button>
        <button
          type="button"
          className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-surface/85"
          onClick={() => setScreen("journal")}
          aria-label="Journal"
        >
          <img src={assetUrl("/sprites/icon-journal.png")} alt="" className="h-7 w-7 pixelated" />
        </button>
      </div>

      <div className="absolute bottom-28 left-1/2 w-[min(92vw,420px)] -translate-x-1/2 text-center md:bottom-10">
        {nearbyChamber ? (
          <p className="rounded-full bg-surface/80 px-4 py-2 text-sm text-fg">
            {nearbyChamber.name} · press Explore or E
          </p>
        ) : find && nearbyWorld ? (
          <button
            type="button"
            className="pointer-events-auto rounded-full bg-surface/90 px-4 py-2 text-sm text-fg"
            onClick={() => collect(nearbyWorld)}
          >
            {find.name} · look closer
          </button>
        ) : running ? (
          <p className="rounded-full bg-surface/80 px-4 py-2 font-mono text-xs text-muted">
            En route to {running.name}
          </p>
        ) : next ? (
          <p className="rounded-full bg-surface/80 px-4 py-2 text-xs text-muted">
            Follow the path to {next.name}
          </p>
        ) : (
          <p className="rounded-full bg-surface/80 px-4 py-2 text-xs text-muted">Region cleared</p>
        )}
      </div>

      <p className="absolute bottom-4 left-1/2 hidden -translate-x-1/2 text-[11px] text-muted md:block">
        WASD to walk · drag to look · scroll to zoom
      </p>
    </div>
  );
}

function StatChip({ icon, label }: { icon: string; label: string }) {
  return (
    <div className={cn("flex items-center gap-2 rounded-lg border border-border bg-surface/85 px-2.5 py-1.5")}>
      <img src={icon} alt="" className="h-5 w-5 pixelated" />
      <span className="font-mono text-xs tabular-nums text-fg">{label}</span>
    </div>
  );
}
