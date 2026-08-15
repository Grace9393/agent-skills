// Client-side persistence: localStorage when available, in-memory fallback
// (private browsing / blocked storage must never crash the app).

const memory = {};

export const store = (() => {
  try {
    const t = "__forge_t";
    localStorage.setItem(t, "1");
    localStorage.removeItem(t);
    return localStorage;
  } catch (e) {
    return {
      getItem: (k) => (k in memory ? memory[k] : null),
      setItem: (k, v) => {
        memory[k] = String(v);
      },
      removeItem: (k) => {
        delete memory[k];
      },
    };
  }
})();

export const DEFAULT_DAYTONA_API_URL = "https://app.daytona.io/api";
export const DEFAULT_MODEL = "claude-sonnet-4-6";
export const DEFAULT_PAGES_REPO = "forge-apps";

export function loadConfig() {
  let cfg = {};
  try {
    cfg = JSON.parse(store.getItem("forge.cfg") || "{}");
  } catch (e) {
    cfg = {};
  }
  cfg.daytonaApiUrl = cfg.daytonaApiUrl || DEFAULT_DAYTONA_API_URL;
  cfg.model = cfg.model || DEFAULT_MODEL;
  cfg.deployTarget = cfg.deployTarget === "pages" ? "pages" : "daytona";
  cfg.pagesRepo = cfg.pagesRepo || DEFAULT_PAGES_REPO;
  return cfg;
}

export function saveConfig(cfg) {
  store.setItem("forge.cfg", JSON.stringify(cfg));
}

// Single-user by design: a locally generated ID scopes all Convex data.
export function userId() {
  let u = store.getItem("forge.userId");
  if (!u) {
    u =
      "user_" +
      Array.from(crypto.getRandomValues(new Uint8Array(8)))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    store.setItem("forge.userId", u);
  }
  return u;
}

export const configured = (cfg) => ({
  convex: !!(cfg.convexUrl || "").trim(),
  daytona: !!(cfg.daytonaKey || "").trim(),
  anthropic: !!(cfg.anthropicKey || "").trim(),
  github: !!(cfg.githubToken || "").trim(),
});

// Which keys a build actually needs depends on the deploy target:
// Daytona (live preview) needs the Daytona key; GitHub Pages needs a token.
export const isConfigured = (cfg) => {
  const c = configured(cfg);
  const runtime = cfg.deployTarget === "pages" ? c.github : c.daytona;
  return c.convex && c.anthropic && runtime;
};

export const missingKeys = (cfg) => {
  const c = configured(cfg);
  const m = [];
  if (!c.convex) m.push("Convex URL");
  if (!c.anthropic) m.push("Anthropic key");
  if (cfg.deployTarget === "pages") {
    if (!c.github) m.push("GitHub token");
  } else if (!c.daytona) {
    m.push("Daytona key");
  }
  return m;
};
