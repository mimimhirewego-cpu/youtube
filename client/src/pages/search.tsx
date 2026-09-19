import { useQuery } from "@tanstack/react-query";
import { useSearch } from "wouter";
import { SearchX, Users } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { VideoCard, VideoGridSkeleton, ChannelAvatar } from "@/components/video-card";
import { VideoLike } from "@/components/video-card";
import type { YtChannel, YtVideo } from "@shared/schema";
import { Link } from "wouter";

interface SearchResult {
  channels: YtChannel[];
  videos: YtVideo[];
}

export default function SearchPage() {
  const search = useSearch();
  const q = new URLSearchParams(search).get("q") ?? "";

  const { data, isLoading, error } = useQuery<SearchResult>({
    queryKey: ["/api/search", q],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/search?q=${encodeURIComponent(q)}`);
      return res.json();
    },
    enabled: q.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  if (!q) {
    return (
      <div className="flex flex-col items-center gap-3 pt-24 text-center text-muted-foreground">
        <SearchX size={40} />
        <p>Type a YouTuber's name in the search bar above.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-8">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex animate-pulse items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-card" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/3 rounded bg-card" />
              <div className="h-3 w-1/4 rounded bg-card" />
            </div>
          </div>
        ))}
        <VideoGridSkeleton count={4} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="pt-24 text-center text-muted-foreground">
        <p>Search failed. {(error as Error | undefined)?.message}</p>
      </div>
    );
  }

  const { channels, videos } = data;

  if (channels.length === 0 && videos.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 pt-24 text-center text-muted-foreground">
        <SearchX size={40} />
        <p>No results for “{q}”. Try a different spelling or a channel name.</p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {channels.length > 0 && (
        <section aria-label="Channels">
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold">
            <Users size={18} className="text-primary" /> YouTubers
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {channels.map((c) => (
              <Link
                key={c.channelId}
                href={`/channel/${c.channelId}`}
                data-testid={`card-channel-${c.channelId}`}
                className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 transition-colors hover:brightness-110"
              >
                <ChannelAvatar name={c.title || "?"} url={c.avatar} size={64} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{c.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {[c.handle, c.subscriberCountText, c.videoCountText].filter(Boolean).join(" · ")}
                  </p>
                  {c.description && (
                    <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{c.description}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {videos.length > 0 && (
        <section aria-label="Videos">
          <h2 className="mb-4 text-base font-semibold">Videos</h2>
          <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {videos.map((v) => (
              <VideoCard key={v.videoId} video={v as VideoLike} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
