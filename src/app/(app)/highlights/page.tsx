import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLinkedin } from "@fortawesome/free-brands-svg-icons";
import { faLink } from "@fortawesome/free-solid-svg-icons";
import {
  listHighlights,
  listMessageTags,
  listLinkedInLinkMessages,
  listOtherLinkMessages,
} from "@/lib/repo";
import HighlightCard from "@/components/HighlightCard";
import HighlightTagHeader from "@/components/HighlightTagHeader";
import LinkMessageCard from "@/components/LinkMessageCard";
import type { Highlight, Tag } from "@/lib/repo";

function groupByTag(highlights: Highlight[]) {
  const groups = new Map<string, { tag: Tag | null; items: Highlight[] }>();
  const untaggedKey = "__untagged__";

  for (const h of highlights) {
    if (h.tags.length === 0) {
      const g = groups.get(untaggedKey) ?? { tag: null, items: [] };
      g.items.push(h);
      groups.set(untaggedKey, g);
      continue;
    }
    for (const tag of h.tags) {
      const key = String(tag.id);
      const g = groups.get(key) ?? { tag, items: [] };
      g.items.push(h);
      groups.set(key, g);
    }
  }

  const entries = [...groups.values()].sort((a, b) => {
    if (!a.tag) return 1;
    if (!b.tag) return -1;
    return a.tag.name.localeCompare(b.tag.name);
  });
  return entries;
}

export default async function HighlightsPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string }>;
}) {
  const { tag } = await searchParams;
  const [highlights, allTags] = await Promise.all([listHighlights(), listMessageTags()]);

  if (tag === "untagged") {
    const filtered = highlights.filter((h) => h.tags.length === 0);
    return (
      <div className="space-y-4">
        <div>
          <Link href="/highlights" className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
            ← All highlights
          </Link>
          <h1 className="text-lg font-semibold mt-1">Untagged</h1>
        </div>

        {filtered.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">No untagged starred messages.</p>
        ) : (
          <div className="space-y-2">
            {filtered.map((h) => (
              <HighlightCard key={h.id} h={h} allTags={allTags} />
            ))}
          </div>
        )}
      </div>
    );
  }

  if (tag === "linkedin") {
    const messages = await listLinkedInLinkMessages();
    return (
      <div className="space-y-4">
        <div>
          <Link href="/highlights" className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
            ← All highlights
          </Link>
          <h1 className="text-lg font-semibold mt-1 flex items-center gap-2">
            <FontAwesomeIcon icon={faLinkedin} className="text-[#0A66C2]" />
            LinkedIn links
          </h1>
        </div>

        {messages.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">No messages with LinkedIn links found.</p>
        ) : (
          <div className="space-y-2">
            {messages.map((m) => (
              <LinkMessageCard key={m.id} m={m} showConnected />
            ))}
          </div>
        )}
      </div>
    );
  }

  if (tag === "links") {
    const messages = await listOtherLinkMessages();
    return (
      <div className="space-y-4">
        <div>
          <Link href="/highlights" className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
            ← All highlights
          </Link>
          <h1 className="text-lg font-semibold mt-1 flex items-center gap-2">
            <FontAwesomeIcon icon={faLink} className="text-slate-400 dark:text-slate-500" />
            Links
          </h1>
        </div>

        {messages.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">No messages with links found.</p>
        ) : (
          <div className="space-y-2">
            {messages.map((m) => (
              <LinkMessageCard key={m.id} m={m} />
            ))}
          </div>
        )}
      </div>
    );
  }

  const tagId = tag ? Number(tag) : undefined;
  if (tagId && !Number.isNaN(tagId)) {
    const tagInfo = allTags.find((t) => t.id === tagId);
    const filtered = highlights.filter((h) => h.tags.some((t) => t.id === tagId));

    return (
      <div className="space-y-4">
        <div>
          <Link href="/highlights" className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
            ← All highlights
          </Link>
          <div className="mt-1">
            {tagInfo ? (
              <HighlightTagHeader tag={tagInfo} large linkToFilter={false} />
            ) : (
              <h1 className="text-lg font-semibold">Tag</h1>
            )}
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">No starred messages with this tag.</p>
        ) : (
          <div className="space-y-2">
            {filtered.map((h) => (
              <HighlightCard key={h.id} h={h} allTags={allTags} />
            ))}
          </div>
        )}
      </div>
    );
  }

  const groups = groupByTag(highlights);

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">Highlights</h1>

      {highlights.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No starred messages yet. Star a message in any chat to follow up on it here.
        </p>
      ) : (
        groups.map((group) => (
          <div key={group.tag ? group.tag.id : "untagged"} className="space-y-2">
            <h2>
              {group.tag ? (
                <HighlightTagHeader tag={group.tag} />
              ) : (
                <Link
                  href="/highlights?tag=untagged"
                  className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide hover:text-indigo-600 dark:hover:text-indigo-400"
                >
                  Untagged
                </Link>
              )}
            </h2>
            <div className="space-y-2">
              {group.items.map((h) => (
                <HighlightCard key={h.id} h={h} allTags={allTags} />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
