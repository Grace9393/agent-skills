// localStorage-backed store implementing the same call surface as the Convex
// backend, so Forge Studio works with no database to deploy. Used whenever no
// Convex URL is configured. Single-user by design — the userId is per-browser
// either way, so this loses nothing but cross-device access.

import { store } from "./storage";

const KEY = "forge.localdb";

const blank = () => ({ projects: [], files: [], messages: [] });

function read() {
  try {
    const raw = store.getItem(KEY);
    if (!raw) return blank();
    const db = JSON.parse(raw);
    return {
      projects: db.projects || [],
      files: db.files || [],
      messages: db.messages || [],
    };
  } catch (e) {
    return blank();
  }
}

function write(db) {
  try {
    store.setItem(KEY, JSON.stringify(db));
  } catch (e) {
    // Quota exceeded (large generated apps) — surface it rather than silently
    // dropping the user's work.
    throw new Error(
      "This browser's local storage is full. Delete an old project, or add a Convex URL in Settings to store projects in the cloud."
    );
  }
}

const uid = (prefix) =>
  prefix +
  "_" +
  Array.from(crypto.getRandomValues(new Uint8Array(8)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

// Mirrors the Convex documents: plain string ids, _creationTime-free.
export function localCall(path, args = {}) {
  const db = read();
  switch (path) {
    case "projects:list":
      return db.projects
        .filter((p) => p.userId === args.userId)
        .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

    case "projects:get":
      return db.projects.find((p) => p._id === args.id) || null;

    case "projects:create": {
      const project = {
        _id: uid("proj"),
        userId: args.userId,
        name: args.name,
        description: args.description,
        status: "draft",
        sandboxId: null,
        previewUrl: null,
        updatedAt: Date.now(),
      };
      db.projects.push(project);
      write(db);
      return project._id;
    }

    case "projects:update": {
      const p = db.projects.find((x) => x._id === args.id);
      if (!p) return null;
      for (const [k, v] of Object.entries(args)) {
        if (k !== "id" && v !== undefined) p[k] = v;
      }
      p.updatedAt = Date.now();
      write(db);
      return null;
    }

    case "projects:remove": {
      db.projects = db.projects.filter((p) => p._id !== args.id);
      db.files = db.files.filter((f) => f.projectId !== args.id);
      db.messages = db.messages.filter((m) => m.projectId !== args.id);
      write(db);
      return null;
    }

    case "files:listByProject":
      return db.files
        .filter((f) => f.projectId === args.projectId)
        .sort((a, b) => a.path.localeCompare(b.path));

    case "files:upsert": {
      upsertFile(db, args.projectId, args.path, args.content);
      write(db);
      return null;
    }

    case "files:bulkUpsert": {
      for (const f of args.files) upsertFile(db, args.projectId, f.path, f.content);
      write(db);
      return null;
    }

    case "files:removeByPath": {
      db.files = db.files.filter(
        (f) => !(f.projectId === args.projectId && f.path === args.path)
      );
      write(db);
      return null;
    }

    case "messages:listByProject":
      return db.messages
        .filter((m) => m.projectId === args.projectId)
        .sort((a, b) => a.createdAt - b.createdAt);

    case "messages:add": {
      db.messages.push({
        _id: uid("msg"),
        projectId: args.projectId,
        role: args.role,
        content: args.content,
        createdAt: Date.now(),
      });
      write(db);
      return null;
    }

    default:
      throw new Error("Unknown local call: " + path);
  }
}

function upsertFile(db, projectId, path, content) {
  const existing = db.files.find((f) => f.projectId === projectId && f.path === path);
  if (existing) {
    existing.content = content;
    existing.updatedAt = Date.now();
  } else {
    db.files.push({ _id: uid("file"), projectId, path, content, updatedAt: Date.now() });
  }
}
