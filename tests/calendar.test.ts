import assert from "node:assert/strict";
import test from "node:test";
import { calendarDays, shiftMonth } from "../src/domain/calendar";
test("kalender mengikuti hari awal bulan dan tahun kabisat tanpa mengubah tanggal karena zona waktu", () => {
  const days = calendarDays("2028-02");
  assert.deepEqual(days.slice(0, 3), [
    null,
    null,
    { date: "2028-02-01", day: 1 },
  ]);
  assert.deepEqual(days.at(-1), { date: "2028-02-29", day: 29 });
  assert.equal(calendarDays("2027-02").filter(Boolean).length, 28);
  assert.equal(calendarDays("2026-11")[0]?.date, "2026-11-01");
});
test("navigasi kalender melintasi tahun dan menolak bulan tidak valid", () => {
  assert.equal(shiftMonth("2026-12", 1), "2027-01");
  assert.equal(shiftMonth("2026-01", -1), "2025-12");
  assert.throws(() => calendarDays("2026-13"));
  assert.throws(() => calendarDays("bukan-bulan"));
});
