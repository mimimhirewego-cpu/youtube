import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listSaved, removeSaved, saveVideo, type SavedVideo } from "@/lib/saved-store";
import type { YtVideo } from "@shared/schema";

export type { SavedVideo };

export function useSavedVideos() {
  return useQuery<SavedVideo[]>({
    queryKey: ["/api/saved"],
    queryFn: () => listSaved(),
  });
}

export function useToggleSave() {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: async ({ video, save }: { video: Partial<YtVideo>; save: boolean }) => {
      if (!video.videoId) return;
      if (save) {
        await saveVideo(video);
      } else {
        await removeSaved(video.videoId);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/saved"] });
    },
  });
  return mutation;
}
