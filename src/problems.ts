/** Merge distinct failure messages without dropping earlier simultaneous ones. */
export function mergeProblemMessages(
  current: string | null | undefined,
  incoming: string | null | undefined,
): string | null {
  const next = incoming?.trim() ?? '';
  const prev = current?.trim() ?? '';
  if (!next) return prev || null;
  if (!prev) return next;
  if (prev === next || prev.includes(next)) return prev;
  if (next.includes(prev)) return next;
  return `${prev} ${next}`;
}
