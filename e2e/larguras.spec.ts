import { expect, test, type Page } from "@playwright/test";
import { atletaPedeRevisao, entrar } from "./apoio";

// Faixa em que a barra lateral de 240 px ainda ocupa a tela e o conteúdo fica estreito.
for (const largura of [900, 1024]) {
  test.describe(`${largura} px`, () => {
    test.use({ viewport: { width: largura, height: 860 } });

    async function semRolagemHorizontal(page: Page, rotulo: string) {
      const doc = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(doc, rotulo).toBeLessThanOrEqual(largura);
    }

    const TELAS = [
      "ranking",
      "avaliar",
      "cadastro",
      "ciclos",
      "revisoes",
      "investimento",
      "usuarios",
      "parametros",
      "auditoria",
    ];

    test("gestor: sem rolagem horizontal nas telas e na ficha", async ({ page }) => {
      await entrar(page, "gestor");
      for (const rota of TELAS) {
        await page.goto(`/${rota}`);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        await page.waitForLoadState("networkidle");
        await semRolagemHorizontal(page, `/${rota}`);
      }
      await page.goto("/ranking");
      await page.waitForLoadState("networkidle");
      await page.locator("a.rank-row").first().click();
      await expect(page).toHaveURL(/\/atletas\//);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await page.waitForLoadState("networkidle");
      await semRolagemHorizontal(page, "ficha");
    });

    test("ranking: o nome de cada atleta fica legível", async ({ page }) => {
      await entrar(page, "gestor");
      await page.goto("/ranking");
      await page.waitForLoadState("networkidle");
      const nomes = page.locator("a.rank-row .who strong");
      const total = await nomes.count();
      expect(total).toBeGreaterThan(0);
      for (let i = 0; i < total; i++) {
        const caixa = await nomes.nth(i).boundingBox();
        expect(caixa?.width ?? 0, `nome #${i + 1}`).toBeGreaterThan(80);
      }
    });

    for (const rota of ["usuarios", "revisoes"]) {
      test(`${rota}: a primeira ação cabe na janela`, async ({ page, browser }) => {
        if (rota === "revisoes") {
          // O banco do E2E nasce sem pedido aberto: sem ele não há botão "Responder" para medir.
          const atleta = await (await browser.newContext()).newPage();
          await atletaPedeRevisao(atleta, `Pedido aberto para conferir o layout em ${largura} px.`);
          await atleta.context().close();
        }
        await entrar(page, "gestor");
        await page.goto(`/${rota}`);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        await page.waitForLoadState("networkidle");
        const botao = page.locator("td.acoes button").first();
        await expect(botao).toBeVisible();
        const caixa = await botao.boundingBox();
        expect(caixa).not.toBeNull();
        expect(caixa!.x + caixa!.width).toBeLessThanOrEqual(largura);
      });
    }
  });
}
