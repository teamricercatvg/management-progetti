import { test, expect, type Page } from "@playwright/test";
const base = "/projects/00000000-0000-4000-8000-000000000007/quadro-logico";
async function login(page: Page, role = "manager") {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(`${role}@example.test`);
  await page
    .getByLabel("Password", { exact: true })
    .fill("local-fixture-password");
  await page.getByRole("button", { name: "Accedi", exact: true }).click();
  await expect(page).toHaveURL(/overview/);
}
async function create(page: Page, code = "A1") {
  await page.goto(base);
  await page
    .getByRole("link", { name: "Aggiungi attività a R1", exact: true })
    .click();
  await page.getByLabel("Codice attività").fill(code);
  await page.getByLabel("Titolo attività").fill("Formazione équipe");
  await page.getByLabel("Inizio previsto").fill("2026-10-01");
  await page.getByLabel("Fine prevista").fill("2026-10-31");
  await page
    .getByRole("button", { name: "Salva attività", exact: true })
    .click();
  await expect(page).toHaveURL(/activity_saved=1/);
}
const row = (page: Page) =>
  page.getByRole("article").filter({
    has: page.getByRole("heading", {
      name: "A1 — Formazione équipe",
      exact: true,
    }),
  });
test.beforeEach(async ({ request }) => {
  await request.get("http://127.0.0.1:54329/fixture/reset?scenario=activities");
});
test("Activity under result saves planned and actual dates independently", async ({
  page,
}) => {
  await login(page);
  await create(page);
  await expect(row(page).getByText("Prevista", { exact: true })).toBeVisible();
  await expect(
    row(page).getByText("Non indicata", { exact: true }),
  ).toHaveCount(2);
  await page
    .getByRole("link", { name: "Modifica attività A1", exact: true })
    .click();
  await page.getByLabel("Inizio effettivo").fill("2026-10-03");
  await page
    .getByRole("button", { name: "Salva attività", exact: true })
    .click();
  await expect(page).toHaveURL(/activity_saved=1/);
  await expect(row(page).getByText("In corso", { exact: true })).toBeVisible();
  await page
    .getByRole("link", { name: "Modifica attività A1", exact: true })
    .click();
  await page.getByLabel("Fine effettiva").fill("2026-11-04");
  await page
    .getByLabel("Risultato collegato")
    .selectOption({ label: "R2 — Titolo R2" });
  await page
    .getByRole("button", { name: "Salva attività", exact: true })
    .click();
  await expect(page).toHaveURL(/activity_saved=1/);
  await page.reload();
  await expect(row(page).getByText("Conclusa", { exact: true })).toBeVisible();
  await expect(
    row(page).getByText("31/10/2026", { exact: true }),
  ).toBeVisible();
  await expect(
    row(page).getByText("04/11/2026", { exact: true }),
  ).toBeVisible();
  const result = page
    .locator("li")
    .filter({
      has: page.getByRole("heading", { name: "R2 — Titolo R2", exact: true }),
    })
    .last();
  await expect(
    result.getByRole("heading", { name: "A1 — Formazione équipe" }),
  ).toBeVisible();
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/activities-${width}.png`,
      fullPage: true,
    });
  }
});
test("Activity validation retains inputs; duplicate codes are rejected", async ({
  page,
}) => {
  await login(page);
  await create(page);
  await page
    .getByRole("link", { name: "Modifica attività A1", exact: true })
    .click();
  await page.getByLabel("Fine prevista").fill("2026-09-01");
  await page
    .getByRole("button", { name: "Salva attività", exact: true })
    .click();
  await expect(page.getByText(/La fine prevista deve/)).toBeVisible();
  await expect(page.getByLabel("Titolo attività")).toHaveValue(
    "Formazione équipe",
  );
  await page.getByLabel("Fine prevista").fill("2026-10-31");
  await page.getByLabel("Fine effettiva").fill("2026-11-01");
  await page
    .getByRole("button", { name: "Salva attività", exact: true })
    .click();
  await expect(page.getByText(/La fine effettiva richiede/)).toBeVisible();
  await page.goto(base);
  await page
    .getByRole("link", { name: "Aggiungi attività a R1", exact: true })
    .click();
  await page.getByLabel("Codice attività").fill("A1");
  await page.getByLabel("Titolo attività").fill("Duplicata");
  await page.getByLabel("Inizio previsto").fill("2026-10-01");
  await page.getByLabel("Fine prevista").fill("2026-10-31");
  await page
    .getByRole("button", { name: "Salva attività", exact: true })
    .click();
  await expect(
    page.getByText("Il codice attività è già utilizzato nel progetto."),
  ).toBeVisible();
  await expect(page.getByLabel("Titolo attività")).toHaveValue("Duplicata");
  await expect(page.getByLabel("Risultato collegato")).toHaveValue(
    "00000000-0000-4000-8000-000000000103",
  );
  await expect(page.getByLabel("Priorità", { exact: true })).toHaveValue(
    "normal",
  );
  for (const width of [1440, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/activity-form-${width}.png`,
      fullPage: true,
    });
  }
});
test("Archive activity before result, restore result before activity", async ({
  page,
}) => {
  await login(page);
  await create(page);
  const result = page.getByRole("article").filter({
    has: page.getByRole("heading", { name: "R1 — Titolo R1", exact: true }),
  });
  await result
    .getByRole("button", { name: "Archivia elemento", exact: true })
    .click();
  await expect(result.getByText(/Gerarchia non valida/)).toBeVisible();
  await row(page)
    .getByRole("button", { name: "Archivia attività", exact: true })
    .click();
  await expect(
    row(page).getByText("Archiviata", { exact: true }),
  ).toBeVisible();
  await result
    .getByRole("button", { name: "Archivia elemento", exact: true })
    .click();
  await expect(result.getByText("Archiviato", { exact: true })).toBeVisible();
  await row(page)
    .getByRole("button", { name: "Riattiva attività", exact: true })
    .click();
  await expect(
    row(page).getByText(/Verifica le date e il risultato/),
  ).toBeVisible();
  await result
    .getByRole("button", { name: "Riattiva elemento", exact: true })
    .click();
  await expect(result.getByRole("link", { name: "Modifica R1" })).toBeVisible();
  await row(page)
    .getByRole("button", { name: "Riattiva attività", exact: true })
    .click();
  await expect(row(page).getByText("Prevista", { exact: true })).toBeVisible();
});
test("Concurrent activity edit preserves first save; archived project is read-only", async ({
  page,
  context,
}) => {
  await login(page, "admin");
  await create(page);
  await page
    .getByRole("link", { name: "Modifica attività A1", exact: true })
    .click();
  await expect(page).toHaveURL(/activity=/);
  const other = await context.newPage();
  await other.goto(page.url());
  await page.getByLabel("Note attività").fill("Primo salvataggio");
  await page
    .getByRole("button", { name: "Salva attività", exact: true })
    .click();
  await expect(page).toHaveURL(/activity_saved=1/);
  await other.getByLabel("Note attività").fill("Secondo salvataggio");
  await other
    .getByRole("button", { name: "Salva attività", exact: true })
    .click();
  await expect(
    other.getByText(/Attività modificata, archiviata o non più accessibile/),
  ).toBeVisible();
  await expect(other.getByLabel("Note attività")).toHaveValue(
    "Secondo salvataggio",
  );
  await other.close();
  await page.goto("/projects/00000000-0000-4000-8000-000000000007");
  await page.getByLabel("Nuovo stato").selectOption("archived");
  await page
    .getByRole("button", { name: "Aggiorna stato", exact: true })
    .click();
  await expect(
    page.getByText("Stato aggiornato.", { exact: true }),
  ).toBeVisible();
  await page.goto(base);
  await expect(
    row(page).getByText("Primo salvataggio", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Modifica attività/ }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Archivia attività", exact: true }),
  ).toHaveCount(0);
});
