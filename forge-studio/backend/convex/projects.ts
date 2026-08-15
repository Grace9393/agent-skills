import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("projects")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const get = query({
  args: { id: v.id("projects") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

export const create = mutation({
  args: {
    userId: v.string(),
    name: v.string(),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("projects", {
      ...args,
      status: "draft",
      updatedAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("projects"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(v.string()),
    sandboxId: v.optional(v.string()),
    previewUrl: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...rest }) => {
    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [key, value] of Object.entries(rest)) {
      if (value !== undefined) patch[key] = value;
    }
    await ctx.db.patch(id, patch as any);
  },
});

export const remove = mutation({
  args: { id: v.id("projects") },
  handler: async (ctx, { id }) => {
    const files = await ctx.db
      .query("files")
      .withIndex("by_project", (q) => q.eq("projectId", id))
      .collect();
    for (const f of files) await ctx.db.delete(f._id);

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_project", (q) => q.eq("projectId", id))
      .collect();
    for (const m of messages) await ctx.db.delete(m._id);

    await ctx.db.delete(id);
  },
});
