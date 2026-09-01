export function cleaningStartedAt(value?: string | null, now = new Date(), serviceDate?: string | null) {
  if (!value) return null;

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) return parsed;

  const time = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(value.trim());
  if (!time) return null;

  const serviceDateParts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(serviceDate ?? '');
  const startedAt = serviceDateParts
    ? new Date(
      Number(serviceDateParts[1]),
      Number(serviceDateParts[2]) - 1,
      Number(serviceDateParts[3]),
    )
    : new Date(now);
  startedAt.setHours(Number(time[1]), Number(time[2]), Number(time[3] ?? 0), 0);
  return startedAt;
}

export function formatCleaningElapsed(value?: string | null, now = new Date(), serviceDate?: string | null) {
  const startedAt = cleaningStartedAt(value, now, serviceDate);
  if (!startedAt) return null;

  const elapsedSeconds = Math.max(0, Math.floor((now.getTime() - startedAt.getTime()) / 1000));
  const hours = Math.floor(elapsedSeconds / 3600);
  const minutes = Math.floor((elapsedSeconds % 3600) / 60);
  const seconds = elapsedSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
  }
  return `${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
}
