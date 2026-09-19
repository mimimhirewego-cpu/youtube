import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { YtVideo } from "@shared/schema";

export interface SavedRow {
  id: number;
  visitorId: string;
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

async function fetchJson<T>(url: string): Promise<T> {
  const res = await apiRequest("GET", url);
  return res.json();
}

export function useSavedVideos() {
  return useQuery<SavedRow[]>({
    queryKey: ["/api/saved"],
    queryFn: () => fetchJson<{ videos: SavedRow[] }>("/api/saved").then((r) => r.videos),
  });
}

export function useToggleSave() {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: async ({ video, save }: { video: Partial<YtVideo>; save: boolean }) => {
      if (save) {
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
      } else {
        await apiRequest("DELETE", `/api/saved/${video.videoId}`);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/saved"] });
    },
  });
  return mutation;
}
