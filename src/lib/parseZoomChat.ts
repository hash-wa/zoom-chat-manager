export type ParsedMessage = {
  timestampRaw: string;
  sender: string;
  body: string;
  replyToSeq?: number;
};

// Zoom "Save Chat" headers come in two shapes depending on Zoom version:
//   10:01:23	From Jane Doe to Everyone: Hello there          (body inline)
//   2026-08-13 11:49:47 From Jane Doe (she/her) to Everyone:   (body on
//   	the following tab-indented lines, until a blank line)     following lines)
const MESSAGE_LINE =
  /^((?:\d{4}-\d{2}-\d{2}\s+)?\d{1,2}:\d{2}:\d{2})\s+From\s+(.+?):[ \t]?(.*)$/;

// Zoom renders a reply as a normal message whose body starts with a quoted,
// possibly-truncated ("...") preview of the message it's replying to.
const REPLY_PREFIX = /^Replying to "(.*)":\n([\s\S]*)$/;

export function parseZoomChat(rawText: string): ParsedMessage[] {
  const lines = rawText.split(/\r\n|\r|\n/);
  const messages: ParsedMessage[] = [];

  for (const line of lines) {
    const match = line.match(MESSAGE_LINE);
    if (match) {
      const [, timestampRaw, sender, body] = match;
      messages.push({ timestampRaw, sender: sender.trim(), body });
    } else if (messages.length > 0 && line.trim().length > 0) {
      const last = messages[messages.length - 1];
      const cleaned = line.replace(/^\t+/, "");
      last.body = last.body ? `${last.body}\n${cleaned}` : cleaned;
    }
  }

  resolveReplies(messages);
  return messages;
}

// If a message body starts with Zoom's "Replying to "..."" preview, returns
// the (de-truncated) snippet to search for and the body with that line
// stripped. Otherwise returns null (not a reply, or an empty/unusable quote).
export function parseReplyReference(body: string): { snippet: string; rest: string } | null {
  const match = body.match(REPLY_PREFIX);
  if (!match) return null;
  const [, rawSnippet, rest] = match;
  const snippet = rawSnippet.endsWith("...") ? rawSnippet.slice(0, -3) : rawSnippet;
  if (!snippet.trim()) return null;
  return { snippet, rest };
}

// Links each reply to the nearest earlier message whose (already-resolved)
// body starts with the reply's quoted preview, then strips the "Replying
// to ..." line from its body since the UI nests it under the original
// instead. Replies whose target isn't in this export (e.g. Zoom's
// "Message sent before you joined the meeting") are left untouched.
function resolveReplies(messages: ParsedMessage[]) {
  for (let i = 0; i < messages.length; i++) {
    const parsed = parseReplyReference(messages[i].body);
    if (!parsed) continue;

    for (let j = i - 1; j >= 0; j--) {
      if (messages[j].body.startsWith(parsed.snippet)) {
        messages[i] = { ...messages[i], body: parsed.rest, replyToSeq: j };
        break;
      }
    }
  }
}

// Returns a lexicographically sortable "YYYY-MM-DD HH:MM:SS" string when the
// raw timestamp includes a date (newer Zoom exports), or null for the older
// time-only format ("10:01:23"), which carries no date information.
export function extractSortableDate(timestampRaw: string): string | null {
  return /^\d{4}-\d{2}-\d{2}\s+\d{1,2}:\d{2}:\d{2}$/.test(timestampRaw)
    ? timestampRaw
    : null;
}

// Splits "Jane Doe to Everyone" -> { name: "Jane Doe", to: "Everyone" }
// and "John Smith to Jane Doe(Direct Message)" -> { name: "John Smith", to: "Jane Doe (Direct Message)" }
export function splitSender(sender: string): { name: string; to: string | null } {
  const match = sender.match(/^(.*?)\s+to\s+(.+)$/i);
  if (!match) return { name: sender, to: null };
  const [, name, to] = match;
  return { name: name.trim(), to: to.trim().replace(/\(Direct Message\)/i, "(Direct Message)") };
}
