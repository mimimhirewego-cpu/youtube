import { Link } from "wouter";
import { Bookmark, Trash2 } from "lucide-react";
import { useSavedVideos, useToggleSave } from "@/hooks/use-saved";
import { VideoGridSkeleton } from "@/components/video-card";

export default function Saved() {
  const { data: saved, isLoading, error } = useSavedVideos();
  const toggle = useToggleSave();

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold">Saved videos</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Your shelf — videos you saved while browsing. Click a card to watch it here.
      </p>

      {isLoading ? (
        <VideoGridSkeleton />
      ) : error ? (
        <p className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Couldn't load your saved videos. {(error as Error).message}
        </p>
      ) : !saved || saved.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border bg-card p-16 text-center">
          <Bookmark size={40} className="text-muted-foreground" />
          <p className="font-medium">Nothing saved yet</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Tap the bookmark icon on any video to keep it here — then watch it any time, inside VidVault or on YouTube.
          </p>
          <Link
            href="/"
            className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
          >
            Browse trending videos
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {saved.map((s) => (
            <div key={s.videoId} className="group">
              <Link href={`/watch/${s.videoId}`} data-testid={`card-saved-${s.videoId}`} className="block">
                <div className="relative overflow-hidden rounded-xl bg-card aspect-video">
                  <img
                    src={s.thumbnail}
                    alt={s.title}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                  {s.durationText && (
                    <span className="absolute bottom-1.5 left-1.5 rounded bg-black/80 px-1.5 py-0.5 text-xs font-medium text-white tabular-nums">
                      {s.durationText}
                    </span>
                  )}
                </div>
              </Link>
              <div className="flex items-start justify-between gap-2 pt-3">
                <Link href={`/watch/${s.videoId}`} className="min-w-0 flex-1">
                  <h3 className="line-clamp-2 text-sm font-semibold leading-snug">{s.title}</h3>
                  <p className="mt-1 truncate text-xs text-muted-foreground">{s.channelTitle}</p>
                  {s.viewCountText && <p className="truncate text-xs text-muted-foreground">{s.viewCountText}</p>}
                </Link>
                <button
                  data-testid={`button-remove-${s.videoId}`}
                  onClick={() => toggle.mutate({ video: s, save: false })}
                  aria-label={`Remove ${s.title} from saved`}
                  title="Remove from saved"
                  className="mt-1 rounded-full p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
