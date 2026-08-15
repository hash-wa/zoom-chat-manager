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
import { extractDomains } from "@/lib/links";
import HighlightCard from "@/components/HighlightCard";
import HighlightTagHeader from "@/components/HighlightTagHeader";
import LinkMessageCard from "@/components/LinkMessageCard";
import type { Highlight, Tag } from "@/lib/repo";

function domainPillClass(active: boolean) {
  return `px-2.5 py-1 rounded-full border text-sm ${
    active
      ? "bg-indigo-600 text-white border-indigo-600"
      : "border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
  }`;
}

// Distinct styling from the pills above - this is a single on/off switch,
// not one option among several, so it shouldn't look like a filter pill.
function toggleButtonClass(active: boolean) {
  return `inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-sm transition ${
    active
      ? "bg-emerald-600 text-white border-emerald-600"
      : "border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
  }`;
}

function linksHref({ domain, hideDone }: { domain: string[]; hideDone: boolean }): string {
  const params = new URLSearchParams({ tag: "links" });
  if (domain.length > 0) params.set("domain", domain.join(","));
  if (hideDone) params.set("hideDone", "1");
  return `/highlights?${params.toString()}`;
}

// Toggles one domain in/out of the comma-separated ?domain= selection,
// so multiple domain pills can be active (OR'd together) at once.
function toggleDomainHref(selected: string[], d: string, hideDone: boolean): string {
  const next = selected.includes(d) ? selected.filter((x) => x !== d) : [...selected, d];
  return linksHref({ domain: next, hideDone });
}

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
  searchParams: Promise<{ tag?: string; domain?: string; hideDone?: string }>;
}) {
  const { tag, domain, hideDone: hideDoneParam } = await searchParams;
  const hideDone = hideDoneParam === "1";
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
    const allMessages = await listLinkedInLinkMessages();
    const messages = hideDone ? allMessages.filter((m) => !m.connected) : allMessages;

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

        <Link
          href={hideDone ? "/highlights?tag=linkedin" : "/highlights?tag=linkedin&hideDone=1"}
          className={toggleButtonClass(hideDone)}
        >
          <span>{hideDone ? "☑" : "☐"}</span> Hide connected
        </Link>

        {messages.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {hideDone ? "No unconnected messages with LinkedIn links." : "No messages with LinkedIn links found."}
          </p>
        ) : (
          <div className="space-y-2">
            {messages.map((m) => (
              <LinkMessageCard key={m.id} m={m} showConnected showActions />
            ))}
          </div>
        )}
      </div>
    );
  }

  if (tag === "links") {
    const allMessages = await listOtherLinkMessages();
    const selectedDomains = domain ? domain.split(",").filter(Boolean) : [];

    const domainCounts = new Map<string, number>();
    for (const m of allMessages) {
      for (const d of extractDomains(m.body)) {
        domainCounts.set(d, (domainCounts.get(d) ?? 0) + 1);
      }
    }
    const domains = [...domainCounts.entries()].sort((a, b) => b[1] - a[1]);

    const domainFiltered =
      selectedDomains.length > 0
        ? allMessages.filter((m) => extractDomains(m.body).some((d) => selectedDomains.includes(d)))
        : allMessages;
    const messages = hideDone ? domainFiltered.filter((m) => !m.connected) : domainFiltered;

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

        <Link
          href={linksHref({ domain: selectedDomains, hideDone: !hideDone })}
          className={toggleButtonClass(hideDone)}
        >
          <span>{hideDone ? "☑" : "☐"}</span> Hide checked
        </Link>

        {domains.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <Link href={linksHref({ domain: [], hideDone })} className={domainPillClass(selectedDomains.length === 0)}>
              All
            </Link>
            {domains.map(([d, count]) => (
              <Link
                key={d}
                href={toggleDomainHref(selectedDomains, d, hideDone)}
                className={domainPillClass(selectedDomains.includes(d))}
              >
                {d} <span className="opacity-60">({count})</span>
              </Link>
            ))}
          </div>
        )}

        {messages.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {selectedDomains.length > 0
              ? `No messages with links from ${selectedDomains.join(", ")}.`
              : "No messages with links found."}
          </p>
        ) : (
          <div className="space-y-2">
            {messages.map((m) => (
              <LinkMessageCard
                key={m.id}
                m={m}
                showConnected
                checkedLabel="Checked"
                allTags={allTags}
                showActions
              />
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
