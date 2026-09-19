import type { Express } from "express";
import type { Server } from "node:http";
import { and, desc, eq } from "drizzle-orm";
import { db } from "./storage";
import { savedVideos, insertSavedVideoSchema } from "@shared/schema";
import { getTrending, searchYouTube, getChannelInfo, getChannelVideos, getVideoInfo } from "./youtube";

function visitorId(req: { headers: Record<string, unknown> }): string {
  const v = req.headers["x-visitor-id"];
  return (typeof v === "string" && v) || "local";
}

const CACHE = new Map<string, unknown>();
async function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = CACHE.get(key) as { at: number; value: T } | undefined;
  if (hit && Date.now() - hit.at < ttlMs) return hit.value;
  const value = await fn();
  CACHE.set(key, { at: Date.now(), value });
  return value;
}

export async function registerRoutes(_httpServer: Server, app: Express): Promise<Server> {
  // Trending videos (most-viewed fresh uploads). ?category=music|gaming|news|...
  app.get("/api/trending", async (req, res) => {
    try {
      const category = typeof req.query.category === "string" ? req.query.category : "all";
      const videos = await cached(`trending:${category}`, 10 * 60 * 1000, () => getTrending(category));
      res.json({ videos });
    } catch (err) {
      res.status(502).json({ message: (err as Error).message });
    }
  });

  // Search YouTubers (channels) and videos.
  app.get("/api/search", async (req, res) => {
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    if (!q) return res.json({ channels: [], videos: [] });
    try {
      const data = await cached(`search:${q.toLowerCase()}`, 5 * 60 * 1000, () => searchYouTube(q));
      res.json(data);
    } catch (err) {
      res.status(502).json({ message: (err as Error).message });
    }
  });

  // Channel profile.
  app.get("/api/channel/:id", async (req, res) => {
    try {
      const info = await cached(`chinfo:${req.params.id}`, 30 * 60 * 1000, () => getChannelInfo(req.params.id));
      if (!info.name || info.name === "Channel") {
        return res.status(404).json({ message: "Channel not found" });
      }
      res.json(info);
    } catch (err) {
      res.status(502).json({ message: (err as Error).message });
    }
  });

  // Channel videos, paginated. ?continuation=<token> for the next page.
  app.get("/api/channel/:id/videos", async (req, res) => {
    try {
      const continuation =
        typeof req.query.continuation === "string" && req.query.continuation.length > 0
          ? req.query.continuation
          : undefined;
      const page = await getChannelVideos(req.params.id, continuation);
      res.json(page);
    } catch (err) {
      res.status(502).json({ message: (err as Error).message });
    }
  });

  // Single video metadata for the watch page.
  app.get("/api/video/:id", async (req, res) => {
    try {
      const info = await cached(`video:${req.params.id}`, 60 * 60 * 1000, () => getVideoInfo(req.params.id));
      if (!info.title) return res.status(404).json({ message: "Video not found or unavailable" });
      res.json(info);
    } catch (err) {
      res.status(502).json({ message: (err as Error).message });
    }
  });

  // ---- Saved videos (per visitor) ----

  app.get("/api/saved", async (req, res) => {
    const rows = await db
      .select()
      .from(savedVideos)
      .where(eq(savedVideos.visitorId, visitorId(req)))
      .orderBy(desc(savedVideos.savedAt));
    res.json({ videos: rows });
  });

  app.post("/api/saved", async (req, res) => {
    const parsed = insertSavedVideoSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid video" });
    const row = { ...parsed.data, visitorId: visitorId(req), savedAt: Date.now() };
    const existing = await db
      .select()
      .from(savedVideos)
      .where(and(eq(savedVideos.visitorId, row.visitorId), eq(savedVideos.videoId, row.videoId)))
      .get();
    if (existing) return res.json(existing);
    const inserted = await db.insert(savedVideos).values(row).returning().get();
    res.status(201).json(inserted);
  });

  app.delete("/api/saved/:videoId", async (req, res) => {
    await db
      .delete(savedVideos)
      .where(and(eq(savedVideos.visitorId, visitorId(req)), eq(savedVideos.videoId, req.params.videoId)));
    res.json({ deleted: req.params.videoId });
  });

  return _httpServer;
}
