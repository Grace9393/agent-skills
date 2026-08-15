import { useMemo, useState } from "react";

const fileIcon = (path) => {
  if (/\.css$/.test(path)) return "#";
  if (/\.html$/.test(path)) return "<>";
  if (/\.json$/.test(path)) return "{}";
  return "JS";
};

// File tree + editor. Unsaved edits are kept per path, so switching files
// never carries a stale draft; Save enables only on a real change and
// hot-pushes to the sandbox.
export default function CodePane({ files, onSave }) {
  const sorted = useMemo(
    () => [...files].sort((a, b) => a.path.localeCompare(b.path)),
    [files]
  );
  const [selPath, setSelPath] = useState(null);
  const [edits, setEdits] = useState({});
  const sel = sorted.find((f) => f.path === selPath) || sorted[0] || null;

  if (!sorted.length) {
    return (
      <div className="dot-grid grid min-h-0 flex-1 place-items-center">
        <div className="text-center text-sm leading-relaxed text-dim">
          <div className="mb-3 text-[44px]">{"{ }"}</div>
          <b className="text-body">No files yet</b>
          <br />
          Generated code shows up here, ready to edit.
        </div>
      </div>
    );
  }

  const value = sel ? (edits[sel.path] !== undefined ? edits[sel.path] : sel.content) : "";
  const dirty = sel && edits[sel.path] !== undefined && edits[sel.path] !== sel.content;

  const save = () => {
    if (!sel || !dirty) return;
    onSave(sel.path, value);
    setEdits((e) => {
      const next = { ...e };
      delete next[sel.path];
      return next;
    });
  };

  return (
    <div className="grid min-h-0 flex-1 grid-cols-[150px_1fr] min-[900px]:grid-cols-[220px_1fr]">
      <div className="overflow-y-auto border-r border-line bg-bg2 p-2.5">
        {sorted.map((f) => (
          <button
            key={f.path}
            className={
              "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[12.5px] " +
              (f.path === (sel && sel.path)
                ? "bg-surface2 text-body"
                : "text-dim hover:bg-surface hover:text-body")
            }
            onClick={() => setSelPath(f.path)}
          >
            <span className="w-[18px] flex-none font-mono text-[11px] text-accent">
              {fileIcon(f.path)}
            </span>
            <span className="overflow-hidden text-ellipsis whitespace-nowrap">{f.path}</span>
          </button>
        ))}
      </div>
      <div className="flex min-w-0 flex-col">
        <div className="flex items-center gap-2.5 border-b border-line px-3.5 py-2 text-[12.5px] text-dim">
          <span className="font-mono">{sel?.path}</span>
          <span className="flex-1" />
          <button
            className="rounded-[9px] bg-fire px-[15px] py-[7px] text-[12.5px] font-bold text-white disabled:bg-surface2 disabled:text-faint"
            disabled={!dirty}
            onClick={save}
          >
            Save
          </button>
        </div>
        <textarea
          className="min-h-0 flex-1 resize-none bg-bg p-3.5 font-mono text-[12.5px] leading-relaxed outline-none"
          spellCheck={false}
          value={value}
          onChange={(e) => {
            const v = e.target.value;
            if (sel) setEdits((prev) => ({ ...prev, [sel.path]: v }));
          }}
        />
      </div>
    </div>
  );
}
