import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { entrar, CONTAS } from "./apoio";

// WCAG 2.x A e AA em todas as telas, nos 4 papéis. Falha com qualquer violação.
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

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

async function varrer(page: Page, rotulo: string) {
  const r = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  const resumo = r.violations.map(
    (v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`,
  );
  expect(resumo, rotulo).toEqual([]);
}

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
