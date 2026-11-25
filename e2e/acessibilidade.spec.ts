import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { entrar, CONTAS } from "./apoio";

// WCAG 2.x A e AA em todas as telas, nos 4 papéis, em 3 larguras, e nos estados com
// sobreposição (busca, gaveta, diálogo). Falha com qualquer violação.
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

const TELAS = {
  gestor: [
    "ranking",
    "avaliar",
    "cadastro",
    "ciclos",
    "revisoes",
    "mensagens",
    "investimento",
    "usuarios",
    "parametros",
    "auditoria",
  ],
  treinadora: ["ranking", "avaliar", "revisoes", "mensagens"],
  atleta: ["painel", "mensagens"],
  ibvar: ["investimento", "ranking"],
} as const;

const LARGURAS = [1280, 1024, 390] as const;

async function varrer(page: Page, rotulo: string) {
  const r = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  const resumo = r.violations.map(
    (v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`,
  );
  expect(resumo, rotulo).toEqual([]);
}

for (const largura of LARGURAS) {
  test.describe(`${largura} px`, () => {
    test.use({ viewport: { width: largura, height: 800 } });

    test("login", async ({ page }) => {
      await page.goto("/entrar");
      await expect(page.getByLabel("E-mail")).toBeVisible();
      await varrer(page, "/entrar");
    });

    for (const [conta, rotas] of Object.entries(TELAS)) {
      test(`${conta}: telas sem violação WCAG AA`, async ({ page }) => {
        await entrar(page, conta as keyof typeof CONTAS);
        for (const rota of rotas) {
          await page.goto(`/${rota}`);
          await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
          await page.waitForLoadState("networkidle");
          await varrer(page, `/${rota}`);
        }
      });
    }

    test("busca (Ctrl+K) aberta", async ({ page }) => {
      await entrar(page, "gestor");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await page.waitForLoadState("networkidle");
      await page.keyboard.press("Control+k");
      await expect(page.getByRole("dialog", { name: /Buscar/ })).toBeVisible();
      await varrer(page, "busca aberta");
    });

    test("diálogo Pedir revisão de nota (atleta)", async ({ page }) => {
      await entrar(page, "atleta");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await page.waitForLoadState("networkidle");
      await page.getByRole("button", { name: "Pedir revisão de nota" }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await varrer(page, "diálogo Pedir revisão de nota");
    });

    test("mensagens: conversa aberta e diálogo Nova conversa (atleta)", async ({ page }) => {
      await entrar(page, "atleta");
      await page.goto("/mensagens");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await page.getByRole("button", { name: /Nova conversa/ }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await varrer(page, "diálogo Nova conversa");
      await page.getByRole("dialog").getByRole("button", { name: "Abrir conversa" }).click();
      await expect(page).toHaveURL(/\/mensagens\?c=/);
      await expect(page.getByRole("log")).toBeVisible();
      await page.waitForLoadState("networkidle");
      await varrer(page, "conversa aberta");
      const doc = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(doc, "conversa aberta sem rolagem horizontal").toBeLessThanOrEqual(largura);
    });
  });
}

test.describe("390 px: gaveta", () => {
  test.use({ viewport: { width: 390, height: 800 }, hasTouch: true, isMobile: true });

  test("gaveta do menu aberta", async ({ page }) => {
    await entrar(page, "gestor");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.waitForLoadState("networkidle");
    const botao = page.getByRole("button", { name: /menu/i }).first();
    await botao.click();
    await expect(botao).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByRole("navigation", { name: "Telas" })).toBeVisible();
    await varrer(page, "gaveta aberta");
  });
});

test("ficha do atleta e modal Meu perfil", async ({ page }) => {
  await entrar(page, "gestor");
  await page.locator("a.rank-row").first().click();
  await expect(page.getByRole("heading", { level: 2, name: "Os 9 pilares" })).toBeVisible();
  await page.waitForLoadState("networkidle");
  await varrer(page, "ficha");
  await page.getByRole("button", { name: /Abrir meu perfil/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await varrer(page, "modal Meu perfil");
});
