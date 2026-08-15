import CodePane from "./CodePane";
import ConsoleDrawer from "./ConsoleDrawer";

export default function RightPanel({
  project,
  files,
  log,
  isLocal,
  tab,
  onTab,
  device,
  onDevice,
  consoleOpen,
  onToggleConsole,
  frameNonce,
  onReload,
  onSaveFile,
  onServerLogs,
  onClearLog,
  appendLog,
}) {
  const previewUrl = project?.previewUrl || "";
  // Cache-bust reloads: GitHub Pages sits behind a CDN with ~10 min caching,
  // so a fresh query param makes the reload button actually fetch new content.
  const frameSrc = previewUrl
    ? previewUrl + (previewUrl.includes("?") ? "&" : "?") + "v=" + frameNonce
    : "";
  // Local target: run the generated app straight from its source, with no
  // hosting at all. Sandboxed without allow-same-origin so it can't reach
  // this page's storage (where the API keys live).
  const localHtml =
    isLocal && project?.status === "running"
      ? files.find((f) => f.path === "index.html")?.content || ""
      : "";
  const showPreview = !!previewUrl || !!localHtml;

  const copyLink = async () => {
    if (!previewUrl) return;
    try {
      await navigator.clipboard.writeText(previewUrl);
      appendLog("ok", "🔗 Link copied");
    } catch (e) {
      window.prompt("Live link:", previewUrl);
    }
  };

  const segBtn = (on) =>
    "rounded-[7px] px-[13px] py-1.5 text-[12.5px] font-bold " +
    (on ? "bg-surface2 text-body" : "text-dim");

  return (
    <div className="relative flex min-w-0 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-line bg-bg2 px-3.5 py-2.5">
        <div className="flex rounded-[10px] border border-line bg-surface p-[3px]">
          <button className={segBtn(tab === "preview")} onClick={() => onTab("preview")}>
            Preview
          </button>
          <button className={segBtn(tab === "code")} onClick={() => onTab("code")}>
            Code
          </button>
        </div>
        {tab === "preview" && (
          <div className="flex rounded-[10px] border border-line bg-surface p-[3px]">
            <button
              className={segBtn(device === "desktop")}
              onClick={() => onDevice("desktop")}
              title="Full width"
            >
              🖥
            </button>
            <button
              className={segBtn(device === "mobile")}
              onClick={() => onDevice("mobile")}
              title="Phone width"
            >
              📱
            </button>
          </div>
        )}
        <div className="flex-1" />
        {previewUrl && (
          <div className="flex min-w-0 max-w-[300px] items-center gap-[7px] rounded-full border border-line bg-surface px-3 py-1.5 text-xs text-dim">
            <span className="text-good">🔒</span>
            <span className="overflow-hidden text-ellipsis whitespace-nowrap [direction:rtl] text-left">
              {previewUrl.replace(/^https?:\/\//, "")}
            </span>
          </div>
        )}
        <button className="iconbtn" onClick={copyLink} title="Copy live link">
          ⧉
        </button>
        <button className="iconbtn" onClick={onReload} title="Reload">
          ⟳
        </button>
        {previewUrl && (
          <a
            className="iconbtn"
            href={previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Open in new tab"
          >
            ↗
          </a>
        )}
        <button className="iconbtn font-mono" onClick={onToggleConsole} title="Console">
          &gt;_
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        {tab === "preview" ? (
          showPreview ? (
            <div
              className={
                "dot-grid min-h-0 flex-1 " +
                (device === "mobile" ? "grid place-items-center p-[18px]" : "grid [place-items:stretch]")
              }
            >
              <iframe
                key={frameNonce}
                title="App preview"
                {...(localHtml
                  ? { srcDoc: localHtml, sandbox: "allow-scripts allow-forms allow-modals allow-popups" }
                  : { src: frameSrc })}
                allow="clipboard-write; fullscreen"
                className={
                  device === "mobile"
                    ? "h-full max-h-[760px] w-[390px] rounded-[28px] border border-line bg-black shadow-[0_30px_80px_rgba(0,0,0,.5)]"
                    : "h-full w-full border-0 bg-black"
                }
              />
            </div>
          ) : (
            <div className="dot-grid grid min-h-0 flex-1 place-items-center">
              <div className="text-center text-sm leading-relaxed text-dim">
                <div className="mb-3 text-[44px] [filter:drop-shadow(0_0_18px_rgba(255,115,25,.45))]">
                  🔨
                </div>
                <b className="text-body">Your app will appear here</b>
                <br />
                Describe it in the chat — once it deploys to its
                <br />
                Daytona sandbox, the live preview loads automatically.
              </div>
            </div>
          )
        ) : (
          <CodePane files={files} onSave={onSaveFile} />
        )}
      </div>

      <ConsoleDrawer
        open={consoleOpen}
        log={log}
        onServerLogs={onServerLogs}
        onClear={onClearLog}
        onClose={onToggleConsole}
      />
    </div>
  );
}
