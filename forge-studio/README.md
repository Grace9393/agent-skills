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

## Setup is one key

**The only thing Forge Studio requires is an Anthropic API key** — Claude has to write the apps. Everything else is optional:

- **No database needed.** Leave the Convex URL empty and projects, files, and chat history are stored in your browser. (Your `user_…` ID is per-browser anyway, so Convex only buys you off-device storage.)
- **No hosting needed.** By default the generated app runs right in the preview pane.

Paste your Anthropic key in Settings and start building. Add the rest only if you want what it buys.

## Where apps run

Pick in Settings (⚙︎ → Where apps run); it applies to new builds.

| | **In this browser** (default) | **GitHub Pages** | **Daytona** |
|---|---|---|---|
| Setup | none | GitHub token | Daytona API key |
| Apps are | one self-contained `index.html` | one self-contained `index.html` | Vite + React projects |
| Runs on | a sandboxed iframe, right here | a public repo served by Pages | a cloud sandbox (`npm install` + dev server) |
| Feedback loop | instant | ~30–90s per publish | seconds, with hot reload |
| Shareable URL | no | yes | yes, while the sandbox is up |
| Cost | $0 | $0 | Daytona compute credit |

Choose **In this browser** to just build and use something. Choose **GitHub Pages** when you want a link to send someone — Forge auto-creates a public repo (default `forge-apps`), commits each project into its own directory, and serves it at `https://<you>.github.io/<repo>/<app>/`. Choose **Daytona** for multi-file React projects that need a real build step.

Because the in-browser preview is sandboxed, generated apps are told to treat `localStorage` as optional and fall back to in-memory state — so the same app works unchanged whether it's previewed locally or published to Pages.

## Setup (3 steps)

1. **Run the frontend**:
   ```bash
   cd frontend && npm install && npm run dev
   ```
   Open the printed localhost URL. (For a static deployment, `npm run build` and serve `dist/`.)

2. **Paste an Anthropic API key in Settings** — click the ⚙︎ gear. Get one at [console.anthropic.com](https://console.anthropic.com).

3. **Build your first app** — type it into the big box and hit Enter. It appears in the preview in seconds.

### Optional extras

- **A shareable link** — switch "Where apps run" to **GitHub Pages** and add a GitHub personal access token (fine-grained with Contents + Pages read/write and Administration read/write, or a classic token with the `repo` scope).
- **Multi-file React projects with a real build** — switch to **Daytona** and add a free API key from [app.daytona.io](https://app.daytona.io) → Settings → API Keys (multi-org accounts: also note your Organization ID).
- **Projects stored off-device** — deploy the Convex backend and paste its URL:
  ```bash
  cd backend && npm install && npx convex dev
  ```
  Copy the deployment URL it prints (like `https://happy-animal-123.convex.cloud`). You can Ctrl-C afterwards — the deployment stays live. Without this, everything lives in your browser.

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
