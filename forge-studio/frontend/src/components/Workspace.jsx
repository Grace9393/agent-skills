import { useEffect, useRef, useState } from "react";
import { useEngine } from "../hooks/useEngine";
import ChatPanel from "./ChatPanel";
import RightPanel from "./RightPanel";

// Lovable-style split: 400px chat on the left, preview/code on the right.
// Stacks vertically under 900px.
export default function Workspace({ cfg, initialProject, initialPrompt, onExit, onOpenSettings }) {
  const [tab, setTab] = useState("preview");
  const [device, setDevice] = useState("desktop");
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [frameNonce, setFrameNonce] = useState(0);

  const engine = useEngine({
    cfg,
    initialProject,
    onPreviewReady: () => setTab("preview"),
    onHotReload: () => setFrameNonce((n) => n + 1),
    onDeleted: onExit,
  });

  // On open: pull the latest state from Convex, then auto-send the creating
  // prompt for a brand-new project (exactly once, even under StrictMode).
  const bootRef = useRef(false);
  useEffect(() => {
    if (bootRef.current) return;
    bootRef.current = true;
    (async () => {
      const { files } = await engine.refreshAll();
      if (initialPrompt && !files.length) engine.sendPrompt(initialPrompt);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="grid h-dvh grid-rows-[45%_55%] min-[900px]:grid-cols-[400px_1fr] min-[900px]:grid-rows-[100%]">
      <ChatPanel
        project={engine.project}
        messages={engine.messages}
        busy={engine.busy}
        phase={engine.phase}
        lastError={engine.lastError}
        deployTarget={cfg.deployTarget}
        onSend={engine.sendPrompt}
        onExit={onExit}
        onRunAgain={engine.runAgain}
        onStop={engine.stopServer}
        onDelete={() => {
          if (
            window.confirm(
              "Delete this project, its files, chat history, and its Daytona sandbox?"
            )
          ) {
            engine.deleteProject();
          }
        }}
      />
      <RightPanel
        project={engine.project}
        files={engine.files}
        log={engine.log}
        isLocal={cfg.deployTarget === "local"}
        tab={tab}
        onTab={setTab}
        device={device}
        onDevice={setDevice}
        consoleOpen={consoleOpen}
        onToggleConsole={() => setConsoleOpen((v) => !v)}
        frameNonce={frameNonce}
        onReload={() => setFrameNonce((n) => n + 1)}
        onSaveFile={engine.pushFile}
        onServerLogs={engine.pullServerLogs}
        onClearLog={engine.clearLog}
        appendLog={engine.appendLog}
      />
    </div>
  );
}
