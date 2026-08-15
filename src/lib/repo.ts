import db from "@/lib/db";
import { parseZoomChat, extractSortableDate, type ParsedMessage } from "@/lib/parseZoomChat";
import { hasLinkedInLink, hasOtherLink } from "@/lib/links";

export type Tag = { id: number; name: string; color: string };
export type TagWithCount = Tag & { count: number };
export type TagScope = "chat" | "message";

export type Message = {
  id: number;
  chatId: number;
  seq: number;
  timestampRaw: string;
  sender: string;
  body: string;
  starred: boolean;
  tags: Tag[];
  replyToMessageId: number | null;
  replies: Message[];
};

export type ChatSummary = {
  id: number;
  title: string;
  filename: string | null;
  uploadedAt: string;
  chatDate: string;
  messageCount: number;
  reviewed: boolean;
  tags: Tag[];
};

export type ChatDetail = ChatSummary & {
  rawText: string;
  notes: string | null;
  messages: Message[]; // top-level only; replies nest under their parent
};

export type Highlight = Message & {
  chatTitle: string;
};

function getOrCreateTag(name: string, scope: TagScope): Tag {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Tag name cannot be empty");
  const existing = db
    .prepare("SELECT id, name, color FROM tags WHERE name = ? AND scope = ?")
    .get(trimmed, scope) as Tag | undefined;
  if (existing) return { ...existing };
  const info = db
    .prepare("INSERT INTO tags (name, scope) VALUES (?, ?)")
    .run(trimmed, scope);
  return { id: Number(info.lastInsertRowid), name: trimmed, color: "#6366f1" };
}

// node:sqlite returns rows as null-prototype objects, which React Server
// Components refuse to pass to Client Components as props. Spreading each
// row into a plain object literal fixes that.
function toPlain<T extends object>(rows: T[]): T[] {
  return rows.map((row) => ({ ...row }));
}

function tagsForChat(chatId: number): Tag[] {
  const rows = db
    .prepare(
      `SELECT t.id, t.name, t.color FROM tags t
       JOIN chat_tags ct ON ct.tag_id = t.id
       WHERE ct.chat_id = ? ORDER BY t.name`
    )
    .all(chatId) as Tag[];
  return toPlain(rows);
}

function tagsForMessage(messageId: number): Tag[] {
  const rows = db
    .prepare(
      `SELECT t.id, t.name, t.color FROM tags t
       JOIN message_tags mt ON mt.tag_id = t.id
       WHERE mt.message_id = ? ORDER BY t.name`
    )
    .all(messageId) as Tag[];
  return toPlain(rows);
}

// Chat tags and message tags are separate pools (same tag name can exist
// independently in each scope), so each gets its own listing.
export function listChatTags(): TagWithCount[] {
  const rows = db
    .prepare(
      `SELECT t.id, t.name, t.color, COUNT(ct.chat_id) as count
       FROM tags t
       LEFT JOIN chat_tags ct ON ct.tag_id = t.id
       WHERE t.scope = 'chat'
       GROUP BY t.id
       ORDER BY t.name`
    )
    .all() as TagWithCount[];
  return toPlain(rows);
}

export function listMessageTags(): TagWithCount[] {
  const rows = db
    .prepare(
      `SELECT t.id, t.name, t.color, COUNT(mt.message_id) as count
       FROM tags t
       LEFT JOIN message_tags mt ON mt.tag_id = t.id
       WHERE t.scope = 'message'
       GROUP BY t.id
       ORDER BY t.name`
    )
    .all() as TagWithCount[];
  return toPlain(rows);
}

export function deleteTag(id: number): void {
  db.prepare("DELETE FROM tags WHERE id = ?").run(id);
}

export function renameTag(id: number, name: string): void {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Tag name cannot be empty");
  db.prepare("UPDATE tags SET name = ? WHERE id = ?").run(trimmed, id);
}

// Used both by createChat (to store the date) and by upload-time duplicate
// detection (to check for an existing chat before inserting a new one).
export function previewChatDate(rawText: string): string {
  const messages = parseZoomChat(rawText);
  const derivedDate = messages.length > 0 ? extractSortableDate(messages[0].timestampRaw) : null;
  return derivedDate ?? new Date().toISOString().slice(0, 19).replace("T", " ");
}

export function findChatByChatDate(chatDate: string): { id: number; title: string } | undefined {
  return db.prepare("SELECT id, title FROM chats WHERE chat_date = ?").get(chatDate) as
    | { id: number; title: string }
    | undefined;
}

export function createChat(
  title: string,
  filename: string | null,
  rawText: string
): number {
  const messages: ParsedMessage[] = parseZoomChat(rawText);
  const chatDate = previewChatDate(rawText);

  const insertChat = db.prepare(
    "INSERT INTO chats (title, filename, raw_text, chat_date) VALUES (?, ?, ?, ?)"
  );
  const insertMessage = db.prepare(
    `INSERT INTO messages (chat_id, seq, timestamp_raw, sender, body)
     VALUES (?, ?, ?, ?, ?)`
  );
  const setReplyTarget = db.prepare(
    "UPDATE messages SET reply_to_message_id = ? WHERE id = ?"
  );

  db.exec("BEGIN");
  try {
    const info = insertChat.run(title, filename, rawText, chatDate);
    const chatId = Number(info.lastInsertRowid);

    const seqToId: number[] = [];
    messages.forEach((m, idx) => {
      const msgInfo = insertMessage.run(chatId, idx, m.timestampRaw, m.sender, m.body);
      seqToId[idx] = Number(msgInfo.lastInsertRowid);
    });
    messages.forEach((m, idx) => {
      if (m.replyToSeq !== undefined) {
        setReplyTarget.run(seqToId[m.replyToSeq], seqToId[idx]);
      }
    });

    db.exec("COMMIT");
    return chatId;
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

export function listChats(tagId?: number, sort: "asc" | "desc" = "desc"): ChatSummary[] {
  const direction = sort === "asc" ? "ASC" : "DESC";
  const rows = tagId
    ? (db
        .prepare(
          `SELECT c.id, c.title, c.filename, c.uploaded_at as uploadedAt, c.chat_date as chatDate,
                  c.reviewed as reviewed,
                  (SELECT COUNT(*) FROM messages m WHERE m.chat_id = c.id) as messageCount
           FROM chats c
           JOIN chat_tags ct ON ct.chat_id = c.id
           WHERE ct.tag_id = ?
           ORDER BY c.chat_date ${direction}`
        )
        .all(tagId) as Array<Omit<ChatSummary, "tags" | "reviewed"> & { reviewed: number }>)
    : (db
        .prepare(
          `SELECT c.id, c.title, c.filename, c.uploaded_at as uploadedAt, c.chat_date as chatDate,
                  c.reviewed as reviewed,
                  (SELECT COUNT(*) FROM messages m WHERE m.chat_id = c.id) as messageCount
           FROM chats c
           ORDER BY c.chat_date ${direction}`
        )
        .all() as Array<Omit<ChatSummary, "tags" | "reviewed"> & { reviewed: number }>);

  return rows.map((r) => ({ ...r, reviewed: !!r.reviewed, tags: tagsForChat(r.id) }));
}

export function getChat(id: number): ChatDetail | undefined {
  const chat = db
    .prepare(
      `SELECT id, title, filename, uploaded_at as uploadedAt, chat_date as chatDate,
              raw_text as rawText, reviewed as reviewed, notes as notes
       FROM chats WHERE id = ?`
    )
    .get(id) as
    | (Omit<ChatDetail, "tags" | "messages" | "messageCount" | "reviewed"> & { reviewed: number })
    | undefined;
  if (!chat) return undefined;

  const messageRows = db
    .prepare(
      `SELECT id, chat_id as chatId, seq, timestamp_raw as timestampRaw, sender, body, starred,
              reply_to_message_id as replyToMessageId
       FROM messages WHERE chat_id = ? ORDER BY seq ASC`
    )
    .all(id) as Array<
    Omit<Message, "starred" | "tags" | "replies"> & { starred: number }
  >;

  const byId = new Map<number, Message>();
  for (const m of messageRows) {
    byId.set(m.id, { ...m, starred: !!m.starred, tags: tagsForMessage(m.id), replies: [] });
  }

  const topLevel: Message[] = [];
  for (const m of messageRows) {
    const message = byId.get(m.id)!;
    const parent = m.replyToMessageId != null ? byId.get(m.replyToMessageId) : undefined;
    if (parent) {
      parent.replies.push(message);
    } else {
      topLevel.push(message);
    }
  }

  return {
    ...chat,
    reviewed: !!chat.reviewed,
    tags: tagsForChat(id),
    messageCount: messageRows.length,
    messages: topLevel,
  };
}

function messageToMarkdown(m: Message, depth: number): string {
  const prefix = "> ".repeat(depth);
  const lines = [
    `${prefix}**${m.sender}** _${m.timestampRaw}_${m.starred ? " ⭐" : ""}`,
    ...m.body.split("\n").map((line) => `${prefix}${line}`),
  ];
  const own = lines.join("\n");
  const replies = m.replies.map((r) => messageToMarkdown(r, depth + 1)).join("\n\n");
  return replies ? `${own}\n\n${replies}` : own;
}

export function exportChatMarkdown(id: number): { title: string; markdown: string } | undefined {
  const chat = getChat(id);
  if (!chat) return undefined;

  const header = [
    `# ${chat.title}`,
    "",
    `_${new Date(chat.chatDate.replace(" ", "T")).toLocaleString()} · ${chat.messageCount} messages_`,
  ];
  if (chat.tags.length > 0) {
    header.push(`_Tags: ${chat.tags.map((t) => t.name).join(", ")}_`);
  }
  if (chat.notes?.trim()) {
    header.push("", "## Notes", "", chat.notes.trim());
  }
  header.push("", "---", "");

  const body = chat.messages.map((m) => messageToMarkdown(m, 0)).join("\n\n");
  return { title: chat.title, markdown: `${header.join("\n")}\n${body}\n` };
}

export function deleteChat(id: number): void {
  db.prepare("DELETE FROM chats WHERE id = ?").run(id);
}

export function renameChat(id: number, title: string): void {
  const trimmed = title.trim();
  if (!trimmed) throw new Error("Title cannot be empty");
  db.prepare("UPDATE chats SET title = ? WHERE id = ?").run(trimmed, id);
}

export function setChatReviewed(id: number, reviewed: boolean): void {
  db.prepare("UPDATE chats SET reviewed = ? WHERE id = ?").run(reviewed ? 1 : 0, id);
}

export function setChatNotes(id: number, notes: string): void {
  db.prepare("UPDATE chats SET notes = ? WHERE id = ?").run(notes, id);
}

export function addChatTag(chatId: number, tagName: string): Tag {
  const tag = getOrCreateTag(tagName, "chat");
  db.prepare(
    "INSERT OR IGNORE INTO chat_tags (chat_id, tag_id) VALUES (?, ?)"
  ).run(chatId, tag.id);
  return tag;
}

export function removeChatTag(chatId: number, tagId: number): void {
  db.prepare("DELETE FROM chat_tags WHERE chat_id = ? AND tag_id = ?").run(
    chatId,
    tagId
  );
}

export function bulkAddChatTag(chatIds: number[], tagName: string): Tag {
  const tag = getOrCreateTag(tagName, "chat");
  const insert = db.prepare("INSERT OR IGNORE INTO chat_tags (chat_id, tag_id) VALUES (?, ?)");
  db.exec("BEGIN");
  try {
    for (const chatId of chatIds) insert.run(chatId, tag.id);
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
  return tag;
}

export function bulkRemoveChatTag(chatIds: number[], tagId: number): void {
  const remove = db.prepare("DELETE FROM chat_tags WHERE chat_id = ? AND tag_id = ?");
  db.exec("BEGIN");
  try {
    for (const chatId of chatIds) remove.run(chatId, tagId);
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

export function setMessageStarred(messageId: number, starred: boolean): void {
  db.prepare("UPDATE messages SET starred = ? WHERE id = ?").run(
    starred ? 1 : 0,
    messageId
  );
}

export function setMessageConnected(messageId: number, connected: boolean): void {
  db.prepare("UPDATE messages SET connected = ? WHERE id = ?").run(
    connected ? 1 : 0,
    messageId
  );
}

// Any replies nested under this message become top-level (reply_to_message_id
// set to NULL via the schema's ON DELETE SET NULL) rather than being deleted
// along with it.
export function deleteMessage(id: number): void {
  db.prepare("DELETE FROM messages WHERE id = ?").run(id);
}

export function addMessageTag(messageId: number, tagName: string): Tag {
  const tag = getOrCreateTag(tagName, "message");
  db.prepare(
    "INSERT OR IGNORE INTO message_tags (message_id, tag_id) VALUES (?, ?)"
  ).run(messageId, tag.id);
  return tag;
}

export function removeMessageTag(messageId: number, tagId: number): void {
  db.prepare(
    "DELETE FROM message_tags WHERE message_id = ? AND tag_id = ?"
  ).run(messageId, tagId);
}

export function listHighlights(): Highlight[] {
  const rows = db
    .prepare(
      `SELECT m.id, m.chat_id as chatId, m.seq, m.timestamp_raw as timestampRaw,
              m.sender, m.body, m.starred, m.reply_to_message_id as replyToMessageId,
              c.title as chatTitle
       FROM messages m
       JOIN chats c ON c.id = m.chat_id
       WHERE m.starred = 1
       ORDER BY c.chat_date DESC, m.seq ASC`
    )
    .all() as Array<
    Omit<Highlight, "starred" | "tags" | "replies"> & { starred: number }
  >;

  return rows.map((r) => ({
    ...r,
    starred: !!r.starred,
    tags: tagsForMessage(r.id),
    replies: [],
  }));
}

export function countUntaggedHighlights(): number {
  const row = db
    .prepare(
      `SELECT COUNT(*) as c FROM messages m
       WHERE m.starred = 1
         AND NOT EXISTS (SELECT 1 FROM message_tags mt WHERE mt.message_id = m.id)`
    )
    .get() as { c: number };
  return row.c;
}

export type LinkMessage = {
  id: number;
  chatId: number;
  chatTitle: string;
  seq: number;
  timestampRaw: string;
  sender: string;
  body: string;
  connected: boolean;
};

// Not tied to starring/tagging at all - these scan every message in every
// chat for URLs, independent of the highlight system.
function allMessagesWithChat(): LinkMessage[] {
  const rows = db
    .prepare(
      `SELECT m.id, m.chat_id as chatId, c.title as chatTitle, m.seq,
              m.timestamp_raw as timestampRaw, m.sender, m.body, m.connected as connected
       FROM messages m
       JOIN chats c ON c.id = m.chat_id
       ORDER BY c.chat_date DESC, m.seq ASC`
    )
    .all() as Array<Omit<LinkMessage, "connected"> & { connected: number }>;
  return rows.map((r) => ({ ...r, connected: !!r.connected }));
}

export function listLinkedInLinkMessages(): LinkMessage[] {
  return allMessagesWithChat().filter((m) => hasLinkedInLink(m.body));
}

export function listOtherLinkMessages(): LinkMessage[] {
  return allMessagesWithChat().filter((m) => hasOtherLink(m.body));
}

export type SearchFilters = {
  sender?: string;
  dateFrom?: string; // YYYY-MM-DD, inclusive
  dateTo?: string; // YYYY-MM-DD, inclusive
};

// Turns free text into an FTS5 MATCH expression: each word becomes a
// quoted prefix term (so "dat" still finds "database"), ANDed together.
// Quoting each term also neutralizes FTS5's own query syntax (AND/OR/NOT,
// -, *, etc.) so a search for e.g. "c++" or "and/or" can't throw a syntax
// error or be misinterpreted as an operator.
function toFtsQuery(query: string): string {
  const tokens = query
    .trim()
    .split(/\s+/)
    .map((t) => t.replace(/[^\p{L}\p{N}']/gu, ""))
    .filter(Boolean);
  if (tokens.length === 0) return "";
  return tokens.map((t) => `"${t.replace(/"/g, '""')}"*`).join(" AND ");
}

export function searchMessages(query: string, filters: SearchFilters = {}): LinkMessage[] {
  const ftsQuery = toFtsQuery(query);
  if (!ftsQuery) return [];

  const conditions = ["messages_fts MATCH ?"];
  const params: (string | number)[] = [ftsQuery];

  if (filters.sender?.trim()) {
    conditions.push("m.sender LIKE ? COLLATE NOCASE");
    params.push(`%${filters.sender.trim()}%`);
  }
  if (filters.dateFrom) {
    conditions.push("c.chat_date >= ?");
    params.push(filters.dateFrom);
  }
  if (filters.dateTo) {
    conditions.push("c.chat_date <= ?");
    params.push(`${filters.dateTo} 23:59:59`);
  }

  const rows = db
    .prepare(
      `SELECT m.id, m.chat_id as chatId, c.title as chatTitle, m.seq,
              m.timestamp_raw as timestampRaw, m.sender, m.body, m.connected as connected
       FROM messages_fts
       JOIN messages m ON m.id = messages_fts.rowid
       JOIN chats c ON c.id = m.chat_id
       WHERE ${conditions.join(" AND ")}
       ORDER BY bm25(messages_fts) ASC`
    )
    .all(...params) as Array<Omit<LinkMessage, "connected"> & { connected: number }>;

  return toPlain(rows).map((r) => ({ ...r, connected: !!r.connected }));
}

export function searchChatsByTitle(query: string, filters: SearchFilters = {}): ChatSummary[] {
  const ftsQuery = toFtsQuery(query);
  if (!ftsQuery) return [];

  const conditions = ["chats_fts MATCH ?"];
  const params: (string | number)[] = [ftsQuery];

  if (filters.dateFrom) {
    conditions.push("c.chat_date >= ?");
    params.push(filters.dateFrom);
  }
  if (filters.dateTo) {
    conditions.push("c.chat_date <= ?");
    params.push(`${filters.dateTo} 23:59:59`);
  }

  const rows = db
    .prepare(
      `SELECT c.id, c.title, c.filename, c.uploaded_at as uploadedAt, c.chat_date as chatDate,
              c.reviewed as reviewed,
              (SELECT COUNT(*) FROM messages m WHERE m.chat_id = c.id) as messageCount
       FROM chats_fts
       JOIN chats c ON c.id = chats_fts.rowid
       WHERE ${conditions.join(" AND ")}
       ORDER BY bm25(chats_fts) ASC`
    )
    .all(...params) as Array<Omit<ChatSummary, "tags" | "reviewed"> & { reviewed: number }>;

  return rows.map((r) => ({ ...r, reviewed: !!r.reviewed, tags: tagsForChat(r.id) }));
}
