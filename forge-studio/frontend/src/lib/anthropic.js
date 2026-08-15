// Anthropic Messages API client + the Forge codegen prompts.
// The anthropic-dangerous-direct-browser-access header is REQUIRED for
// browser CORS — keys stay client-side by design.

import { DEFAULT_MODEL } from "./storage";

export const SYSTEM_PROMPT = `You are Forge, an expert web-app generator inside an AI app builder. You produce complete, runnable Vite + React apps.

OUTPUT FORMAT — STRICT:
Respond with ONLY one JSON object. No markdown fences. No text before or after.
Shape:
{"summary": "1-2 friendly sentences about what you built or changed", "files": [{"path": "src/App.jsx", "content": "..."}], "deleted": []}

TECH RULES:
- Vite 5 + React 18, plain JavaScript and JSX only. No TypeScript.
- On a brand-new app, always include ALL of: package.json, vite.config.js, index.html, src/main.jsx, src/App.jsx, src/index.css.
- package.json must have: {"scripts": {"dev": "vite --host 0.0.0.0 --port 3000"}}, dependencies react ^18.3.1 and react-dom ^18.3.1, devDependencies vite ^5.4.0 and @vitejs/plugin-react ^4.3.0. Add other npm packages only when truly needed.
- vite.config.js must be exactly:
import react from '@vitejs/plugin-react'
export default {
  plugins: [react()],
  server: { host: true, port: 3000, strictPort: true, allowedHosts: true, hmr: { clientPort: 443 } }
}
- No backend or external API calls. Persist with localStorage when useful.

DESIGN RULES:
- Gorgeous by default: dark theme, gradient accents, rounded corners, generous spacing, smooth transitions, tasteful shadows.
- Responsive: beautiful full-width on desktop AND at 390px on a phone.

EDIT REQUESTS:
- When current files are provided, return ONLY files you changed or added (always full file content), and list removed paths in "deleted".`;

export async function claudeComplete(cfg, system, user) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": (cfg.anthropicKey || "").trim(),
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: cfg.model || DEFAULT_MODEL,
      max_tokens: 16000,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  const obj = await r.json();
  if (obj.error) throw new Error("Anthropic: " + obj.error.message);
  const text = (obj.content || []).map((c) => c.text || "").join("");
  if (!text) throw new Error("Claude returned an empty message");
  return text;
}

// Trim, slice first "{" to last "}", JSON.parse; must contain files[].
export function parseGenerated(raw) {
  let t = String(raw).trim();
  const a = t.indexOf("{");
  const b = t.lastIndexOf("}");
  if (a >= 0 && b > a) t = t.slice(a, b + 1);
  try {
    const o = JSON.parse(t);
    if (!Array.isArray(o.files)) throw new Error("no files");
    return { summary: o.summary || "", files: o.files, deleted: o.deleted || [] };
  } catch (e) {
    throw new Error(
      "Could not parse Claude's response as JSON. Try sending your request again."
    );
  }
}

export function createPrompt(name, description, request) {
  let p = "Create a new web app.\nApp name: " + name + "\n";
  if (description) p += "App concept: " + description + "\n";
  return p + "User request: " + request + "\n\nRemember: output ONLY the JSON object.";
}

export function editPrompt(files, request) {
  let p = "Here are the current files of the app:\n\n";
  for (const f of files) {
    p += "===== FILE: " + f.path + " =====\n" + f.content + "\n\n";
  }
  return (
    p +
    "User request: " +
    request +
    "\n\nReturn ONLY the JSON object with changed/added files (full content) and any deleted paths."
  );
}
