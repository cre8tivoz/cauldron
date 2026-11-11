/** How long the first unsaved edit waits before it is copied to the recovery area (plan 1.6). */
export const DRAFT_SAVE_DELAY_MS = 3000;

export type DraftSchedule = { dueAt: number | null };

/**
 * The save is due a fixed time after the first unsaved change. Later keystrokes
 * keep the existing due time, so continuous typing cannot postpone it.
 */
export function noteDraftChange(
  schedule: DraftSchedule,
  now: number,
): DraftSchedule {
  if (schedule.dueAt !== null) return schedule;
  return { dueAt: now + DRAFT_SAVE_DELAY_MS };
}

export function clearDraftSchedule(): DraftSchedule {
  return { dueAt: null };
}
