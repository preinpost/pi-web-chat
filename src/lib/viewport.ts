/**
 * iOS standalone PWAs often report a visualViewport shorter than the
 * physical screen. Using that as the app height leaves a white dead band
 * under the composer. Default layout is `position:fixed; inset:0` (full
 * screen). Only shrink to visualViewport when the keyboard is open.
 */
export function initViewportLock() {
  const root = document.documentElement;

  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    (typeof navigator !== "undefined" &&
      "standalone" in navigator &&
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone));

  root.classList.toggle("ua-standalone", standalone);

  const apply = () => {
    const vv = window.visualViewport;
    const inner = window.innerHeight;
    const vvHeight = vv?.height ?? inner;
    const vvTop = vv?.offsetTop ?? 0;

    // Keyboard (or other overlay) meaningfully reduced the visible area.
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

  apply();
  window.visualViewport?.addEventListener("resize", apply);
  window.visualViewport?.addEventListener("scroll", apply);
  window.addEventListener("resize", apply);
  window.addEventListener("orientationchange", () => {
    requestAnimationFrame(() => requestAnimationFrame(apply));
  });
}
