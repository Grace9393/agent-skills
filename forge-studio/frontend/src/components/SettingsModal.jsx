import { useState } from "react";
import { DEFAULT_DAYTONA_API_URL, DEFAULT_MODEL, configured, userId } from "../lib/storage";

export default function SettingsModal({ cfg, onSave }) {
  const [draft, setDraft] = useState({
    convexUrl: cfg.convexUrl || "",
    daytonaKey: cfg.daytonaKey || "",
    daytonaApiUrl: cfg.daytonaApiUrl || DEFAULT_DAYTONA_API_URL,
    daytonaOrgId: cfg.daytonaOrgId || "",
    anthropicKey: cfg.anthropicKey || "",
    model: cfg.model || DEFAULT_MODEL,
  });

  const set = (key) => (e) => setDraft((d) => ({ ...d, [key]: e.target.value }));
  const c = configured(draft);

  const save = () =>
    onSave({
      ...draft,
      convexUrl: draft.convexUrl.trim(),
      daytonaKey: draft.daytonaKey.trim(),
      daytonaApiUrl: draft.daytonaApiUrl.trim() || DEFAULT_DAYTONA_API_URL,
      daytonaOrgId: draft.daytonaOrgId.trim(),
      anthropicKey: draft.anthropicKey.trim(),
      model: draft.model.trim() || DEFAULT_MODEL,
    });

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
              {c.convex ? "✅" : "❌"} Convex database
            </div>
            <div className="flex items-center gap-[9px] py-[5px] text-sm">
              {c.daytona ? "✅" : "❌"} Daytona sandboxes
            </div>
            <div className="flex items-center gap-[9px] py-[5px] text-sm">
              {c.anthropic ? "✅" : "❌"} Anthropic (Claude)
            </div>
          </div>

          <div>
            <label className="field-label">CONVEX DEPLOYMENT URL</label>
            <input
              className="field-input"
              placeholder="https://your-app.convex.cloud"
              autoCapitalize="off"
              autoCorrect="off"
              value={draft.convexUrl}
              onChange={set("convexUrl")}
            />
            <div className="field-hint">
              In the backend folder: <span className="font-mono">npm install</span> then{" "}
              <span className="font-mono">npx convex dev</span> — paste the URL it prints (ends in
              .convex.cloud).
            </div>
          </div>

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
