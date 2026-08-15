import { useCallback, useEffect, useState } from "react";
import AutoGrowTextarea from "./AutoGrowTextarea";
import StatusBadge from "./StatusBadge";
import { cvMutation, cvQuery } from "../lib/convex";
import { deleteSandbox } from "../lib/daytona";
import { configured, isConfigured, missingKeys, userId } from "../lib/storage";
import { CHIPS, TEMPLATES } from "../lib/templates";
import { errMessage, hueFor, timeAgo, titleFromPrompt } from "../lib/util";

const POLL_MS = 8000;

export default function Dashboard({ cfg, onOpenSettings, onOpenProject }) {
  const [prompt, setPrompt] = useState("");
  const [projects, setProjects] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const [loaded, setLoaded] = useState(false);

  const hasConvex = configured(cfg).convex;

  const loadProjects = useCallback(async () => {
    if (!configured(cfg).convex) return;
    try {
      const list = await cvQuery(cfg, "projects:list", { userId: userId() });
      setProjects(list);
      setLoadError(null);
    } catch (e) {
      setLoadError(errMessage(e));
    }
    setLoaded(true);
  }, [cfg]);

  useEffect(() => {
    loadProjects();
    const t = setInterval(loadProjects, POLL_MS);
    return () => clearInterval(t);
  }, [loadProjects]);

  const createAndOpen = async (name, promptText) => {
    if (!configured(cfg).convex) {
      onOpenSettings();
      return;
    }
    try {
      const id = await cvMutation(cfg, "projects:create", {
        userId: userId(),
        name,
        description: promptText,
      });
      onOpenProject(
        {
          _id: id,
          userId: userId(),
          name,
          description: promptText,
          status: "draft",
          sandboxId: null,
          previewUrl: null,
          updatedAt: Date.now(),
        },
        promptText
      );
    } catch (e) {
      setLoadError(errMessage(e));
    }
  };

  const heroGo = () => {
    const p = prompt.trim();
    if (!p) return;
    setPrompt("");
    createAndOpen(titleFromPrompt(p), p);
  };

  const removeProject = async (project, ev) => {
    ev.stopPropagation();
    if (!window.confirm('Delete "' + project.name + '" and its sandbox?')) return;
    if (project.sandboxId) {
      try {
        await deleteSandbox(cfg, project.sandboxId);
      } catch (e) {
        /* best-effort */
      }
    }
    try {
      await cvMutation(cfg, "projects:remove", { id: project._id });
    } catch (e) {
      /* refresh will show the truth */
    }
    loadProjects();
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <nav className="flex items-center gap-3 px-[clamp(16px,4vw,40px)] py-4">
        <div className="flex items-center gap-[9px] text-[17px] font-black tracking-[.5px]">
          <span className="text-xl [filter:drop-shadow(0_0_12px_rgba(255,115,25,.6))]">🔨</span>
          Forge Studio
        </div>
        <div className="flex-1" />
        <button className="iconbtn" onClick={onOpenSettings} title="Settings">
          ⚙︎
        </button>
      </nav>

      <header className="hero-glow px-5 pb-[26px] pt-[clamp(36px,8vh,90px)] text-center">
        <h1 className="text-[clamp(30px,4.6vw,52px)] font-black tracking-[-.5px]">
          Build something <em className="fire-text not-italic">amazing</em>
        </h1>
        <p className="mt-3 text-[clamp(14px,1.6vw,17px)] text-dim">
          Describe it once. Claude writes it, a cloud sandbox runs it, and it&rsquo;s live in
          minutes.
        </p>

        <div className="mx-auto mt-[30px] max-w-[720px] px-5">
          <div className="flex items-end gap-2.5 rounded-[20px] border border-line bg-surface p-2 pl-[18px] transition-all focus-within:border-accent/60 focus-within:shadow-[0_0_0_4px_rgba(255,115,25,.12),0_18px_50px_rgba(255,90,25,.12)]">
            <AutoGrowTextarea
              value={prompt}
              onChange={setPrompt}
              onSubmit={heroGo}
              placeholder="Ask Forge to create a…"
              className="min-h-[48px] w-full resize-none bg-transparent py-3 text-[15.5px] outline-none"
            />
            <button
              className="grid h-11 w-11 flex-none place-items-center rounded-[14px] bg-fire text-[19px] text-white shadow-[0_8px_22px_rgba(255,90,25,.35)] disabled:bg-surface2 disabled:text-faint disabled:shadow-none"
              disabled={!prompt.trim()}
              onClick={heroGo}
              title="Build it"
            >
              ↑
            </button>
          </div>

          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {CHIPS.map((c) => (
              <button
                key={c}
                className="rounded-full border border-line bg-surface px-3.5 py-[7px] text-[13px] text-dim hover:border-accent/45 hover:text-body"
                onClick={() => setPrompt("A beautiful " + c.toLowerCase())}
              >
                {c}
              </button>
            ))}
          </div>

          {!isConfigured(cfg) && (
            <button
              className="mt-[18px] w-full rounded-full border border-[rgba(245,197,66,.35)] bg-surface p-3 text-[13px] text-[#f5c542]"
              onClick={onOpenSettings}
            >
              ⚠️ Finish setup — add {missingKeys(cfg).join(", ")} in Settings
            </button>
          )}
        </div>
      </header>

      <section className="mx-auto w-full max-w-[1080px] px-[clamp(16px,4vw,40px)] pb-5 pt-[34px]">
        <h2 className="mb-4 text-[15px] font-extrabold uppercase tracking-[1.2px] text-dim">
          My projects
        </h2>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-3.5">
          {!hasConvex ? (
            <div className="col-span-full rounded-[18px] border border-dashed border-line p-[34px] text-center text-sm text-dim">
              Connect Convex in Settings to see your projects.
            </div>
          ) : loadError ? (
            <div className="col-span-full rounded-[18px] border border-dashed border-line p-[34px] text-center text-sm text-bad">
              {loadError}
            </div>
          ) : !projects.length ? (
            <div className="col-span-full rounded-[18px] border border-dashed border-line p-[34px] text-center text-sm text-dim">
              {loaded ? "No projects yet — describe your first app above ↑" : "Loading…"}
            </div>
          ) : (
            projects.map((p) => {
              const h = hueFor(p.name);
              return (
                <button
                  key={p._id}
                  className="group relative flex flex-col overflow-hidden rounded-[18px] border border-line bg-surface text-left transition-all hover:-translate-y-[3px] hover:border-accent/35"
                  onClick={() => onOpenProject(p, null)}
                >
                  <div
                    className="grid h-[110px] place-items-center text-[40px] font-black text-white/90"
                    style={{
                      background: `linear-gradient(135deg, hsl(${h} 75% 45%), hsl(${(h + 50) % 360} 80% 38%))`,
                    }}
                  >
                    {(p.name || "?")[0].toUpperCase()}
                  </div>
                  <div className="px-3.5 pb-[13px] pt-3">
                    <div className="overflow-hidden text-ellipsis whitespace-nowrap text-[14.5px] font-bold">
                      {p.name}
                    </div>
                    <div className="mt-[7px] flex items-center gap-2">
                      <StatusBadge status={p.status} />
                      <span className="text-[11px] text-faint">{timeAgo(p.updatedAt)}</span>
                    </div>
                  </div>
                  <span
                    className="absolute right-2 top-2 hidden h-7 w-7 place-items-center rounded-lg bg-black/45 text-[13px] group-hover:grid"
                    onClick={(ev) => removeProject(p, ev)}
                    title="Delete"
                  >
                    🗑
                  </span>
                </button>
              );
            })
          )}
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1080px] px-[clamp(16px,4vw,40px)] pb-5 pt-[34px]">
        <h2 className="mb-4 text-[15px] font-extrabold uppercase tracking-[1.2px] text-dim">
          Start from a template
        </h2>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-3.5">
          {TEMPLATES.map((t) => (
            <button
              key={t.name}
              className="rounded-[18px] border border-line bg-surface p-4 text-left transition-all hover:-translate-y-[3px] hover:border-accent/35"
              onClick={() => createAndOpen(t.name, t.prompt)}
            >
              <div className="text-[26px]">{t.ico}</div>
              <div className="mt-2.5 text-[14.5px] font-bold">{t.name}</div>
              <div className="mt-[5px] text-[12.5px] leading-snug text-dim">{t.desc}</div>
              <div className="mt-2.5 text-xs font-bold text-accent">Remix →</div>
            </button>
          ))}
        </div>
      </section>

      <footer className="px-5 pb-10 pt-[30px] text-center text-xs text-faint">
        Forge Studio · your keys, your Convex, your Daytona sandboxes · no account needed
      </footer>
    </div>
  );
}
