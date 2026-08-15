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
