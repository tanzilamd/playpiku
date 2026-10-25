// One game view for every controller, with a fullscreen fallback for mobile browsers.
export function createFocusMode({ main, pause, help, toast }) {
  let enabled = false,
    previousFocus = null,
    scrollY = 0,
    resizeFrame = 0;
  const root = document.documentElement;
  const observer = new ResizeObserver(() => scheduleFit());
  const canFullscreen = () =>
    !!(document.fullscreenEnabled && root.requestFullscreen);
  function reflectFullscreen() {
    const button = main.querySelector("#focus-fullscreen");
    if (button) {
      button.hidden = !canFullscreen();
      button.textContent = document.fullscreenElement
        ? "Exit fullscreen"
        : "Fullscreen";
      button.setAttribute("aria-pressed", !!document.fullscreenElement);
    }
  }
  function fit() {
    resizeFrame = 0;
    if (!enabled) return;
    const panel = main.querySelector("#play-panel"),
      board = main.querySelector("#game-board"),
      stage = main.querySelector(".game-stage"),
      bar = main.querySelector(".focus-toolbar");
    if (!panel || !board || !stage || !bar) return;
    const box = board.getBoundingClientRect(),
      style = getComputedStyle(panel);
    if (!box.width || !box.height) return;
    const height = window.visualViewport?.height || innerHeight;
    const barHeight = bar.getBoundingClientRect().height;
    root.style.setProperty("--focus-toolbar-height", `${barHeight}px`);
    const landscape = innerWidth >= 600 && height <= 560 && innerWidth > height;
    const chrome = landscape
      ? (getComputedStyle(stage).display === "contents"
          ? 0
          : Math.max(0, stage.getBoundingClientRect().height - box.height)) +
        parseFloat(style.paddingTop) +
        parseFloat(style.paddingBottom)
      : panel.getBoundingClientRect().height - box.height;
    const available = Math.max(100, height - barHeight - chrome - 24);
    const panelWidth =
      panel.clientWidth -
      parseFloat(style.paddingLeft) -
      parseFloat(style.paddingRight);
    const columnWidth = landscape
      ? parseFloat(style.gridTemplateColumns) || panelWidth / 2
      : panelWidth;
    const width = Math.min(
      800,
      columnWidth,
      Math.max(landscape ? 150 : 240, (available * box.width) / box.height),
    );
    const value = Math.floor(width) + "px";
    if (stage.style.getPropertyValue("--focus-stage-width") !== value)
      stage.style.setProperty("--focus-stage-width", value);
  }
  function scheduleFit() {
    if (enabled && !resizeFrame) resizeFrame = requestAnimationFrame(fit);
  }
  function enter() {
    if (enabled || !main.querySelector("#game-board")) return;
    pause();
    enabled = true;
    previousFocus = document.activeElement;
    scrollY = window.scrollY;
    root.classList.add("focus-mode");
    main.querySelector(".focus-toolbar").hidden = false;
    main.querySelector("#focus-button").setAttribute("aria-pressed", "true");
    reflectFullscreen();
    scheduleFit();
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    (
      main.querySelector("#game-start:not(:disabled)") ||
      main.querySelector("#game-board .board-overlay button") ||
      main.querySelector("#game-board[tabindex], #game-board button") ||
      main.querySelector("#focus-exit")
    ).focus({ preventScroll: true });
    toast("Focus mode is on. Your game is kept right here.");
  }
  function leave(restore = true) {
    if (!enabled) return;
    pause();
    enabled = false;
    root.classList.remove("focus-mode");
    root.style.removeProperty("--focus-toolbar-height");
    const bar = main.querySelector(".focus-toolbar");
    if (bar) bar.hidden = true;
    main.querySelector("#focus-button")?.setAttribute("aria-pressed", "false");
    main
      .querySelector(".game-stage")
      ?.style.removeProperty("--focus-stage-width");
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    if (restore) {
      window.scrollTo({ top: scrollY, left: 0, behavior: "instant" });
      previousFocus?.isConnected &&
        previousFocus.focus({ preventScroll: true });
    }
    previousFocus = null;
  }
  async function fullscreen() {
    pause();
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (canFullscreen()) await root.requestFullscreen();
      else
        toast(
          "Focus mode is available here; this browser does not support fullscreen.",
        );
    } catch {
      if (enabled)
        toast("Fullscreen could not open. You can keep playing in Focus mode.");
    }
    if (!enabled && document.fullscreenElement)
      document.exitFullscreen().catch(() => {});
    reflectFullscreen();
    scheduleFit();
  }
  document.addEventListener("fullscreenchange", () => {
    if (enabled) pause();
    reflectFullscreen();
    scheduleFit();
  });
  document.addEventListener(
    "keydown",
    (event) => {
      if (
        !enabled ||
        event.key !== "Escape" ||
        document.querySelector("dialog[open]") ||
        document.fullscreenElement
      )
        return;
      event.preventDefault();
      event.stopImmediatePropagation();
      leave();
    },
    true,
  );
  window.addEventListener("resize", () => {
    if (enabled) pause();
    scheduleFit();
  });
  window.visualViewport?.addEventListener("resize", scheduleFit);
  return {
    bind() {
      main.querySelector("#focus-button").onclick = enter;
      main.querySelector("#focus-exit").onclick = () => leave();
      main.querySelector("#focus-fullscreen").onclick = fullscreen;
      main.querySelector("#focus-help").onclick = help;
      observer.observe(main.querySelector("#play-panel"));
      reflectFullscreen();
    },
    reset() {
      leave(false);
      observer.disconnect();
      cancelAnimationFrame(resizeFrame);
      resizeFrame = 0;
    },
  };
}
