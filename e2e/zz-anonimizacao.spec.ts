import { expect, test } from "@playwright/test";
import { entrar, linkDoMenu, SEED } from "./apoio";

// Este arquivo roda por último (ordem alfabética): a anonimização apaga a conta da atleta do
// seed, e os demais arquivos dependem dela. O banco do E2E é recriado a cada execução.
test("pedido de exclusão, anonimização pelo gestor e saída do ranking", async ({ browser }) => {
  const descricao = `Peço a exclusão dos meus dados ${Date.now()}`;

  const atleta = await (await browser.newContext()).newPage();
  await entrar(atleta, "atleta");
  await atleta.getByLabel("Tipo de pedido").selectOption({ label: "Exclusão de dados" });
  await atleta.getByLabel(/^Descrição/).fill(descricao);
  await atleta.getByRole("button", { name: "Enviar pedido" }).click();
  await expect(atleta.getByText("Pedido enviado", { exact: true })).toBeVisible();

  const gestor = await (await browser.newContext()).newPage();
  await entrar(gestor, "gestor");
  await gestor.goto("/ranking");
  await expect(gestor.locator("a.rank-row", { hasText: SEED.atleta.nome })).toBeVisible();

  await linkDoMenu(gestor, "Revisões").click();
  await gestor.getByRole("tab", { name: /Pedidos do titular/ }).click();
  const linha = gestor.getByRole("row", { name: new RegExp(descricao) });
  await linha.getByRole("button", { name: /^Anonimizar atleta/ }).click();
  const dialogo = gestor.getByRole("dialog");
  const confirmar = dialogo.getByRole("button", { name: "Anonimizar", exact: true });
  await dialogo.getByLabel(/Digite ANONIMIZAR/).fill("anonimizar");
  await expect(confirmar).toBeDisabled();
  await dialogo.getByLabel(/Digite ANONIMIZAR/).fill("ANONIMIZAR");
  await confirmar.click();
  await expect(dialogo.getByText("Atleta anonimizado.")).toBeVisible();
  await dialogo.locator("button.primary", { hasText: "Fechar" }).click();

  // O pedido passa a anonimizado (nome e descrição saem) e respondido; a atleta some do ranking.
  const anonimizado = gestor.getByRole("row", { name: /Atleta anonimizado\s+Exclusão/ });
  await expect(anonimizado).toContainText("[removido na anonimização]");
  await expect(anonimizado).toContainText("Respondido");
  await expect(gestor.getByRole("row", { name: new RegExp(descricao) })).toHaveCount(0);
  await expect(gestor.getByRole("button", { name: /^Anonimizar atleta/ })).toHaveCount(0);
  await linkDoMenu(gestor, "Ranking").click();
  await expect(gestor.getByRole("heading", { level: 1, name: "Ranking de talento" })).toBeVisible();
  await gestor.waitForLoadState("networkidle");
  await expect(gestor.locator("a.rank-row").first()).toBeVisible();
  await expect(gestor.getByText(SEED.atleta.nome)).toHaveCount(0);
});
