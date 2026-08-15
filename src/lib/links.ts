export const URL_REGEX = /(https?:\/\/[^\s]+)/g;

export function extractUrls(text: string): string[] {
  return text.match(URL_REGEX) ?? [];
}

export function hasLinkedInLink(text: string): boolean {
  return extractUrls(text).some((u) => /linkedin\.com/i.test(u));
}

export function hasOtherLink(text: string): boolean {
  return extractUrls(text).some((u) => !/linkedin\.com/i.test(u));
}

// Domains behind the (non-LinkedIn) links in a message, deduped and
// normalized (lowercased, "www." stripped) - used to build the Links
// section's domain filter bar.
export function extractDomains(text: string): string[] {
  const domains = new Set<string>();
  for (const u of extractUrls(text)) {
    if (/linkedin\.com/i.test(u)) continue;
    try {
      domains.add(new URL(u).hostname.replace(/^www\./i, "").toLowerCase());
    } catch {
      // malformed URL, skip
    }
  }
  return [...domains];
}
