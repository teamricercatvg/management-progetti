import test from "node:test";
import assert from "node:assert/strict";
import { parseActivity } from "../src/lib/activities.mjs";
function form(extra = {}) {
  const f = new FormData();
  for (const [k, v] of Object.entries({
    result_id: "00000000-0000-4000-8000-000000000103",
    code: " a1 ",
    title: " Attività ",
    planned_start_date: "2026-10-01",
    planned_end_date: "2026-10-31",
    priority: "normal",
    sort_order: "0",
    ...extra,
  }))
    f.set(k, v);
  return f;
}
test("activities keep plan separate from optional actual dates and discard forged fields", () => {
  const { data, errors } = parseActivity(
    form({ status: "completed", created_by: "forged", project_id: "other" }),
  );
  assert.deepEqual(errors, {});
  assert.equal(data.code, "A1");
  assert.equal(data.actual_start_date, null);
  assert.equal(data.actual_end_date, null);
  assert.equal(data.status, undefined);
  assert.equal(data.created_by, undefined);
  assert.equal(data.project_id, undefined);
  const actual = parseActivity(
    form({ actual_start_date: "2026-10-03", actual_end_date: "2026-11-30" }),
  );
  assert.deepEqual(actual.errors, {});
  assert.equal(actual.data.planned_end_date, "2026-10-31");
});
test("activity dates enforce calendar validity and interval consistency", () => {
  for (const extra of [
    { planned_start_date: "" },
    { planned_start_date: "2026-02-30" },
    { planned_end_date: "2026-09-30" },
    { actual_end_date: "2026-10-31" },
    { actual_start_date: "2026-10-30", actual_end_date: "2026-10-01" },
    { actual_start_date: "0000-01-01" },
  ])
    assert.ok(Object.keys(parseActivity(form(extra)).errors).length);
  assert.deepEqual(
    parseActivity(
      form({ actual_start_date: "2026-10-01", actual_end_date: "2026-10-01" }),
    ).errors,
    {},
  );
});
test("activities validate required link and order", () => {
  for (const extra of [
    { result_id: "" },
    { priority: "forged" },
    { sort_order: "-1" },
    { sort_order: "1.5" },
    { sort_order: "2147483648" },
    { title: " " },
  ])
    assert.ok(Object.keys(parseActivity(form(extra)).errors).length);
});
