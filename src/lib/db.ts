import { createClient, type Client, type InArgs, type InStatement, type ResultSet } from "@libsql/client";
import fs from "node:fs";
import path from "node:path";
import { extractSortableDate, parseReplyReference } from "@/lib/parseZoomChat";

// No TURSO_DATABASE_URL -> use a local file, so dev needs no Turso account at
// all. Production supplies real Turso credentials via env vars.
const url = process.env.TURSO_DATABASE_URL ?? "file:./data/app.db";

if (!process.env.TURSO_DATABASE_URL) {
  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __zoomChatClient: Client | undefined;
}

// Reuse a single client across hot-reloads in dev, same as before.
export const client: Client =
  global.__zoomChatClient ?? createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
if (process.env.NODE_ENV !== "production") {
  global.__zoomChatClient = client;
}

// `execute()` runs every statement on its own logical connection, so a
// standalone `PRAGMA foreign_keys = ON` here would not reliably apply to
// later calls against a remote Turso database (unlike batch()/transaction(),
// which do share one connection for their whole lifetime). So cascading
// deletes are done explicitly in application code (see repo.ts) rather than
// relied on via FK constraints - the schema's ON DELETE CASCADE/SET NULL
// clauses are kept for documentation and for local file: mode, but nothing
// depends on them actually firing.
function rowsToObjects<T>(rs: ResultSet): T[] {
  return rs.rows.map((row) => {
    const obj: Record<string, unknown> = {};
    for (const col of rs.columns) obj[col] = row[col];
    return obj as T;
  });
}

export async function queryAll<T>(sql: string, args: InArgs = []): Promise<T[]> {
  await ensureMigrated();
  const rs = await client.execute({ sql, args });
  return rowsToObjects<T>(rs);
}

export async function queryOne<T>(sql: string, args: InArgs = []): Promise<T | undefined> {
  const rows = await queryAll<T>(sql, args);
  return rows[0];
}

export async function run(
  sql: string,
  args: InArgs = []
): Promise<{ lastInsertRowid: number; rowsAffected: number }> {
  await ensureMigrated();
  const rs = await client.execute({ sql, args });
  return { lastInsertRowid: Number(rs.lastInsertRowid ?? 0), rowsAffected: rs.rowsAffected };
}

// Runs a group of statements atomically on a single connection. Use this
// (not sequential run() calls) for anything that depends on cascading
// deletes, since a shared connection is exactly what batch() guarantees.
export async function batch(stmts: InStatement[]): Promise<void> {
  await ensureMigrated();
  if (stmts.length === 0) return;
  await client.batch(stmts, "write");
}

async function hasColumn(table: string, column: string): Promise<boolean> {
  const cols = await queryAllRaw<{ name: string }>(`PRAGMA table_info(${table})`);
  return cols.some((c) => c.name === column);
}

// Bypasses ensureMigrated() (unlike the exported queryAll) since these run
// from inside migrate() itself, before migration is marked complete.
async function queryAllRaw<T>(sql: string, args: InArgs = []): Promise<T[]> {
  const rs = await client.execute({ sql, args });
  return rowsToObjects<T>(rs);
}
async function runRaw(sql: string, args: InArgs = []): Promise<void> {
  await client.execute({ sql, args });
}

async function backfillChatDates(): Promise<void> {
  const chats = await queryAllRaw<{ id: number; uploaded_at: string }>(
    "SELECT id, uploaded_at FROM chats WHERE chat_date IS NULL"
  );
  if (chats.length === 0) return;

  for (const chat of chats) {
    const first = await queryAllRaw<{ timestamp_raw: string }>(
      "SELECT timestamp_raw FROM messages WHERE chat_id = ? ORDER BY seq ASC LIMIT 1",
      [chat.id]
    );
    const derived = first[0] ? extractSortableDate(first[0].timestamp_raw) : null;
    await runRaw("UPDATE chats SET chat_date = ? WHERE id = ?", [
      derived ?? chat.uploaded_at,
      chat.id,
    ]);
  }
}

// Reply linking only used to happen at upload time, so chats saved before
// that feature existed have raw "Replying to "..."" text but no
// reply_to_message_id. This resolves any message still in that state,
// scoped per chat so a quote never matches a message from another chat.
async function backfillReplyThreads(): Promise<void> {
  const chatIds = await queryAllRaw<{ chat_id: number }>(
    `SELECT DISTINCT chat_id FROM messages
     WHERE reply_to_message_id IS NULL AND body LIKE 'Replying to "%'`
  );
  if (chatIds.length === 0) return;

  for (const { chat_id } of chatIds) {
    const rows = await queryAllRaw<{ id: number; body: string }>(
      "SELECT id, body FROM messages WHERE chat_id = ? ORDER BY seq ASC",
      [chat_id]
    );
    const bodies = rows.map((r) => r.body);

    for (let i = 0; i < rows.length; i++) {
      const parsed = parseReplyReference(bodies[i]);
      if (!parsed) continue;

      for (let j = i - 1; j >= 0; j--) {
        if (bodies[j].startsWith(parsed.snippet)) {
          bodies[i] = parsed.rest;
          await runRaw("UPDATE messages SET body = ?, reply_to_message_id = ? WHERE id = ?", [
            parsed.rest,
            rows[j].id,
            rows[i].id,
          ]);
          break;
        }
      }
    }
  }
}

const schema = fs.readFileSync(path.join(process.cwd(), "src", "lib", "schema.sql"), "utf-8");

// Applied on every module load; each step is guarded so it's a no-op once
// already applied. Memoized so every exported query waits for it exactly
// once, regardless of import order - safer than relying on top-level await.
let migratedPromise: Promise<void> | null = null;

function ensureMigrated(): Promise<void> {
  if (!migratedPromise) {
    migratedPromise = migrate();
  }
  return migratedPromise;
}

async function migrate(): Promise<void> {
  await client.executeMultiple(schema);

  if (!(await hasColumn("chats", "chat_date"))) {
    await runRaw("ALTER TABLE chats ADD COLUMN chat_date TEXT");
  }
  // Runs independently of the ALTER above (and every load) so any chat left
  // with a null chat_date - e.g. from a prior migration attempt that didn't
  // finish - gets backfilled instead of staying null forever.
  await backfillChatDates();

  if (!(await hasColumn("messages", "reply_to_message_id"))) {
    await runRaw(
      "ALTER TABLE messages ADD COLUMN reply_to_message_id INTEGER REFERENCES messages(id) ON DELETE SET NULL"
    );
  }
  await backfillReplyThreads();

  if (!(await hasColumn("tags", "scope"))) {
    // migrate() batches these on one connection with foreign_keys off/on
    // wrapped around it, which is exactly what this rebuild needs.
    await client.migrate([
      `CREATE TABLE tags_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        color TEXT NOT NULL DEFAULT '#6366f1',
        scope TEXT NOT NULL DEFAULT 'chat' CHECK (scope IN ('chat', 'message')),
        UNIQUE (name, scope)
      )`,
      // Existing installs only ever had one shared tag pool; treat it as
      // chat-scoped since that's how tags were first introduced in the UI.
      `INSERT INTO tags_new (id, name, color, scope) SELECT id, name, color, 'chat' FROM tags`,
      `DROP TABLE tags`,
      `ALTER TABLE tags_new RENAME TO tags`,
    ]);
  }

  await runRaw("CREATE INDEX IF NOT EXISTS idx_chats_chat_date ON chats(chat_date)");

  if (!(await hasColumn("chats", "reviewed"))) {
    await runRaw("ALTER TABLE chats ADD COLUMN reviewed INTEGER NOT NULL DEFAULT 0");
  }
  if (!(await hasColumn("chats", "notes"))) {
    await runRaw("ALTER TABLE chats ADD COLUMN notes TEXT");
  }
  if (!(await hasColumn("messages", "connected"))) {
    await runRaw("ALTER TABLE messages ADD COLUMN connected INTEGER NOT NULL DEFAULT 0");
  }
  if (!(await hasColumn("messages", "low_value_dismissed"))) {
    await runRaw("ALTER TABLE messages ADD COLUMN low_value_dismissed INTEGER NOT NULL DEFAULT 0");
  }
}

// App-level export used by /api/backup: there's no local file to copy when
// running against a remote Turso database (and Vercel's filesystem is
// ephemeral anyway), so this dumps every table as JSON instead.
const BACKUP_TABLES = ["chats", "tags", "chat_tags", "messages", "message_tags"] as const;

export async function exportAllTables(): Promise<Record<string, unknown[]>> {
  await ensureMigrated();
  const dump: Record<string, unknown[]> = {};
  for (const table of BACKUP_TABLES) {
    dump[table] = await queryAllRaw(`SELECT * FROM ${table}`);
  }
  return dump;
}
