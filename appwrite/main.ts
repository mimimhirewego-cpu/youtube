/**
 * VidVault API — Appwrite Function
 *
 * Serves the same YouTube-data endpoints as the Express backend
 * (server/routes.ts), so the static React app deployed on Appwrite Sites
 * can call it from the browser. The saved-videos feature is intentionally
 * not here: on a static deployment it uses the browser's localStorage.
 *
 * Deploy: see README.md ("Deploy on Appwrite"). Bundle with
 * `npm run build:function` → appwrite/function/src/main.js
 */
import {
  getChannelInfo,
  getChannelVideos,
  getTrending,
  getVideoInfo,
  searchYouTube,
} from "../server/youtube";

interface FnReq {
  method: string;
  path: string;
  query: Record<string, string>;
}
interface FnRes {
  json: (body: unknown, status?: number, headers?: Record<string, string>) => unknown;
  text: (body: string, status?: number, headers?: Record<string, string>) => unknown;
}

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// Small in-memory cache — warm function containers share module state.
const cache = new Map<string, { at: number; value: unknown }>();
async function cached<T>(key: string, ttl: number, fn: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttl) return hit.value as T;
  const value = await fn();
  cache.set(key, { at: Date.now(), value });
  return value;
}

export default async function handler({
  req,
  res,
  error,
}: {
  req: FnReq;
  res: FnRes;
  error: (message: string) => void;
}) {
  if (req.method === "OPTIONS") return res.text("", 204, CORS);

  const path = (req.path || "/").replace(/\/+$/, "") || "/";
  const q = req.query ?? {};

  try {
    if (req.method !== "GET") return res.json({ message: "Method not allowed" }, 405, CORS);

    if (path === "/api/trending") {
      const category = q.category || "all";
      const videos = await cached(`trend:${category}`, 10 * 60_000, () => getTrending(category));
      return res.json({ videos }, 200, CORS);
    }

    if (path === "/api/search") {
      const query = (q.q || "").trim();
      if (!query) return res.json({ channels: [], videos: [] }, 200, CORS);
      const data = await cached(`search:${query.toLowerCase()}`, 5 * 60_000, () => searchYouTube(query));
      return res.json(data, 200, CORS);
    }

    if (path.startsWith("/api/video/")) {
      const id = path.split("/")[3];
      if (!id) return res.json({ message: "Missing video id" }, 400, CORS);
      const info = await cached(`video:${id}`, 60 * 60_000, () => getVideoInfo(id));
      if (!info.title) return res.json({ message: "Video not found or unavailable" }, 404, CORS);
      return res.json(info, 200, CORS);
    }

    const videosMatch = path.match(/^\/api\/channel\/([\w-]+)\/videos$/);
    if (videosMatch) {
      const id = videosMatch[1];
      const continuation = q.continuation && q.continuation.length > 0 ? q.continuation : undefined;
      let hint: { name: string; avatar: string | null } | undefined;
      try {
        const info = await cached(`chinfo:${id}`, 30 * 60_000, () => getChannelInfo(id));
        hint = { name: info.name, avatar: info.avatar };
      } catch {
        hint = undefined;
      }
      return res.json(await getChannelVideos(id, continuation, hint), 200, CORS);
    }

    const channelMatch = path.match(/^\/api\/channel\/([\w-]+)$/);
    if (channelMatch) {
      const info = await cached(`chinfo:${channelMatch[1]}`, 30 * 60_000, () =>
        getChannelInfo(channelMatch[1]),
      );
      if (!info.name || info.name === "Channel") {
        return res.json({ message: "Channel not found" }, 404, CORS);
      }
      return res.json(info, 200, CORS);
    }

    return res.json({ message: "Not found" }, 404, CORS);
  } catch (err) {
    error?.(String(err));
    return res.json({ message: (err as Error).message || "Upstream error" }, 502, CORS);
  }
}
