import { useEffect, useRef } from "react";

const LINE_COLOR = {
  info: "text-dim",
  cmd: "text-accent",
  out: "text-[#d8d8de]",
  ok: "text-good",
  err: "text-bad",
};

// Slide-up drawer streaming the engine log, color-coded by line kind.
export default function ConsoleDrawer({ open, log, onServerLogs, onClear, onClose }) {
  const boxRef = useRef(null);

  useEffect(() => {
    const el = boxRef.current;
    if (open && el) el.scrollTop = el.scrollHeight;
  }, [log, open]);

  if (!open) return null;

  return (
    <div className="absolute inset-x-0 bottom-0 z-20 flex h-[40%] flex-col border-t border-line bg-bg2">
      <div className="flex items-center gap-2.5 border-b border-line px-3.5 py-2 text-[11px] font-extrabold tracking-[1px] text-dim">
        CONSOLE
        <span className="flex-1" />
        <button className="text-xs font-semibold tracking-normal hover:text-body" onClick={onServerLogs}>
          ⇣ Server logs
        </button>
        <button className="text-xs font-semibold tracking-normal hover:text-body" onClick={onClear}>
          Clear
        </button>
        <button className="text-xs font-semibold tracking-normal hover:text-body" onClick={onClose}>
          ✕
        </button>
      </div>
      <div ref={boxRef} className="flex-1 overflow-y-auto px-3.5 py-3 font-mono text-xs leading-relaxed">
        {log.map((l, i) => (
          <div key={i} className={"whitespace-pre-wrap break-words " + (LINE_COLOR[l.kind] || "text-dim")}>
            {l.text}
          </div>
        ))}
      </div>
    </div>
  );
}
