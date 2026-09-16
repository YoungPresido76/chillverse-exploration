import { useGame } from "../store";

export function WorldToast() {
  const toast = useGame((s) => s.worldToast);
  const dismiss = useGame((s) => s.dismissWorldToast);
  if (!toast) return null;

  return (
    <div className="absolute inset-x-0 top-24 z-30 flex justify-center px-4">
      <button
        type="button"
        className="w-full max-w-sm rounded-xl border border-border bg-surface/95 p-4 text-left shadow-[0_12px_32px_rgba(0,0,0,0.4)]"
        onClick={dismiss}
      >
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-accent">Field note</p>
        <h2 className="mt-1 text-base font-semibold text-fg">{toast.name}</h2>
        <p className="mt-1 text-sm leading-relaxed text-dim">{toast.lore}</p>
        <p className="mt-2 text-[11px] text-muted">Added to journal · tap to close</p>
      </button>
    </div>
  );
}
