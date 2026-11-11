function parseMonth(value: string) {
  if (!/^\d{4}-\d{2}$/.test(value)) throw new Error("Bulan tidak valid.");
  const [year, month] = value.split("-").map(Number);
  if (year < 1900 || year > 9999 || month < 1 || month > 12)
    throw new Error("Bulan tidak valid.");
  return { year, month };
}
export function calendarDays(
  value: string,
): ({ date: string; day: number } | null)[] {
  const { year, month } = parseMonth(value);
  const offset = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const length = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length }, (_, i) => ({
      date: `${value}-${String(i + 1).padStart(2, "0")}`,
      day: i + 1,
    })),
  ];
}
export function shiftMonth(value: string, step: number) {
  const { year, month } = parseMonth(value);
  const result = new Date(Date.UTC(year, month - 1 + step, 1))
    .toISOString()
    .slice(0, 7);
  parseMonth(result);
  return result;
}
