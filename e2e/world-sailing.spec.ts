import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { entrar, linkDoMenu } from "./apoio";

// Importação do perfil World Sailing (D19). O back local roda com o simulador, que devolve dados
// FICTÍCIOS para os WS IDs BRATESTE01 e BRASPT08: 5 resultados de regata e 4 posições de ranking em 3
// séries (ILCA 6 Senior, ILCA 7 Senior e ILCA 6 Youth). Nada chama o site real.
//
// O cadastro usa BRATESTE01 (o atleta nasce com cadastro incompleto, e a ficha dele dá 404 até o
// primeiro acesso, regra da D1). A ficha usa o atleta fictício do seed Davi Moretto (BRASPT08), que tem
// cadastro completo: o gestor clica em "Atualizar da World Sailing" e a importação acontece ali.
// Os testes dependem uns dos outros: rodam em série e compartilham o ID da ficha.
test.describe.configure({ mode: "serial" });
test.use({ reducedMotion: "reduce" });

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const WS_ID = "BRATESTE01";
const ATLETA_FICHA = "Davi Moretto";
const WS_ID_FICHA = "BRASPT08";
const MUNDIAL = "Campeonato Mundial Simulado (ILCA 6)";
/** Linha da tabela pelo nome do evento (o nome tem parênteses, que não podem virar grupo da regex). */
const MUNDIAL_RE = /Campeonato Mundial Simulado \(ILCA 6\)/;

let fichaId = "";

async function varrer(page: Page, rotulo: string) {
  const r = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  const resumo = r.violations.map(
    (v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`,
  );
  expect(resumo, rotulo).toEqual([]);
}

async function abrirFicha(page: Page) {
  await page.goto(`/atletas/${fichaId}`);
  await expect(page.getByRole("heading", { level: 2, name: "World Sailing" })).toBeVisible();
  await page.waitForLoadState("networkidle");
}

test("gestor cadastra o WS ID do simulador e vê o resumo da importação", async ({ page }) => {
  await entrar(page, "gestor");
  await linkDoMenu(page, "Cadastrar atleta").click();
  await page.getByLabel("ID World Sailing").fill(WS_ID);
  await page.getByLabel("E-mail do atleta").fill("marina.simulada@scoutvela.dev");
  await page.getByLabel("Classe e função projetadas").selectOption({ index: 1 });
  await page.getByLabel("Treinador(a) responsável").selectOption({ index: 1 });
  await page.getByLabel("Confirmo que o atleta tem 18 anos ou mais").check();
  const resposta = page.waitForResponse(
    (r) => new URL(r.url()).pathname === "/atletas" && r.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Enviar termo de consentimento" }).click();
  const corpo = (await (await resposta).json()) as { id: string };
  expect(corpo.id).toBeTruthy();
  await expect(page.getByTestId("cad-ws-resumo")).toHaveText(
    "Importados da World Sailing: 5 resultados e 4 posições de ranking.",
  );
});

test("ficha: seção World Sailing com link, gráfico, tabela e filtro por classe e tipo", async ({
  page,
}) => {
  await entrar(page, "gestor");
  await page.goto("/ranking");
  await page.locator("a.rank-row", { hasText: ATLETA_FICHA }).click();
  await expect(page).toHaveURL(/\/atletas\/[0-9a-f-]{36}$/);
  fichaId = new URL(page.url()).pathname.split("/").pop() ?? "";
  await expect(page.getByRole("heading", { level: 2, name: "World Sailing" })).toBeVisible();
  const secao = page.locator("section[aria-labelledby='ws-titulo']");
  // Primeira busca deste atleta do seed: importa o perfil fictício do simulador.
  await secao.getByRole("button", { name: "Atualizar da World Sailing" }).click();
  await expect(
    page.getByText("Importados da World Sailing: 5 resultados e 4 posições de ranking."),
  ).toBeVisible();
  const perfil = secao.getByRole("link", { name: /Ver perfil público na World Sailing/ });
  await expect(perfil).toHaveAttribute(
    "href",
    `https://www.sailing.org/sailor/?ref=${WS_ID_FICHA}`,
  );
  await expect(perfil).toHaveAttribute("target", "_blank");
  await expect(perfil).toHaveAttribute("rel", /noopener/);
  await expect(secao.getByText(/Última atualização:/)).toContainText("Importado");
  // A maior série (ILCA 6 Senior, 2 pontos) abre primeiro; a tabela é a alternativa ao gráfico.
  await expect(secao.getByRole("img", { name: /ILCA 6 · Senior/ })).toBeVisible();
  await expect(secao.getByTestId("ws-ponto")).toHaveCount(2);
  // A tabela alternativa começa fechada (o histórico real passa de 100 linhas).
  await secao.getByText("Números em tabela").click();
  const tabela = secao.getByRole("table", { name: /ILCA 6 · Senior/ });
  await expect(tabela.getByRole("row", { name: /18º/ })).toBeVisible();
  await expect(tabela.getByRole("row", { name: /24º/ })).toBeVisible();
  await secao.getByLabel("Classe e tipo de ranking").selectOption({ label: "ILCA 7 · Senior" });
  await expect(secao.getByTestId("ws-ponto")).toHaveCount(1);
  await expect(secao.getByRole("table", { name: /ILCA 7 · Senior/ })).toContainText("61º");
  await expect(secao.getByRole("button", { name: "Atualizar da World Sailing" })).toBeVisible();
});

test("histórico competitivo: resultados da World Sailing com selo e situação vigente", async ({
  page,
}) => {
  await entrar(page, "gestor");
  await abrirFicha(page);
  const linha = page.getByRole("row", { name: MUNDIAL_RE });
  await expect(linha.getByRole("link", { name: /World Sailing/ })).toBeVisible();
  await expect(linha.getByText("Vigente")).toBeVisible();
  // O resultado sem nível na World Sailing entra como internacional aberto (não pontua).
  const semNivel = page.getByRole("row", { name: /Troféu Simulado de Primavera/ });
  await expect(semNivel).toContainText("Internacional aberto");
});

for (const largura of [1280, 390]) {
  test(`acessibilidade da seção World Sailing e do diálogo Invalidar (${largura} px)`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: largura, height: 800 });
    await entrar(page, "gestor");
    await abrirFicha(page);
    await varrer(page, `ficha com World Sailing (${largura} px)`);
    await page.getByRole("button", { name: /^Invalidar .*Campeonato Mundial Simulado/ }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByLabel("Motivo (obrigatório)")).toBeFocused();
    await varrer(page, `diálogo Invalidar (${largura} px)`);
  });
}

test("gestor invalida um resultado com motivo e depois revalida", async ({ page }) => {
  await entrar(page, "gestor");
  await abrirFicha(page);
  const botaoInvalidar = page.getByRole("button", {
    name: /^Invalidar .*Campeonato Mundial Simulado/,
  });
  await botaoInvalidar.click();
  const dialogo = page.getByRole("dialog");
  // O motivo é obrigatório.
  await dialogo.getByRole("button", { name: "Invalidar resultado" }).click();
  await expect(dialogo.getByText("Explique o motivo da invalidação.")).toBeVisible();
  await dialogo.getByLabel("Motivo (obrigatório)").fill("Evento de outro velejador.");
  await dialogo.getByRole("button", { name: "Invalidar resultado" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  const linha = page.getByRole("row", { name: MUNDIAL_RE });
  await expect(linha.getByText("Invalidado")).toBeVisible();
  await expect(linha).toContainText("Motivo: Evento de outro velejador.");
  await expect(linha.getByRole("button", { name: /^Invalidar/ })).toHaveCount(0);

  await linha.getByRole("button", { name: /^Revalidar/ }).click();
  await expect(linha.getByText("Vigente")).toBeVisible();
  await expect(linha.getByRole("button", { name: /^Invalidar/ })).toBeVisible();
});

test("atualizar de novo logo depois mostra o limite da API ou nada novo", async ({ page }) => {
  await entrar(page, "gestor");
  await abrirFicha(page);
  await page.getByRole("button", { name: "Atualizar da World Sailing" }).click();
  // Menos de 60 s depois da primeira busca: 429 com a mensagem pronta. Se a suíte demorou mais, a
  // busca roda e não acha nada novo (nada se duplica).
  await expect(
    page.getByText(/já foi consultada para este atleta há pouco|nada novo desde a última busca/),
  ).toBeVisible();
});
