const held = new Set<string>();
let injected: Set<string> | null = null;

export const moveStick = { x: 0, y: 0 };

function isTypingTarget(el: EventTarget | null) {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
}

export function attachInput() {
  const onDown = (e: KeyboardEvent) => {
    if (isTypingTarget(e.target)) return;
    held.add(e.code);
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
      e.preventDefault();
    }
  };
  const onUp = (e: KeyboardEvent) => {
    held.delete(e.code);
  };
  const clear = () => held.clear();
  window.addEventListener("keydown", onDown, { passive: false });
  window.addEventListener("keyup", onUp);
  window.addEventListener("blur", clear);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) clear();
  });
  return () => {
    window.removeEventListener("keydown", onDown);
    window.removeEventListener("keyup", onUp);
    window.removeEventListener("blur", clear);
  };
}

export function setInjectedKeys(codes: string[]) {
  if (codes.length === 0) injected = null;
  else injected = new Set(codes);
}

export function getKeys(): Set<string> {
  return injected ?? held;
}

export function getMoveAxes(): { x: number; y: number } {
  const keys = getKeys();
  let x = moveStick.x;
  let y = moveStick.y;
  if (keys.has("KeyD") || keys.has("ArrowRight")) x += 1;
  if (keys.has("KeyA") || keys.has("ArrowLeft")) x -= 1;
  if (keys.has("KeyW") || keys.has("ArrowUp")) y += 1;
  if (keys.has("KeyS") || keys.has("ArrowDown")) y -= 1;
  const mag = Math.hypot(x, y);
  if (mag > 1) {
    x /= mag;
    y /= mag;
  }
  return { x, y };
}
