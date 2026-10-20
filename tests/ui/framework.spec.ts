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
async function add(
  page: Page,
  code: string,
  type = "general_objective",
  parent?: string,
) {
  await page.goto(base + "?new=1");
  await page.getByLabel("Livello").selectOption(type);
  if (parent) await page.getByLabel("Genitore").selectOption({ label: parent });
  await page.getByLabel("Codice").fill(code);
  await page
    .getByRole("textbox", { name: "Titolo *", exact: true })
    .fill("Titolo " + code);
  await page.getByRole("button", { name: "Salva elemento" }).click();
  await expect(page).toHaveURL(/saved=1/);
}
test.beforeEach(async ({ request }) => {
  await request.get("http://127.0.0.1:54329/fixture/reset");
});
test("Manager builds hierarchy, edits order, handles duplicate and archives bottom-up", async ({
  page,
}) => {
  await login(page);
  await page.goto(base);
  await expect(page.getByText("Il quadro logico è ancora vuoto")).toBeVisible();
  await add(page, "OG1");
  await add(page, "OS1", "specific_objective", "OG1 — Titolo OG1");
  await add(page, "R1", "expected_result", "OS1 — Titolo OS1");
  await page.getByRole("link", { name: "Modifica R1", exact: true }).click();
  await page.getByLabel("Ordine").fill("7");
  await page.getByRole("button", { name: "Aggiungi rischio" }).click();
  await page.getByLabel("Descrizione del rischio 1").fill("Condizione di prova");
  await page.getByLabel("Azioni previste di mitigazione 1").fill("Azione di prova");
  await page.getByRole("button", { name: "Salva elemento" }).click();
  await expect(page.getByText("Rischio: Condizione di prova", { exact: true })).toBeHidden();
  await page.getByText("Rischi e azioni di mitigazione", { exact: true }).click();
  await expect(page.getByText("Rischio: Condizione di prova", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Risultato atteso", { exact: true })).toBeVisible();
  await page.goto(base + "?new=1");
  await page.getByLabel("Codice").fill("OG1");
  await page
    .getByRole("textbox", { name: "Titolo *", exact: true })
    .fill("Conserva input");
  await page.getByRole("button", { name: "Salva elemento" }).click();
  await expect(
    page.getByText("Il codice è già utilizzato nel progetto."),
  ).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Titolo *", exact: true }),
  ).toHaveValue("Conserva input");
  await page.goto(base);
  const og = page
    .getByRole("article")
    .filter({
      has: page.getByRole("heading", { name: "OG1 — Titolo OG1", exact: true }),
    });
  page.once("dialog", (dialog) => dialog.dismiss());
  await og.getByRole("button", { name: "Archivia elemento" }).click();
  await expect(og.getByRole("link", { name: "Modifica OG1" })).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await og.getByRole("button", { name: "Archivia elemento" }).click();
  await expect(page.getByRole("button", { name: "Riattiva elemento" })).toHaveCount(3);
  await page.reload();
  await expect(page.getByText("Archiviato", { exact: true })).toHaveCount(3);
  await og.getByRole("button", { name: "Riattiva elemento" }).click();
  await expect(og.getByRole("link", { name: "Modifica OG1" })).toBeVisible();
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/framework-${width}.png`,
      fullPage: true,
    });
  }
});
test("Concurrent edit preserves stale input and reports conflict", async ({
  page,
  context,
}) => {
  await login(page, "admin");
  await add(page, "OG1");
  await page.getByRole("link", { name: "Modifica OG1" }).click();
  await expect(page).toHaveURL(/edit=/);
  const other = await context.newPage();
  await other.goto(page.url());
  await page
    .getByRole("textbox", { name: "Titolo *", exact: true })
    .fill("First save");
  await page.getByRole("button", { name: "Salva elemento" }).click();
  await expect(page).toHaveURL(/saved=1/);
  await other
    .getByRole("textbox", { name: "Titolo *", exact: true })
    .fill("Stale edit");
  await other.getByRole("button", { name: "Salva elemento" }).click();
  await expect(
    other.getByText(/Elemento modificato o non più accessibile/),
  ).toBeVisible();
  await expect(
    other.getByRole("textbox", { name: "Titolo *", exact: true }),
  ).toHaveValue("Stale edit");
  await other.close();
});
test("Unassigned user cannot open hierarchy; archived project is read-only", async ({
  page,
}) => {
  await login(page, "admin");
  await add(page, "OG1");
  await page.goto("/projects/00000000-0000-4000-8000-000000000007");
  await page.getByLabel("Nuovo stato").selectOption("archived");
  await page.getByRole("button", { name: "Aggiorna stato" }).click();
  await expect(
    page.getByText("Stato aggiornato.", { exact: true }),
  ).toBeVisible();
  await page.goto(base);
  await expect(page.getByText(/quadro logico in sola lettura/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Archivia elemento" }),
  ).toHaveCount(0);
  await page.context().clearCookies();
  await login(page, "unassigned");
  await page.goto(base);
  await expect(
    page.getByRole("heading", { name: /non disponibile/i }),
  ).toBeVisible();
});

test('Order between siblings and reparenting survive reload', async ({ page }) => {
  await login(page);
  await add(page, 'OG1');
  await add(page, 'OG2');
  await page.getByRole('link', { name: 'Modifica OG1' }).click();
  await page.getByLabel('Ordine').fill('10');
  await page.getByRole('button', { name: 'Salva elemento' }).click();
  await expect(page).toHaveURL(/saved=1/);
  await page.reload();
  await expect(page.locator('article h2').first()).toHaveText('OG2 — Titolo OG2');
  await add(page, 'OS1', 'specific_objective', 'OG1 — Titolo OG1');
  await page.getByRole('link', { name: 'Modifica OS1' }).click();
  await page.getByLabel('Genitore').selectOption({ label: 'OG2 — Titolo OG2' });
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({path: `test-results/framework-form-${width}.png`, fullPage: true});
  }
  await page.getByRole('button', { name: 'Salva elemento' }).click();
  await expect(page).toHaveURL(/saved=1/);
  await page.reload();
  await expect(page.locator('ol.framework-tree').first().locator(':scope > li').first().getByRole('heading', { name: 'OS1 — Titolo OS1', exact: true })).toBeVisible();
});

test("compact tree collapses branches and expands long descriptions", async ({ page }) => {
  await login(page);
  await add(page, "OG1");
  await add(page, "OS1", "specific_objective", "OG1 — Titolo OG1");
  await add(page, "R1", "expected_result", "OS1 — Titolo OS1");
  await page.getByRole("link", { name: "Modifica OG1", exact: true }).click();
  await page.getByLabel("Descrizione", { exact: true }).fill("Prima riga\nSeconda riga\nTerza riga\nQuarta riga");
  await page.getByRole("button", { name: "Salva elemento" }).click();
  const more = page.getByRole("button", { name: "Altro...", exact: true });
  await expect(more).toBeVisible();
  await more.click();
  await expect(page.getByRole("button", { name: "Meno", exact: true })).toHaveAttribute("aria-expanded", "true");
  await page.getByRole("button", { name: "Meno", exact: true }).click();
  await page.getByRole("button", { name: "Chiudi figli di OS1", exact: true }).click();
  await expect(page.getByRole("heading", { name: "R1 — Titolo R1", exact: true })).toBeHidden();
  await page.getByRole("button", { name: "Chiudi tutto", exact: true }).click();
  await expect(page.getByRole("heading", { name: "OS1 — Titolo OS1", exact: true })).toBeHidden();
  await page.getByRole("button", { name: "Espandi tutto", exact: true }).click();
  await expect(page.getByRole("heading", { name: "R1 — Titolo R1", exact: true })).toBeVisible();
});

test("sidebar starts collapsed and toggles labels", async ({ page }) => {
  await login(page);
  const sidebar = page.getByRole("complementary");
  await expect(sidebar.getByRole("button", { name: "Espandi menu" })).toHaveAttribute("aria-expanded", "false");
  await expect(sidebar.getByRole("link", { name: "Progetti", exact: true })).toBeVisible();
  await expect(sidebar.locator(".sidebar-label").filter({ hasText: /^Progetti$/ })).toBeHidden();
  await sidebar.getByRole("button", { name: "Espandi menu" }).click();
  await expect(sidebar.locator(".sidebar-label").filter({ hasText: /^Progetti$/ })).toBeVisible();
  await sidebar.getByRole("button", { name: "Comprimi menu" }).click();
  await expect(sidebar.locator(".sidebar-label").filter({ hasText: /^Progetti$/ })).toBeHidden();
});

test("plus on specific objective prefills a new result", async ({ page }) => {
  await login(page);
  await add(page, "OG1");
  await add(page, "OS1", "specific_objective", "OG1 — Titolo OG1");
  await page.getByRole("link", { name: "Aggiungi risultato a OS1", exact: true }).click();
  await expect(page.getByLabel("Livello")).toHaveValue("expected_result");
  await expect(page.getByLabel("Genitore").locator("option:checked")).toHaveText("OS1 — Titolo OS1");
  await page.getByLabel("Codice").fill("R1");
  await page.getByRole("textbox", { name: "Titolo *", exact: true }).fill("Nuovo risultato");
  await page.getByRole("button", { name: "Salva elemento", exact: true }).click();
  await expect(page).toHaveURL(/saved=1/);
  await expect(page.getByRole("heading", { name: "R1 — Nuovo risultato", exact: true })).toBeVisible();
});
