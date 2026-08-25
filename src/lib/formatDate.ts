// "Thu, Aug 13, 2026" - used anywhere a chat's date is shown.
export function formatChatDate(chatDate: string): string {
  return new Date(chatDate.replace(" ", "T")).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}
