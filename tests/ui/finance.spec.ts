import { test, expect, type Page } from "@playwright/test";
const base = "/projects/00000000-0000-4000-8000-000000000007/piano-finanziario";
test.setTimeout(90_000);
const fixture = "http://127.0.0.1:54329";
async function login(page: Page, role = "manager") {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(`${role}@example.test`);
  await page
    .getByLabel("Password", { exact: true })
    .fill("local-fixture-password");
  await page.getByRole("button", { name: "Accedi", exact: true }).click();
  await expect(page).toHaveURL(/overview/);
}
test("Dense desktop plan, cash workflow and narrow-screen overflow", async ({
  page,
  request,
}, testInfo) => {
  await request.get(`${fixture}/fixture/reset?scenario=finance-showcase`);
  await login(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(base);
  await expect(page.locator(".finance-table tbody tr")).toHaveCount(12);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("piano-finanziario-desktop.png"),
  });
  await page.goto(`${base}/piano`);
  await expect(page.locator(".finance-plan-table tbody tr")).toHaveCount(12);
  await page.screenshot({
    path: testInfo.outputPath("ripartizioni-desktop.png"),
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${base}/entrate?new=1`);
  await page
    .locator(".finance-form")
    .getByRole("combobox", { name: "Partner", exact: true })
    .selectOption("10000000-0000-4000-8000-000000000001");
  const account = page.getByRole("combobox", {
    name: "Conto (obbligatorio)",
    exact: true,
  });
  await expect(account.locator("option")).toHaveCount(2);
  await account.selectOption("10000000-0000-4000-8000-000000000005");
  await page.getByLabel("Riferimento", { exact: true }).fill("TRANCHE-2");
  await page
    .getByLabel("Descrizione", { exact: true })
    .fill("Secondo versamento del donatore");
  await page.getByLabel("Importo EUR", { exact: true }).fill("5000");
  await page
    .getByRole("button", { name: "Registra entrata", exact: true })
    .click();
  await expect(page.locator(".finance-table")).toContainText("TRANCHE-2");
  await page.goto(`${base}/trasferimenti?new=1`);
  await page
    .getByRole("combobox", { name: "Partner mittente", exact: true })
    .selectOption("10000000-0000-4000-8000-000000000001");
  await page
    .getByRole("combobox", { name: "Partner destinatario", exact: true })
    .selectOption("10000000-0000-4000-8000-000000000002");
  await page.getByLabel("Riferimento", { exact: true }).fill("TRANSFER-2");
  await page
    .getByLabel("Descrizione", { exact: true })
    .fill("Trasferimento senza conti specificati");
  await page.getByLabel("Importo EUR", { exact: true }).fill("1000");
  await page
    .getByRole("button", { name: "Registra trasferimento", exact: true })
    .click();
  await expect(page.locator(".finance-table")).toContainText("TRANSFER-2");
  await page.goto(base);
  await expect(page.locator(".finance-metric").nth(1)).toContainText(
    "805.000,00 EUR",
  );
  await expect(page.locator(".finance-cash")).toContainText("613.100,00 EUR");
});
test("Financial overview reconciles commitments, partner transfers and filters on desktop", async ({
  page,
  request,
}) => {
  await request.get(`${fixture}/fixture/reset?scenario=finance`);
  await login(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(base);
  const metrics = page.locator(".finance-metric");
  await expect(metrics).toHaveCount(5);
  await expect(metrics.nth(0)).toContainText("1.000,00 EUR");
  await expect(metrics.nth(2)).toContainText("300,00 EUR");
  await expect(metrics.nth(3)).toContainText("400,00 EUR");
  await expect(metrics.nth(4)).toContainText("300,00 EUR");
  await expect(page.locator(".finance-cash")).toContainText("500,00 EUR");
  await expect(page.locator(".finance-cash")).toContainText("100,00 EUR");
  await page.getByRole("button", { name: "Per partner", exact: true }).click();
  const partnerRow = page
    .locator(".finance-table tbody tr")
    .filter({ hasText: "TVG · Università Tor Vergata" });
  await expect(partnerRow).toContainText("600,00");
  await expect(partnerRow).toContainText("300,00");
  await page
    .getByRole("combobox", { name: "Risultato", exact: true })
    .selectOption("unassigned");
  await expect(metrics.nth(2)).toContainText("100,00 EUR");
  await expect(page.locator(".finance-cash")).toContainText(
    "azzera questi filtri",
  );
  await page.getByRole("button", { name: "Azzera filtri" }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.goto(`${base}/conti`);
  await expect(
    page.getByRole("row").filter({ hasText: "Conto non indicato" }),
  ).toContainText("−100,00 EUR");
});
test("Create, allocate and approve a plan; draft revision preserves approved baseline", async ({
  page,
  request,
}) => {
  await request.get(`${fixture}/fixture/reset?scenario=finance-empty`);
  await login(page);
  await page.goto(base);
  await page.getByRole("link", { name: "Crea il primo piano" }).click();
  await page
    .getByLabel("Motivazione / riferimento approvazione")
    .fill("Approvazione del donatore");
  await page.getByRole("button", { name: "Crea bozza del piano" }).click();
  await expect(page.getByRole("link", { name: "+ Nuova voce" })).toBeVisible();
  await page.getByRole("link", { name: "+ Nuova voce" }).click();
  await page.getByLabel("Codice voce", { exact: true }).fill("A.1");
  await page.getByLabel("Codice categoria").fill("A");
  await page.getByLabel("Nome categoria").fill("Personale");
  await page.getByLabel("Descrizione voce").fill("Personale sanitario");
  await page.getByLabel("Importo previsto").fill("1000");
  await page.getByRole("button", { name: "Salva voce", exact: true }).click();
  await expect(page.locator(".finance-plan-table")).toContainText(
    "Personale sanitario",
  );
  await page.getByRole("link", { name: "Modifica / ripartisci" }).click();
  await page
    .getByRole("combobox", { name: "Partner", exact: true })
    .selectOption({ label: "TVG · Università Tor Vergata" });
  await page
    .getByRole("combobox", { name: "Risultato", exact: true })
    .selectOption({ label: "R1 · Rafforzamento dei servizi sanitari" });
  await page
    .getByRole("combobox", { name: "Anno di progetto", exact: true })
    .selectOption("1");
  await page.getByLabel("Importo della quota").fill("1001");
  await page.getByRole("button", { name: "Salva quota" }).click();
  await expect(page.locator(".finance-error")).toContainText("superano");
  await expect(page.getByLabel("Importo della quota")).toHaveValue("1001");
  await page.getByLabel("Importo della quota").fill("1000");
  await page.getByRole("button", { name: "Salva quota" }).click();
  await expect(page.locator(".finance-plan-table")).not.toContainText(
    "Da ripartire",
  );
  await page.getByText(/Approva la versione 1/).click();
  await page.getByRole("button", { name: "Approva questa versione" }).click();
  await expect(page.getByRole("link", { name: "V1 · corrente" })).toBeVisible();
  await page.getByText("Crea una revisione dal piano corrente").click();
  await page
    .getByLabel("Motivazione / riferimento approvazione")
    .fill("Seconda versione del piano");
  await page.getByRole("button", { name: "Crea bozza del piano" }).click();
  await expect(page.getByRole("link", { name: "V2 · bozza" })).toBeVisible();
  await page.getByRole("link", { name: "V1 · corrente" }).click();
  await expect(
    page.getByRole("link", { name: "Modifica / ripartisci" }),
  ).toHaveCount(0);
});
test("Register linked payment without double counting; reject overpayment and retain values", async ({
  page,
  request,
}) => {
  await request.get(`${fixture}/fixture/reset?scenario=finance`);
  await login(page);
  await page.goto(`${base}/spese?new=1`);
  await page
    .getByRole("combobox", { name: "Collegamento a un impegno", exact: true })
    .selectOption("10000000-0000-4000-8000-000000000014");
  await page.getByLabel("Riferimento", { exact: true }).fill("SALDO-TEST");
  await page
    .getByLabel("Descrizione", { exact: true })
    .fill("Pagamento parziale");
  await page.getByLabel("Importo EUR", { exact: true }).fill("401");
  await page
    .getByRole("button", { name: "Registra spesa", exact: true })
    .click();
  await expect(page.locator(".finance-error")).toContainText(
    "supera il residuo",
  );
  await expect(page.getByLabel("Riferimento", { exact: true })).toHaveValue(
    "SALDO-TEST",
  );
  await page.getByLabel("Importo EUR", { exact: true }).fill("100");
  await page
    .getByRole("button", { name: "Registra spesa", exact: true })
    .click();
  await expect(page.locator(".finance-table")).toContainText("SALDO-TEST");
  await page.goto(base);
  await expect(page.locator(".finance-metric").nth(2)).toContainText(
    "400,00 EUR",
  );
  await expect(page.locator(".finance-metric").nth(3)).toContainText(
    "300,00 EUR",
  );
  await expect(page.locator(".finance-metric").nth(4)).toContainText(
    "300,00 EUR",
  );
});
