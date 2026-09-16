import { useRef } from "react";
import { moveStick } from "../input";
import { useGame } from "../store";
import { cn } from "@/lib/utils";

export function Joystick() {
  const origin = useRef<{ x: number; y: number; id: number } | null>(null);
  const knob = useRef<HTMLDivElement>(null);
  const raised = useGame((s) => Boolean(s.selectedChamberId || s.nearbyChamberId || s.nearbyWorldId || s.result || s.worldToast));

  const reset = () => {
    origin.current = null;
    moveStick.x = 0;
    moveStick.y = 0;
    if (knob.current) {
      knob.current.style.transform = "translate(-50%, -50%)";
    }
  };

  return (
    <div
      className={cn(
        "absolute left-5 z-20 h-32 w-32 touch-none select-none rounded-full border border-border/80 bg-surface/70 md:left-8",
        raised ? "bottom-48 md:bottom-8" : "bottom-6 md:bottom-8",
      )}
      style={{ touchAction: "none" }}
      onPointerDown={(e) => {
        origin.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
        (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!origin.current || origin.current.id !== e.pointerId) return;
        const dx = e.clientX - origin.current.x;
        const dy = e.clientY - origin.current.y;
        const max = 42;
        const mag = Math.hypot(dx, dy);
        const scale = mag > max ? max / mag : 1;
        const x = dx * scale;
        const y = dy * scale;
        moveStick.x = x / max;
        moveStick.y = -y / max;
        if (knob.current) {
          knob.current.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
        }
      }}
      onPointerUp={reset}
      onPointerCancel={reset}
      aria-label="Move"
    >
      <div
        ref={knob}
        className="absolute left-1/2 top-1/2 h-14 w-14 rounded-full border border-accent/50 bg-fg/80"
        style={{ transform: "translate(-50%, -50%)" }}
      />
    </div>
  );
}
