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

/**
 * Dados do seed do back (modo local) que os testes usam. O banco do E2E é recriado a cada
 * execução, então estes valores só mudam quando o seed muda.
 */
export const SEED = {
  /** Atleta com conta (atleta@scoutvela.dev). */
  atleta: { nome: "Helena Vasques", saudacao: /Olá, Helena/ },
  /** Pilar e indicador usados nos pedidos de revisão e nos lançamentos. */
  pilar: { nome: "Técnica", nomeCurto: "Técnica" },
  indicador: { nome: "Boat handling" },
  /** Registro do VelaID que ainda não virou atleta (cadastro pelo gestor). */
  velaid: { codigo: "MG-T15", nome: "Renata Bastos" },
  /** Ciclo aberto no seed. */
  cicloAberto: "Novembro de 2026",
} as const;

/** Abre o diálogo da atleta e envia um pedido de revisão (pilar e indicador do seed). */
export async function atletaPedeRevisao(page: Page, motivo: string): Promise<void> {
  await entrar(page, "atleta");
  await page.getByRole("button", { name: "Pedir revisão de nota" }).click();
  const dialogo = page.getByRole("dialog");
  await dialogo.locator("#rev-pilar").selectOption({ label: SEED.pilar.nome });
  await dialogo.locator("#rev-indicador").selectOption({ label: SEED.indicador.nome });
  await dialogo.getByLabel("Motivo").fill(motivo);
  await dialogo.getByRole("button", { name: "Enviar pedido" }).click();
  await expect(page.getByText(/Pedido de revisão enviado/)).toBeVisible();
}

/** Balão de pendências do link do menu ("Revisões 3 pendentes"): o número, ou 0 sem balão. */
export async function pendenciasDoMenu(page: Page, rotulo: string): Promise<number> {
  const nome = (await linkDoMenu(page, rotulo).getAttribute("aria-label")) ?? "";
  const m = /(\d+)\+?\s*(?:\((\d+)\s+)?pendente/.exec(nome);
  return m ? Number(m[2] ?? m[1]) : 0;
}
