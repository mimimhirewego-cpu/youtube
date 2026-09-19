import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Flame, RotateCw } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { VideoCard, VideoGridSkeleton } from "@/components/video-card";
import { cn } from "@/lib/utils";
import type { YtVideo } from "@shared/schema";

const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "music", label: "Music" },
  { id: "gaming", label: "Gaming" },
  { id: "news", label: "News" },
  { id: "sports", label: "Sports" },
  { id: "trailers", label: "Trailers" },
  { id: "comedy", label: "Comedy" },
  { id: "tech", label: "Tech" },
];

export default function Home() {
  const [category, setCategory] = useState("all");

  const { data, isLoading, error, refetch, isRefetching } = useQuery<{ videos: YtVideo[] }>({
    queryKey: ["/api/trending", category],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/trending?category=${encodeURIComponent(category)}`);
      return res.json();
    },
    staleTime: 10 * 60 * 1000,
  });

  const videos = data?.videos ?? [];

  return (
    <div>
      {/* category chips, YouTube style */}
      <div className="sticky top-14 z-30 -mx-4 mb-5 flex gap-3 overflow-x-auto bg-background/95 px-4 py-3 no-scrollbar sm:-mx-6 sm:px-6 backdrop-blur supports-[backdrop-filter]:bg-background/85">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            data-testid={`chip-${c.id}`}
            onClick={() => setCategory(c.id)}
            className={cn(
              "whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              category === c.id
                ? "bg-foreground text-background"
                : "bg-secondary text-foreground hover:brightness-110",
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="mb-5 flex items-center gap-2 text-sm text-muted-foreground">
        <Flame size={16} className="text-primary" />
        <span>
          {category === "all"
            ? "Trending now — the most-watched fresh uploads on YouTube"
            : `Trending in ${CATEGORIES.find((c) => c.id === category)?.label}`}
        </span>
      </div>

      {isLoading || isRefetching ? (
        <VideoGridSkeleton />
      ) : error ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-12 text-center">
          <p className="font-medium">Couldn't load trending videos right now.</p>
          <p className="text-sm text-muted-foreground">{(error as Error).message}</p>
          <button
            data-testid="button-retry-trending"
            onClick={() => refetch()}
            className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            <RotateCw size={16} /> Try again
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {videos.map((v) => (
            <VideoCard key={v.videoId} video={v} />
          ))}
        </div>
      )}
    </div>
  );
}
