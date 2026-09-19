# VidVault

A YouTube-style web app: browse trending videos, search any YouTuber, watch
their full catalog, and save videos to your own shelf.

## What kind of app is this?

**React single-page application (SPA)** — exactly the React setup you want
for static hosting:

- **Frontend:** React 18 + TypeScript + Vite. Builds to plain static files
  (`dist/public`). Uses hash-based routing (`/#/watch/...`), so **any static
  host serves it with zero "page not found" errors** — no server rewrite
  rules needed.
- **Backend (data proxy):** a small Node/Express server (`server/`) that
  fetches public YouTube data (trending, search, channel videos, video
  metadata) using YouTube's public InnerTube and oEmbed endpoints. The
  browser cannot call these directly — YouTube blocks cross-origin requests
  — so a tiny server-side proxy is required.
- **Saved videos:** stored server-side in SQLite when the backend is
  reachable, and automatically in the browser's localStorage when the app
  runs fully static. Works both ways with no login.
- **Video playback:** always YouTube's official embedded player plus a
  "Watch on YouTube" link. Nothing is downloaded or rehosted.

## Local development

```bash
npm install
npm run dev        # serves the app + API on http://localhost:5000
```

Production build:

```bash
npm run build              # static site → dist/public, server → dist/index.cjs
npm start                  # serve both from one port
```

## Deploying on Appwrite — the easy way (one upload, no settings)

The whole app — site **and** API — ships inside a **single Appwrite Function**.
No env vars, no build commands, no separate Site. Just one upload:

1. Download **`appwrite-function.tar.gz`** from this repo (it is committed,
   ready to use — no build needed).
2. In the [Appwrite Console](https://cloud.appwrite.io): create a project,
   then **Functions → Create function**.
3. Pick a name, choose **Node.js 20+ (or newer)** runtime.
4. Deploy by archive: upload `appwrite-function.tar.gz`, entrypoint
   **`src/main.js`**.
5. In the function's **Settings → Permissions**, set **Execute access** to
   **Any**.
6. Open the function's **domain** (e.g. `https://xxxx.fra.appwrite.run`) —
   that's your live site. Trending, search, channels and the player all work
   from that one URL.

That's it. The bundle is a single self-contained file (no dependencies to
install), it serves the app for every non-API path and answers `/api/*`
itself, and saved videos are kept in each visitor's browser localStorage.

If you edit the code, rebuild the archive with:

```bash
npm run build:function   # → appwrite/function/ + appwrite-function.tar.gz
```

### Why a function at all?

Browsers cannot ask YouTube directly for trending/search data — YouTube
blocks cross-origin requests — so a small server is unavoidable. Embedding
the player itself is easy anywhere; the data calls need this one function.

### Alternative: Site + separate API function

You can also host the static site on Appwrite Sites (connect this repo,
framework React, install `npm install`, build `npm run build:site`, output
`./dist/public`) — but then you must add the env var
`VITE_API_BASE = <your function domain>` and `VITE_SAVE_MODE = local` in the
Site's settings, and deploy the same function for the API. The one-upload
method above avoids all of that.

## Push this repo to GitHub

The code lives at
[github.com/mimimhirewego-cpu/youtube](https://github.com/mimimhirewego-cpu/youtube).
To push your own copy:

```bash
git remote add origin https://github.com/<you>/youtube.git
git push -u origin main
```

## Project structure

```
client/     React SPA (pages, components, hooks)
server/      Express API + YouTube data service (InnerTube / oEmbed)
shared/      Types shared by client and server
appwrite/    All-in-one Appwrite Function (site + API in one deployment)
script/     Build scripts (build-function.ts makes the upload archive)
```

VidVault is a fan-made browser and is not affiliated with YouTube. All
videos play through YouTube's official player.
