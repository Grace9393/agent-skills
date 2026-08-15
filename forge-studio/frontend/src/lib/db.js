// Storage dispatcher: Convex when a deployment URL is configured, otherwise a
// localStorage-backed store with the same call surface. Callers don't care
// which is active, so Convex is genuinely optional rather than a hard setup step.

import { cvMutation, cvQuery } from "./convex";
import { localCall } from "./localdb";

export const usesLocalDb = (cfg) => !(cfg.convexUrl || "").trim();

export async function dbQuery(cfg, path, args) {
  if (usesLocalDb(cfg)) return localCall(path, args);
  return cvQuery(cfg, path, args);
}

export async function dbMutation(cfg, path, args) {
  if (usesLocalDb(cfg)) return localCall(path, args);
  return cvMutation(cfg, path, args);
}
