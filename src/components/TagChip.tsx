import type { Tag } from "@/lib/repo";

export default function TagChip({
  tag,
  onRemove,
}: {
  tag: Tag;
  onRemove?: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 text-xs font-medium px-2.5 py-1">
      {tag.name}
      {onRemove && (
        <button
          onClick={onRemove}
          aria-label={`Remove tag ${tag.name}`}
          className="text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-400"
        >
          ×
        </button>
      )}
    </span>
  );
}
