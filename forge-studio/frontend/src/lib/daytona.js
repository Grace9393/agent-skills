// Daytona API client.
// REST base: https://app.daytona.io/api (Authorization: Bearer <key>,
// optional X-Daytona-Organization-ID). Commands INSIDE a sandbox go through
// the toolbox proxy host, with the API-base route as a fallback.

import { DEFAULT_DAYTONA_API_URL } from "./storage";

const PROXY_HOST = "https://proxy.app.daytona.io";

const apiBase = (cfg) => {
  let u = (cfg.daytonaApiUrl || DEFAULT_DAYTONA_API_URL).trim().replace(/\/+$/, "");
  if (!/^https?:\/\//.test(u)) u = "https://" + u;
  return u;
};

async function dtRaw(cfg, method, url, body) {
  const headers = {
    Authorization: "Bearer " + (cfg.daytonaKey || "").trim(),
    "Content-Type": "application/json",
  };
  if ((cfg.daytonaOrgId || "").trim()) {
    headers["X-Daytona-Organization-ID"] = cfg.daytonaOrgId.trim();
  }
  const r = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  if (r.status >= 400) {
    let msg = "Daytona error " + r.status;
    try {
      const o = JSON.parse(text);
      if (o.message) {
        msg += ": " + (Array.isArray(o.message) ? o.message.join(", ") : o.message);
      }
    } catch (e) {
      if (text) msg += ": " + text.slice(0, 300);
    }
    throw new Error(msg);
  }
  try {
    return text ? JSON.parse(text) : {};
  } catch (e) {
    return {};
  }
}

const dtApi = (cfg, method, path, body) =>
  dtRaw(cfg, method, apiBase(cfg) + "/" + path, body);

async function dtToolbox(cfg, method, sid, sub, body) {
  try {
    return await dtRaw(cfg, method, PROXY_HOST + "/toolbox/" + sid + "/" + sub, body);
  } catch (e) {
    return await dtRaw(
      cfg,
      method,
      apiBase(cfg) + "/toolbox/" + sid + "/toolbox/" + sub,
      body
    );
  }
}

// One-shot command. Toolbox timeout defaults to 10s — always pass one.
export async function exec(cfg, sid, command, timeoutSeconds = 120, cwd) {
  const body = { command, timeout: timeoutSeconds };
  if (cwd) body.cwd = cwd;
  const res = await dtToolbox(cfg, "POST", sid, "process/execute", body);
  const out = [res.result ?? res.stdout ?? res.output ?? "", res.stderr ?? ""]
    .filter(Boolean)
    .join("\n");
  const code = res.exitCode ?? res.code;
  return { exitCode: typeof code === "number" ? Math.trunc(code) : null, output: out };
}

export function createSandbox(cfg) {
  return dtApi(cfg, "POST", "sandbox", {
    public: true,
    labels: { forge: "true" },
    autoStopInterval: 30,
  });
}

export const getSandbox = (cfg, sid) => dtApi(cfg, "GET", "sandbox/" + sid);
export const startSandbox = (cfg, sid) => dtApi(cfg, "POST", "sandbox/" + sid + "/start");
export const stopSandbox = (cfg, sid) => dtApi(cfg, "POST", "sandbox/" + sid + "/stop");
export const deleteSandbox = (cfg, sid) => dtApi(cfg, "DELETE", "sandbox/" + sid);

// Poll every 2s up to 180s until state == "started"; re-issue /start when
// stopped/archived; fail fast on error states.
export async function ensureStarted(cfg, sid) {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  let sb = await getSandbox(cfg, sid);
  let st = (sb.state || "").toLowerCase();
  if (st === "started") return;
  if (st === "stopped" || st === "archived") {
    try {
      await startSandbox(cfg, sid);
    } catch (e) {
      /* may already be starting */
    }
  }
  const deadline = Date.now() + 180000;
  while (Date.now() < deadline) {
    await sleep(2000);
    sb = await getSandbox(cfg, sid);
    st = (sb.state || "").toLowerCase();
    if (st === "started") return;
    if (st.includes("error") || st.includes("failed")) {
      throw new Error("Sandbox entered state '" + st + "'");
    }
    if (st === "stopped" || st === "archived") {
      try {
        await startSandbox(cfg, sid);
      } catch (e) {
        /* retry next tick */
      }
    }
  }
  throw new Error("Timed out waiting for the sandbox to start");
}

// Long-running processes (the Vite dev server) live in a toolbox session.
export async function deleteSession(cfg, sid, session) {
  try {
    await dtToolbox(cfg, "DELETE", sid, "process/session/" + session, null);
  } catch (e) {
    /* absent session is fine */
  }
}

export async function createSession(cfg, sid, session) {
  try {
    await dtToolbox(cfg, "POST", sid, "process/session", { sessionId: session });
  } catch (e) {
    if (!/409|exist/i.test(e.message || "")) throw e;
  }
}

export function sessionExecAsync(cfg, sid, session, command) {
  return dtToolbox(cfg, "POST", sid, "process/session/" + session + "/exec", {
    command,
    runAsync: true,
  });
}

// Standard preview URL first (works headerless in an iframe for public
// sandboxes); signed URL as the fallback.
export async function previewUrl(cfg, sid, port) {
  try {
    const p = await dtApi(cfg, "GET", "sandbox/" + sid + "/ports/" + port + "/preview-url");
    if (p && p.url) return p.url;
  } catch (e) {
    /* fall through to signed URL */
  }
  const p = await dtApi(
    cfg,
    "GET",
    "sandbox/" + sid + "/ports/" + port + "/signed-preview-url?expiresInSeconds=604800"
  );
  if (p.url) return p.url;
  if (p.legacyProxyUrl) return p.legacyProxyUrl;
  throw new Error("Daytona did not return a preview URL");
}
