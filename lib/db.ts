import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "cheezefilm.db");

// Cache the instance across hot reloads in dev and serverless reuse
declare global {
  // eslint-disable-next-line no-var
  var __cheezeDb: Database.Database | undefined;
}

function createDb(): Database.Database {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const conn = new Database(DB_PATH);
  conn.pragma("journal_mode = WAL");
  conn.pragma("foreign_keys = ON");
  conn.pragma("busy_timeout = 5000");

  conn.exec(`
    CREATE TABLE IF NOT EXISTS auditions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      age INTEGER,
      gender TEXT,
      phone TEXT,
      email TEXT NOT NULL,
      experience TEXT,
      role_preference TEXT,
      intro TEXT NOT NULL,
      portfolio_url TEXT,
      photo_url TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS fan_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nickname TEXT NOT NULL,
      email TEXT,
      favorite_work TEXT,
      message TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS site_content (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS members (
      slug TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      name_en TEXT NOT NULL DEFAULT '',
      role TEXT NOT NULL DEFAULT 'actor',
      role_label TEXT NOT NULL DEFAULT '',
      highlight TEXT NOT NULL DEFAULT '',
      bio TEXT NOT NULL DEFAULT '',
      works TEXT NOT NULL DEFAULT '[]',
      joined_note TEXT,
      instagram TEXT,
      source_url TEXT,
      accent TEXT NOT NULL DEFAULT 'purple',
      uncertain INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_members_sort ON members(sort_order ASC);

    CREATE INDEX IF NOT EXISTS idx_auditions_created ON auditions(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_fan_messages_created ON fan_messages(created_at DESC);
  `);

  // Forward-migrate older databases that pre-date the photo_url column.
  // sqlite-style "ADD COLUMN IF NOT EXISTS" needs introspection.
  type ColInfo = { name: string };
  const cols = conn
    .prepare("PRAGMA table_info(auditions)")
    .all() as ColInfo[];
  if (!cols.some((c) => c.name === "photo_url")) {
    conn.exec("ALTER TABLE auditions ADD COLUMN photo_url TEXT");
  }

  return conn;
}

/**
 * Lazy-initialized SQLite connection.
 *
 * Build-time "collecting page data" launches many workers that all import this
 * module. If we opened the DB at module evaluation we'd thrash the WAL setup
 * with concurrent writers and hit SQLITE_BUSY. By deferring the open until the
 * first real query, only routes that actually query the DB pay for it.
 */
export function getDb(): Database.Database {
  if (!globalThis.__cheezeDb) {
    globalThis.__cheezeDb = createDb();
  }
  return globalThis.__cheezeDb;
}

// Proxy that defers connection until first property access.
export const db = new Proxy({} as Database.Database, {
  get(_target, prop, receiver) {
    const real = getDb();
    const value = Reflect.get(real, prop, receiver);
    return typeof value === "function" ? value.bind(real) : value;
  },
});

export type Audition = {
  id: number;
  name: string;
  age: number | null;
  gender: string | null;
  phone: string | null;
  email: string;
  experience: string | null;
  role_preference: string | null;
  intro: string;
  portfolio_url: string | null;
  photo_url: string | null;
  status: "pending" | "reviewing" | "accepted" | "rejected";
  created_at: string;
};

export type FanMessage = {
  id: number;
  nickname: string;
  email: string | null;
  favorite_work: string | null;
  message: string;
  is_read: number;
  created_at: string;
};
