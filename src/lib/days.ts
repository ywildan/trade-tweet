export const DAY_MS = 86_400_000;

/** Hari UTC "YYYY-MM-DD": sama dengan format kolom PostView.day & DailyStat.day. */
export function utcDay(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function dayStart(day: string): Date {
  return new Date(`${day}T00:00:00.000Z`);
}

export function addDays(day: string, amount: number): string {
  return utcDay(new Date(dayStart(day).getTime() + amount * DAY_MS));
}

/** Daftar hari UTC terakhir, urut lama → terbaru, termasuk hari `end`. */
export function lastDays(count: number, end: Date = new Date()): string[] {
  const endDay = utcDay(end);
  return Array.from({ length: count }, (_, index) =>
    addDays(endDay, index - count + 1),
  );
}

export function dayRangeBounds(days: string[]): { from: Date; to: Date } {
  return {
    from: dayStart(days[0]),
    to: dayStart(addDays(days[days.length - 1], 1)),
  };
}
