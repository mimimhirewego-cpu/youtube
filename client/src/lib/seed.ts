import type { YtVideo } from "@shared/schema";

/**
 * Lightweight "seed" store: when the user clicks a video card we already have
 * all its metadata, so stash it here before navigating to the watch page.
 * The watch page merges this with fresh data from the API, and gracefully
 * works without it when the URL is loaded directly.
 */
let seed: Partial<YtVideo> | null = null;

export function setSeed(video: Partial<YtVideo>) {
  seed = video;
}

export function takeSeed(): Partial<YtVideo> | null {
  return seed;
}
