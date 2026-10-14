import { expect, test, type Page } from "@playwright/test";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

test("Auth HTTP regression: confirmation, origins and safe redirects", async () => {
  await promisify(execFile)(process.execPath, ["scripts/test-auth-http.mjs", "http://127.0.0.1:3106"]);
});

async function login(page: Page, role: string) {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(`${role}@example.test`);
  await page
    .getByLabel("Password", { exact: true })
    .fill("local-fixture-password");
  await page.getByRole("button", { name: "Accedi", exact: true }).click();
}

test("anonymous routes and legacy email links keep their protection", async ({
  page,
}) => {
  for (const route of [
    "/overview",
    "/projects",
    "/admin",
    "/account",
    "/password",
  ]) {
    await page.goto(route);
    await expect(page).toHaveURL(/\/login$/);
  }
  await page.goto("/?token_hash=local-test&type=invite");
  await expect(page).toHaveURL(/\/auth\/accept\?/);
});

test("Admin navigation, mobile layout, account and logout", async ({
  page,
}) => {
  await login(page, "admin");
  await expect(page).toHaveURL(/\/overview$/);
  await expect(
    page.getByRole("navigation").getByRole("link", { name: "Panoramica" }),
  ).toHaveAttribute("aria-current", "page");
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.getByRole("navigation")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/overview-${width}.png`,
      fullPage: true,
    });
  }
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Amministrazione" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Amministrazione", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Progetti", exact: true })
    .click();
  await expect(
    page.getByText("Questa pagina non mostra ancora i dati dei progetti."),
  ).toBeVisible();
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Account", exact: true })
    .click();
  await page
    .getByRole("link", { name: "Imposta o modifica la password" })
    .click();
  await expect(
    page.getByRole("navigation").getByRole("link", { name: "Account" }),
  ).toHaveAttribute("aria-current", "page");
  await page.getByRole("button", { name: "Esci", exact: true }).click();
  await expect(page).toHaveURL(/\/login\?status=out$/);
  await page.goto("/overview");
  await expect(page).toHaveURL(/\/login$/);
});

for (const role of ["manager", "unassigned"]) {
  test(`${role}: Admin hidden and direct route denied`, async ({ page }) => {
    await login(page, role);
    await expect(page).toHaveURL(/\/overview$/);
    await expect(
      page
        .getByRole("navigation")
        .getByRole("link", { name: "Amministrazione" }),
    ).toHaveCount(0);
    await page.goto("/admin");
    await expect(
      page.getByRole("heading", { name: "Pagina non disponibile" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Gestione della piattaforma" }),
    ).toHaveCount(0);
  });
}

test("inactive profile cannot enter workspace", async ({ page }) => {
  await login(page, "inactive");
  await expect(page).toHaveURL(/\/login\?status=inactive$/);
  await expect(page.getByRole("navigation")).toHaveCount(0);
});
