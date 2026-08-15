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
  cfg.deployTarget = resolveTarget(cfg);
  cfg.pagesRepo = cfg.pagesRepo || DEFAULT_PAGES_REPO;
  return cfg;
}

export const DEPLOY_TARGETS = ["local", "pages", "daytona"];

// New users get the zero-setup target. Configs saved before the target
// setting existed are inferred from the credentials they already hold, so
// nobody who had Daytona or GitHub working is silently downgraded.
function resolveTarget(cfg) {
  if (DEPLOY_TARGETS.includes(cfg.deployTarget)) return cfg.deployTarget;
  if ((cfg.daytonaKey || "").trim()) return "daytona";
  if ((cfg.githubToken || "").trim()) return "pages";
  return "local";
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

// Only the Anthropic key is ever required — Claude has to write the app.
// Storage falls back to this browser when no Convex URL is set, and the
// "local" target runs apps in the browser, so it needs no hosting credential.
export const missingKeys = (cfg) => {
  const c = configured(cfg);
  const m = [];
  if (!c.anthropic) m.push("Anthropic key");
  if (cfg.deployTarget === "pages" && !c.github) m.push("GitHub token");
  if (cfg.deployTarget === "daytona" && !c.daytona) m.push("Daytona key");
  return m;
};

export const isConfigured = (cfg) => missingKeys(cfg).length === 0;
