import { test, expect, type Page } from "@playwright/test";
const id = "00000000-0000-4000-8000-000000000007";
async function login(page: Page, role: string) {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(`${role}@example.test`);
  await page
    .getByLabel("Password", { exact: true })
    .fill("local-fixture-password");
  await page.getByRole("button", { name: "Accedi", exact: true }).click();
  await expect(page).toHaveURL(/overview/);
}
test.beforeEach(async ({ request }) => {
  await request.get("http://127.0.0.1:54329/fixture/reset");
});
test("Admin creates, edits, archives and reopens a project", async ({
  page,
}) => {
  await login(page, "admin");
  await page.goto("/projects");
  await expect(page.getByText("2 progetti trovati")).toBeVisible();
  await page.getByLabel("Cerca per codice o titolo").fill("riservato");
  await page.getByRole("button", { name: "Filtra", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "Progetto dimostrativo" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Progetto riservato" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Nuovo progetto" }).click();
  await expect(page).toHaveURL(/projects\/new$/);
  await page.getByLabel(/^Codice \*/).fill("NEW");
  await page.getByLabel("Titolo").fill("Nuovo progetto di prova");
  await page.getByLabel("Data di inizio").fill("2026-01-01");
  await page.getByLabel("Data di fine").fill("2026-12-31");
  await page.getByLabel("Data di fine").fill("2025-12-31");
  await page.getByRole("button", { name: "Salva progetto" }).click();
  await expect(
    page.getByText("La fine deve essere uguale o successiva all’inizio."),
  ).toBeVisible();
  await expect(page.getByLabel("Titolo")).toHaveValue(
    "Nuovo progetto di prova",
  );
  await expect(page.getByLabel("Data di inizio")).toHaveValue("2026-01-01");
  await expect(page.getByLabel("Data di fine")).toHaveValue("2025-12-31");
  await page.getByLabel("Data di fine").fill("2026-12-31");
  await page.getByLabel("Valuta principale").fill("12!");
  await page.getByRole("button", { name: "Salva progetto" }).click();
  await expect(page.getByText("Inserisci il codice valuta di tre lettere, ad esempio EUR.")).toBeVisible();
  await expect(page.getByLabel("Data di inizio")).toHaveValue("2026-01-01");
  await expect(page.getByLabel("Data di fine")).toHaveValue("2026-12-31");
  await expect(page.getByLabel("Valuta principale")).toHaveValue("12!");
  await page.getByLabel("Valuta principale").fill("EUR");
  await page.getByLabel(/^Codice \*/).fill("DEMO");
  await page.getByRole("button", { name: "Salva progetto" }).click();
  await expect(
    page.getByText("Codice o associazione già presente.", { exact: false }),
  ).toBeVisible();
  await expect(page.getByLabel("Titolo")).toHaveValue(
    "Nuovo progetto di prova",
  );
  await page.getByLabel(/^Codice \*/).fill("NEW");
  await page.getByRole("button", { name: "Salva progetto" }).click();
  await expect(page.getByText("Progetto salvato.")).toBeVisible();
  await page.getByRole("link", { name: "Modifica progetto" }).click();
  await page.getByLabel("Titolo").fill("Progetto aggiornato");
  await page.getByRole("button", { name: "Salva progetto" }).click();
  await expect(
    page.getByRole("heading", { name: "Progetto aggiornato" }),
  ).toBeVisible();
  await page.getByLabel("Nuovo stato").selectOption("archived");
  await page.getByRole("button", { name: "Aggiorna stato" }).click();
  await expect(
    page.getByRole("button", { name: "Riapri progetto" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Modifica progetto" }),
  ).toHaveCount(0);
  await page.getByLabel("Nuovo stato").selectOption("draft");
  await page.getByRole("button", { name: "Riapri progetto" }).click();
  await expect(
    page.getByRole("link", { name: "Modifica progetto" }),
  ).toBeVisible();
});
test("Manager only sees assigned project; direct URLs and creation are denied", async ({
  page,
}) => {
  await login(page, "manager");
  await page.goto("/projects");
  await expect(
    page.getByRole("link", { name: "Progetto dimostrativo" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Progetto riservato" }),
  ).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Nuovo progetto" })).toHaveCount(
    0,
  );
  for (const path of [
    "new",
    "00000000-0000-4000-8000-000000000008",
    "00000000-0000-4000-8000-000000000008/edit",
    "invalid",
  ]) {
    await page.goto(`/projects/${path}`);
    await expect(
      page.getByRole("heading", { name: "Pagina non disponibile" }),
    ).toBeVisible();
  }
  await page.goto(`/projects/${id}/edit`);
  await page.getByLabel("Titolo").fill("Aggiornato dal Manager");
  await page.getByRole("button", { name: "Salva progetto" }).click();
  await expect(
    page.getByRole("heading", { name: "Aggiornato dal Manager" }),
  ).toBeVisible();
});
test("empty access, responsive screens and stale saves", async ({
  page,
  context,
}) => {
  await login(page, "unassigned");
  await page.goto("/projects");
  await expect(
    page.getByText("Non hai ancora progetti assegnati.", { exact: false }),
  ).toBeVisible();
  await login(page, "admin");
  for (const path of ["/projects", `/projects/${id}`, `/projects/${id}/edit`]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: path.endsWith("edit") ? "Modifica progetto" : path.endsWith(id) ? "Progetto dimostrativo" : "Progetti", exact: true })).toBeVisible();
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: `test-results/projects-${path.endsWith("edit") ? "edit" : path.endsWith(id) ? "detail" : "list"}-${width}.png`,
        fullPage: false,
      });
    }
    await page.getByRole("contentinfo").scrollIntoViewIfNeeded();
    await page.screenshot({
      path: `test-results/projects-bottom-${path.endsWith("edit") ? "edit" : path.endsWith(id) ? "detail" : "list"}.png`,
    });
  }
  const other = await context.newPage();
  await other.goto(`/projects/${id}/edit`);
  await other.getByLabel("Titolo").fill("Modifica concorrente");
  await other.getByRole("button", { name: "Salva progetto" }).click();
  await expect(other.getByText("Progetto salvato.")).toBeVisible();
  await page.getByLabel("Titolo").fill("Modifica obsoleta");
  await page.getByRole("button", { name: "Salva progetto" }).click();
  await expect(
    page.getByText("Progetto modificato da un altro utente", { exact: false }),
  ).toBeVisible();
});

test("existing organization can be associated and removed from a draft", async ({
  page,
}) => {
  await login(page, "admin");
  await page.goto(`/projects/${id}`);
  await page.getByLabel("Cerca un ente esistente").fill("ORG");
  await page.getByRole("button", { name: "Cerca enti" }).click();
  await page
    .getByRole("combobox", { name: "Ente", exact: true })
    .selectOption("00000000-0000-4000-8000-000000000010");
  await page.getByRole("button", { name: "Associa ente" }).click();
  await expect(page.getByText("Ente associato.")).toBeVisible();
  await expect(page.getByRole("strong")).toContainText("Ente di prova");
  await page.getByRole("button", { name: "Rimuovi associazione" }).click();
  await expect(page.getByText("Nessun ente associato.")).toBeVisible();
});


test("pagination preserves filters and navigates beyond twenty projects", async ({ page, request }) => {
  await request.get("http://127.0.0.1:54329/fixture/reset?scenario=pagination");
  await login(page, "admin");
  await page.goto("/projects?q=PAGE&status=draft");
  await expect(page.getByText("25 progetti trovati", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /^Collaudo pagina/ })).toHaveCount(20);
  await page.getByRole("link", { name: "Successivi →", exact: true }).click();
  await expect(page).toHaveURL(/q=PAGE&status=draft&page=2$/);
  await expect(page.getByRole("link", { name: /^Collaudo pagina/ })).toHaveCount(5);
  await expect(page.getByRole("link", { name: "Collaudo pagina 021", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Successivi →", exact: true })).toHaveCount(0);
  await page.getByRole("link", { name: "← Precedenti", exact: true }).click();
  await expect(page.getByRole("link", { name: "Collaudo pagina 001", exact: true })).toBeVisible();
});

test("backend failure can be retried after service recovery", async ({ page, request }) => {
  await login(page, "admin");
  await request.get("http://127.0.0.1:54329/fixture/reset?scenario=error");
  await page.goto("/projects");
  await expect(page.getByRole("heading", { name: "Non siamo riusciti a caricare la pagina", exact: true })).toBeVisible();
  await request.get("http://127.0.0.1:54329/fixture/reset");
  await page.getByRole("button", { name: "Riprova", exact: true }).click();
  await expect(page.getByRole("link", { name: "Progetto dimostrativo", exact: true })).toBeVisible();
});
