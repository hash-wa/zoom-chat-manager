CREATE TABLE IF NOT EXISTS chats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  filename TEXT,
  uploaded_at TEXT NOT NULL DEFAULT (datetime('now')),
  chat_date TEXT,
  raw_text TEXT NOT NULL,
  reviewed INTEGER NOT NULL DEFAULT 0,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6366f1',
  scope TEXT NOT NULL DEFAULT 'chat' CHECK (scope IN ('chat', 'message')),
  UNIQUE (name, scope)
);

CREATE TABLE IF NOT EXISTS chat_tags (
  chat_id INTEGER NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (chat_id, tag_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id INTEGER NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  seq INTEGER NOT NULL,
  timestamp_raw TEXT NOT NULL,
  sender TEXT NOT NULL,
  body TEXT NOT NULL,
  starred INTEGER NOT NULL DEFAULT 0,
  reply_to_message_id INTEGER REFERENCES messages(id) ON DELETE SET NULL,
  connected INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS message_tags (
  message_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (message_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_starred ON messages(starred);
CREATE INDEX IF NOT EXISTS idx_chat_tags_chat_id ON chat_tags(chat_id);
CREATE INDEX IF NOT EXISTS idx_message_tags_message_id ON message_tags(message_id);
CREATE INDEX IF NOT EXISTS idx_chats_chat_date ON chats(chat_date);

-- External-content FTS5 indexes: the messages/chats tables remain the
-- source of truth, these just mirror their text columns for ranked search.
-- Kept in sync via triggers below rather than at query time.
CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(
  body, sender, content='messages', content_rowid='id'
);
CREATE VIRTUAL TABLE IF NOT EXISTS chats_fts USING fts5(
  title, content='chats', content_rowid='id'
);

CREATE TRIGGER IF NOT EXISTS messages_fts_ai AFTER INSERT ON messages BEGIN
  INSERT INTO messages_fts(rowid, body, sender) VALUES (new.id, new.body, new.sender);
END;
CREATE TRIGGER IF NOT EXISTS messages_fts_ad AFTER DELETE ON messages BEGIN
  INSERT INTO messages_fts(messages_fts, rowid, body, sender) VALUES ('delete', old.id, old.body, old.sender);
END;
CREATE TRIGGER IF NOT EXISTS messages_fts_au AFTER UPDATE ON messages BEGIN
  INSERT INTO messages_fts(messages_fts, rowid, body, sender) VALUES ('delete', old.id, old.body, old.sender);
  INSERT INTO messages_fts(rowid, body, sender) VALUES (new.id, new.body, new.sender);
END;

CREATE TRIGGER IF NOT EXISTS chats_fts_ai AFTER INSERT ON chats BEGIN
  INSERT INTO chats_fts(rowid, title) VALUES (new.id, new.title);
END;
CREATE TRIGGER IF NOT EXISTS chats_fts_ad AFTER DELETE ON chats BEGIN
  INSERT INTO chats_fts(chats_fts, rowid, title) VALUES ('delete', old.id, old.title);
END;
CREATE TRIGGER IF NOT EXISTS chats_fts_au AFTER UPDATE ON chats BEGIN
  INSERT INTO chats_fts(chats_fts, rowid, title) VALUES ('delete', old.id, old.title);
  INSERT INTO chats_fts(rowid, title) VALUES (new.id, new.title);
END;
