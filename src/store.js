let unavailable = false;
const prefix = "playpiku:";
const memory = new Map();
export function get(key, fallback = null) {
  try {
    const value = localStorage.getItem(prefix + key);
    return value === null
      ? memory.has(key)
        ? memory.get(key)
        : fallback
      : JSON.parse(value);
  } catch {
    unavailable = true;
    return memory.has(key) ? memory.get(key) : fallback;
  }
}
export function set(key, value) {
  memory.set(key, value);
  try {
    localStorage.setItem(prefix + key, JSON.stringify(value));
  } catch {
    unavailable = true;
  }
}
export function storageUnavailable() {
  return unavailable;
}
export function record(key, score, lower = false) {
  const old = get("best:" + key);
  const fresh = old === null || (lower ? score < old : score > old);
  if (fresh) set("best:" + key, score);
  return fresh;
}
export function clearRecords() {
  const ids = [
    "memory-8",
    "memory-12",
    "memory-18",
    "snake-slow",
    "snake-normal",
    "snake-fast",
    "reaction",
    "2048",
    "breaker",
    "blocks",
    "dash",
    "mines-easy",
    "mines-normal",
    "mines-hard",
    "golf",
    "words-easy",
    "words-classic",
    "stack-relaxed",
    "stack-classic",
    "defense-meadow",
    "defense-river",
    ...["meadow", "sunset", "harbor"].flatMap((track) =>
      ["relaxed", "classic"].map((mode) => `rally-${track}-${mode}`),
    ),
  ];
  for (const id of ids) {
    memory.delete("best:" + id);
    try {
      localStorage.removeItem(prefix + "best:" + id);
    } catch {
      unavailable = true;
    }
  }
}
let audio;
export function sound(kind = "tap") {
  if (!get("sound", false)) return;
  try {
    audio ||= new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === "suspended") audio.resume().catch(() => {});
    const oscillator = audio.createOscillator(),
      gain = audio.createGain();
    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.frequency.value =
      kind === "win" ? 660 : kind === "lose" ? 160 : 360;
    oscillator.type = "sine";
    gain.gain.setValueAtTime(0.06, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.14);
    oscillator.start();
    oscillator.stop(audio.currentTime + 0.15);
  } catch {
    /* Audio is optional. */
  }
}
