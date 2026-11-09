import { expect, test } from "@playwright/test";
import { entrar } from "./apoio";

// Cada conta de teste abre na sua tela inicial (a coluna "Abre em" das contas de teste).
const CASOS = [
  { conta: "gestor", url: /\/ranking$/, titulo: "Ranking de talento" },
  { conta: "treinadora", url: /\/ranking$/, titulo: "Meus atletas" },
  { conta: "atleta", url: /\/painel$/, titulo: /Olá, Helena/ },
  { conta: "ibvar", url: /\/investimento$/, titulo: "Painel de investimento" },
] as const;

for (const c of CASOS) {
  test(`${c.conta} entra e abre na tela inicial`, async ({ page }) => {
    await entrar(page, c.conta);
    await expect(page).toHaveURL(c.url);
    await expect(page.getByRole("heading", { level: 1, name: c.titulo })).toBeVisible();
  });
}

test("senha errada não entra", async ({ page }) => {
  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill("gestor@scoutvela.dev");
  await page.getByLabel("Senha").fill("errada123");
  await page.getByRole("button", { name: /Entrar/ }).click();
  await expect(page.getByRole("alert")).toHaveText("E-mail ou senha incorretos.");
  await expect(page).toHaveURL(/\/entrar/);
});

test("sair volta ao login e a rota protegida pede login de novo", async ({ page }) => {
  await entrar(page, "gestor");
  await page.getByRole("button", { name: /Sair/ }).click();
  await expect(page).toHaveURL(/\/entrar/);
  await page.goto("/ranking");
  await expect(page).toHaveURL(/\/entrar/);
});
