// The Forge engine: prompt → Claude writes code → Convex persists it →
// a Daytona sandbox installs and serves it → preview URL.
// All state a workspace needs (project, chat, files, log, phase) lives here.

import { useCallback, useEffect, useRef, useState } from "react";
import { cvMutation, cvQuery } from "../lib/convex";
import * as dt from "../lib/daytona";
import {
  SYSTEM_PROMPT,
  claudeComplete,
  createPrompt,
  editPrompt,
  parseGenerated,
} from "../lib/anthropic";
import { isConfigured, missingKeys } from "../lib/storage";
import { b64utf8, errMessage, shq } from "../lib/util";

const DEV_SESSION = "forge-dev";
const WORKDIR = "app";
const LOG_CAP = 500;

// One curl-poll loop inside the sandbox — a single execute call, so the
// browser never busy-waits on the toolbox API.
const READINESS_CMD =
  "for i in $(seq 1 40); do c=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000 || true); " +
  'if [ "$c" = "200" ]; then echo READY; exit 0; fi; sleep 2; done; ' +
  "echo TIMEOUT; tail -n 30 /tmp/forge-dev.log 2>/dev/null";

export function useEngine({ cfg, initialProject, onPreviewReady, onHotReload, onDeleted }) {
  const [project, setProject] = useState(initialProject);
  const [messages, setMessages] = useState([]);
  const [files, setFiles] = useState([]);
  const [log, setLog] = useState([]);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState("");
  const [lastError, setLastError] = useState(null);

  const cfgRef = useRef(cfg);
  useEffect(() => {
    cfgRef.current = cfg;
  }, [cfg]);

  const projectRef = useRef(initialProject);
  const busyRef = useRef(false);
  const callbacksRef = useRef({ onPreviewReady, onHotReload, onDeleted });
  useEffect(() => {
    callbacksRef.current = { onPreviewReady, onHotReload, onDeleted };
  }, [onPreviewReady, onHotReload, onDeleted]);

  const syncProject = (patch) => {
    projectRef.current = { ...projectRef.current, ...patch };
    setProject(projectRef.current);
  };

  const appendLog = useCallback((kind, text) => {
    setLog((l) => {
      const next = [...l, { kind, text }];
      return next.length > LOG_CAP ? next.slice(next.length - LOG_CAP) : next;
    });
  }, []);

  const clearLog = useCallback(() => setLog([]), []);

  const setStatus = async (status) => {
    if (!projectRef.current) return;
    syncProject({ status });
    try {
      await cvMutation(cfgRef.current, "projects:update", {
        id: projectRef.current._id,
        status,
      });
    } catch (e) {
      /* status is cosmetic — never block the pipeline on it */
    }
  };

  const refreshAll = useCallback(async () => {
    const c = cfgRef.current;
    const id = projectRef.current?._id;
    if (!id) return { files: [] };
    let fetched = { files: [] };
    try {
      const p = await cvQuery(c, "projects:get", { id });
      if (p) {
        projectRef.current = p;
        setProject(p);
      }
      const msgs = await cvQuery(c, "messages:listByProject", { projectId: id });
      setMessages(msgs);
      const fs = await cvQuery(c, "files:listByProject", { projectId: id });
      setFiles(fs);
      fetched = { files: fs };
    } catch (e) {
      /* offline Convex just means stale UI, not a crash */
    }
    return fetched;
  }, []);

  async function uploadFile(sid, path, content) {
    const c = cfgRef.current;
    const full = WORKDIR + "/" + path;
    const dir = full.includes("/") ? full.slice(0, full.lastIndexOf("/")) : ".";
    const cmd =
      "mkdir -p " + shq(dir) + " && printf %s '" + b64utf8(content) + "' | base64 -d > " + shq(full);
    const res = await dt.exec(c, sid, cmd, 60);
    if (res.exitCode !== null && res.exitCode !== 0) {
      throw new Error("Failed to write " + path);
    }
  }

  async function deploy(genFiles, deleted, install) {
    const c = cfgRef.current;
    await setStatus("building");

    let sid = projectRef.current.sandboxId || "";
    if (!sid) {
      setPhase("Creating sandbox…");
      appendLog("info", "📦 Creating Daytona sandbox…");
      const sb = await dt.createSandbox(c);
      sid = sb.id;
      syncProject({ sandboxId: sid });
      try {
        await cvMutation(c, "projects:update", { id: projectRef.current._id, sandboxId: sid });
      } catch (e) {
        /* persisted on next successful update */
      }
    }
    setPhase("Waking sandbox…");
    await dt.ensureStarted(c, sid);
    appendLog("info", "⚙️ Sandbox " + sid.slice(0, 8) + "… online");

    setPhase("Uploading files…");
    await dt.exec(c, sid, "mkdir -p " + shq(WORKDIR), 30);
    for (const f of genFiles) {
      await uploadFile(sid, f.path, f.content);
      appendLog("out", "⬆️  " + f.path);
    }
    for (const d of deleted) {
      try {
        await dt.exec(c, sid, "rm -f " + shq(WORKDIR + "/" + d), 30);
      } catch (e) {
        /* best-effort */
      }
      appendLog("out", "🗑  removed " + d);
    }

    if (install) {
      setPhase("Installing dependencies…");
      appendLog("cmd", "$ npm install");
      const res = await dt.exec(
        c,
        sid,
        "cd " + shq(WORKDIR) + " && npm install --no-audit --no-fund 2>&1 | tail -n 25",
        600
      );
      if (res.output.trim()) appendLog("out", res.output.trim());
      if (res.exitCode !== null && res.exitCode !== 0) {
        throw new Error("npm install failed (exit " + res.exitCode + ")");
      }
    }

    setPhase("Starting dev server…");
    appendLog("cmd", "$ npm run dev");
    try {
      await dt.exec(c, sid, "pkill -f vite >/dev/null 2>&1 || true", 30);
    } catch (e) {
      /* nothing was running */
    }
    await dt.deleteSession(c, sid, DEV_SESSION);
    await dt.createSession(c, sid, DEV_SESSION);
    await dt.sessionExecAsync(
      c,
      sid,
      DEV_SESSION,
      "cd " + shq(WORKDIR) + " && npm run dev > /tmp/forge-dev.log 2>&1"
    );

    setPhase("Waiting for the app to boot…");
    const wait = await dt.exec(c, sid, READINESS_CMD, 150);
    if (!wait.output.includes("READY")) {
      if (wait.output.trim()) appendLog("err", wait.output.trim());
      throw new Error("The dev server did not come up on port 3000");
    }

    setPhase("Fetching preview URL…");
    const url = await dt.previewUrl(c, sid, 3000);
    syncProject({ previewUrl: url, status: "running" });
    try {
      await cvMutation(c, "projects:update", {
        id: projectRef.current._id,
        previewUrl: url,
        status: "running",
      });
    } catch (e) {
      /* preview still works locally */
    }
    appendLog("ok", "🚀 Live: " + url);
    callbacksRef.current.onPreviewReady?.();
  }

  const sendPrompt = useCallback(async (prompt) => {
    if (busyRef.current || !projectRef.current) return;
    const c = cfgRef.current;
    if (!isConfigured(c)) {
      const msg =
        "Missing configuration: " +
        missingKeys(c).join(", ") +
        ". Open Settings (⚙︎) to finish setup.";
      setLastError(msg);
      appendLog("err", "⚠️ " + msg);
      return;
    }
    busyRef.current = true;
    setBusy(true);
    setLastError(null);
    setPhase("Starting…");
    const pid = projectRef.current._id;
    try {
      try {
        await cvMutation(c, "messages:add", { projectId: pid, role: "user", content: prompt });
      } catch (e) {
        /* keep the local copy either way */
      }
      setMessages((m) => [
        ...m,
        { _id: "local-" + Date.now(), projectId: pid, role: "user", content: prompt, createdAt: Date.now() },
      ]);

      let existing = [];
      try {
        existing = await cvQuery(c, "files:listByProject", { projectId: pid });
      } catch (e) {
        existing = [];
      }

      await setStatus("generating");
      let generated;
      if (!existing.length) {
        setPhase("Claude is writing your app…");
        appendLog("info", "🤖 Claude is writing your app…");
        generated = parseGenerated(
          await claudeComplete(
            c,
            SYSTEM_PROMPT,
            createPrompt(projectRef.current.name, projectRef.current.description || "", prompt)
          )
        );
      } else {
        setPhase("Claude is editing your app…");
        appendLog("info", "🤖 Claude is editing your app…");
        generated = parseGenerated(
          await claudeComplete(c, SYSTEM_PROMPT, editPrompt(existing, prompt))
        );
      }
      appendLog("ok", "✏️ " + generated.files.length + " file(s) generated");

      if (generated.summary) {
        try {
          await cvMutation(c, "messages:add", {
            projectId: pid,
            role: "assistant",
            content: generated.summary,
          });
        } catch (e) {
          /* keep the local copy either way */
        }
        setMessages((m) => [
          ...m,
          {
            _id: "local-a-" + Date.now(),
            projectId: pid,
            role: "assistant",
            content: generated.summary,
            createdAt: Date.now(),
          },
        ]);
      }

      setPhase("Saving files…");
      await cvMutation(c, "files:bulkUpsert", {
        projectId: pid,
        files: generated.files.map((f) => ({ path: f.path, content: f.content })),
      });
      for (const d of generated.deleted) {
        try {
          await cvMutation(c, "files:removeByPath", { projectId: pid, path: d });
        } catch (e) {
          /* best-effort */
        }
      }

      const needsInstall =
        !existing.length || generated.files.some((f) => f.path === "package.json");
      await deploy(generated.files, generated.deleted, needsInstall);
      await refreshAll();
    } catch (e) {
      const msg = errMessage(e);
      setLastError(msg);
      appendLog("err", "❌ " + msg);
      await setStatus("error");
    } finally {
      busyRef.current = false;
      setBusy(false);
      setPhase("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runAgain = useCallback(async () => {
    if (busyRef.current || !projectRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setLastError(null);
    try {
      const fs = await cvQuery(cfgRef.current, "files:listByProject", {
        projectId: projectRef.current._id,
      });
      if (!fs.length) {
        appendLog("err", "No files yet — describe your app in the chat first.");
        return;
      }
      await deploy(fs.map((f) => ({ path: f.path, content: f.content })), [], true);
    } catch (e) {
      const msg = errMessage(e);
      setLastError(msg);
      appendLog("err", "❌ " + msg);
      await setStatus("error");
    } finally {
      busyRef.current = false;
      setBusy(false);
      setPhase("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopServer = useCallback(async () => {
    const c = cfgRef.current;
    const p = projectRef.current;
    if (!p || !p.sandboxId) return;
    try {
      await dt.exec(c, p.sandboxId, "pkill -f vite >/dev/null 2>&1 || true", 30);
    } catch (e) {
      /* sandbox may already be down */
    }
    await dt.deleteSession(c, p.sandboxId, DEV_SESSION);
    try {
      await dt.stopSandbox(c, p.sandboxId);
    } catch (e) {
      /* already stopped */
    }
    await setStatus("stopped");
    appendLog("info", "⏹ Stopped");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Editor Save: persist to Convex, then hot-push into the running sandbox.
  const pushFile = useCallback(async (path, content) => {
    const c = cfgRef.current;
    const p = projectRef.current;
    if (!p) return;
    setFiles((fs) => fs.map((f) => (f.path === path ? { ...f, content } : f)));
    try {
      await cvMutation(c, "files:upsert", { projectId: p._id, path, content });
    } catch (e) {
      /* still push to the sandbox below */
    }
    if (p.sandboxId) {
      try {
        await dt.ensureStarted(c, p.sandboxId);
        await uploadFile(p.sandboxId, path, content);
        appendLog("ok", "💾 Saved " + path + " — hot reloading");
        callbacksRef.current.onHotReload?.();
      } catch (e) {
        appendLog("info", "💾 Saved " + path + " (sandbox offline — will apply on next run)");
      }
    } else {
      appendLog("ok", "💾 Saved " + path);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pullServerLogs = useCallback(async () => {
    const c = cfgRef.current;
    const p = projectRef.current;
    if (!p || !p.sandboxId) {
      appendLog("info", "(no sandbox yet)");
      return;
    }
    try {
      const res = await dt.exec(
        c,
        p.sandboxId,
        "tail -n 120 /tmp/forge-dev.log 2>/dev/null || echo '(no server log yet)'",
        30
      );
      appendLog("out", res.output.trim());
    } catch (e) {
      appendLog("info", "(sandbox is offline)");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Caller confirms first; this does the deletion (best-effort sandbox
  // teardown, then the cascade delete in Convex).
  const deleteProject = useCallback(async () => {
    const c = cfgRef.current;
    const p = projectRef.current;
    if (!p) return;
    if (p.sandboxId) {
      try {
        await dt.deleteSandbox(c, p.sandboxId);
      } catch (e) {
        /* sandbox may be gone already */
      }
    }
    try {
      await cvMutation(c, "projects:remove", { id: p._id });
    } catch (e) {
      /* nothing else to do */
    }
    callbacksRef.current.onDeleted?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    project,
    messages,
    files,
    log,
    busy,
    phase,
    lastError,
    sendPrompt,
    runAgain,
    stopServer,
    pushFile,
    pullServerLogs,
    deleteProject,
    refreshAll,
    appendLog,
    clearLog,
  };
}
