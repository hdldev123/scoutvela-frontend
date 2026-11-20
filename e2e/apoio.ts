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

/**
 * Link do menu lateral pelo rótulo. O nome acessível pode trazer o balão de notificações
 * ("Revisões 3 pendentes"), então aceita o rótulo sozinho ou seguido de espaço.
 */
export function linkDoMenu(page: Page, rotulo: string) {
  const escapado = rotulo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return page
    .getByRole("navigation", { name: "Telas" })
    .getByRole("link", { name: new RegExp(`^${escapado}( |$)`) });
}

/** A atleta abre um pedido de revisão de nota (deixa um pedido aberto para o gestor). */
export async function atletaPedeRevisao(page: Page, motivo: string): Promise<void> {
  await entrar(page, "atleta");
  await page.getByRole("button", { name: "Pedir revisão de nota" }).click();
  const dialogo = page.getByRole("dialog");
  await dialogo.locator("#rev-pilar").selectOption({ index: 1 });
  await dialogo.getByLabel("Motivo").fill(motivo);
  await dialogo.getByRole("button", { name: "Enviar pedido" }).click();
  await expect(page.getByText(/Pedido de revisão enviado/)).toBeVisible();
}
