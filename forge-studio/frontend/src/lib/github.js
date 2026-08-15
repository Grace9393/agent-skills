// GitHub REST API client for the "GitHub Pages" deploy target.
// Apps are committed to a public repo under the user's account (one directory
// per project) and served by GitHub Pages from the default branch.

import { b64utf8 } from "./util";
import { DEFAULT_PAGES_REPO } from "./storage";

const API = "https://api.github.com";

async function ghRequest(cfg, method, path, body) {
  const r = await fetch(API + path, {
    method,
    headers: {
      Authorization: "Bearer " + (cfg.githubToken || "").trim(),
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  let obj = null;
  try {
    obj = text ? JSON.parse(text) : null;
  } catch (e) {
    obj = null;
  }
  if (!r.ok) {
    const err = new Error(
      "GitHub error " + r.status + (obj && obj.message ? ": " + obj.message : "")
    );
    err.status = r.status;
    throw err;
  }
  return obj;
}

export const pagesRepoName = (cfg) => (cfg.pagesRepo || DEFAULT_PAGES_REPO).trim();

// Resolve the account and make sure the apps repo exists (created public —
// free GitHub Pages requires a public repo).
export async function ensureRepo(cfg) {
  const user = await ghRequest(cfg, "GET", "/user");
  const owner = user.login;
  const repo = pagesRepoName(cfg);
  try {
    const r = await ghRequest(cfg, "GET", "/repos/" + owner + "/" + repo);
    return { owner, repo, branch: r.default_branch || "main" };
  } catch (e) {
    if (e.status !== 404) throw e;
  }
  const created = await ghRequest(cfg, "POST", "/user/repos", {
    name: repo,
    description: "Apps built with Forge Studio, served by GitHub Pages",
    auto_init: true,
    private: false,
    has_issues: false,
    has_projects: false,
    has_wiki: false,
  });
  return { owner, repo, branch: created.default_branch || "main" };
}

export async function getFileSha(cfg, owner, repo, branch, path) {
  try {
    const r = await ghRequest(
      cfg,
      "GET",
      "/repos/" + owner + "/" + repo + "/contents/" + encodePath(path) + "?ref=" + branch
    );
    return r && !Array.isArray(r) ? r.sha : null;
  } catch (e) {
    if (e.status === 404) return null;
    throw e;
  }
}

export async function putFile(cfg, owner, repo, branch, path, content, message) {
  const sha = await getFileSha(cfg, owner, repo, branch, path);
  await ghRequest(cfg, "PUT", "/repos/" + owner + "/" + repo + "/contents/" + encodePath(path), {
    message,
    content: b64utf8(content),
    branch,
    ...(sha ? { sha } : {}),
  });
}

export async function deleteFile(cfg, owner, repo, branch, path, message) {
  const sha = await getFileSha(cfg, owner, repo, branch, path);
  if (!sha) return;
  await ghRequest(cfg, "DELETE", "/repos/" + owner + "/" + repo + "/contents/" + encodePath(path), {
    message,
    sha,
    branch,
  });
}

export async function listDir(cfg, owner, repo, branch, dir) {
  try {
    const r = await ghRequest(
      cfg,
      "GET",
      "/repos/" + owner + "/" + repo + "/contents/" + encodePath(dir) + "?ref=" + branch
    );
    return Array.isArray(r) ? r : [];
  } catch (e) {
    if (e.status === 404) return [];
    throw e;
  }
}

// Best-effort removal of a project's directory (small trees only).
export async function deleteDirRecursive(cfg, owner, repo, branch, dir, depth = 0) {
  if (depth > 4) return;
  const entries = await listDir(cfg, owner, repo, branch, dir);
  for (const entry of entries) {
    if (entry.type === "dir") {
      await deleteDirRecursive(cfg, owner, repo, branch, entry.path, depth + 1);
    } else {
      try {
        await ghRequest(
          cfg,
          "DELETE",
          "/repos/" + owner + "/" + repo + "/contents/" + encodePath(entry.path),
          { message: "Remove " + entry.path, sha: entry.sha, branch }
        );
      } catch (e) {
        /* best-effort */
      }
    }
  }
}

// Enabling Pages on an existing repo returns 409 — that's fine.
export async function enablePages(cfg, owner, repo, branch) {
  try {
    await ghRequest(cfg, "POST", "/repos/" + owner + "/" + repo + "/pages", {
      source: { branch, path: "/" },
    });
  } catch (e) {
    try {
      await ghRequest(cfg, "GET", "/repos/" + owner + "/" + repo + "/pages");
    } catch (e2) {
      throw e;
    }
  }
}

export async function requestPagesBuild(cfg, owner, repo) {
  try {
    await ghRequest(cfg, "POST", "/repos/" + owner + "/" + repo + "/pages/builds");
  } catch (e) {
    /* builds also trigger automatically on push */
  }
}

export async function latestPagesBuild(cfg, owner, repo) {
  try {
    return await ghRequest(cfg, "GET", "/repos/" + owner + "/" + repo + "/pages/builds/latest");
  } catch (e) {
    return null;
  }
}

export const pagesUrl = (owner, repo, slug) =>
  "https://" + owner + ".github.io/" + repo + "/" + slug + "/";

const encodePath = (p) => String(p).split("/").map(encodeURIComponent).join("/");
