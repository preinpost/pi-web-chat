/**
 * iOS standalone PWAs:
 * - env(safe-area-inset-*) can report absurdly large bottoms (100px+),
 *   which shows up as a huge empty band under the composer.
 * - visualViewport height is only used while the keyboard is open.
 */
const SAFE_TOP_MAX = 60; // Dynamic Island / notch
const SAFE_BOTTOM_MAX = 36; // home indicator (~34)

function measureEnvPadding(side: "top" | "bottom"): number {
  const el = document.createElement("div");
  el.style.cssText = [
    "position:fixed",
    "left:0",
    "visibility:hidden",
    "pointer-events:none",
    side === "top"
      ? "padding-top:env(safe-area-inset-top, 0px)"
      : "padding-bottom:env(safe-area-inset-bottom, 0px)",
  ].join(";");
  document.body.appendChild(el);
  const cs = getComputedStyle(el);
  const raw = side === "top" ? cs.paddingTop : cs.paddingBottom;
  el.remove();
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) ? n : 0;
}

function applySafeAreaCaps(root: HTMLElement) {
  const top = Math.min(Math.max(measureEnvPadding("top"), 0), SAFE_TOP_MAX);
  const bottom = Math.min(Math.max(measureEnvPadding("bottom"), 0), SAFE_BOTTOM_MAX);
  root.style.setProperty("--safe-top", `${top}px`);
  root.style.setProperty("--safe-bottom", `${bottom}px`);
}

export function initViewportLock() {
  const root = document.documentElement;

  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    (typeof navigator !== "undefined" &&
      "standalone" in navigator &&
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone));

  root.classList.toggle("ua-standalone", standalone);

  const applyKeyboard = () => {
    const vv = window.visualViewport;
    const inner = window.innerHeight;
    const vvHeight = vv?.height ?? inner;
    const vvTop = vv?.offsetTop ?? 0;
    const keyboardOpen = vvHeight < inner - 40 || vvTop > 0;

    if (keyboardOpen) {
      root.style.setProperty("--app-height", `${Math.round(vvHeight)}px`);
      root.style.setProperty("--app-offset-top", `${Math.round(vvTop)}px`);
      root.classList.add("ua-keyboard");
    } else {
      root.style.removeProperty("--app-height");
      root.style.removeProperty("--app-offset-top");
      root.classList.remove("ua-keyboard");
    }
  };

  const applyAll = () => {
    applySafeAreaCaps(root);
    applyKeyboard();
  };

  // body must exist for the probe element
  if (document.body) applyAll();
  else document.addEventListener("DOMContentLoaded", applyAll, { once: true });

  window.visualViewport?.addEventListener("resize", applyKeyboard);
  window.visualViewport?.addEventListener("scroll", applyKeyboard);
  window.addEventListener("resize", applyAll);
  window.addEventListener("orientationchange", () => {
    requestAnimationFrame(() => requestAnimationFrame(applyAll));
  });
}
