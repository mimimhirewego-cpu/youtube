import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { ArrowLeft, ExternalLink, Users } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { VideoCard, VideoGridSkeleton, ChannelAvatar } from "@/components/video-card";
import type { YtChannelInfo, YtVideo } from "@shared/schema";

interface ChannelPage {
  videos: YtVideo[];
  nextToken: string | null;
}

export default function ChannelPage() {
  const { id } = useParams<{ id: string }>();

  const { data: info, error: infoError } = useQuery<YtChannelInfo>({
    queryKey: ["/api/channel", id],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/channel/${id}`);
      return res.json();
    },
    retry: false,
  });

  const videosQuery = useInfiniteQuery<ChannelPage>({
    queryKey: ["/api/channel", id, "videos"],
    initialPageParam: "",
    queryFn: async ({ pageParam }: { pageParam: string }) => {
      const url = pageParam
        ? `/api/channel/${id}/videos?continuation=${encodeURIComponent(pageParam)}`
        : `/api/channel/${id}/videos`;
      const res = await apiRequest("GET", url);
      return res.json();
    },
    getNextPageParam: (last) => last.nextToken ?? undefined,
    staleTime: 10 * 60 * 1000,
  });

  if (infoError) {
    return (
      <div className="flex flex-col items-center gap-4 pt-24 text-center">
        <p className="font-medium">Channel not found.</p>
        <Link href="/" className="text-sm text-primary underline">
          Back to home
        </Link>
      </div>
    );
  }

  const info_ = info ?? null;
  const videos = videosQuery.data?.pages.flatMap((p) => p.videos) ?? [];

  return (
    <div>
      <Link
        href="/"
        data-testid="link-back-home"
        className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={16} /> Back
      </Link>

      {/* channel header */}
      <div className="mb-8 flex flex-wrap items-center gap-5">
        <ChannelAvatar name={info_?.name ?? "?"} url={info_?.avatar} size={96} />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold" data-testid="text-channel-name">
            {info_?.name ?? (videosQuery.isLoading ? "Loading channel…" : "Channel")}
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
            {info_?.handle && <span>{info_.handle}</span>}
            {info_?.subscriberCountText && <span>· {info_.subscriberCountText}</span>}
            {info_?.videoCountText && <span>· {info_.videoCountText}</span>}
          </p>
        </div>
        <a
          href={`https://www.youtube.com/channel/${id}`}
          target="_blank"
          rel="noopener noreferrer"
          data-testid="link-channel-youtube"
          className="flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-secondary"
        >
          <ExternalLink size={15} /> Open on YouTube
        </a>
      </div>

      <h2 className="mb-4 flex items-center gap-2 text-base font-semibold">
        <Users size={18} className="text-primary" /> Videos
      </h2>

      {videosQuery.isLoading ? (
        <VideoGridSkeleton />
      ) : videosQuery.isError ? (
        <p className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Couldn't load this channel's videos. {(videosQuery.error as Error).message}
        </p>
      ) : videos.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          No public videos found for this channel.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {videos.map((v) => (
              <VideoCard key={v.videoId} video={v} />
            ))}
          </div>
          {videosQuery.hasNextPage && (
            <div className="mt-10 flex justify-center">
              <button
                data-testid="button-load-more"
                onClick={() => videosQuery.fetchNextPage()}
                disabled={videosQuery.isFetchingNextPage}
                className="rounded-full bg-secondary px-6 py-2.5 text-sm font-semibold hover:brightness-110 disabled:opacity-50"
              >
                {videosQuery.isFetchingNextPage ? "Loading…" : "Load more videos"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
