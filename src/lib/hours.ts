import { EventStatus } from "@prisma/client";

export function computeDefaultPlannedHours(startAt: Date, endAt: Date) {
  const diffMs = Math.max(endAt.getTime() - startAt.getTime(), 0);
  const diffMinutes = Math.floor(diffMs / 60000);
  return Math.max(1, Math.ceil(diffMinutes / 60));
}

export function computeBillableHours(status: EventStatus, plannedHours: number) {
  if (status !== EventStatus.COMPLETED) return 0;
  return Math.max(0, plannedHours);
}

