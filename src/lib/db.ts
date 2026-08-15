import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { extractSortableDate, parseReplyReference } from "@/lib/parseZoomChat";

const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, "app.db");

declare global {
  // eslint-disable-next-line no-var
  var __zoomChatDb: DatabaseSync | undefined;
}

function hasColumn(database: DatabaseSync, table: string, column: string): boolean {
  const cols = database.prepare(`PRAGMA table_info(${table})`).all() as Array<{
    name: string;
  }>;
  return cols.some((c) => c.name === column);
}

function backfillChatDates(database: DatabaseSync) {
  const chats = database
    .prepare("SELECT id, uploaded_at FROM chats WHERE chat_date IS NULL")
    .all() as Array<{ id: number; uploaded_at: string }>;
  if (chats.length === 0) return;

  const firstMessage = database.prepare(
    "SELECT timestamp_raw FROM messages WHERE chat_id = ? ORDER BY seq ASC LIMIT 1"
  );
  const setChatDate = database.prepare("UPDATE chats SET chat_date = ? WHERE id = ?");
  for (const chat of chats) {
    const first = firstMessage.get(chat.id) as { timestamp_raw: string } | undefined;
    const derived = first ? extractSortableDate(first.timestamp_raw) : null;
    setChatDate.run(derived ?? chat.uploaded_at, chat.id);
  }
}

// Reply linking only used to happen at upload time, so chats saved before
// that feature existed have raw "Replying to "..."" text but no
// reply_to_message_id. This resolves any message still in that state,
// scoped per chat so a quote never matches a message from another chat.
function backfillReplyThreads(database: DatabaseSync) {
  const chatIds = database
    .prepare(
      `SELECT DISTINCT chat_id FROM messages
       WHERE reply_to_message_id IS NULL AND body LIKE 'Replying to "%'`
    )
    .all() as Array<{ chat_id: number }>;
  if (chatIds.length === 0) return;

  const getMessages = database.prepare(
    "SELECT id, body FROM messages WHERE chat_id = ? ORDER BY seq ASC"
  );
  const updateMessage = database.prepare(
    "UPDATE messages SET body = ?, reply_to_message_id = ? WHERE id = ?"
  );

  for (const { chat_id } of chatIds) {
    const rows = getMessages.all(chat_id) as Array<{ id: number; body: string }>;
    const bodies = rows.map((r) => r.body);

    for (let i = 0; i < rows.length; i++) {
      const parsed = parseReplyReference(bodies[i]);
      if (!parsed) continue;

      for (let j = i - 1; j >= 0; j--) {
        if (bodies[j].startsWith(parsed.snippet)) {
          bodies[i] = parsed.rest;
          updateMessage.run(parsed.rest, rows[j].id, rows[i].id);
          break;
        }
      }
    }
  }
}

// The FTS5 tables are created empty by schema.sql on an upgrade (they didn't
// exist before), so an existing install needs its historical rows copied in
// once. Fresh installs have 0 rows on both sides and this is a no-op.
//
// external-content FTS5 tables proxy plain `COUNT(*)`/column reads through
// to the content table by rowid, so that always mirrors messages/chats and
// can't tell us whether the index itself has been populated. The `_docsize`
// shadow table has one row per row actually indexed, so it's the real signal.
function backfillFts(database: DatabaseSync) {
  const msgFtsCount = (
    database.prepare("SELECT COUNT(*) as c FROM messages_fts_docsize").get() as { c: number }
  ).c;
  const msgCount = (database.prepare("SELECT COUNT(*) as c FROM messages").get() as { c: number })
    .c;
  if (msgFtsCount === 0 && msgCount > 0) {
    database.exec(
      "INSERT INTO messages_fts(rowid, body, sender) SELECT id, body, sender FROM messages"
    );
  }

  const chatFtsCount = (
    database.prepare("SELECT COUNT(*) as c FROM chats_fts_docsize").get() as { c: number }
  ).c;
  const chatCount = (database.prepare("SELECT COUNT(*) as c FROM chats").get() as { c: number }).c;
  if (chatFtsCount === 0 && chatCount > 0) {
    database.exec("INSERT INTO chats_fts(rowid, title) SELECT id, title FROM chats");
  }
}

// Applied on every boot; each step is guarded so it's a no-op once already applied.
function migrate(database: DatabaseSync) {
  if (!hasColumn(database, "chats", "chat_date")) {
    database.exec("ALTER TABLE chats ADD COLUMN chat_date TEXT");
  }
  // Runs independently of the ALTER above (and every boot) so any chat left
  // with a null chat_date - e.g. from a prior migration attempt that didn't
  // finish - gets backfilled instead of staying null forever.
  backfillChatDates(database);

  if (!hasColumn(database, "messages", "reply_to_message_id")) {
    database.exec(
      "ALTER TABLE messages ADD COLUMN reply_to_message_id INTEGER REFERENCES messages(id) ON DELETE SET NULL"
    );
  }
  backfillReplyThreads(database);

  if (!hasColumn(database, "tags", "scope")) {
    database.exec("PRAGMA foreign_keys = OFF");
    database.exec("BEGIN");
    try {
      database.exec(`
        CREATE TABLE tags_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          color TEXT NOT NULL DEFAULT '#6366f1',
          scope TEXT NOT NULL DEFAULT 'chat' CHECK (scope IN ('chat', 'message')),
          UNIQUE (name, scope)
        )
      `);
      // Existing installs only ever had one shared tag pool; treat it as
      // chat-scoped since that's how tags were first introduced in the UI.
      database.exec(
        `INSERT INTO tags_new (id, name, color, scope) SELECT id, name, color, 'chat' FROM tags`
      );
      database.exec("DROP TABLE tags");
      database.exec("ALTER TABLE tags_new RENAME TO tags");
      database.exec("COMMIT");
    } catch (err) {
      database.exec("ROLLBACK");
      throw err;
    } finally {
      database.exec("PRAGMA foreign_keys = ON");
    }
  }

  database.exec("CREATE INDEX IF NOT EXISTS idx_chats_chat_date ON chats(chat_date)");

  if (!hasColumn(database, "chats", "reviewed")) {
    database.exec("ALTER TABLE chats ADD COLUMN reviewed INTEGER NOT NULL DEFAULT 0");
  }
  if (!hasColumn(database, "chats", "notes")) {
    database.exec("ALTER TABLE chats ADD COLUMN notes TEXT");
  }
  if (!hasColumn(database, "messages", "connected")) {
    database.exec("ALTER TABLE messages ADD COLUMN connected INTEGER NOT NULL DEFAULT 0");
  }

  // Re-run (idempotently) so an already-open dev connection - which only
  // ran schema.sql once, back when these tables/triggers didn't exist yet
  // - picks them up without needing a full server restart.
  database.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(
      body, sender, content='messages', content_rowid='id'
    )
  `);
  database.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS chats_fts USING fts5(
      title, content='chats', content_rowid='id'
    )
  `);
  database.exec(`
    CREATE TRIGGER IF NOT EXISTS messages_fts_ai AFTER INSERT ON messages BEGIN
      INSERT INTO messages_fts(rowid, body, sender) VALUES (new.id, new.body, new.sender);
    END
  `);
  database.exec(`
    CREATE TRIGGER IF NOT EXISTS messages_fts_ad AFTER DELETE ON messages BEGIN
      INSERT INTO messages_fts(messages_fts, rowid, body, sender) VALUES ('delete', old.id, old.body, old.sender);
    END
  `);
  database.exec(`
    CREATE TRIGGER IF NOT EXISTS messages_fts_au AFTER UPDATE ON messages BEGIN
      INSERT INTO messages_fts(messages_fts, rowid, body, sender) VALUES ('delete', old.id, old.body, old.sender);
      INSERT INTO messages_fts(rowid, body, sender) VALUES (new.id, new.body, new.sender);
    END
  `);
  database.exec(`
    CREATE TRIGGER IF NOT EXISTS chats_fts_ai AFTER INSERT ON chats BEGIN
      INSERT INTO chats_fts(rowid, title) VALUES (new.id, new.title);
    END
  `);
  database.exec(`
    CREATE TRIGGER IF NOT EXISTS chats_fts_ad AFTER DELETE ON chats BEGIN
      INSERT INTO chats_fts(chats_fts, rowid, title) VALUES ('delete', old.id, old.title);
    END
  `);
  database.exec(`
    CREATE TRIGGER IF NOT EXISTS chats_fts_au AFTER UPDATE ON chats BEGIN
      INSERT INTO chats_fts(chats_fts, rowid, title) VALUES ('delete', old.id, old.title);
      INSERT INTO chats_fts(rowid, title) VALUES (new.id, new.title);
    END
  `);

  backfillFts(database);
}

function createDb() {
  const database = new DatabaseSync(dbPath);
  database.exec("PRAGMA journal_mode = WAL");
  database.exec("PRAGMA foreign_keys = ON");
  database.exec("PRAGMA busy_timeout = 5000");
  const schema = fs.readFileSync(
    path.join(process.cwd(), "src", "lib", "schema.sql"),
    "utf-8"
  );
  database.exec(schema);
  return database;
}

// Reuse a single connection across hot-reloads / route invocations in dev.
const db = global.__zoomChatDb ?? createDb();
if (process.env.NODE_ENV !== "production") {
  global.__zoomChatDb = db;
}

// Runs on every module load (including cached dev connections reused across
// Fast Refresh) so schema changes reach an already-open connection too.
migrate(db);

// WAL mode means recent writes may only exist in the -wal file; a plain
// filesystem copy of app.db alone could miss them. Truncating the WAL back
// into the main file first guarantees the copy is complete and self-contained.
export function checkpointForBackup(): void {
  db.exec("PRAGMA wal_checkpoint(TRUNCATE)");
}

export { dbPath };
export default db;
