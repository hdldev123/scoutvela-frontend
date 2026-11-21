import { expect, test, type Page } from "@playwright/test";
import { entrar, CONTAS, SEED } from "./apoio";

const LARGURA = 390;

// Com isMobile o Chrome alarga a janela de layout quando o conteúdo estoura, e innerWidth
// cresce junto. Por isso a comparação é sempre com o valor fixo, nunca com innerWidth.
test.use({ viewport: { width: LARGURA, height: 844 }, hasTouch: true, isMobile: true });

async function semRolagemHorizontal(page: Page, rotulo: string) {
  const doc = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(doc, rotulo).toBeLessThanOrEqual(LARGURA);
}

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
      await semRolagemHorizontal(page, `/${rota}`);
      if (process.env.E2E_CAPTURAS) {
        await page.screenshot({ path: info.outputPath(`${conta}-${rota}.png`), fullPage: true });
      }
    }
  });
}

test("gestor: ficha do atleta sem rolagem horizontal a 390 px", async ({ page }) => {
  await entrar(page, "gestor");
  await page.goto("/ranking");
  await page.waitForLoadState("networkidle");
  await page.locator("a.rank-row").first().click();
  await expect(page).toHaveURL(/\/atletas\//);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.waitForLoadState("networkidle");
  await semRolagemHorizontal(page, "ficha (gestor)");
});

test("atleta: Minha ficha sem rolagem horizontal a 390 px", async ({ page }) => {
  await entrar(page, "atleta");
  await page.getByRole("button", { name: /menu/i }).first().click();
  await page
    .getByRole("navigation", { name: "Telas" })
    .getByRole("link", { name: "Minha ficha", exact: true })
    .click();
  await expect(page).toHaveURL(/\/atletas\//);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.waitForLoadState("networkidle");
  await semRolagemHorizontal(page, "ficha (atleta)");
});

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

test("avaliação: mudar uma nota mostra a barra fixa com o resumo e descartar a esconde", async ({
  page,
}) => {
  await entrar(page, "gestor");
  await page.goto("/avaliar");
  const escolha = page.getByRole("combobox", { name: /^Atleta/ });
  const valor = await escolha
    .locator("option", { hasText: SEED.atleta.nome })
    .getAttribute("value");
  await escolha.selectOption(valor!);
  const barra = page.getByRole("region", { name: "Resumo e ações da avaliação" });
  await expect(page.getByRole("radiogroup").first()).toBeVisible();
  await expect(barra).toHaveCount(0);

  await page
    .getByRole("radiogroup")
    .first()
    .locator("label:not(:has(input:checked))")
    .first()
    .click();
  await expect(barra).toBeVisible();
  // Sem evidência a nota não está pronta: a barra avisa em vez de mostrar o score.
  await expect(barra).toContainText("Informe a evidência");
  await page.getByLabel("Evidência (obrigatória)").first().fill("Observado no treino de sábado");
  await expect(barra).toContainText(/Score:\s*\d+[.,]\d → \d+[.,]\d/);
  // Fixa no rodapé da janela, sem rolagem horizontal.
  const caixa = await barra.boundingBox();
  expect(caixa!.y + caixa!.height).toBeGreaterThan(844 - 4);
  await semRolagemHorizontal(page, "avaliar com barra");

  await barra.getByRole("button", { name: "Descartar" }).click();
  await expect(barra).toHaveCount(0);
});
