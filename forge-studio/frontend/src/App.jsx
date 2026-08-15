import { useCallback, useState } from "react";
import Dashboard from "./components/Dashboard";
import Workspace from "./components/Workspace";
import SettingsModal from "./components/SettingsModal";
import { loadConfig, saveConfig, userId } from "./lib/storage";

// Ensure the local user ID exists before anything renders.
userId();

export default function App() {
  const [cfg, setCfg] = useState(loadConfig);
  const [settingsOpen, setSettingsOpen] = useState(false);
  // { name: "home" } | { name: "studio", project, initialPrompt }
  const [view, setView] = useState({ name: "home" });

  const openSettings = useCallback(() => setSettingsOpen(true), []);
  const openProject = useCallback(
    (project, initialPrompt) => setView({ name: "studio", project, initialPrompt }),
    []
  );
  const goHome = useCallback(() => setView({ name: "home" }), []);

  return (
    <>
      {view.name === "home" ? (
        <Dashboard cfg={cfg} onOpenSettings={openSettings} onOpenProject={openProject} />
      ) : (
        <Workspace
          key={view.project._id}
          cfg={cfg}
          initialProject={view.project}
          initialPrompt={view.initialPrompt}
          onExit={goHome}
          onOpenSettings={openSettings}
        />
      )}
      {settingsOpen && (
        <SettingsModal
          cfg={cfg}
          onSave={(next) => {
            saveConfig(next);
            setCfg(next);
            setSettingsOpen(false);
          }}
        />
      )}
    </>
  );
}
