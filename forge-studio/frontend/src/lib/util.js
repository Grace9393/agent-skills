export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Single-quote shell escaping for commands run inside the sandbox.
export const shq = (s) => "'" + String(s).replace(/'/g, "'\\''") + "'";

// Base64 of the UTF-8 bytes of a string (safe for any file content).
export function b64utf8(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}

export function timeAgo(ms) {
  if (!ms) return "";
  const s = Math.max(1, (Date.now() - ms) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return Math.floor(s / 60) + "m ago";
  if (s < 86400) return Math.floor(s / 3600) + "h ago";
  return Math.floor(s / 86400) + "d ago";
}

// Title-Case project name from the first ~5 words of a prompt.
export function titleFromPrompt(p) {
  const words = p
    .replace(/[^\w\s-]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 5);
  let t = words.map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
  if (t.length > 34) t = t.slice(0, 34).trim();
  return t || "Untitled App";
}

// Stable hue hashed from a project name (gradient thumbnails).
export function hueFor(name) {
  let h = 0;
  for (const ch of String(name)) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
}

export const STATUS = {
  draft: { label: "Draft", color: "#8b8b98" },
  generating: { label: "Generating", color: "#b48bff" },
  building: { label: "Building", color: "#ff7319" },
  running: { label: "Live", color: "#34d97b" },
  stopped: { label: "Stopped", color: "#8b8b98" },
  error: { label: "Error", color: "#ff5d5d" },
};

export const statusMeta = (status) => STATUS[status] || STATUS.draft;

// Human-readable message from any thrown value — never a raw stack.
export const errMessage = (e) =>
  e instanceof Error ? e.message : String(e ?? "Something went wrong");
