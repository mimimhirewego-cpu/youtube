import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";

const sqlite = new Database("data.db");
sqlite.pragma("journal_mode = WAL");

// Create the saved-videos table on boot — no migration step needed.
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS saved_videos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    visitor_id TEXT NOT NULL,
    video_id TEXT NOT NULL,
    title TEXT NOT NULL,
    channel_id TEXT,
    channel_title TEXT NOT NULL DEFAULT '',
    thumbnail TEXT NOT NULL,
    view_count_text TEXT,
    duration_text TEXT,
    published_text TEXT,
    saved_at INTEGER NOT NULL
  );
`);
sqlite.exec(
  "CREATE UNIQUE INDEX IF NOT EXISTS saved_visitor_video_uniq ON saved_videos (visitor_id, video_id);",
);

export const db = drizzle(sqlite);
