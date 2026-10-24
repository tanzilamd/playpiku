import { keyboardAllowed } from "./shared.js";
export function drivingInput(root, events, bindings, onPress = () => {}) {
  const keys = new Set(),
    pointers = new Map(),
    buttonKeys = new Map();
  const held = (action) =>
    [...keys].some((key) => bindings[key] === action) ||
    [...pointers.values()].includes(action) ||
    [...buttonKeys.values()].includes(action);
  function reflect() {
    root
      .querySelectorAll("[data-drive]")
      .forEach((b) => b.classList.toggle("pressed", held(b.dataset.drive)));
  }
  function clear() {
    keys.clear();
    pointers.clear();
    buttonKeys.clear();
    reflect();
  }
  for (const b of root.querySelectorAll("[data-drive]")) {
    events.on(b, "pointerdown", (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      b.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, b.dataset.drive);
      reflect();
      onPress(b.dataset.drive);
    });
    for (const name of ["pointerup", "pointercancel", "lostpointercapture"])
      events.on(b, name, (e) => {
        pointers.delete(e.pointerId);
        reflect();
      });
    events.on(b, "click", (e) => {
      if (e.detail === 0) onPress(b.dataset.drive);
    });
  }
  events.on(document, "keydown", (e) => {
    const button = e.target.closest?.("[data-drive]");
    if (
      button &&
      root.contains(button) &&
      !document.querySelector("dialog[open]") &&
      ["Enter", "Space"].includes(e.code)
    ) {
      e.preventDefault();
      if (!buttonKeys.has(e.code) && !e.repeat) {
        buttonKeys.set(e.code, button.dataset.drive);
        onPress(button.dataset.drive);
        reflect();
      }
      return;
    }
    const key = e.key.toLowerCase();
    if (!keyboardAllowed(e) || !bindings[key]) return;
    e.preventDefault();
    const was = keys.has(key);
    keys.add(key);
    reflect();
    if (!was && !e.repeat) onPress(bindings[key]);
  });
  events.on(document, "keyup", (e) => {
    keys.delete(e.key.toLowerCase());
    buttonKeys.delete(e.code);
    reflect();
  });
  events.on(window, "blur", clear);
  return { held, clear };
}
export function raceResult(area, title, detail, actions) {
  area.parentElement.querySelector(".race-result")?.remove();
  const result = document.createElement("section");
  result.className = "race-result";
  result.setAttribute("aria-label", "Run result");
  const h = document.createElement("h2");
  h.textContent = title;
  const p = document.createElement("p");
  p.textContent = detail;
  result.append(h, p);
  const buttons = document.createElement("div");
  buttons.className = "result-actions";
  for (const [label, action] of actions) {
    const b = document.createElement("button");
    b.className = "button primary";
    b.textContent = label;
    b.onclick = action;
    buttons.append(b);
  }
  result.append(buttons);
  area.insertAdjacentElement("afterend", result);
  return result;
}
