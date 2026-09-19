import { sqliteTable, text, integer, uniqueIndex } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import type * as z from "zod/mini";

// Videos a visitor has saved to their shelf. Scoped by visitor id because the
// site runs in a sandboxed iframe where cookies/localStorage are unavailable —
// the proxy injects an X-Visitor-Id header instead.
export const savedVideos = sqliteTable(
  "saved_videos",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    visitorId: text("visitor_id").notNull(),
    videoId: text("video_id").notNull(),
    title: text("title").notNull(),
    channelId: text("channel_id"),
    channelTitle: text("channel_title").notNull().default(""),
    thumbnail: text("thumbnail").notNull(),
    viewCountText: text("view_count_text"),
    durationText: text("duration_text"),
    publishedText: text("published_text"),
    savedAt: integer("saved_at").notNull(),
  },
  (t) => ({
    uniq: uniqueIndex("saved_visitor_video_uniq").on(t.visitorId, t.videoId),
  }),
);

export const insertSavedVideoSchema = createInsertSchema(savedVideos).pick({
  videoId: true,
  title: true,
  channelId: true,
  channelTitle: true,
  thumbnail: true,
  viewCountText: true,
  durationText: true,
  publishedText: true,
});

export type InsertSavedVideo = z.infer<typeof insertSavedVideoSchema>;
export type SavedVideo = typeof savedVideos.$inferSelect;

// ---- YouTube API shapes shared between server and client ----

export interface YtVideo {
  videoId: string;
  title: string;
  channelId: string | null;
  channelTitle: string;
  viewCountText: string | null;
  publishedText: string | null;
  lengthText: string | null;
  thumbnail: string | null;
}

export interface YtChannel {
  channelId: string;
  title: string;
  handle: string | null;
  avatar: string | null;
  subscriberCountText: string | null;
  videoCountText: string | null;
  description: string | null;
}

export interface YtChannelInfo {
  channelId: string;
  name: string;
  handle: string | null;
  avatar: string | null;
  subscriberCountText: string | null;
  videoCountText: string | null;
}
