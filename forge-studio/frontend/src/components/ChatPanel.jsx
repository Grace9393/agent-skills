import { useEffect, useRef, useState } from "react";
import AutoGrowTextarea from "./AutoGrowTextarea";
import StatusBadge from "./StatusBadge";

export default function ChatPanel({
  project,
  messages,
  busy,
  phase,
  lastError,
  onSend,
  onExit,
  onRunAgain,
  onStop,
  onDelete,
}) {
  const [input, setInput] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, busy, phase, lastError]);

  useEffect(() => {
    if (!menuOpen) return;
    const close = () => setMenuOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [menuOpen]);

  const send = () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    onSend(text);
  };

  return (
    <div className="flex min-w-0 flex-col border-b border-line bg-bg2 min-[900px]:border-b-0 min-[900px]:border-r">
      <div className="flex items-center gap-[9px] border-b border-line px-3.5 py-3">
        <button className="iconbtn" onClick={onExit} title="Back">
          ‹
        </button>
        <div className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-[15px] font-extrabold">
          {project?.name}
        </div>
        <StatusBadge status={project?.status} />
        <div className="relative">
          <button
            className="iconbtn"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((v) => !v);
            }}
          >
            ⋯
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-10 z-40 min-w-[190px] rounded-[14px] border border-line bg-surface2 p-1.5 shadow-[0_16px_40px_rgba(0,0,0,.5)]">
              <button
                className="menu-item"
                onClick={() => {
                  setMenuOpen(false);
                  onRunAgain();
                }}
              >
                ▶︎&nbsp; Run / Restart
              </button>
              <button
                className="menu-item"
                onClick={() => {
                  setMenuOpen(false);
                  onStop();
                }}
              >
                ■&nbsp; Stop sandbox
              </button>
              {project?.previewUrl && (
                <a
                  className="menu-item"
                  href={project.previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  ↗&nbsp; Open live link
                </a>
              )}
              <hr className="my-[5px] border-0 border-t border-line" />
              <button
                className="menu-item text-bad"
                onClick={() => {
                  setMenuOpen(false);
                  onDelete();
                }}
              >
                🗑&nbsp; Delete project
              </button>
            </div>
          )}
        </div>
      </div>

      <div ref={scrollRef} className="flex flex-1 flex-col gap-2.5 overflow-y-auto px-3.5 py-4">
        {!messages.length && !busy && !lastError && (
          <div className="rounded-2xl border border-line bg-surface p-3.5 text-[13.5px] leading-relaxed text-dim">
            👋 This is your build chat. Ask for anything — &ldquo;make the header sticky&rdquo;,
            &ldquo;add a dark mode toggle&rdquo;, &ldquo;turn it into a game&rdquo; — and Forge
            rewrites, redeploys, and hot-reloads the preview.
          </div>
        )}
        {messages.map((m) => (
          <div
            key={m._id}
            className={
              m.role === "user"
                ? "max-w-[90%] self-end whitespace-pre-wrap break-words rounded-2xl bg-fire px-3.5 py-2.5 text-sm leading-relaxed text-white"
                : "max-w-[90%] self-start whitespace-pre-wrap break-words rounded-2xl border border-line bg-surface px-3.5 py-2.5 text-sm leading-relaxed"
            }
          >
            {m.role !== "user" && <span className="text-accent">🔨 </span>}
            {m.content}
          </div>
        ))}
        {lastError && (
          <div className="self-stretch whitespace-pre-wrap break-words rounded-2xl border border-bad/25 bg-bad/10 px-3.5 py-2.5 text-sm leading-relaxed text-bad">
            ❌ {lastError}
          </div>
        )}
        {busy && (
          <div className="flex items-center gap-2.5 rounded-2xl border border-line bg-surface px-3.5 py-3 text-[13.5px] text-dim">
            <span className="spinner" />
            <span>{phase || "Working…"}</span>
          </div>
        )}
      </div>

      <div className="flex items-end gap-2.5 border-t border-line px-3.5 py-3">
        <AutoGrowTextarea
          value={input}
          onChange={setInput}
          onSubmit={send}
          placeholder="Describe a change…"
          maxHeight={130}
          className="min-h-[44px] w-full resize-none rounded-2xl border border-line bg-surface px-3 py-2.5 outline-none focus:border-accent/55"
        />
        <button
          className="grid h-[42px] w-[42px] flex-none place-items-center rounded-full bg-fire text-lg text-white disabled:bg-surface2 disabled:text-faint"
          disabled={busy || !input.trim()}
          onClick={send}
        >
          ↑
        </button>
      </div>
    </div>
  );
}
