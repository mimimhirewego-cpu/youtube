// Saved-videos storage with a resilient two-layer design:
// 1. Server API (works everywhere the backend is reachable, incl. sandboxed
//    preview iframes where localStorage is blocked).
// 2. localStorage fallback for fully static deployments (e.g. Appwrite Sites)
//    where there is no backend — the app still keeps saves per browser.
import { apiRequest } from "@/lib/queryClient";
import type { YtVideo } from "@shared/schema";

export interface SavedVideo {
  id: number;
  videoId: string;
  title: string;
  channelId: string | null;
  channelTitle: string;
  thumbnail: string;
  viewCountText: string | null;
  durationText: string | null;
  publishedText: string | null;
  savedAt: number;
}

const LS_KEY = "vidvault:saved";

// Set VITE_SAVE_MODE=local for fully static deployments (e.g. Appwrite Sites)
// where there is no backend — saves go straight to localStorage with no
// doomed network requests.
const LOCAL_ONLY = import.meta.env.VITE_SAVE_MODE === "local";

function ls(): Storage | null {
  try {
    const s = window.localStorage;
    s.setItem("__vv_t", "1");
    s.removeItem("__vv_t");
    return s;
  } catch {
    return null; // sandboxed iframe or storage disabled
  }
}

function readLocal(): SavedVideo[] {
  const s = ls();
  if (!s) return [];
  try {
    const parsed = JSON.parse(s.getItem(LS_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocal(rows: SavedVideo[]) {
  const s = ls();
  if (s) s.setItem(LS_KEY, JSON.stringify(rows));
}

function toRow(video: Partial<YtVideo>): SavedVideo {
  return {
    id: Date.now(),
    videoId: video.videoId!,
    title: video.title ?? "Untitled",
    channelId: video.channelId ?? null,
    channelTitle: video.channelTitle ?? "",
    thumbnail: video.thumbnail ?? `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`,
    viewCountText: video.viewCountText ?? null,
    durationText: video.lengthText ?? null,
    publishedText: video.publishedText ?? null,
    savedAt: Date.now(),
  };
}

export async function listSaved(): Promise<SavedVideo[]> {
  if (LOCAL_ONLY) return readLocal();
  try {
    const res = await apiRequest("GET", "/api/saved");
    const data = (await res.json()) as { videos?: SavedVideo[] };
    return data.videos ?? [];
  } catch {
    // no backend (static deployment) — fall back to localStorage
    return readLocal();
  }
}

export async function saveVideo(video: Partial<YtVideo>): Promise<void> {
  if (!LOCAL_ONLY) {
    try {
      await apiRequest("POST", "/api/saved", {
        videoId: video.videoId,
        title: video.title ?? "Untitled",
        channelId: video.channelId ?? null,
        channelTitle: video.channelTitle ?? "",
        thumbnail: video.thumbnail ?? `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`,
        viewCountText: video.viewCountText ?? null,
        durationText: video.lengthText ?? null,
        publishedText: video.publishedText ?? null,
      });
      return;
    } catch {
      // backend unreachable — fall through to localStorage
    }
  }
  if (!readLocal().some((r) => r.videoId === video.videoId)) {
    writeLocal([toRow(video), ...readLocal()]);
  }
}

export async function removeSaved(videoId: string): Promise<void> {
  if (!LOCAL_ONLY) {
    try {
      await apiRequest("DELETE", `/api/saved/${videoId}`);
      return;
    } catch {
      // backend unreachable — fall through to localStorage
    }
  }
  writeLocal(readLocal().filter((r) => r.videoId !== videoId));
}
