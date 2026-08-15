// Convex HTTP API client.
// POST {deploymentUrl}/api/query | /api/mutation
// Body: {"path":"projects:list","args":{...},"format":"json"}
// Success: {"status":"success","value":...} — failure: {"errorMessage":"..."}

async function convexCall(cfg, kind, path, args) {
  let base = (cfg.convexUrl || "").trim().replace(/\/+$/, "");
  if (base && !/^https?:\/\//.test(base)) base = "https://" + base;
  if (!base) throw new Error("Add your Convex deployment URL in Settings.");
  const r = await fetch(base + "/api/" + kind, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, args, format: "json" }),
  });
  let obj = null;
  try {
    obj = await r.json();
  } catch (e) {
    obj = null;
  }
  if (!obj) {
    throw new Error(
      "Convex returned an unexpected response (HTTP " +
        r.status +
        "). Check the URL in Settings."
    );
  }
  if (obj.status === "success") return obj.value;
  let msg = obj.errorMessage || "Convex call to " + path + " failed";
  if (/could not find/i.test(msg)) {
    msg += " — make sure the backend is deployed (npx convex dev in backend/).";
  }
  throw new Error(msg);
}

export const cvQuery = (cfg, path, args) => convexCall(cfg, "query", path, args);
export const cvMutation = (cfg, path, args) => convexCall(cfg, "mutation", path, args);
