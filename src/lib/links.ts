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

// Identity of a LinkedIn URL lives in its path (e.g. /in/johndoe), not the
// query string or trailing slash - two links pointing at the same profile
// can otherwise differ by tracking params (?trk=...) or a trailing "/".
// Normalizing to just the lowercased path lets two mentions of the same
// profile (possibly pasted at different times, in different chats) compare
// equal.
function normalizeLinkedInUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (!/linkedin\.com$/i.test(u.hostname.replace(/^www\./i, ""))) return null;
    const path = u.pathname.replace(/\/+$/, "").toLowerCase();
    return path || null;
  } catch {
    return null;
  }
}

export function extractLinkedInUrls(text: string): string[] {
  const urls = new Set<string>();
  for (const raw of extractUrls(text)) {
    const normalized = normalizeLinkedInUrl(raw);
    if (normalized) urls.add(normalized);
  }
  return [...urls];
}
