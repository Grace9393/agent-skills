import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  projects: defineTable({
    userId: v.string(),
    name: v.string(),
    description: v.string(),
    status: v.string(),
    sandboxId: v.optional(v.string()),
    previewUrl: v.optional(v.string()),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  files: defineTable({
    projectId: v.id("projects"),
    path: v.string(),
    content: v.string(),
    updatedAt: v.number(),
  })
    .index("by_project", ["projectId"])
    .index("by_project_path", ["projectId", "path"]),

  messages: defineTable({
    projectId: v.id("projects"),
    role: v.string(),
    content: v.string(),
    createdAt: v.number(),
  }).index("by_project", ["projectId"]),
});
