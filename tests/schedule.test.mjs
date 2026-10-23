import test from "node:test";
import assert from "node:assert/strict";
import {
  scheduleMonths,
  intersects,
  overlappingPeriods,
  periodChanges,
} from "../src/lib/schedule.mjs";
test("calendar handles leap years, year crossing and partial months", () => {
  const m = scheduleMonths("2027-12-15", "2028-03-03");
  assert.equal(m.length, 4);
  assert.equal(m[2].end, "2028-02-29");
  assert.equal(m[3].label, "M4");
  assert.equal(intersects("2028-03-01", "2028-03-03", m[2]), false);
});
test("multiple periods keep gaps and only same-activity overlaps are flagged", () => {
  const p = [
    {
      activity_id: "a",
      start_date: "2026-01-01",
      end_date: "2026-02-01",
      status: "planned",
    },
    {
      activity_id: "a",
      start_date: "2026-02-01",
      end_date: "2026-02-05",
      status: "planned",
    },
    {
      activity_id: "b",
      start_date: "2026-01-01",
      end_date: "2026-02-01",
      status: "planned",
    },
  ];
  assert.equal(overlappingPeriods(p).length, 2);
  p[1].status = "cancelled";
  assert.equal(overlappingPeriods(p).length, 0);
});
test("comparison uses stable keys and distinguishes dates, cancellation and additions", () => {
  const a = {
    period_key: "a",
    start_date: "2026-01-01",
    end_date: "2026-01-31",
    status: "planned",
  };
  assert.equal(
    periodChanges([a], [{ ...a, end_date: "2026-02-01" }])[0].change,
    "Date modificate",
  );
  assert.equal(
    periodChanges([a], [{ ...a, status: "cancelled" }])[0].change,
    "Stato modificato",
  );
  assert.equal(periodChanges([], [a])[0].change, "Aggiunto");
});
