import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const listByProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => {
    const files = await ctx.db
      .query("files")
      .withIndex("by_project", (q) => q.eq("projectId", projectId))
      .collect();
    return files.sort((a, b) => a.path.localeCompare(b.path));
  },
});

export const upsert = mutation({
  args: {
    projectId: v.id("projects"),
    path: v.string(),
    content: v.string(),
  },
  handler: async (ctx, { projectId, path, content }) => {
    const existing = await ctx.db
      .query("files")
      .withIndex("by_project_path", (q) =>
        q.eq("projectId", projectId).eq("path", path)
      )
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { content, updatedAt: Date.now() });
      return existing._id;
    }
    return await ctx.db.insert("files", {
      projectId,
      path,
      content,
      updatedAt: Date.now(),
    });
  },
});

export const bulkUpsert = mutation({
  args: {
    projectId: v.id("projects"),
    files: v.array(v.object({ path: v.string(), content: v.string() })),
  },
  handler: async (ctx, { projectId, files }) => {
    for (const file of files) {
      const existing = await ctx.db
        .query("files")
        .withIndex("by_project_path", (q) =>
          q.eq("projectId", projectId).eq("path", file.path)
        )
        .unique();
      if (existing) {
        await ctx.db.patch(existing._id, {
          content: file.content,
          updatedAt: Date.now(),
        });
      } else {
        await ctx.db.insert("files", {
          projectId,
          path: file.path,
          content: file.content,
          updatedAt: Date.now(),
        });
      }
    }
  },
});

export const removeByPath = mutation({
  args: {
    projectId: v.id("projects"),
    path: v.string(),
  },
  handler: async (ctx, { projectId, path }) => {
    const existing = await ctx.db
      .query("files")
      .withIndex("by_project_path", (q) =>
        q.eq("projectId", projectId).eq("path", path)
      )
      .unique();
    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});
