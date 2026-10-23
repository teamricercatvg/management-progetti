import { test, expect } from "@playwright/test";
const base = "/projects/00000000-0000-4000-8000-000000000007/cronoprogramma";
test("Independent activity, draft, periods, publication and revision preserve baseline", async ({
  page,
  request,
}) => {
  await request.get("http://127.0.0.1:54329/fixture/reset?scenario=activities");
  page.on("dialog", (d) => d.accept());
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill("manager@example.test");
  await page
    .getByLabel("Password", { exact: true })
    .fill("local-fixture-password");
  await page.getByRole("button", { name: "Accedi", exact: true }).click();
  await expect(page).toHaveURL(/overview/);
  await page.goto(base);
  await page.getByRole("link", { name: "Nuova attività", exact: true }).click();
  await page.getByLabel("Codice attività").fill("ADM1");
  await page.getByLabel("Titolo attività").fill("Avvio amministrativo");
  await page.getByLabel("Categoria fuori QL").selectOption("administrative");
  await page.getByLabel("Soggetti coinvolti").fill("Ente capofila");
  await page
    .getByRole("button", { name: "Salva attività", exact: true })
    .click();
  await expect(page).toHaveURL(/activity_saved/);
  await page.getByLabel("Titolo revisione").fill("Piano iniziale");
  await page
    .getByLabel("Motivazione", { exact: true })
    .fill("Avvio del progetto");
  await page
    .getByRole("button", { name: "Crea bozza dal piano corrente" })
    .click();
  await expect(page.getByRole("heading", { name: "Bozza n. 1" })).toBeVisible();
  await page.getByText("Aggiungi periodo", { exact: true }).click();
  await page
    .getByRole("combobox", { name: "Attività", exact: true })
    .selectOption({ label: "ADM1 — Avvio amministrativo (Prevista)" });
  await page.getByLabel("Titolo del periodo").fill("Preparazione");
  await page.getByLabel("Inizio previsto").fill("2026-02-01");
  await page.getByLabel("Fine prevista").fill("2026-03-31");
  await page
    .getByRole("button", { name: "Salva periodo", exact: true })
    .click();
  await expect(
    page.getByText("ADM1 — Preparazione", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Pubblica piano", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Piano pubblicato n. 1" }),
  ).toBeVisible();
  await page.getByLabel("Titolo revisione").fill("Revisione 2");
  await page
    .getByLabel("Motivazione", { exact: true })
    .fill("Nuovo calendario");
  await page
    .getByRole("button", { name: "Crea bozza dal piano corrente" })
    .click();
  await expect(page.getByRole("heading", { name: "Bozza n. 2" })).toBeVisible();
  await page.getByRole("link", { name: "Modifica / annulla periodo" }).click();
  await page.getByLabel("Fine prevista").fill("2026-04-30");
  await page
    .getByRole("button", { name: "Salva periodo", exact: true })
    .click();
  await expect(page.getByText(/Date modificate/)).toBeVisible();
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/schedule-${width}.png`,
      fullPage: true,
    });
  }
  await page
    .getByRole("link", { name: "1. Piano iniziale — Pubblicato", exact: true })
    .click();
  await expect(
    page.getByText(/01\/02\/2026 – 31\/03\/2026/).first(),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Salva periodo" })).toHaveCount(
    0,
  );
});
