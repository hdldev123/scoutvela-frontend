import { expect, test } from "@playwright/test";
import { entrar } from "./apoio";

// Cada papel abre as telas do seu menu com dados reais da API (modo local, dados fictícios).
const TELAS = {
  gestor: [
    { menu: "Ranking", titulo: "Ranking de talento" },
    { menu: "Lançar avaliação", titulo: "Lançar avaliação" },
    { menu: "Cadastrar atleta", titulo: "Cadastrar atleta" },
    { menu: "Ciclos", titulo: "Ciclos de avaliação" },
    { menu: "Revisões", titulo: "Pedidos de revisão" },
    { menu: "Investimento", titulo: "Painel de investimento" },
    { menu: "Contas", titulo: "Contas de acesso" },
    { menu: "Parâmetros", titulo: "Parâmetros" },
    { menu: "Auditoria", titulo: "Trilha de auditoria" },
  ],
  treinadora: [
    { menu: "Meus atletas", titulo: "Meus atletas" },
    { menu: "Lançar avaliação", titulo: "Lançar avaliação" },
    { menu: "Revisões", titulo: "Pedidos de revisão" },
  ],
  atleta: [{ menu: "Meu painel", titulo: /Olá, Helena/ }],
  ibvar: [
    { menu: "Investimento", titulo: "Painel de investimento" },
    { menu: "Ranking", titulo: "Ranking de talento" },
  ],
} as const;

for (const [conta, telas] of Object.entries(TELAS)) {
  test(`${conta} abre as telas do menu sem erro`, async ({ page }) => {
    await entrar(page, conta as keyof typeof TELAS);
    const menu = page.getByRole("navigation", { name: "Telas" });
    for (const t of telas) {
      await menu.getByRole("link", { name: t.menu, exact: true }).click();
      await expect(page.getByRole("heading", { level: 1, name: t.titulo })).toBeVisible();
      await expect(page.getByRole("alert")).toHaveCount(0);
    }
  });
}

test("gestor abre a ficha a partir do ranking", async ({ page }) => {
  await entrar(page, "gestor");
  await page.locator("a.rank-row").first().click();
  await expect(page).toHaveURL(/\/atletas\//);
  await expect(page.getByRole("heading", { level: 2, name: "Os 9 pilares" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Plano individual" })).toBeVisible();
});

test("atleta não abre telas de gestão", async ({ page }) => {
  await entrar(page, "atleta");
  await page.goto("/parametros");
  await expect(page.getByRole("heading", { level: 1, name: "Parâmetros" })).toHaveCount(0);
});
