import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { Bookmark, BookmarkCheck, ExternalLink, Users } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useSavedVideos, useToggleSave } from "@/hooks/use-saved";
import { CompactVideoCard, ChannelAvatar } from "@/components/video-card";
import { takeSeed } from "@/lib/seed";
import type { YtVideo } from "@shared/schema";

interface VideoInfo {
  videoId: string;
  title: string | null;
  authorName: string | null;
  channelId: string | null;
  thumbnail: string | null;
}

export default function Watch() {
  const { id } = useParams<{ id: string }>();
  const seed = useMemo(() => takeSeed(), [id]);

  const { data: info, isLoading, error } = useQuery<VideoInfo>({
    queryKey: ["/api/video", id],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/video/${id}`);
      return res.json();
    },
    staleTime: 60 * 60 * 1000,
    retry: false,
  });

  const channelId = info?.channelId ?? seed?.channelId ?? null;

  // more from this channel (distinct key — the channel page caches an infinite query under a similar key)
  const { data: channelVideos } = useQuery<{ videos: YtVideo[] }>({
    queryKey: ["/api/channel", channelId, "related"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/channel/${channelId}/videos`);
      return res.json();
    },
    enabled: !!channelId,
    staleTime: 10 * 60 * 1000,
  });

  const { data: saved } = useSavedVideos();
  const toggle = useToggleSave();
  const isSaved = !!saved?.some((s) => s.videoId === id);

  const current: Partial<YtVideo> = {
    videoId: id,
    title: info?.title ?? seed?.title ?? "Loading…",
    channelTitle: info?.authorName ?? seed?.channelTitle ?? "",
    channelId,
    thumbnail: info?.thumbnail ?? seed?.thumbnail ?? null,
    viewCountText: seed?.viewCountText ?? null,
    publishedText: seed?.publishedText ?? null,
    lengthText: seed?.lengthText ?? null,
  };

  const related = (channelVideos?.videos ?? []).filter((v) => v.videoId !== id).slice(0, 12);

  useEffect(() => {
    document.title = `${current.title} — VidVault`;
    return () => {
      document.title = "VidVault — Browse YouTubers & Save Videos";
    };
  }, [current.title]);

  return (
    <div className="mx-auto flex max-w-[1600px] flex-col gap-6 xl:flex-row">
      <div className="min-w-0 flex-1">
        {/* player */}
        <div className="overflow-hidden rounded-2xl bg-black shadow-lg">
          <div className="relative aspect-video w-full">
            <iframe
              key={id}
              data-testid={`iframe-player-${id}`}
              src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`}
              title={current.title ?? "Video player"}
              className="absolute inset-0 h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          </div>
        </div>

        {/* title + actions */}
        <h1 className="mt-4 text-lg font-bold leading-snug" data-testid={`text-watch-title-${id}`}>
          {current.title}
        </h1>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          {/* channel */}
          <div className="flex items-center gap-3">
            {channelId ? (
              <Link href={`/channel/${channelId}`} data-testid="link-watch-channel" className="shrink-0">
                <ChannelAvatar name={current.channelTitle || "?"} size={40} />
              </Link>
            ) : (
              <ChannelAvatar name={current.channelTitle || "?"} size={40} />
            )}
            <div className="min-w-0">
              {channelId ? (
                <Link
                  href={`/channel/${channelId}`}
                  data-testid="text-watch-channel"
                  className="block max-w-[40vw] truncate text-sm font-semibold hover:text-primary"
                >
                  {current.channelTitle}
                </Link>
              ) : (
                <span className="block max-w-[40vw] truncate text-sm font-semibold">{current.channelTitle}</span>
              )}
              {isLoading && !current.channelTitle && (
                <span className="text-xs text-muted-foreground">Loading channel…</span>
              )}
            </div>
          </div>

          {/* action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              data-testid={`button-watch-save-${id}`}
              onClick={() => toggle.mutate({ video: current, save: !isSaved })}
              disabled={toggle.isPending}
              className={
                isSaved
                  ? "flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-sm font-semibold text-foreground hover:brightness-110"
                  : "flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background hover:opacity-90"
              }
            >
              {isSaved ? <BookmarkCheck size={17} className="text-primary" /> : <Bookmark size={17} />}
              {isSaved ? "Saved" : "Save"}
            </button>
            <a
              href={`https://www.youtube.com/watch?v=${id}`}
              target="_blank"
              rel="noopener noreferrer"
              data-testid={`link-watch-youtube-${id}`}
              className="flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-secondary"
            >
              <ExternalLink size={15} /> Watch on YouTube
            </a>
          </div>
        </div>

        {/* meta strip */}
        {(current.viewCountText || current.publishedText) && (
          <p className="mt-2 text-sm text-muted-foreground">
            {[current.viewCountText, current.publishedText].filter(Boolean).join(" · ")}
          </p>
        )}

        {error && (
          <p className="mt-4 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
            Couldn't load full video details{current.title === "Loading…" ? " — the player above may still work" : ""}.
            You can watch it on YouTube.
          </p>
        )}
      </div>

      {/* related rail */}
      <aside className="w-full shrink-0 xl:w-[402px]" aria-label="More from this channel">
        {related.length > 0 && (
          <>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Users size={15} /> More from this channel
            </h2>
            <div className="flex flex-col gap-2">
              {related.map((v) => (
                <CompactVideoCard key={v.videoId} video={v} />
              ))}
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
