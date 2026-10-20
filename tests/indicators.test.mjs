import test from "node:test";
import assert from "node:assert/strict";
import { parseIndicator, indicatorValue } from "../src/lib/indicators.mjs";
const base = {
  framework_item_id: "00000000-0000-4000-8000-000000000001",
  code: "i1",
  title: "Test",
  type: "absolute",
  unit: "persone",
  aggregation_method: "last",
  direction: "increase",
  ratio_scale: "1",
  status: "draft",
  verification_source: "Registro",
};
const parse = (overrides) =>
  parseIndicator(new Map(Object.entries({ ...base, ...overrides })));
test("Draft unknown baseline differs from a zero baseline", () => {
  assert.deepEqual(parse({}).errors, {});
  assert.equal(parse({}).data.baseline_value, null);
  assert.ok(parse({ baseline_value: "0" }).errors.baseline_date);
  assert.deepEqual(
    parse({ baseline_value: "0", baseline_date: "2026-01-01" }).errors,
    {},
  );
  assert.ok(parse({ status: "active" }).errors.target_date);
});
test("Complete numerical definitions support official rates and decreasing direction", () => {
  const p = parse({
    status: "active",
    unit: "per 1.000",
    direction: "decrease",
    baseline_value: "9,2",
    baseline_date: "2024-12-31",
    target_value: "9.1",
    target_date: "2029-12-31",
  });
  assert.deepEqual(p.errors, {});
  assert.equal(p.data.baseline_value, "9.2");
  assert.ok(
    parse({ baseline_value: "1e3", baseline_date: "2026-01-01" }).errors
      .baseline_value,
  );
  assert.ok(
    parse({ baseline_value: "NaN", baseline_date: "2026-01-01" }).errors
      .baseline_value,
  );
  assert.ok(
    parse({ baseline_value: "0.0000001", baseline_date: "2026-01-01" }).errors
      .baseline_value,
  );
});
test("Ratios preserve raw values, allow over 100%, reject zero denominators and means", () => {
  const ratio = {
    type: "ratio",
    ratio_scale: "100",
    aggregation_method: "ratio_of_sums",
    baseline_numerator: "0",
    baseline_denominator: "25",
    baseline_date: "2026-01-01",
    target_numerator: "30",
    target_denominator: "25",
    target_date: "2026-12-31",
    status: "active",
  };
  const p = parse(ratio);
  assert.deepEqual(p.errors, {});
  assert.equal(indicatorValue(p.data, "target"), "120%");
  assert.ok(
    parse({ ...ratio, target_denominator: "0" }).errors.target_denominator,
  );
  assert.ok(
    parse({ ...ratio, aggregation_method: "mean" }).errors.aggregation_method,
  );
  assert.ok(parse({ ...ratio, target_value: "88" }).errors.target_value);
  assert.ok(parse({ ...ratio, target_date: "2025-01-01" }).errors.target_date);
  assert.equal(
    indicatorValue({ ...p.data, target_numerator: null }, "target"),
    "Non disponibile",
  );
});
test("Reject incompatible methods, identifiers, metadata and numeric overflow", () => {
  for (const invalid of [
    { framework_item_id: "x" },
    { verification_source: "" },
    { aggregation_method: "ratio_of_sums" },
    { ratio_scale: "100" },
    { status: "archived" },
    { baseline_value: "123456789012345", baseline_date: "2026-01-01" },
  ])
    assert.ok(Object.keys(parse(invalid).errors).length);
});
