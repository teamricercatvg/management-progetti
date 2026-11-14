import { expect, test } from "@playwright/test";

test("invitation accepts once, persists session and opens password setup", async ({ page }) => {
  let submissions = 0;
  page.on("request", request => {
    if (new URL(request.url()).pathname === "/auth/confirm" && request.method() === "POST") submissions++;
  });
  const token = `valid-fixture-${Date.now()}`;
  await page.goto(`/auth/accept?token_hash=${token}&type=invite`);
  await page.getByRole("button", { name: "Continua", exact: true }).dblclick();
  await expect(page).toHaveURL(/\/password$/);
  await expect(page.getByRole("heading", { name: "La tua password" })).toBeVisible();
  expect(submissions).toBe(1);
  await page.getByLabel("Nuova password", { exact: true }).fill("fixture-new-password");
  await page.getByLabel("Conferma password", { exact: true }).fill("fixture-new-password");
  await page.getByRole("button", { name: "Salva password" }).click();
  await expect(page).toHaveURL(/\/account\?status=updated$/);
  await page.goto(`/auth/accept?token_hash=${token}&type=invite`);
  await page.getByRole("button", { name: "Continua", exact: true }).click();
  await expect(page).toHaveURL(/\/auth\/invitation-help$/);
  await expect(page.getByRole("button", { name: "Accedi", exact: true })).toHaveCount(0);
});

test("expired invitation offers password link without asking for a password", async ({ page }) => {
  await page.goto('/auth/accept?token_hash=expired-fixture&type=invite');
  await page.getByRole('button', { name: 'Continua', exact: true }).click();
  await expect(page).toHaveURL(/\/auth\/invitation-help$/);
  await page.getByLabel('Email dell’invito').fill('manager@example.test');
  await page.getByRole('button', { name: 'Invia un nuovo collegamento' }).click();
  await expect(page).toHaveURL(/\/auth\/invitation-help\?status=sent$/);
  await expect(page.getByRole('status')).toContainText('Apri l’ultimo collegamento');
});
