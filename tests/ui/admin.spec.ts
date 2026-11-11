import { expect, test, type Page } from "@playwright/test";
const target = "00000000-0000-4000-8000-000000000099";
async function login(page: Page, role = "admin") {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(`${role}@example.test`);
  await page.getByLabel("Password", { exact: true }).fill("local-fixture-password");
  await page.getByRole("button", { name: "Accedi", exact: true }).click();
  await expect(page).toHaveURL(/overview/);
}
test.beforeEach(async ({ request }) => { await request.get("http://127.0.0.1:54329/fixture/reset"); });
test("Admin manages profile, roles, membership and invitation", async ({ page }) => {
  await login(page); page.on("dialog", d => d.accept());
  await page.goto("/admin");
  await page.getByRole("link", { name: "Utente invitato", exact: true }).click();
  await expect(page.getByText("Email: invited@example.test")).toBeVisible();
  await page.getByLabel("Nome", { exact: true }).fill("Nome aggiornato");
  await page.getByRole("button", { name: "Salva nome" }).click();
  await expect(page.getByRole("heading", { name: "Nome aggiornato" })).toBeVisible();
  await page.getByRole("button", { name: "Assegna ruolo Admin" }).click();
  await expect(page.getByRole("button", { name: "Revoca ruolo Admin" })).toBeVisible();
  await page.getByRole("button", { name: "Revoca ruolo Admin" }).click();
  await expect(page.getByRole("button", { name: "Assegna ruolo Admin" })).toBeVisible();
  await page.getByRole("button", { name: "Assegna Manager — DEMO", exact: true }).click();
  await expect(page.getByRole("button", { name: "Revoca Manager — DEMO", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Revoca Manager — DEMO", exact: true }).click();
  await expect(page.getByRole("button", { name: "Assegna Manager — DEMO", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Disabilita utente" }).click();
  await expect(page.getByRole("button", { name: "Riattiva utente" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Reinvia invito" })).toHaveCount(0);
  await page.getByRole("button", { name: "Riattiva utente" }).click();
  await page.getByRole("button", { name: "Reinvia invito" }).click();
  await expect(page.getByText(/Invito inviato/)).toBeVisible();
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/admin-${width}.png`, fullPage: true });
  }
});
test("new invitation, duplicate error and last Admin protection", async ({ page }) => {
  await login(page); page.on("dialog", d => d.accept());
  await page.goto("/admin");
  await page.getByRole("button", { name: "Invita un utente", exact: true }).click();
  await page.getByRole("combobox", { name: "Ruolo", exact: true }).selectOption("admin");
  await page.getByLabel("Nome", { exact: true }).fill("Nuovo utente");
  await page.getByLabel("Email", { exact: true }).fill("duplicate@example.test");
  await page.getByRole("button", { name: "Invia invito", exact: true }).click();
  await expect(page.getByText(/Invito non inviato/)).toBeVisible();
  await page.getByLabel("Email", { exact: true }).fill("new@example.test");
  await page.getByRole("button", { name: "Invia invito", exact: true }).click();
  await expect(page.getByText(/Invito inviato/)).toBeVisible();
  await page.getByRole("button", { name: "Chiudi invito" }).click();
  await page.getByRole("link", { name: "Admin collaudo" }).click();
  await page.getByRole("button", { name: "Disabilita utente" }).click();
  await expect(page.getByText(/Operazione non riuscita/)).toBeVisible();
});
test("Manager cannot open user detail", async ({ page }) => {
  await login(page, "manager");
  await page.goto(`/admin/${target}`);
  await expect(page.getByRole("heading", { name: "Pagina non disponibile" })).toBeVisible();
});
test("a Manager cannot replay an Admin server action", async ({ page, browser }) => {
  await login(page); page.on("dialog", d => d.accept());
  await page.goto(`/admin/${target}`);
  const requestPromise = page.waitForRequest(request => request.method() === "POST" && Boolean(request.headers()["next-action"]));
  await page.getByRole("button", { name: "Assegna ruolo Admin" }).click();
  const request = await requestPromise;
  await expect(page.getByRole("button", { name: "Revoca ruolo Admin" })).toBeVisible();
  const actionId = request.headers()["next-action"];
  const contentType = request.headers()["content-type"];
  const body = request.postData()!;
  const managerContext = await browser.newContext();
  const managerPage = await managerContext.newPage();
  await login(managerPage, "manager");
  const result = await managerPage.evaluate(async ({ actionId, contentType, body, target }) => {
    const response = await fetch(`/admin/${target}`, { method: "POST", headers: { "Next-Action": actionId, "Content-Type": contentType }, body });
    return { status: response.status, text: await response.text() };
  }, { actionId, contentType, body, target });
  await managerContext.close();
  expect(result.text).not.toContain("Modifica salvata");
  expect(result.status === 404 || result.text.includes("NEXT_HTTP_ERROR_FALLBACK;404")).toBe(true);
});

test("invitation dialog requires Manager projects and lists role and assignments", async ({ page }) => {
  await login(page);
  await page.goto("/admin");
  await expect(page.getByRole("columnheader", { name: "Ruolo", exact: true })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Progetti associati" })).toBeVisible();
  await page.getByRole("button", { name: "Invita un utente", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "Invita un utente", exact: true }).click();
  await page.getByLabel("Nome", { exact: true }).fill("Nuovo Manager");
  await page.getByLabel("Email", { exact: true }).fill("manager-new@example.test");
  await page.getByRole("button", { name: "Invia invito", exact: true }).click();
  await expect(page.getByText("Seleziona da 1 a 100 progetti validi per il Manager.")).toBeVisible();
  await page.getByRole("checkbox", { name: "DEMO — Progetto dimostrativo" }).check();
  await page.getByRole("button", { name: "Invia invito", exact: true }).click();
  await expect(page.getByText(/Invito inviato/)).toBeVisible();
  await page.getByRole("button", { name: "Chiudi invito" }).click();
  const row = page.getByRole("row").filter({ has: page.getByRole("link", { name: "Utente invitato", exact: true }) });
  await expect(row.getByRole("cell", { name: "Manager", exact: true })).toBeVisible();
  await expect(row.getByRole("link", { name: "DEMO — Progetto dimostrativo" })).toBeVisible();
});

test("an invitation with incomplete permissions reports partial success", async ({ page, request }) => {
  await request.get("http://127.0.0.1:54329/fixture/reset?scenario=role_failure");
  await login(page);
  await page.goto("/admin");
  await page.getByRole("button", { name: "Invita un utente", exact: true }).click();
  await page.getByLabel("Nome", { exact: true }).fill("Admin invitato");
  await page.getByLabel("Email", { exact: true }).fill("partial@example.test");
  await page.getByRole("combobox", { name: "Ruolo", exact: true }).selectOption("admin");
  await page.getByRole("button", { name: "Invia invito", exact: true }).click();
  await expect(page.getByText(/gli accessi richiesti non sono stati completati/)).toBeVisible();
  await expect(page.getByRole("link", { name: "Apri il profilo dell’utente" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Invia invito", exact: true })).toHaveCount(0);
});

test("directory searches email and project, combines column filters and sorts", async ({ page }) => {
  await login(page); page.on("dialog", dialog => dialog.accept());
  await page.goto(`/admin/${target}`);
  await page.getByRole("button", { name: "Assegna Manager — DEMO", exact: true }).click();
  await expect(page.getByRole("button", { name: "Revoca Manager — DEMO", exact: true })).toBeVisible();
  await page.goto("/admin");
  const search = page.getByLabel("Cerca per nome, email o progetto", { exact: true });
  await search.fill("duplicate@example.test");
  await expect(page.getByRole("status")).toHaveText("1 utenti trovati");
  await expect(page.getByRole("link", { name: "Utente invitato", exact: true })).toBeVisible();
  await search.fill("dimostrativo");
  await expect(page.getByRole("status")).toHaveText("1 utenti trovati");
  await page.getByLabel("Filtra Ruolo", { exact: true }).fill("admin");
  await expect(page.getByText("Nessun utente corrisponde ai filtri.")).toBeVisible();
  await page.getByRole("button", { name: "Azzera filtri" }).click();
  await expect(page.getByRole("status")).toHaveText("2 utenti trovati");
  await page.getByRole("button", { name: "Email", exact: true }).click();
  await expect(page.locator("tbody tr").first()).toContainText("admin@example.test");
  await page.getByRole("button", { name: "Email", exact: true }).click();
  await expect(page.locator("tbody tr").first()).toContainText("duplicate@example.test");
  await page.getByLabel("Filtra Stato", { exact: true }).fill("disabilitato");
  await expect(page.getByRole("status")).toHaveText("0 utenti trovati");
});


test("assignment search matches a code or any title fragment regardless of case", async ({ page }) => {
  await login(page);
  await page.goto(`/admin/${target}`);
  const search = page.getByLabel("Cerca progetto per codice o titolo");
  for (const term of ["demo", "DIMOSTRATIVO", "mostra"]) {
    await search.fill(term);
    await page.getByRole("button", { name: "Cerca", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`q=${term}`));
    await expect(page.getByRole("link", { name: "DEMO — Progetto dimostrativo", exact: true })).toBeVisible();
  }
  await search.fill("inesistente");
  await page.getByRole("button", { name: "Cerca", exact: true }).click();
  await expect(page.getByText("Nessun progetto trovato.")).toBeVisible();
  await search.fill("");
  await page.getByRole("button", { name: "Cerca", exact: true }).click();
  await expect(page.getByRole("link", { name: "DEMO — Progetto dimostrativo", exact: true })).toBeVisible();
});
