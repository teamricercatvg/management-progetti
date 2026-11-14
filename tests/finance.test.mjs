import { test } from "node:test";
import assert from "node:assert/strict";
import {
  cents,
  decimal,
  money,
  percent,
  financialSummary,
  accountBalances,
  commitmentRemainders,
  planSlices,
  projectYears,
  projectYear,
  elapsedPercent,
} from "../src/lib/finance.mjs";
const dates = { start_date: "2026-07-01", end_date: "2028-06-30" };
const lines = [
  {
    id: "l",
    line_item_id: "i",
    planned_amount: 1000,
    category_name_snapshot: "Staff",
  },
];
const data = {
  allocations: [
    {
      id: "a1",
      budget_line_id: "l",
      partner_id: "p1",
      result_id: "r1",
      project_year: 1,
      amount: 600,
    },
    {
      id: "a2",
      budget_line_id: "l",
      partner_id: "p2",
      result_id: "r1",
      project_year: 2,
      amount: 400,
    },
  ],
  partners: [{ id: "p1" }, { id: "p2" }],
  accounts: [{ id: "ac1" }, { id: "ac2" }],
  entries: [
    {
      id: "in",
      kind: "income",
      status: "posted",
      partner_id: "p1",
      account_id: "ac1",
      amount: 800,
      entry_date: "2026-07-01",
    },
    {
      id: "c",
      kind: "commitment",
      status: "confirmed",
      line_item_id: "i",
      partner_id: "p1",
      result_id: "r1",
      amount: 600,
      entry_date: "2026-07-02",
    },
    {
      id: "e1",
      kind: "expense",
      status: "posted",
      line_item_id: "i",
      partner_id: "p1",
      result_id: "r1",
      account_id: "ac1",
      commitment_id: "c",
      amount: 200,
      entry_date: "2026-07-03",
    },
    {
      id: "e2",
      kind: "expense",
      status: "posted",
      line_item_id: "i",
      partner_id: "p2",
      account_id: null,
      amount: 100,
      entry_date: "2026-07-04",
    },
    {
      id: "t",
      kind: "transfer",
      status: "posted",
      partner_id: "p1",
      account_id: "ac1",
      destination_partner_id: "p2",
      destination_account_id: "ac2",
      amount: 300,
      entry_date: "2026-07-05",
    },
  ],
};
test("Exact cents, no floating point or silent rounding", () => {
  assert.equal(cents("0.1") + cents("0.2"), 30n);
  assert.equal(decimal(-123n), "-1.23");
  assert.equal(money(123456n, "EUR"), "1.234,56 EUR");
  assert.throws(() => cents("0.001"));
  assert.throws(() => cents("NaN"));
  assert.equal(percent(1n, 0n), null);
  assert.equal(decimal(cents("999999999999.99")), "999999999999.99");
});
test("Partial settlement avoids double counting; cash and plan are distinct", () => {
  const s = financialSummary(data, lines, {}, dates);
  assert.deepEqual(
    [
      s.planned,
      s.received,
      s.spent,
      s.committed,
      s.available,
      s.cash,
      s.freeCash,
    ],
    [100000n, 80000n, 30000n, 40000n, 30000n, 50000n, 10000n],
  );
});
test("Transfers conserve total cash and move partner/account balances", () => {
  const a = financialSummary(data, lines, { partner_id: "p1" }, dates),
    b = financialSummary(data, lines, { partner_id: "p2" }, dates);
  assert.equal(a.cash, 30000n);
  assert.equal(b.cash, 20000n);
  assert.equal(a.received + b.received, 80000n);
  const { balances, unassigned } = accountBalances(data);
  assert.equal(balances.get("ac1"), 30000n);
  assert.equal(balances.get("ac2"), 30000n);
  assert.equal(unassigned.get("p2"), -10000n);
  assert.equal(
    [...balances.values(), ...unassigned.values()].reduce((s, n) => s + n, 0n),
    50000n,
  );
});
test("Joint allocations reconcile and do not manufacture actual result attribution", () => {
  assert.equal(
    planSlices(lines, data.allocations).reduce((s, a) => s + a.planned, 0n),
    100000n,
  );
  assert.equal(
    financialSummary(
      data,
      lines,
      { result_id: "r1", partner_id: "p1", project_year: 1 },
      dates,
    ).planned,
    60000n,
  );
  assert.equal(
    financialSummary(data, lines, { result_id: "r1" }, dates).spent,
    20000n,
  );
  assert.equal(
    financialSummary(data, lines, { result_id: "unassigned" }, dates).spent,
    10000n,
  );
  assert.equal(
    financialSummary(data, lines, { result_id: "r1" }, dates).cash,
    null,
  );
  const partial = { ...data, allocations: data.allocations.slice(0, 1) };
  assert.equal(
    financialSummary(partial, lines, { partner_id: "unassigned" }, dates)
      .planned,
    40000n,
  );
});
test("Later-year payment reduces initial-year commitment globally; closed/voided/draft semantics", () => {
  const later = structuredClone(data);
  later.entries.find((e) => e.id === "e1").entry_date = "2027-08-01";
  assert.equal(
    financialSummary(later, lines, { project_year: 1 }, dates).committed,
    40000n,
  );
  assert.equal(
    financialSummary(later, lines, { project_year: 2 }, dates).spent,
    20000n,
  );
  later.entries.find((e) => e.id === "c").status = "closed";
  assert.equal(commitmentRemainders(later.entries).get("c").remaining, 0n);
  later.entries.find((e) => e.id === "e1").status = "voided";
  assert.equal(financialSummary(later, lines, {}, dates).spent, 10000n);
  assert.equal(financialSummary(later, lines, {}, dates).committed, 0n);
  later.entries.find((e) => e.id === "e2").status = "draft";
  assert.equal(financialSummary(later, lines, {}, dates).spent, 0n);
});
test("Project years follow anniversaries, including leap day and outside dates", () => {
  assert.equal(projectYear("2027-06-30", dates.start_date, dates.end_date), 1);
  assert.equal(projectYear("2027-07-01", dates.start_date, dates.end_date), 2);
  assert.equal(
    projectYear("2028-07-01", dates.start_date, dates.end_date),
    null,
  );
  assert.deepEqual(
    projectYears("2024-02-29", "2026-02-27").map((y) => [y.start, y.end]),
    [
      ["2024-02-29", "2025-02-27"],
      ["2025-02-28", "2026-02-27"],
    ],
  );
  assert.equal(elapsedPercent("2026-01-01", "2026-12-31", "2025-01-01"), 0);
  assert.equal(elapsedPercent("2026-01-01", "2026-12-31", "2027-01-01"), 100);
});
