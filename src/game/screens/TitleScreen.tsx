import { sfxPlay, unlockAudio } from "../audio";
import { useGame } from "../store";
import { assetUrl } from "../assets";

export function TitleScreen() {
  const hasSave = useGame((s) => s.hasSave);
  const xp = useGame((s) => s.xp);
  const setScreen = useGame((s) => s.setScreen);
  const resetSave = useGame((s) => s.resetSave);

  const begin = () => {
    unlockAudio();
    sfxPlay.enter();
    setScreen("atlas");
  };

  return (
    <div className="relative flex h-dvh w-full flex-col overflow-hidden bg-bg text-fg">
      <img
        src={assetUrl("/maps/title.jpg")}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/55 to-bg/20" />
      <div className="relative z-10 flex h-full flex-col justify-end px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-16">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">Expedition atlas</p>
        <h1 className="mt-2 max-w-lg text-5xl font-semibold tracking-tight text-fg md:text-6xl">
          Chillverse
        </h1>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-dim">
          Four compact worlds. Walk the path, step off it, and bring relics home.
        </p>
        <div className="mt-8 flex w-full max-w-sm flex-col gap-3">
          <button
            type="button"
            className="min-h-12 rounded-lg bg-fg text-sm font-semibold text-accent-fg"
            onClick={begin}
          >
            {hasSave && xp > 0 ? "Continue" : "Begin expedition"}
          </button>
          {hasSave && xp > 0 ? (
            <button
              type="button"
              className="min-h-12 rounded-lg border border-border bg-surface/80 text-sm font-medium text-fg"
              onClick={() => {
                unlockAudio();
                sfxPlay.click();
                setScreen("journal");
              }}
            >
              Journal
            </button>
          ) : null}
          {hasSave ? (
            <button
              type="button"
              className="min-h-11 text-xs text-muted"
              onClick={() => {
                resetSave();
                sfxPlay.click();
              }}
            >
              New expedition
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
