import { expect, type Page } from "@playwright/test";

export const CONTAS = {
  gestor: { email: "gestor@scoutvela.dev", senha: "gestor123" },
  treinadora: { email: "treinadora@scoutvela.dev", senha: "treino123" },
  atleta: { email: "atleta@scoutvela.dev", senha: "atleta123" },
  ibvar: { email: "ibvar@scoutvela.dev", senha: "ibvar123" },
} as const;

export async function entrar(page: Page, conta: keyof typeof CONTAS): Promise<void> {
  const { email, senha } = CONTAS[conta];
  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(senha);
  await page.getByRole("button", { name: /Entrar/ }).click();
  await expect(page).not.toHaveURL(/\/entrar/);
}
