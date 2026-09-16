import { lazy, Suspense, useEffect, useState } from "react";
import { hideOnLeave, useGame } from "./store";
import { TitleScreen } from "./screens/TitleScreen";
import { AtlasScreen } from "./screens/AtlasScreen";
import { JournalScreen } from "./screens/JournalScreen";
import { unlockAudio } from "./audio";

const ExploreScreen = lazy(() => import("./screens/ExploreScreen"));

export function GameRoot() {
  const screen = useGame((s) => s.screen);
  const hydrate = useGame((s) => s.hydrate);
  const tickExpeditions = useGame((s) => s.tickExpeditions);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    hydrate();
    const id = window.setInterval(() => tickExpeditions(), 250);
    const onHide = () => {
      if (document.visibilityState === "hidden") hideOnLeave();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", hideOnLeave);
    const unlock = () => unlockAudio();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", hideOnLeave);
    };
  }, [hydrate, tickExpeditions]);

  if (!mounted) {
    return (
      <div className="flex h-dvh items-center justify-center bg-bg text-muted">
        <p className="font-mono text-xs tracking-wide">Opening the atlas…</p>
      </div>
    );
  }

  if (screen === "title") return <TitleScreen />;
  if (screen === "atlas") return <AtlasScreen />;
  if (screen === "journal") return <JournalScreen />;

  return (
    <Suspense
      fallback={
        <div className="flex h-dvh items-center justify-center bg-bg text-muted">
          <p className="font-mono text-xs tracking-wide">Loading map…</p>
        </div>
      }
    >
      <ExploreScreen />
    </Suspense>
  );
}
