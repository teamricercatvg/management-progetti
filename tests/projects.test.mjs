import test from "node:test";
import assert from "node:assert/strict";
import {
  parseProject,
  validDate,
  validId,
  validVersion,
  projectError,
} from "../src/lib/projects.mjs";
const input = {
  code: " demo ",
  title: " Titolo ",
  start_date: "2026-01-01",
  end_date: "2026-12-31",
  currency_code: "eur",
};
function form(overrides = {}) {
  const f = new FormData();
  for (const [k, v] of Object.entries({ ...input, ...overrides })) f.set(k, v);
  return f;
}
test("project input is normalized and attribution/status cannot be forged", () => {
  const { data, errors } = parseProject(
    form({ status: "active", created_by: "forged", row_version: "999" }),
  );
  assert.deepEqual(errors, {});
  assert.equal(data.code, "DEMO");
  assert.equal(data.currency_code, "EUR");
  assert.equal(data.status, undefined);
  assert.equal(data.created_by, undefined);
  assert.equal(data.row_version, undefined);
});
test("invalid dates, reversed dates and excessive input rejected", () => {
  for (const date of [
    "2026-02-29",
    "2026-02-31",
    "0000-01-01",
    "2026-13-01",
    "infinity",
    "2026-1-1",
  ])
    assert.equal(validDate(date), false);
  assert.equal(validDate("2028-02-29"), true);
  assert.ok(parseProject(form({ end_date: "2025-01-01" })).errors.end_date);
  for (const [key, value] of Object.entries({
    code: " ",
    title: "x".repeat(241),
    currency_code: "EU",
    description: "x".repeat(10001),
    donor: "x".repeat(241),
    notes: "x".repeat(10001),
  }))
    assert.ok(parseProject(form({ [key]: value })).errors[key]);
});
test("identifiers and versions cannot become arbitrary filter operands", () => {
  assert.equal(validId("00000000-0000-4000-8000-000000000007"), true);
  for (const value of ["1", "abc", "x,or=(id.not.is.null)", null])
    assert.equal(validId(value), false);
  for (const value of ["0", "-1", "1.2", "1e3", "1,2", null])
    assert.equal(validVersion(value), false);
  assert.equal(validVersion("12"), true);
  assert.match(projectError("23505"), /già presente/);
});
