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

// Naive "last two labels" heuristic (academy.posit.co -> posit.co,
// www.example.com -> example.com). Doesn't handle multi-part TLDs like
// .co.uk correctly, but a full public-suffix-list lookup is overkill for
// a personal link filter.
function registrableDomain(hostname: string): string {
  const parts = hostname.split(".");
  return parts.length > 2 ? parts.slice(-2).join(".") : hostname;
}

// Main domains (subdomains collapsed) behind the (non-LinkedIn) links in a
// message, deduped - used to build the Links section's domain filter bar.
export function extractDomains(text: string): string[] {
  const domains = new Set<string>();
  for (const u of extractUrls(text)) {
    if (/linkedin\.com/i.test(u)) continue;
    try {
      domains.add(registrableDomain(new URL(u).hostname.toLowerCase()));
    } catch {
      // malformed URL, skip
    }
  }
  return [...domains];
}
