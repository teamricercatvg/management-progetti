// Synthetic UI contract fixture. Database permissions and constraints are tested in SQL.
const uuid = (n) => `10000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const empty = () => ({
  revisions: [],
  lines: [],
  items: [],
  categories: [],
  allocations: [],
  state: null,
  accounts: [],
  rates: [],
  entries: [],
  partners: [
    { id: uuid(1), label: "TVG · Università Tor Vergata", role: "lead" },
    { id: uuid(2), label: "ACAP · Associazione partner", role: "partner" },
  ],
  results: [
    {
      id: uuid(3),
      label: "R1 · Rafforzamento dei servizi sanitari",
      status: "active",
    },
    { id: uuid(4), label: "R2 · Formazione degli operatori", status: "active" },
  ],
});
let data = empty();
export function resetFinance(scenario = "") {
  data = empty();
  if (!scenario.startsWith("finance")) return;
  data.accounts = [
    {
      id: uuid(5),
      partner_id: uuid(1),
      name: "Conto progetto TVG",
      bank_name: "Banca dimostrativa",
      account_reference: "Riferimento sintetico",
      status: "active",
      row_version: 1,
    },
    {
      id: uuid(6),
      partner_id: uuid(2),
      name: "Conto progetto ACAP",
      status: "active",
      row_version: 1,
    },
  ];
  if (scenario === "finance-empty") return;
  data.revisions = [
    {
      id: uuid(7),
      revision_number: 1,
      title: "Piano approvato dal donatore",
      reason: "Approvazione iniziale",
      status: "approved",
      row_version: 4,
      approved_at: "2026-01-01T00:00:00Z",
      project_snapshot: {
        start_date: "2026-01-01",
        end_date: "2026-12-31",
        currency_code: "EUR",
      },
    },
  ];
  data.state = { initial_revision_id: uuid(7), current_revision_id: uuid(7) };
  data.categories = [{ id: uuid(8), code: "A", name: "Risorse umane" }];
  data.items = [{ id: uuid(9), code: "A.1" }];
  data.lines = [
    {
      id: uuid(10),
      revision_id: uuid(7),
      line_item_id: uuid(9),
      category_id: uuid(8),
      category_name_snapshot: "A · Risorse umane",
      description: "Personale di progetto",
      planned_amount: 1000,
    },
  ];
  data.allocations = [
    {
      id: uuid(11),
      budget_line_id: uuid(10),
      partner_id: uuid(1),
      result_id: uuid(3),
      project_year: 1,
      amount: 600,
    },
    {
      id: uuid(12),
      budget_line_id: uuid(10),
      partner_id: uuid(2),
      result_id: uuid(4),
      project_year: 1,
      amount: 400,
    },
  ];
  const entry = (id, kind, amount, rest) => ({
    id: uuid(id),
    kind,
    reference: `${kind.toUpperCase()}-${id}`,
    description:
      kind === "income"
        ? "Prima tranche donatore"
        : kind === "commitment"
          ? "Contratto personale di progetto"
          : "Pagamento personale",
    entry_date: "2026-02-01",
    partner_id: uuid(1),
    account_id: uuid(5),
    line_item_id: ["expense", "commitment"].includes(kind) ? uuid(9) : null,
    result_id: ["expense", "commitment"].includes(kind) ? uuid(3) : null,
    commitment_id: null,
    destination_partner_id: null,
    destination_account_id: null,
    original_currency_code: "EUR",
    original_amount: String(amount),
    amount,
    applied_rate: "1",
    status: kind === "commitment" ? "confirmed" : "posted",
    row_version: 1,
    notes: null,
    ...rest,
  });
  data.entries = [
    entry(13, "income", 800, {}),
    entry(14, "commitment", 600, {}),
    entry(15, "expense", 200, { commitment_id: uuid(14) }),
    entry(16, "expense", 100, {
      partner_id: uuid(2),
      account_id: null,
      result_id: null,
    }),
    entry(17, "transfer", 300, {
      destination_partner_id: uuid(2),
      destination_account_id: uuid(6),
    }),
  ];
  if (scenario === "finance-showcase") {
    data.lines[0].planned_amount = 480000;
    data.allocations[0].amount = 300000;
    data.allocations[1].amount = 180000;
    const categories = [
      "Risorse umane",
      "Formazione e attività",
      "Attrezzature e forniture",
      "Gestione del progetto",
    ];
    const titles = [
      "Coordinamento scientifico",
      "Personale sanitario locale",
      "Tutor e docenti",
      "Formazione medici e infermieri",
      "Missioni e trasferte",
      "Workshop territoriali",
      "Materiale sanitario",
      "Attrezzature informatiche",
      "Comunicazione e visibilità",
      "Monitoraggio e valutazione",
      "Costi amministrativi",
    ];
    titles.forEach((title, i) => {
      const item = uuid(100 + i),
        line = uuid(200 + i),
        cat = String.fromCharCode(65 + Math.floor((i + 1) / 3));
      data.items.push({ id: item, code: `${cat}.${(i % 3) + 2}` });
      data.lines.push({
        id: line,
        revision_id: uuid(7),
        line_item_id: item,
        category_id: uuid(8),
        category_name_snapshot: `${cat} · ${categories[Math.floor((i + 1) / 3)]}`,
        description: title,
        planned_amount: 100000 + i * 4000,
      });
      data.allocations.push({
        id: uuid(300 + i),
        budget_line_id: line,
        partner_id: uuid((i % 2) + 1),
        result_id: uuid((i % 2) + 3),
        project_year: 1,
        amount: 100000 + i * 4000,
      });
      if (i < 7)
        data.entries.push(
          entry(400 + i, "expense", 5000 + i * 900, {
            line_item_id: item,
            partner_id: uuid((i % 2) + 1),
            result_id: uuid((i % 2) + 3),
            account_id: uuid((i % 2) + 5),
          }),
        );
    });
    data.entries[0].amount = 800000;
    data.entries[0].original_amount = "800000";
    data.entries[1].amount = 320000;
    data.entries[1].original_amount = "320000";
    data.entries[2].amount = 120000;
    data.entries[2].original_amount = "120000";
    data.entries[3].amount = 18000;
    data.entries[3].original_amount = "18000";
    data.entries[4].amount = 300000;
    data.entries[4].original_amount = "300000";
  }
}
export async function financeFixture(req, res, url, role, project) {
  if (
    ![
      "/rest/v1/rpc/financial_snapshot",
      "/rest/v1/rpc/edit_financial_plan",
    ].includes(url.pathname)
  )
    return false;
  let raw = "";
  for await (const chunk of req) raw += chunk;
  const args = JSON.parse(raw || "{}");
  const send = (value) => {
    res.end(JSON.stringify(value));
    return true;
  };
  const fail = (message, code = "23514") => {
    res.statusCode = 400;
    return send({ code, message });
  };
  if (!project || !["admin", "manager"].includes(role))
    return fail("Forbidden", "42501");
  if (url.pathname.endsWith("financial_snapshot")) return send(data);
  if (project.status === "archived") return fail("Archived", "42501");
  const { command, expected_version, payload: p } = args;
  const draft = data.revisions.find((r) => r.status === "draft");
  const id = () => crypto.randomUUID();
  if (command === "create_revision") {
    if (draft) return fail("Stale", "40001");
    const r = {
      id: id(),
      revision_number: data.revisions.length + 1,
      title: p.title,
      reason: p.reason,
      status: "draft",
      row_version: 1,
      based_on_id: data.state?.current_revision_id ?? null,
    };
    data.revisions.push(r);
    for (const l of data.lines.filter(
      (l) => l.revision_id === data.state?.current_revision_id,
    )) {
      const copy = { ...l, id: id(), revision_id: r.id };
      data.lines.push(copy);
      data.allocations.push(
        ...data.allocations
          .filter((a) => a.budget_line_id === l.id)
          .map((a) => ({ ...a, id: id(), budget_line_id: copy.id })),
      );
    }
    return send(r.id);
  }
  if (["save_line", "save_allocation", "publish"].includes(command)) {
    if (!draft || draft.row_version !== expected_version)
      return fail("Stale", "40001");
    if (command === "save_line") {
      let item = data.items.find((i) => i.id === p.line_item_id);
      if (!item) {
        item = { id: id(), code: p.code };
        data.items.push(item);
      }
      let cat = data.categories.find((c) => c.code === p.category_code);
      if (!cat) {
        cat = { id: id(), code: p.category_code, name: p.category_name };
        data.categories.push(cat);
      }
      const line = data.lines.find(
          (l) => l.revision_id === draft.id && l.line_item_id === item.id,
        ),
        next = {
          id: line?.id ?? id(),
          revision_id: draft.id,
          line_item_id: item.id,
          category_id: cat.id,
          category_name_snapshot: `${cat.code} · ${cat.name}`,
          description: p.description,
          planned_amount: Number(p.planned_amount),
          notes: p.notes,
        };
      if (line) Object.assign(line, next);
      else data.lines.push(next);
    } else if (command === "save_allocation") {
      const own = data.allocations.filter(
          (a) => a.budget_line_id === p.budget_line_id,
        ),
        match = own.find(
          (a) =>
            (a.result_id ?? "") === (p.result_id ?? "") &&
            (a.partner_id ?? "") === (p.partner_id ?? "") &&
            String(a.project_year ?? "") === (p.project_year ?? ""),
        );
      if (
        own.reduce((s, a) => s + (a === match ? 0 : a.amount), 0) +
          Number(p.amount) >
        data.lines.find((l) => l.id === p.budget_line_id).planned_amount
      )
        return fail("Le ripartizioni superano il totale della voce.");
      const next = {
        id: match?.id ?? id(),
        budget_line_id: p.budget_line_id,
        partner_id: p.partner_id || null,
        result_id: p.result_id || null,
        project_year: p.project_year ? Number(p.project_year) : null,
        amount: Number(p.amount),
      };
      if (match) Object.assign(match, next);
      else data.allocations.push(next);
      data.allocations = data.allocations.filter((a) => a.amount > 0);
    } else {
      if (
        !data.lines.some(
          (l) => l.revision_id === draft.id && l.planned_amount > 0,
        )
      )
        return fail("Inserisci almeno una voce con importo positivo.");
      Object.assign(draft, {
        status: "approved",
        title: p.title,
        reason: p.reason,
        approved_at: new Date().toISOString(),
        project_snapshot: {
          start_date: project.start_date,
          end_date: project.end_date,
          currency_code: project.currency_code,
        },
      });
      data.state = {
        initial_revision_id: data.state?.initial_revision_id ?? draft.id,
        current_revision_id: draft.id,
      };
    }
    draft.row_version++;
    return send(draft.id);
  }
  if (command === "save_entry") {
    if (!data.state) return fail("Approva prima il piano finanziario.");
    const existing = data.entries.find((e) => e.id === p.id);
    if (
      existing &&
      (existing.status !== "draft" || existing.row_version !== expected_version)
    )
      return fail("Stale", "40001");
    if (
      data.entries.some(
        (e) =>
          e.id !== p.id && e.reference === p.reference && e.kind === p.kind,
      )
    )
      return fail("Duplicate", "23505");
    const linked = data.entries.find((e) => e.id === p.commitment_id),
      register = p.register === "true";
    if (linked && register) {
      const paid = data.entries
        .filter((e) => e.commitment_id === linked.id && e.status === "posted")
        .reduce((s, e) => s + e.amount, 0);
      if (paid + Number(p.original_amount) > linked.amount)
        return fail("Il pagamento supera il residuo dell’impegno.");
    }
    const row = {
      ...p,
      id: p.id || id(),
      row_version: (existing?.row_version ?? 0) + 1,
      status: register
        ? p.kind === "commitment"
          ? "confirmed"
          : "posted"
        : "draft",
      amount: Number(p.original_amount),
      applied_rate: "1",
      notes: p.notes || null,
    };
    if (existing) Object.assign(existing, row);
    else data.entries.unshift(row);
    return send(row.id);
  }
  if (command === "void_entry" || command === "close_commitment") {
    const row = data.entries.find((e) => e.id === p.id);
    if (!row || row.row_version !== expected_version)
      return fail("Stale", "40001");
    row.status =
      command === "close_commitment"
        ? "closed"
        : row.kind === "commitment" || row.status === "draft"
          ? "cancelled"
          : "voided";
    row.void_reason = p.reason;
    row.row_version++;
    return send(row.id);
  }
  if (command === "save_account") {
    const row = data.accounts.find((a) => a.id === p.id);
    const next = {
      ...p,
      id: row?.id ?? id(),
      status: p.status || "active",
      row_version: (row?.row_version ?? 0) + 1,
    };
    if (row) Object.assign(row, next);
    else data.accounts.push(next);
    return send(next.id);
  }
  if (command === "save_rate") {
    const row = {
      ...p,
      id: id(),
      rate_month: p.rate_month,
      version: expected_version + 1,
    };
    data.rates.unshift(row);
    return send(row.id);
  }
  return fail("Unknown command");
}
