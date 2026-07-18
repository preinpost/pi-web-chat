/**
 * Lock the app shell to the *visible* viewport.
 *
 * iOS standalone PWAs are unreliable with bare 100vh/100dvh: the layout
 * viewport can be taller than what's on screen, leaving a dead band under
 * the composer. visualViewport tracks the pixels the user actually sees
 * (and shrinks when the keyboard opens).
 */
export function initViewportLock() {
  const root = document.documentElement;

  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    // iOS Safari legacy
    (typeof navigator !== "undefined" &&
      "standalone" in navigator &&
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone));

  root.classList.toggle("ua-standalone", standalone);

  const apply = () => {
    const vv = window.visualViewport;
    const height = Math.round(vv?.height ?? window.innerHeight);
    const offsetTop = Math.round(vv?.offsetTop ?? 0);
    root.style.setProperty("--app-height", `${height}px`);
    root.style.setProperty("--app-offset-top", `${offsetTop}px`);
  };

  apply();

  window.visualViewport?.addEventListener("resize", apply);
  window.visualViewport?.addEventListener("scroll", apply);
  window.addEventListener("resize", apply);
  window.addEventListener("orientationchange", () => {
    // iOS reports stale metrics mid-rotation
    requestAnimationFrame(() => requestAnimationFrame(apply));
  });
}
