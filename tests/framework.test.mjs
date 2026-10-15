import test from "node:test";
import assert from "node:assert/strict";
import { parseFramework } from "../src/lib/framework.mjs";
const form = (extra = {}) => {
  const f = new FormData();
  for (const [k, v] of Object.entries({
    type: "general_objective",
    parent_id: "",
    code: " og1 ",
    title: " General ",
    sort_order: "0",
    ...extra,
  }))
    f.set(k, v);
  return f;
};
test("framework normalizes fields and ignores forged attribution", () => {
  const { data, errors } = parseFramework(
    form({ created_by: "attacker", project_id: "other", status: "archived" }),
  );
  assert.deepEqual(errors, {});
  assert.equal(data.code, "OG1");
  assert.equal(data.title, "General");
  assert.equal(data.parent_id, null);
  assert.equal(data.created_by, undefined);
  assert.equal(data.status, undefined);
});
test("framework validates hierarchy input and integer ordering", () => {
  for (const sort_order of ["", "-1", "1.5", "Infinity", "2147483648"])
    assert.ok(parseFramework(form({ sort_order })).errors.sort_order);
  assert.ok(
    parseFramework(form({ type: "specific_objective" })).errors.parent_id,
  );
  assert.ok(
    parseFramework(form({ parent_id: "80000000-0000-4000-8000-000000000001" }))
      .errors.parent_id,
  );
  assert.ok(parseFramework(form({ type: "invalid" })).errors.type);
  assert.ok(parseFramework(form({ title: "  " })).errors.title);
});
