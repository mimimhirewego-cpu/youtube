import { Link, useLocation } from "wouter";
import { Bookmark, BookmarkCheck } from "lucide-react";
import type { YtVideo } from "@shared/schema";
import { useSavedVideos, useToggleSave } from "@/hooks/use-saved";
import { setSeed } from "@/lib/seed";
import { cn } from "@/lib/utils";

export type VideoLike = Partial<YtVideo> & { videoId: string };

export function ChannelAvatar({ name, url, size = 36 }: { name: string; url?: string | null; size?: number }) {
  const hues = [358, 210, 262, 150, 20, 190, 40, 320];
  const hue = hues[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % hues.length];
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        width={size}
        height={size}
        className="rounded-full object-cover shrink-0"
        style={{ width: size, height: size }}
        loading="lazy"
        referrerPolicy="no-referrer"
      />
    );
  }
  return (
    <div
      aria-hidden
      className="rounded-full flex items-center justify-center font-semibold text-white shrink-0"
      style={{
        width: size,
        height: size,
        background: `hsl(${hue} 55% 45%)`,
        fontSize: Math.round(size / 2.4),
      }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function SaveButton({ video, className }: { video: VideoLike; className?: string }) {
  const { data: saved } = useSavedVideos();
  const toggle = useToggleSave();
  const isSaved = !!saved?.some((s) => s.videoId === video.videoId);
  return (
    <button
      data-testid={`button-save-${video.videoId}`}
      aria-label={isSaved ? "Remove from saved" : "Save video"}
      title={isSaved ? "Remove from saved" : "Save to shelf"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle.mutate({ video, save: !isSaved });
      }}
      className={cn(
        "absolute bottom-1.5 right-1.5 z-10 rounded-md bg-black/70 text-white p-1.5 hover:bg-black transition-colors",
        className,
      )}
    >
      {isSaved ? <BookmarkCheck size={16} className="text-red-400" /> : <Bookmark size={16} />}
    </button>
  );
}

export function VideoCard({ video }: { video: VideoLike }) {
  const [, navigate] = useLocation();
  const thumb = video.thumbnail ?? `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`;
  const meta = [video.viewCountText, video.publishedText].filter(Boolean).join(" · ");

  const open = () => {
    setSeed(video);
    navigate(`/watch/${video.videoId}`);
  };

  return (
    <article
      data-testid={`card-video-${video.videoId}`}
      role="link"
      tabIndex={0}
      aria-label={video.title}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          open();
        }
      }}
      className="block group cursor-pointer"
    >
      <div className="relative overflow-hidden rounded-xl bg-card aspect-video">
        <img
          src={thumb}
          alt={video.title ?? "Video thumbnail"}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
        {video.lengthText && (
          <span className="absolute bottom-1.5 left-1.5 rounded bg-black/80 px-1.5 py-0.5 text-xs font-medium text-white tabular-nums">
            {video.lengthText}
          </span>
        )}
        <SaveButton video={video} />
      </div>
      <div className="flex gap-3 pt-3">
        {video.channelId ? (
          <Link
            href={`/channel/${video.channelId}`}
            onClick={(e) => e.stopPropagation()}
            className="shrink-0"
            aria-label={`Go to ${video.channelTitle}`}
          >
            <ChannelAvatar name={video.channelTitle || "?"} />
          </Link>
        ) : (
          <ChannelAvatar name={video.channelTitle || "?"} />
        )}
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground" title={video.title}>
            {video.title}
          </h3>
          <p className="mt-1 truncate text-xs text-muted-foreground">{video.channelTitle}</p>
          {meta && <p className="truncate text-xs text-muted-foreground">{meta}</p>}
        </div>
      </div>
    </article>
  );
}

export function CompactVideoCard({ video }: { video: VideoLike }) {
  const [, navigate] = useLocation();
  const thumb = video.thumbnail ?? `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`;
  const meta = [video.viewCountText, video.publishedText].filter(Boolean).join(" · ");
  return (
    <div
      data-testid={`card-compact-${video.videoId}`}
      role="link"
      tabIndex={0}
      aria-label={video.title}
      onClick={() => {
        setSeed(video);
        navigate(`/watch/${video.videoId}`);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setSeed(video);
          navigate(`/watch/${video.videoId}`);
        }
      }}
      className="flex gap-2 rounded-lg p-1.5 hover:bg-card transition-colors cursor-pointer"
    >
      <div className="relative w-40 shrink-0 overflow-hidden rounded-lg bg-card aspect-video">
        <img
          src={thumb}
          alt={video.title ?? "Video thumbnail"}
          className="h-full w-full object-cover"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
        {video.lengthText && (
          <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 py-0.5 text-[11px] font-medium text-white tabular-nums">
            {video.lengthText}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1 py-0.5">
        <h3 className="line-clamp-2 text-[13px] font-medium leading-snug">{video.title}</h3>
        <p className="mt-1 truncate text-xs text-muted-foreground">{video.channelTitle}</p>
        {meta && <p className="truncate text-xs text-muted-foreground">{meta}</p>}
      </div>
    </div>
  );
}

export function VideoGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="aspect-video w-full rounded-xl bg-card" />
          <div className="mt-3 flex gap-3">
            <div className="h-9 w-9 rounded-full bg-card" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 w-full rounded bg-card" />
              <div className="h-3 w-3/5 rounded bg-card" />
              <div className="h-3 w-2/5 rounded bg-card" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
