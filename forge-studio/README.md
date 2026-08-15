# Forge Studio 🔨 — idea to app in one prompt

An AI app builder. You type what you want; Claude generates a complete Vite + React web app; a Daytona cloud sandbox installs and runs it; the live app renders in your workspace. Convex stores projects, files, and chat history. Single-user by design — no auth, no server of our own: a locally generated `user_…` ID scopes your data, and your API keys stay in the browser and are sent only to their own APIs.

```
Browser ──► Anthropic API (Claude writes the code)
        ──► Convex        (projects, files, chat history)
        ──► Daytona API   (upload → npm install → Vite dev server)
        ◄── preview URL   (rendered live in an iframe)
```

- **`frontend/`** — Vite + React + Tailwind app: prompt-first dashboard, Lovable-style chat/preview workspace, code editor with hot-push, console drawer, settings modal.
- **`backend/`** — Convex project: `projects`, `files`, and `messages` tables with cascade delete.

## Two deploy targets

Pick in Settings (⚙︎ → Deploy target); it applies to new builds.

| | **Daytona (live preview)** | **GitHub Pages (free, slower)** |
|---|---|---|
| Apps are | Vite + React projects | Single-file static apps (no build step) |
| Run on | A cloud sandbox (`npm install` + dev server) | A public GitHub repo served by Pages |
| Feedback loop | Seconds, with hot reload | ~30–90s per publish (plus CDN cache) |
| Needs | Daytona API key | GitHub personal access token |
| Costs | Daytona compute credit while running | $0 |

In Pages mode, Forge auto-creates a public repo under your account (default name `forge-apps`), commits each project into its own directory, and serves it at `https://<you>.github.io/<repo>/<app>/`. Only the Anthropic API calls cost anything.

## Setup (6 steps)

1. **Deploy the backend** (once):
   ```bash
   cd backend && npm install && npx convex dev
   ```
   Log in / create a project when prompted, then copy the deployment URL it prints (like `https://happy-animal-123.convex.cloud`). You can Ctrl-C afterwards — the deployment stays live.

2. **Get a deploy credential** — for the Daytona target: a free API key at [app.daytona.io](https://app.daytona.io) → Settings → API Keys (multi-org accounts: also note your Organization ID). For the GitHub Pages target: a GitHub personal access token (fine-grained with Contents + Pages read/write and Administration read/write, or a classic token with the `repo` scope).

3. **Get an Anthropic API key** — at [console.anthropic.com](https://console.anthropic.com). Claude writes every app.

4. **Run the frontend**:
   ```bash
   cd frontend && npm install && npm run dev
   ```
   Open the printed localhost URL. (For a static deployment, `npm run build` and serve `dist/`.)

5. **Paste your keys in Settings** — click the ⚙︎ gear, fill in the Convex URL, Daytona key, and Anthropic key. Three green checks means you're ready.

6. **Build your first app** — type it into the big box and hit Enter. First build takes ~1–2 minutes (mostly `npm install` in the sandbox); watch it live in the Console drawer (`>_`).

## How a build works

1. Your prompt is saved to Convex chat history.
2. Claude writes (or, on follow-ups, edits) the app as strict JSON — full files for new apps, only changed files for edits.
3. Files are upserted into Convex, then uploaded into the sandbox (base64 over the Daytona toolbox API, so any content survives shell quoting).
4. `npm install` runs only on the first build or when `package.json` changed.
5. The Vite dev server runs in a persistent Daytona **session** (not a one-shot command), with a single in-sandbox readiness loop polling `localhost:3000`.
6. The preview URL is fetched, persisted, and loaded in the iframe automatically.

## Lifecycle

- Sandboxes are public (headerless iframe previews) and auto-stop after **30 idle minutes** to protect your free credit. ⋯ → **Run / Restart** wakes one with the same preview URL.
- **Code tab → Save** hot-pushes the file into the running sandbox and reloads the preview; if the sandbox is offline the save still lands in Convex and applies on the next run.
- **Delete** removes the project, its files, its chat history, and its Daytona sandbox.

## Troubleshooting

- **Daytona 401 / org error** — recheck the key; multi-org accounts need the Organization ID field (sent as `X-Daytona-Organization-ID`).
- **Preview dead after idle** — the sandbox auto-stopped; ⋯ → Run / Restart wakes it with the same URL.
- **Blank preview** — Vite may still be booting; hit ⟳, or open the Console → Server logs.
- **Convex "Could not find function"** — the backend isn't deployed to that URL; re-run `npx convex dev` in `backend/`.
- **CORS errors** — serve the frontend from localhost (`npm run dev`), not as a `file://` page.

## A note on originality

Forge Studio is an original implementation of the prompt-to-app product experience — its own name, design, and code. No third-party builder's code, assets, or branding are used.
