import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLinkedin } from "@fortawesome/free-brands-svg-icons";
import { faLink, faStar, faCircleCheck, faCircle } from "@fortawesome/free-solid-svg-icons";
import { listAllMessages, listMessageTags } from "@/lib/repo";
import { extractDomains, hasLinkedInLink, hasOtherLink } from "@/lib/links";
import LinkMessageCard from "@/components/LinkMessageCard";
import type { LinkMessage } from "@/lib/repo";

const UNTAGGED = "untagged";

function pillClass(active: boolean) {
  return `inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-sm ${
    active
      ? "bg-indigo-600 text-white border-indigo-600"
      : "border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
  }`;
}

function groupLabelClass() {
  return "text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1.5";
}

function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((x) => x !== value) : [...list, value];
}

function buildHref({
  tags,
  sources,
  domain,
  checked,
}: {
  tags: string[];
  sources: string[];
  domain: string[];
  checked: "1" | "0" | null;
}): string {
  const params = new URLSearchParams();
  if (tags.length > 0) params.set("tags", tags.join(","));
  if (sources.length > 0) params.set("sources", sources.join(","));
  if (domain.length > 0) params.set("domain", domain.join(","));
  if (checked) params.set("checked", checked);
  const qs = params.toString();
  return qs ? `/highlights?${qs}` : "/highlights";
}

type DisplayItem = LinkMessage & { showConnected: boolean };

export default async function HighlightsPage({
  searchParams,
}: {
  searchParams: Promise<{ tags?: string; sources?: string; domain?: string; checked?: string }>;
}) {
  const { tags: tagsParam, sources: sourcesParam, domain: domainParam, checked: checkedParam } =
    await searchParams;
  const selectedTags = tagsParam ? tagsParam.split(",").filter(Boolean) : [];
  const selectedTagIds = selectedTags.filter((t) => t !== UNTAGGED);
  const wantsUntagged = selectedTags.includes(UNTAGGED);
  const selectedSources = sourcesParam ? sourcesParam.split(",").filter(Boolean) : [];
  const selectedDomains = domainParam ? domainParam.split(",").filter(Boolean) : [];
  const checkedState = checkedParam === "1" ? "checked" : checkedParam === "0" ? "unchecked" : null;
  const wantsLinkedIn = selectedSources.includes("linkedin");
  const wantsLinks = selectedSources.includes("links");

  const [allMessages, messageTags] = await Promise.all([listAllMessages(), listMessageTags()]);

  const starredMessages = allMessages.filter((m) => m.starred);
  const allLinkedIn = allMessages.filter((m) => hasLinkedInLink(m.body));
  const allLinks = allMessages.filter((m) => hasOtherLink(m.body));

  // Every capsule (Star/LinkedIn/Links/Tag) pulls its own matching messages
  // into the pool regardless of starred status - selecting a tag shows
  // every message with that tag, not just the ones already starred.
  const merged = new Map<number, DisplayItem>();
  for (const m of starredMessages) {
    merged.set(m.id, { ...m, showConnected: true });
  }

  let linksDomainCounts: Array<[string, number]> = [];
  if (wantsLinks) {
    const counts = new Map<string, number>();
    for (const m of allLinks) {
      for (const d of extractDomains(m.body)) counts.set(d, (counts.get(d) ?? 0) + 1);
    }
    linksDomainCounts = [...counts.entries()].sort((a, b) => b[1] - a[1]);

    const filtered =
      selectedDomains.length > 0
        ? allLinks.filter((m) => extractDomains(m.body).some((d) => selectedDomains.includes(d)))
        : allLinks;
    for (const m of filtered) {
      merged.set(m.id, { ...m, showConnected: true });
    }
  }

  if (wantsLinkedIn) {
    for (const m of allLinkedIn) {
      merged.set(m.id, { ...m, showConnected: true });
    }
  }

  if (selectedTagIds.length > 0) {
    for (const m of allMessages) {
      if (m.tags.some((t) => selectedTagIds.includes(String(t.id)))) {
        merged.set(m.id, { ...m, showConnected: true });
      }
    }
  }

  // Untagged narrows whatever's already in the pool down to messages with
  // no tags at all, rather than pulling in every untagged message across
  // every chat (which would be most of the database).
  let scoped = [...merged.values()];
  const untaggedCount = scoped.filter((m) => m.tags.length === 0).length;
  if (wantsUntagged) scoped = scoped.filter((m) => m.tags.length === 0);

  const checkedCount = scoped.filter((m) => m.connected).length;
  const uncheckedCount = scoped.filter((m) => !m.connected).length;
  const results =
    checkedState === "checked"
      ? scoped.filter((m) => m.connected)
      : checkedState === "unchecked"
        ? scoped.filter((m) => !m.connected)
        : scoped;

  const checkedQueryValue: "1" | "0" | null = checkedState === "checked" ? "1" : checkedState === "unchecked" ? "0" : null;
  const hasAnyFilter = selectedTags.length > 0 || selectedSources.length > 0 || checkedState !== null;
  const availableTags = messageTags.filter((t) => t.count > 0);

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Highlights</h1>

      <div>
        <div className={groupLabelClass()}>Source</div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={buildHref({ tags: [], sources: [], domain: [], checked: null })}
            className={pillClass(!hasAnyFilter)}
            title="All starred"
          >
            <FontAwesomeIcon icon={faStar} className={!hasAnyFilter ? "text-white" : "text-amber-400"} />
            <span className="opacity-60">({starredMessages.length})</span>
          </Link>
          <Link
            href={buildHref({
              tags: selectedTags,
              sources: toggle(selectedSources, "linkedin"),
              domain: selectedDomains,
              checked: checkedQueryValue,
            })}
            className={pillClass(wantsLinkedIn)}
            title="LinkedIn"
          >
            <FontAwesomeIcon icon={faLinkedin} className={wantsLinkedIn ? "text-white" : "text-[#0A66C2]"} />
            <span className="opacity-60">({allLinkedIn.length})</span>
          </Link>
          <Link
            href={buildHref({
              tags: selectedTags,
              sources: toggle(selectedSources, "links"),
              domain: selectedDomains,
              checked: checkedQueryValue,
            })}
            className={pillClass(wantsLinks)}
            title="Links"
          >
            <FontAwesomeIcon icon={faLink} className={wantsLinks ? "text-white" : "text-slate-400 dark:text-slate-500"} />
            <span className="opacity-60">({allLinks.length})</span>
          </Link>
        </div>
      </div>

      {wantsLinks && linksDomainCounts.length > 0 && (
        <div className="flex flex-wrap gap-2 pl-4 border-l-2 border-slate-200 dark:border-slate-700">
          <Link
            href={buildHref({ tags: selectedTags, sources: selectedSources, domain: [], checked: checkedQueryValue })}
            className={pillClass(selectedDomains.length === 0)}
          >
            All domains
          </Link>
          {linksDomainCounts.map(([d, count]) => (
            <Link
              key={d}
              href={buildHref({
                tags: selectedTags,
                sources: selectedSources,
                domain: toggle(selectedDomains, d),
                checked: checkedQueryValue,
              })}
              className={pillClass(selectedDomains.includes(d))}
            >
              {d} <span className="opacity-60">({count})</span>
            </Link>
          ))}
        </div>
      )}

      <div>
        <div className={groupLabelClass()}>Tag</div>
        <div className="flex flex-wrap gap-2">
          {availableTags.map((t) => (
            <Link
              key={t.id}
              href={buildHref({
                tags: toggle(selectedTags, String(t.id)),
                sources: selectedSources,
                domain: selectedDomains,
                checked: checkedQueryValue,
              })}
              className={pillClass(selectedTagIds.includes(String(t.id)))}
            >
              {t.name} <span className="opacity-60">({t.count})</span>
            </Link>
          ))}
          {untaggedCount > 0 && (
            <Link
              href={buildHref({
                tags: toggle(selectedTags, UNTAGGED),
                sources: selectedSources,
                domain: selectedDomains,
                checked: checkedQueryValue,
              })}
              className={pillClass(wantsUntagged)}
            >
              Untagged <span className="opacity-60">({untaggedCount})</span>
            </Link>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-700 pt-3">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {results.length} message{results.length === 1 ? "" : "s"}
        </p>
        <div className="flex items-center gap-2">
          <Link
            href={buildHref({
              tags: selectedTags,
              sources: selectedSources,
              domain: selectedDomains,
              checked: checkedState === "checked" ? null : "1",
            })}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-sm transition ${
              checkedState === "checked"
                ? "bg-emerald-600 text-white border-emerald-600"
                : "border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
            }`}
          >
            <FontAwesomeIcon icon={faCircleCheck} className={checkedState === "checked" ? "text-white" : "text-emerald-500"} />
            Checked <span className="opacity-60">({checkedCount})</span>
          </Link>
          <Link
            href={buildHref({
              tags: selectedTags,
              sources: selectedSources,
              domain: selectedDomains,
              checked: checkedState === "unchecked" ? null : "0",
            })}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-sm transition ${
              checkedState === "unchecked"
                ? "bg-slate-600 text-white border-slate-600"
                : "border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
            }`}
          >
            <FontAwesomeIcon icon={faCircle} className={checkedState === "unchecked" ? "text-white" : "text-slate-400 dark:text-slate-500"} />
            Unchecked <span className="opacity-60">({uncheckedCount})</span>
          </Link>
        </div>
      </div>

      {results.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {hasAnyFilter ? (
            "No messages match the selected filters."
          ) : (
            <>
              <FontAwesomeIcon icon={faStar} className="text-amber-400 mr-1" />
              No starred messages yet. Star a message in any chat to follow up on it here.
            </>
          )}
        </p>
      ) : (
        <div className="space-y-2">
          {results.map((m) => (
            <LinkMessageCard key={m.id} m={m} showConnected={m.showConnected} allTags={messageTags} showActions />
          ))}
        </div>
      )}
    </div>
  );
}
