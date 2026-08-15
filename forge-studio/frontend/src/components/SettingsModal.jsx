import { useState } from "react";
import {
  DEFAULT_DAYTONA_API_URL,
  DEFAULT_MODEL,
  DEFAULT_PAGES_REPO,
  configured,
  userId,
} from "../lib/storage";

export default function SettingsModal({ cfg, onSave }) {
  const [draft, setDraft] = useState({
    convexUrl: cfg.convexUrl || "",
    daytonaKey: cfg.daytonaKey || "",
    daytonaApiUrl: cfg.daytonaApiUrl || DEFAULT_DAYTONA_API_URL,
    daytonaOrgId: cfg.daytonaOrgId || "",
    anthropicKey: cfg.anthropicKey || "",
    model: cfg.model || DEFAULT_MODEL,
    deployTarget: cfg.deployTarget === "pages" ? "pages" : "daytona",
    githubToken: cfg.githubToken || "",
    pagesRepo: cfg.pagesRepo || DEFAULT_PAGES_REPO,
  });

  const set = (key) => (e) => setDraft((d) => ({ ...d, [key]: e.target.value }));
  const c = configured(draft);
  const target = draft.deployTarget;
  const usePages = target === "pages";

  const save = () =>
    onSave({
      ...draft,
      convexUrl: draft.convexUrl.trim(),
      daytonaKey: draft.daytonaKey.trim(),
      daytonaApiUrl: draft.daytonaApiUrl.trim() || DEFAULT_DAYTONA_API_URL,
      daytonaOrgId: draft.daytonaOrgId.trim(),
      anthropicKey: draft.anthropicKey.trim(),
      model: draft.model.trim() || DEFAULT_MODEL,
      githubToken: draft.githubToken.trim(),
      pagesRepo: draft.pagesRepo.trim() || DEFAULT_PAGES_REPO,
    });

  const targetBtn = (on) =>
    "flex-1 rounded-[9px] px-2 py-2 text-[12px] font-bold " +
    (on ? "bg-surface2 text-body" : "text-dim");

  const TARGETS = [
    { id: "local", label: "In this browser" },
    { id: "pages", label: "GitHub Pages" },
    { id: "daytona", label: "Daytona" },
  ];
  const TARGET_HINTS = {
    local:
      "Zero setup — the generated app runs right here in the preview, instantly. Nothing is uploaded and nothing is public. Only the Anthropic key is needed.",
    pages:
      "Publishes free static apps to a public repo under your GitHub account, so each app gets a shareable URL. ~30–90s per publish.",
    daytona:
      "Runs each app in a cloud sandbox with npm install and a real dev server — the only target that supports multi-file builds and hot reload. Uses Daytona credit.",
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-[18px] backdrop-blur-sm">
      <div className="flex max-h-[92dvh] w-full max-w-[520px] flex-col rounded-[20px] border border-line bg-[#14141d]">
        <div className="flex items-center border-b border-line px-4 py-3.5">
          <span className="w-[60px]" />
          <h2 className="flex-1 text-center text-base font-bold">Settings</h2>
          <button className="w-[60px] font-bold text-accent" onClick={save}>
            Done
          </button>
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto p-4">
          <div>
            <div className="flex items-center gap-[9px] py-[5px] text-sm">
              {c.anthropic ? "✅" : "❌"} Anthropic (Claude) — required
            </div>
            <div className="flex items-center gap-[9px] py-[5px] text-sm">
              ✅ Projects stored in {c.convex ? "Convex" : "this browser"}
            </div>
            {target === "local" && (
              <div className="flex items-center gap-[9px] py-[5px] text-sm">
                ✅ Apps run in this browser
              </div>
            )}
            {target === "pages" && (
              <div className="flex items-center gap-[9px] py-[5px] text-sm">
                {c.github ? "✅" : "❌"} GitHub (Pages hosting)
              </div>
            )}
            {target === "daytona" && (
              <div className="flex items-center gap-[9px] py-[5px] text-sm">
                {c.daytona ? "✅" : "❌"} Daytona sandboxes
              </div>
            )}
          </div>

          <div>
            <label className="field-label">WHERE APPS RUN</label>
            <div className="flex rounded-[10px] border border-line bg-surface p-[3px]">
              {TARGETS.map((t) => (
                <button
                  key={t.id}
                  className={targetBtn(target === t.id)}
                  onClick={() => setDraft((d) => ({ ...d, deployTarget: t.id }))}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="field-hint">{TARGET_HINTS[target]}</div>
          </div>

          {usePages && (
            <>
              <div>
                <label className="field-label">GITHUB TOKEN</label>
                <input
                  className="field-input"
                  type="password"
                  placeholder="github_pat_… or ghp_…"
                  value={draft.githubToken}
                  onChange={set("githubToken")}
                />
                <div className="field-hint">
                  Create at github.com → Settings → Developer settings → Personal access tokens. A
                  fine-grained token needs Contents + Pages (read/write) and Administration
                  (read/write, to auto-create the repo) — or use a classic token with the
                  &ldquo;repo&rdquo; scope.
                </div>
              </div>
              <div>
                <label className="field-label">GITHUB PAGES REPO</label>
                <input
                  className="field-input"
                  placeholder={DEFAULT_PAGES_REPO}
                  autoCapitalize="off"
                  autoCorrect="off"
                  value={draft.pagesRepo}
                  onChange={set("pagesRepo")}
                />
                <div className="field-hint">
                  A public repo under your account (created automatically). Apps publish to
                  https://&lt;you&gt;.github.io/&lt;repo&gt;/&lt;app&gt;/.
                </div>
              </div>
            </>
          )}

          <div>
            <label className="field-label">CONVEX DEPLOYMENT URL (OPTIONAL)</label>
            <input
              className="field-input"
              placeholder="leave empty to store projects in this browser"
              autoCapitalize="off"
              autoCorrect="off"
              value={draft.convexUrl}
              onChange={set("convexUrl")}
            />
            <div className="field-hint">
              Not required. Leave it empty and projects, files, and chat history are stored in this
              browser. Add a Convex deployment only if you want them off-device: in{" "}
              <span className="font-mono">backend/</span>, run{" "}
              <span className="font-mono">npm install</span> then{" "}
              <span className="font-mono">npx convex dev</span> and paste the URL it prints.
            </div>
          </div>

          {target === "daytona" && (
            <>
              <div>
                <label className="field-label">DAYTONA API KEY</label>
                <input
                  className="field-input"
                  type="password"
                  placeholder="dtn_…"
                  value={draft.daytonaKey}
                  onChange={set("daytonaKey")}
                />
                <div className="field-hint">Free key at app.daytona.io → Settings → API Keys.</div>
              </div>

              <div>
                <label className="field-label">DAYTONA API URL</label>
                <input
                  className="field-input"
                  placeholder={DEFAULT_DAYTONA_API_URL}
                  autoCapitalize="off"
                  autoCorrect="off"
                  value={draft.daytonaApiUrl}
                  onChange={set("daytonaApiUrl")}
                />
              </div>

              <div>
                <label className="field-label">DAYTONA ORGANIZATION ID (OPTIONAL)</label>
                <input
                  className="field-input"
                  placeholder="only if your account has multiple orgs"
                  autoCapitalize="off"
                  autoCorrect="off"
                  value={draft.daytonaOrgId}
                  onChange={set("daytonaOrgId")}
                />
              </div>
            </>
          )}

          <div>
            <label className="field-label">ANTHROPIC API KEY</label>
            <input
              className="field-input"
              type="password"
              placeholder="sk-ant-…"
              value={draft.anthropicKey}
              onChange={set("anthropicKey")}
            />
            <div className="field-hint">
              Get one at console.anthropic.com — Claude writes every app.
            </div>
          </div>

          <div>
            <label className="field-label">MODEL</label>
            <input
              className="field-input"
              placeholder={DEFAULT_MODEL}
              autoCapitalize="off"
              autoCorrect="off"
              value={draft.model}
              onChange={set("model")}
            />
          </div>

          <div>
            <label className="field-label">ABOUT</label>
            <div className="field-hint">
              Single-user by design: a locally generated ID (
              <span className="font-mono">{userId()}</span>) scopes your projects in Convex. Keys
              stay in this browser and are sent only to their own APIs.
              <br />
              <br />
              Tip: serve the frontend from localhost (<span className="font-mono">
                npm run dev
              </span>) — localhost avoids CORS quirks.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
