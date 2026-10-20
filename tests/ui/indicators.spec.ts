import { test, expect, type Page } from "@playwright/test";
const base = "/projects/00000000-0000-4000-8000-000000000007/indicatori";
async function login(page: Page, role = "manager") {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(`${role}@example.test`);
  await page
    .getByLabel("Password", { exact: true })
    .fill("local-fixture-password");
  await page.getByRole("button", { name: "Accedi", exact: true }).click();
  await expect(page).toHaveURL(/overview/);
}
async function draft(page: Page, code = "I1") {
  await page.goto(base + "?new=1");
  await page
    .getByLabel("Obiettivo o risultato collegato")
    .selectOption({ label: "R1 — Titolo R1" });
  await page.getByLabel("Codice indicatore").fill(code);
  await page.getByLabel("Titolo indicatore").fill("Completamento formazione");
  await page.getByLabel("Unità di misura").fill("professionisti");
  await page.getByLabel("Fonti di verifica").fill("Registro e diplomi");
}
test.beforeEach(async ({ request, page }) => {
  page.on("dialog", (d) => d.accept());
  await request.get("http://127.0.0.1:54329/fixture/reset?scenario=activities");
});
test("Unknown baseline draft, failed activation preserves form, ratio activation and archive restore", async ({
  page,
}) => {
  await login(page);
  await draft(page);
  await page
    .getByLabel("Note sulla baseline")
    .fill("Non disponibile: rilevazione iniziale da programmare");
  await page
    .getByRole("button", { name: "Salva indicatore", exact: true })
    .click();
  await expect(page).toHaveURL(/indicator_saved/);
  await expect(
    page.getByRole("article").getByText("Non disponibile", { exact: true }),
  ).toHaveCount(2);
  await page
    .getByRole("link", { name: "Modifica indicatore", exact: true })
    .click();
  await page.getByLabel("Stato", { exact: false }).selectOption("active");
  await page
    .getByRole("button", { name: "Salva indicatore", exact: true })
    .click();
  await expect(page.locator("main [role=alert]")).toContainText("Controlla");
  await expect(page.getByLabel("Titolo indicatore")).toHaveValue(
    "Completamento formazione",
  );
  await page.getByLabel("Tipo", { exact: false }).selectOption("ratio");
  const baseline = page.getByRole("group", {
      name: "Baseline — valore iniziale",
    }),
    target = page.getByRole("group", { name: "Target — valore atteso" });
  await baseline.getByLabel("Data di riferimento").fill("2026-01-01");
  await baseline.getByLabel("Numeratore", { exact: true }).fill("0");
  await baseline.getByLabel("Denominatore", { exact: true }).fill("25");
  await target.getByLabel("Data di riferimento").fill("2026-12-31");
  await target.getByLabel("Numeratore", { exact: true }).fill("22");
  await target.getByLabel("Denominatore", { exact: true }).fill("0");
  await page
    .getByRole("button", { name: "Salva indicatore", exact: true })
    .click();
  await expect(
    page.getByText("Il denominatore deve essere maggiore di zero."),
  ).toBeVisible();
  await target.getByLabel("Denominatore", { exact: true }).fill("25");
  await page
    .getByRole("button", { name: "Salva indicatore", exact: true })
    .click();
  await expect(page).toHaveURL(/indicator_saved/);
  await page.reload();
  await expect(
    page.getByRole("article").getByText(/^88%/),
  ).toBeVisible();
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 950 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    await page.screenshot({
      path: `/tmp/ariadne-indicators-${width}.png`,
      fullPage: true,
    });
  }
  await page
    .getByRole("button", { name: "Archivia indicatore", exact: true })
    .click();
  await expect(page.getByRole("article")).toHaveCount(0);
  await page.getByRole("combobox", {name:"Archivio", exact:true}).selectOption("1");
  await page.getByRole("button", { name: "Filtra indicatori" }).click();
  await page.getByRole("button", { name: "Ripristina in bozza" }).click();
  await expect(
    page.getByRole("article").getByText("Bozza", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("article").getByText(/^88%/),
  ).toBeVisible();
});
test("Duplicate code retains values; stale update does not overwrite a newer save", async ({
  page,
  context,
}) => {
  await login(page, "admin");
  await draft(page);
  await page
    .getByRole("button", { name: "Salva indicatore", exact: true })
    .click();
  await expect(page).toHaveURL(/indicator_saved/);
  await draft(page);
  await page
    .getByRole("button", { name: "Salva indicatore", exact: true })
    .click();
  await expect(page.locator("main [role=alert]")).toContainText(
    "Codice indicatore già",
  );
  await expect(page.getByLabel("Fonti di verifica")).toHaveValue(
    "Registro e diplomi",
  );
  await page.goto(base);
  await page
    .getByRole("link", { name: "Modifica indicatore", exact: true })
    .click();
  await expect(page).toHaveURL(/edit=/);
  await expect(page.getByLabel("Titolo indicatore")).toBeVisible();
  const other = await context.newPage();
  await other.goto(page.url());
  await page.getByLabel("Titolo indicatore").fill("Versione aggiornata");
  await page
    .getByRole("button", { name: "Salva indicatore", exact: true })
    .click();
  await expect(page).toHaveURL(/indicator_saved/);
  await other.getByLabel("Titolo indicatore").fill("Versione obsoleta");
  await other
    .getByRole("button", { name: "Salva indicatore", exact: true })
    .click();
  await expect(other.locator("main [role=alert]")).toContainText("Ricarica");
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "I1 — Versione aggiornata" }),
  ).toBeVisible();
  await other.close();
});
test("Unassigned manager cannot open project indicators", async ({ page }) => {
  await login(page, "unassigned");
  await page.goto(base);
  await expect(
    page.getByRole("link", { name: "Nuovo indicatore", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Indicatori", exact: true }),
  ).toHaveCount(0);
});

test("Indicator form remains readable on narrow screens",async({page})=>{
 await login(page); await draft(page); await page.getByLabel("Tipo",{exact:false}).selectOption("ratio");
 for(const width of [1440,320]) { await page.setViewportSize({width,height:950}); expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy(); await page.getByRole("group",{name:"Baseline — valore iniziale"}).scrollIntoViewIfNeeded(); await page.screenshot({path:`/tmp/ariadne-indicator-baseline-${width}.png`,fullPage:false}); await page.getByRole("button",{name:"Salva indicatore",exact:true}).scrollIntoViewIfNeeded(); await page.screenshot({path:`/tmp/ariadne-indicator-bottom-${width}.png`,fullPage:false}); }
});
