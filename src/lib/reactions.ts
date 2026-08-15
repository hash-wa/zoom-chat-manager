export type Reaction = { emoji: string; names: string[] };

// Zoom appends one line per distinct emoji reaction at the end of the
// message it's attached to, e.g.:
//   Dwight Barry, Natasha lang:❤️
//   Erin Pierson:😂
const REACTION_LINE = /^([^:\n]+):\s*([\p{Extended_Pictographic}\p{Emoji_Modifier}️‍]+)\s*$/u;

export function extractReactions(body: string): { cleanBody: string; reactions: Reaction[] } {
  const lines = body.split("\n");
  const reactions: Reaction[] = [];
  let end = lines.length;

  while (end > 0) {
    const match = lines[end - 1].trim().match(REACTION_LINE);
    if (!match) break;
    const names = match[1]
      .split(",")
      .map((n) => n.trim())
      .filter(Boolean);
    if (names.length === 0) break;
    reactions.unshift({ emoji: match[2], names });
    end--;
  }

  if (reactions.length === 0) return { cleanBody: body, reactions: [] };

  const cleanBody = lines.slice(0, end).join("\n").trimEnd();
  // A message shouldn't ever be *only* reactions - if that's all that's
  // left, something matched unexpectedly, so play it safe and show the
  // original text untouched instead of an empty bubble.
  if (!cleanBody.trim()) return { cleanBody: body, reactions: [] };

  return { cleanBody, reactions };
}
