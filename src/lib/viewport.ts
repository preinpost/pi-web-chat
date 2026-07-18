/**
 * iOS PWA viewport handling (see known WebKit issues):
 * - 100dvh in standalone can leave dead space at the bottom.
 * - env(safe-area-inset-*) can over-report (100px+), inflating padding.
 * - position:fixed on the root can truncate content on iOS 26+.
 *
 * Strategy: keep normal flex flow, but drive the shell height from
 * visualViewport (the actual visible pixels) via --app-height, and cap
 * the safe-area insets to sane maxima.
 */
const SAFE_TOP_MAX = 60; // Dynamic Island / notch
const SAFE_BOTTOM_MAX = 34; // home indicator

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

export function initViewportLock() {
  const root = document.documentElement;

  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    (typeof navigator !== "undefined" &&
      "standalone" in navigator &&
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone));

  root.classList.toggle("ua-standalone", standalone);

  const applySafeAreas = () => {
    const top = Math.min(Math.max(measureEnvPadding("top"), 0), SAFE_TOP_MAX);
    const bottom = Math.min(Math.max(measureEnvPadding("bottom"), 0), SAFE_BOTTOM_MAX);
    root.style.setProperty("--safe-top", `${top}px`);
    root.style.setProperty("--safe-bottom", `${bottom}px`);
  };

  const applyHeight = () => {
    const vv = window.visualViewport;
    // Visible height = the pixels actually on screen (excludes URL bar,
    // shrinks with keyboard). This is the most reliable app-shell height.
    const height = Math.round(vv?.height ?? window.innerHeight);
    root.style.setProperty("--app-height", `${height}px`);
  };

  const applyAll = () => {
    if (!document.body) return;
    applySafeAreas();
    applyHeight();
  };

  if (document.body) applyAll();
  else document.addEventListener("DOMContentLoaded", applyAll, { once: true });

  window.visualViewport?.addEventListener("resize", applyHeight);
  window.visualViewport?.addEventListener("scroll", applyHeight);
  window.addEventListener("resize", applyAll);
  window.addEventListener("orientationchange", () => {
    requestAnimationFrame(() => requestAnimationFrame(applyAll));
  });
}
