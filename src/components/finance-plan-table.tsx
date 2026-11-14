"use client";
import Link from "next/link";
import { Fragment, useState } from "react";
import type {
  FinancialData,
  FinancialLine,
  FinancialRevision,
} from "@/lib/finance-data";
import type { Project } from "@/lib/project-data";
import { cents, money, financeHierarchy } from "@/lib/finance.mjs";
type HierarchyGroup = {
  key: string;
  label: string;
  lines: FinancialLine[];
  categories: Map<string, FinancialLine[]>;
};
export function FinancePlanTable({
  project,
  data,
  lines,
  initial,
  selected,
  isDraft,
  base,
}: {
  project: Project;
  data: FinancialData;
  lines: FinancialLine[];
  initial: FinancialLine[];
  selected: FinancialRevision;
  isDraft: boolean;
  base: string;
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(
    () => new Set(financeHierarchy(lines).map((g: HierarchyGroup) => g.key)),
  );
  const total = lines.reduce((sum, l) => sum + cents(l.planned_amount), 0n);
  const hasHierarchy = lines.some((l) => !!l.macro_code);
  function allocationCells(children: FinancialLine[]) {
    const ids = new Set(children.map((l) => l.id));
    const own = data.allocations.filter((a) => ids.has(a.budget_line_id));
    const value = children.reduce(
      (sum, l) => sum + cents(l.planned_amount),
      0n,
    );
    return (["result_id", "partner_id", "project_year"] as const).map((dim) => {
      const groups = new Map<string, { label: string; amount: bigint }>();
      let allocated = 0n;
      for (const a of own)
        if (a[dim]) {
          const key = String(a[dim]);
          const label =
            dim === "result_id"
              ? (a.result_label ??
                data.results.find((r) => r.id === a.result_id)?.label ??
                "Risultato")
              : dim === "partner_id"
                ? (a.partner_label ??
                  data.partners.find((p) => p.id === a.partner_id)?.label ??
                  "Partner")
                : `Anno ${a.project_year}`;
          groups.set(key, {
            label,
            amount: (groups.get(key)?.amount ?? 0n) + cents(a.amount),
          });
          allocated += cents(a.amount);
        }
      return (
        <td key={dim}>
          <ul className="finance-allocations">
            {[...groups].map(([key, g]) => (
              <li key={key}>
                <span title={g.label}>{g.label.split(" · ")[0]}</span>
                <strong>{money(g.amount, "").trim()}</strong>
              </li>
            ))}
            {allocated < value && (
              <li className="finance-unassigned">
                <span>
                  {dim === "result_id" ? "Non attribuito" : "Da ripartire"}
                </span>
                <strong>{money(value - allocated, "").trim()}</strong>
              </li>
            )}
            {value === 0n && <li>—</li>}
          </ul>
        </td>
      );
    });
  }
  function header(
    key: string,
    label: string,
    children: FinancialLine[],
    depth: number,
  ) {
    const value = children.reduce(
      (sum, l) => sum + cents(l.planned_amount),
      0n,
    );
    const original = children.reduce(
      (sum, l) =>
        sum +
        cents(
          initial.find((i) => i.line_item_id === l.line_item_id)
            ?.planned_amount ?? 0,
        ),
      0n,
    );
    return (
      <tr className={`finance-group-row depth-${depth}`}>
        <th scope="row">
          <button
            type="button"
            aria-expanded={!collapsed.has(key)}
            onClick={() =>
              setCollapsed((previous) => {
                const next = new Set(previous);
                if (next.has(key)) next.delete(key);
                else next.add(key);
                return next;
              })
            }
          >
            {collapsed.has(key) ? "▸" : "▾"} {label}
          </button>
          <small>{children.length} voci · subtotale</small>
        </th>
        <td className="finance-number">
          {data.state ? money(original, "") : "—"}
        </td>
        <td className="finance-number">{money(value, "")}</td>
        <td className="finance-number">
          {data.state ? money(value - original, "") : "—"}
        </td>
        {allocationCells(children)}
        {isDraft && <td />}
      </tr>
    );
  }
  const renderLines = (groupLines: FinancialLine[]) =>
    groupLines.map((l) => {
      const original = initial.find((x) => x.line_item_id === l.line_item_id),
        value = cents(l.planned_amount);
      return (
        <tr key={l.id} data-finance-line="true">
          <th scope="row">
            <span>
              {data.items.find((i) => i.id === l.line_item_id)?.code} ·{" "}
              {l.description}
            </span>
            <small>{l.category_name_snapshot}</small>
            {l.notes && (
              <details className="finance-source-notes">
                <summary>Note e fonti</summary>
                <p>{l.notes}</p>
              </details>
            )}
          </th>
          <td className="finance-number">
            {data.state ? money(original?.planned_amount ?? 0, "").trim() : "—"}
          </td>
          <td className="finance-number finance-emphasis">
            {money(value, "").trim()}
          </td>
          <td className="finance-number">
            {data.state
              ? money(value - cents(original?.planned_amount ?? 0), "").trim()
              : "—"}
          </td>
          {allocationCells([l])}
          {isDraft && (
            <td>
              <Link
                href={`${base}?revision=${selected.id}&line=${l.id}#plan-editor`}
              >
                Modifica / ripartisci
              </Link>
            </td>
          )}
        </tr>
      );
    });
  return (
    <>
      {" "}
      {hasHierarchy && (
        <div className="finance-hierarchy-controls">
          <span>Macrovoce → categoria → voce</span>
          <button
            type="button"
            className="secondary"
            onClick={() => setCollapsed(new Set())}
          >
            Espandi tutto
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() =>
              setCollapsed(
                new Set(
                  financeHierarchy(lines).map((g: HierarchyGroup) => g.key),
                ),
              )
            }
          >
            Solo macrovoci
          </button>
        </div>
      )}
      <table className="finance-table finance-plan-table">
        <caption>
          Piano selezionato · confronto con il primo piano approvato
        </caption>
        <thead>
          <tr>
            <th>Voce / categoria</th>
            <th className="finance-number">Iniziale</th>
            <th className="finance-number">Versione selezionata</th>
            <th className="finance-number">Variazione</th>
            <th>Risultati</th>
            <th>Partner</th>
            <th>Anni</th>
            {isDraft && <th>Azioni</th>}
          </tr>
        </thead>
        <tbody>
          {hasHierarchy
            ? financeHierarchy(lines).map((group: HierarchyGroup) => (
                <Fragment key={group.key}>
                  {header(group.key, group.label, group.lines, 0)}
                  {!collapsed.has(group.key) &&
                    [...group.categories].map(([name, children]) => {
                      const key = group.key + ":" + name;
                      const redundant =
                        children.every(
                          (line) =>
                            data.items.find(
                              (item) => item.id === line.line_item_id,
                            )?.code === name.split(" · ")[0],
                        ) ||
                        (group.categories.size === 1 && group.label === name);
                      return (
                        <Fragment key={key}>
                          {!redundant && header(key, name, children, 1)}
                          {(redundant || !collapsed.has(key)) &&
                            renderLines(children)}
                        </Fragment>
                      );
                    })}
                </Fragment>
              ))
            : renderLines(lines)}
        </tbody>
        <tfoot>
          <tr>
            <th>Totale {project.currency_code}</th>
            <td className="finance-number">
              {data.state
                ? money(
                    initial.reduce((s, l) => s + cents(l.planned_amount), 0n),
                    "",
                  ).trim()
                : "—"}
            </td>
            <td className="finance-number">{money(total, "").trim()}</td>
            <td colSpan={isDraft ? 5 : 4} />
          </tr>
        </tfoot>
      </table>
    </>
  );
}
