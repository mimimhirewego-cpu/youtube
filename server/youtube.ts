// YouTube data service — talks to YouTube's public innerTube API (the same
// JSON API youtube.com itself uses) plus the public oEmbed endpoint.
// No API key required, no video streams are downloaded or rehosted.
import type { YtVideo, YtChannel, YtChannelInfo } from "@shared/schema";

const INNERTUBE_KEY = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y8tSsav0w";
const CLIENT = {
  clientName: "WEB",
  clientVersion: "2.20240702.01.00",
  hl: "en",
  gl: "US",
};
// "Most viewed · uploaded this week · type: video" search filter.
const SP_WEEK_VIEWS = "CAMSBAgDEAE=";

const FETCH_TIMEOUT = 15000;

async function innertube<T>(endpoint: string, body: Record<string, unknown>): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT);
  try {
    const res = await fetch(
      `https://www.youtube.com/youtubei/v1/${endpoint}?key=${INNERTUBE_KEY}&prettyPrint=false`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context: { client: CLIENT }, ...body }),
        signal: ctrl.signal,
      },
    );
    if (!res.ok) throw new Error(`innertube ${endpoint} -> ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

/** Recursively collect every object that satisfies pred. */
function walk(obj: unknown, pred: (o: Record<string, unknown>) => boolean, out: Record<string, unknown>[] = []) {
  if (obj && typeof obj === "object") {
    const rec = obj as Record<string, unknown>;
    if (pred(rec)) out.push(rec);
    for (const v of Object.values(rec)) walk(v, pred, out);
  }
  return out;
}

function text(obj: unknown): string | null {
  if (!obj || typeof obj !== "object") return null;
  const o = obj as Record<string, unknown>;
  if (typeof o.simpleText === "string") return o.simpleText;
  if (Array.isArray(o.runs) && o.runs.length > 0) {
    const r = o.runs[0] as Record<string, unknown>;
    if (typeof r.text === "string") return r.text;
  }
  if (typeof o.content === "string") return o.content;
  return null;
}

function pickThumb(node: unknown): string | null {
  const thumbs = (node as { thumbnails?: { url: string; width: number }[] } | null)?.thumbnails;
  if (!Array.isArray(thumbs) || thumbs.length === 0) return null;
  const best = thumbs.reduce((a, b) => (b.width > a.width ? b : a));
  return best.url;
}

function parseVideoRenderer(r: Record<string, unknown>): YtVideo | null {
  const videoId = r.videoId;
  if (typeof videoId !== "string" || videoId.length !== 11) return null;
  const title = text(r.title);
  if (!title) return null;
  let channelId: string | null = null;
  let channelTitle = "";
  const owner = r.ownerText as Record<string, unknown> | undefined;
  if (owner) {
    channelTitle = text(owner) ?? "";
    const runs = (owner as { runs?: Record<string, unknown>[] }).runs;
    if (runs && runs[0]) {
      const nav = runs[0].navigationEndpoint as Record<string, unknown> | undefined;
      const bep = nav?.browseEndpoint as Record<string, unknown> | undefined;
      if (typeof bep?.browseId === "string") channelId = bep.browseId;
    }
  }
  if (!channelId) {
    const short = r.shortBylineText as Record<string, unknown> | undefined;
    if (short) channelTitle = text(short) ?? channelTitle;
  }
  return {
    videoId,
    title,
    channelId,
    channelTitle,
    viewCountText: text(r.viewCountText),
    publishedText: text(r.publishedTimeText),
    lengthText: text(r.lengthText),
    thumbnail: pickThumb(r.thumbnail),
  };
}

// ---------- search ----------

export async function searchYouTube(
  query: string,
  opts: { channelsOnly?: boolean; viewsThisWeek?: boolean } = {},
): Promise<{ videos: YtVideo[]; channels: YtChannel[] }> {
  const body: Record<string, unknown> = { query };
  if (opts.viewsThisWeek) body.params = SP_WEEK_VIEWS;
  const data = (await innertube("search", body)) as unknown;

  const videos: YtVideo[] = [];
  const seen = new Set<string>();
  if (!opts.channelsOnly) {
    for (const r of walk(data, (o) => typeof o.videoId === "string" && !!o.title && !!o.viewCountText)) {
      const v = parseVideoRenderer(r);
      if (v && !seen.has(v.videoId)) {
        seen.add(v.videoId);
        videos.push(v);
      }
    }
  }

  const channels: YtChannel[] = [];
  const seenCh = new Set<string>();
  for (const r of walk(data, (o) => typeof o.channelId === "string" && String(o.channelId).startsWith("UC") && !!o.title && !!o.thumbnail)) {
    const channelId = r.channelId as string;
    if (seenCh.has(channelId)) continue;
    seenCh.add(channelId);
    channels.push({
      channelId,
      title: text(r.title) ?? "",
      handle: null,
      avatar: pickThumb(r.thumbnail),
      subscriberCountText: text(r.subscriberCountText),
      videoCountText: text(r.videoCountText),
      description: text(r.descriptionSnippet),
    });
  }
  return { videos, channels };
}

// ---------- trending (most-viewed fresh uploads across categories) ----------

const TRENDING_CATEGORIES: Record<string, string> = {
  all: "",
  music: "music",
  gaming: "gaming",
  news: "news",
  sports: "sports highlights",
  trailers: "trailer",
  comedy: "comedy",
  tech: "tech",
};

const trendingCache = new Map<string, { at: number; videos: YtVideo[] }>();
const TRENDING_TTL = 10 * 60 * 1000;

export async function getTrending(category = "all"): Promise<YtVideo[]> {
  const cat = category in TRENDING_CATEGORIES ? category : "all";
  const cached = trendingCache.get(cat);
  if (cached && Date.now() - cached.at < TRENDING_TTL) return cached.videos;

  const queries = cat === "all"
    ? ["music", "gaming", "news", "sports highlights", "trailer", "viral"]
    : [TRENDING_CATEGORIES[cat], `${TRENDING_CATEGORIES[cat]} highlights`];

  const results = await Promise.allSettled(
    queries.map((q) => searchYouTube(q, { viewsThisWeek: true }).then((r) => r.videos)),
  );

  const byId = new Map<string, YtVideo>();
  for (const res of results) {
    if (res.status !== "fulfilled") continue;
    for (const v of res.value) if (!byId.has(v.videoId)) byId.set(v.videoId, v);
  }
  const parseViews = (t: string | null): number => {
    const m = t?.replace(/,/g, "").match(/([\d.]+)([KM]?)/);
    if (!m) return 0;
    const n = parseFloat(m[1]);
    return m[2] === "M" ? n * 1e6 : m[2] === "K" ? n * 1e3 : n;
  };
  let videos = [...byId.values()].filter((v) => v.thumbnail);
  videos = videos.sort((a, b) => parseViews(b.viewCountText) - parseViews(a.viewCountText));
  if (videos.length === 0) throw new Error("Trending is unavailable right now — please try again shortly.");
  trendingCache.set(cat, { at: Date.now(), videos });
  return videos;
}

// ---------- channel info + paginated channel videos ----------

const channelInfoCache = new Map<string, YtChannelInfo>();

export async function getChannelInfo(channelId: string): Promise<YtChannelInfo> {
  const cached = channelInfoCache.get(channelId);
  if (cached) return cached;
  const data = (await innertube("browse", { browseId: channelId })) as unknown;
  const s = JSON.stringify(data);
  const pageTitle = (data as { header?: { pageHeaderRenderer?: { pageTitle?: string } } })
    .header?.pageHeaderRenderer?.pageTitle;
  const name: string | undefined =
    typeof pageTitle === "string" ? pageTitle : undefined;
  const handle = s.match(/"content":"(@[\w.-]+)"/)?.[1] ?? null;
  const info: YtChannelInfo = {
    channelId,
    name: name ?? "Channel",
    handle,
    avatar: s.match(/"decoratedAvatarViewModel".{0,400}?"url":"(https:[^"]+)"/s)?.[1] ?? null,
    subscriberCountText: s.match(/"content":"([\d.,KM]+\s?subscribers)"/)?.[1] ?? null,
    videoCountText: s.match(/"content":"([\d.,KM]+\s?videos)"/)?.[1] ?? null,
  };
  channelInfoCache.set(channelId, info);
  return info;
}

interface ChannelPage {
  videos: YtVideo[];
  nextToken: string | null;
}

export async function getChannelVideos(channelId: string, continuation?: string): Promise<ChannelPage> {
  const body: Record<string, unknown> = continuation
    ? { continuation }
    : { browseId: channelId, params: "EgZ2aWRlb3PyBgQKAjoA" }; // "Videos" tab
  const data = (await innertube("browse", body)) as unknown;

  const videos: YtVideo[] = [];
  const seen = new Set<string>();
  for (const r of walk(data, (o) => typeof o.videoId === "string" && !!o.title && !!o.lengthText)) {
    const v = parseVideoRenderer(r);
    if (v && !seen.has(v.videoId)) {
      seen.add(v.videoId);
      videos.push(v);
    }
  }

  let nextToken: string | null = null;
  const conts = walk(data, (o) => !!o.continuationCommand);
  for (const c of conts) {
    const cmd = (c as { continuationCommand?: { token?: string } }).continuationCommand;
    if (cmd && typeof cmd.token === "string") {
      nextToken = cmd.token;
      break;
    }
  }
  return { videos, nextToken };
}

// ---------- single video (for watch page) ----------

export async function getVideoInfo(videoId: string): Promise<{
  videoId: string;
  title: string | null;
  authorName: string | null;
  channelId: string | null;
  thumbnail: string | null;
}> {
  // oEmbed is public, key-free and reliable for basic metadata.
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}&format=json`,
      { signal: AbortSignal.timeout(FETCH_TIMEOUT) },
    );
    if (res.ok) {
      const d = (await res.json()) as {
        title?: string;
        author_name?: string;
        author_url?: string;
        thumbnail_url?: string;
      };
      // author_url is like https://www.youtube.com/@handle — resolve its channel id.
      let channelId: string | null = null;
      const handle = d.author_url?.match(/@([\w.-]+)/)?.[1];
      if (handle) {
        try {
          const { channels } = await searchYouTube(`@${handle}`, { channelsOnly: true });
          const match = channels.find((c) => c.handle === `@${handle}`) ?? channels[0];
          if (match) channelId = match.channelId;
        } catch {
          // channel resolution is best-effort
        }
      }
      return {
        videoId,
        title: d.title ?? null,
        authorName: d.author_name ?? null,
        channelId,
        thumbnail: d.thumbnail_url ?? null,
      };
    }
  } catch {
    // fall through
  }
  return { videoId, title: null, authorName: null, channelId: null, thumbnail: null };
}
