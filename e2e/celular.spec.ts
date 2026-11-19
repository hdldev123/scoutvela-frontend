import { expect, test } from "@playwright/test";
import { entrar, CONTAS } from "./apoio";

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

const TELAS = {
  gestor: [
    "ranking",
    "avaliar",
    "cadastro",
    "ciclos",
    "revisoes",
    "investimento",
    "usuarios",
    "parametros",
    "auditoria",
  ],
  treinadora: ["ranking", "avaliar", "revisoes"],
  atleta: ["painel"],
  ibvar: ["investimento", "ranking"],
} as const;

for (const [conta, rotas] of Object.entries(TELAS)) {
  test(`${conta}: sem rolagem horizontal a 390 px`, async ({ page }, info) => {
    await entrar(page, conta as keyof typeof CONTAS);
    for (const rota of rotas) {
      await page.goto(`/${rota}`);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await page.waitForLoadState("networkidle");
      const largura = await page.evaluate(() => ({
        doc: document.documentElement.scrollWidth,
        vis: window.innerWidth,
      }));
      expect(largura.doc, `/${rota}`).toBeLessThanOrEqual(largura.vis);
      if (process.env.E2E_CAPTURAS) {
        await page.screenshot({ path: info.outputPath(`${conta}-${rota}.png`), fullPage: true });
      }
    }
  });
}

test("gaveta abre pelo botão e o menu leva à tela", async ({ page }) => {
  await entrar(page, "gestor");
  const botao = page.getByRole("button", { name: /menu/i }).first();
  await botao.click();
  await expect(botao).toHaveAttribute("aria-expanded", "true");
  await page
    .getByRole("navigation", { name: "Telas" })
    .getByRole("link", { name: "Ciclos", exact: true })
    .click();
  await expect(page).toHaveURL(/\/ciclos$/);
  await expect(botao).toHaveAttribute("aria-expanded", "false");
});
