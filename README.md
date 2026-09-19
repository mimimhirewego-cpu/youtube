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

## Deploying on Appwrite

Appwrite Sites hosts the **static React build**, and an **Appwrite Function**
provides the YouTube data API (Appwrite Sites cannot run an Express server,
and browsers can't call YouTube's data API directly due to CORS).

### Settings cheat-sheet

**Function** (create first — you need its domain for the site build):

| Setting | Value |
|---|---|
| Runtime | Node.js 20 or newer |
| Entrypoint | `src/main.js` |
| Execute access | **Any** (browsers must be able to call it) |
| Dependencies | none — the bundle is self-contained |

**Site** (connect your GitHub repo, then use these build settings):

| Setting | Value |
|---|---|
| Framework | React (or Other) |
| Install command | `npm install` |
| Build command | `npm run build:site` |
| Output directory | `./dist/public` |
| Env var 1 | `VITE_API_BASE` = your function domain, e.g. `https://xxxx.fra.appwrite.run` |
| Env var 2 | `VITE_SAVE_MODE` = `local` |
| Rendering | Static (no SSR needed — the app is a hash-routed SPA) |

### 1. Push this repo to GitHub

Create an empty GitHub repo and push:

```bash
git remote add origin https://github.com/<you>/vidvault.git
git push -u origin main
```

### 2. Create the API function (one-time)

```bash
npm run build:function     # bundles → appwrite/function/ (already committed, re-run after edits)
```

The bundle is dependency-free ESM (`export default`) with CORS handled
internally — no npm install needed inside the function.

Then in the [Appwrite Console](https://cloud.appwrite.io):

1. Create a project, then go to **Functions** → **Create function**.
2. Choose **Node.js 20+** runtime, manual upload.
3. Package and upload the function code:
   ```bash
   cd appwrite/function && tar --exclude code.tar.gz -czf code.tar.gz . && cd ../..
   ```
   Upload `appwrite/function/code.tar.gz` as the deployment, with entrypoint
   `src/main.js`.
4. In the function's **Settings → Permissions → Execute access**, set it to
   **Any** so browsers can call it.
5. Copy the function's **domain** (e.g. `https://xxxx.fra.appwrite.run`).

### 3. Create the Site

1. In the console, go to **Sites** → **Create site** → **Connect a
   repository** and pick this repo (this is where you connect GitHub).
2. Build settings:
   - **Framework:** React (or Other)
   - **Install command:** `npm install`
   - **Build command:** `npm run build:site`
   - **Output directory:** `./dist/public`
3. **Environment variables:**
   - `VITE_API_BASE = https://xxxx.fra.appwrite.run` — your function domain
     (bakes the API address into the static build)
   - `VITE_SAVE_MODE = local` — saves go to the browser's localStorage
     instead of calling the (nonexistent) saved-videos backend
4. Deploy. Deep links like `/#/saved` work out of the box — no 404s.

> Notes: saved videos on the Appwrite deployment are kept per browser in
> localStorage. The `server/` Express app is used for local development and
> Perplexity preview hosting; Appwrite only needs `dist/public` + the
> function.

## Project structure

```
client/     React SPA (pages, components, hooks)
server/      Express API + YouTube data service (InnerTube / oEmbed)
shared/      Types shared by client and server
appwrite/    Appwrite Function variant of the API (see above)
script/      Build scripts
```

VidVault is a fan-made browser and is not affiliated with YouTube. All
videos play through YouTube's official player.
