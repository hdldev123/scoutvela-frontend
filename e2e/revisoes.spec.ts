import { expect, test, type Page } from "@playwright/test";
import { atletaPedeRevisao, entrar, linkDoMenu, pendenciasDoMenu, SEED } from "./apoio";

/** O gestor lança uma nota nova no indicador do seed (a nota muda, com evidência). */
async function gestorLancaNota(gestor: Page): Promise<void> {
  await linkDoMenu(gestor, "Lançar avaliação").click();
  const escolha = gestor.getByRole("combobox", { name: /^Atleta/ });
  const valor = await escolha
    .locator("option", { hasText: SEED.atleta.nome })
    .getAttribute("value");
  await escolha.selectOption(valor!);
  await gestor.getByRole("button", { name: new RegExp(`^${SEED.pilar.nomeCurto}`) }).click();
  const grupo = gestor.getByRole("radiogroup", { name: `Nota de ${SEED.indicador.nome}` });
  await grupo.locator("label:not(:has(input:checked))").first().click();
  await gestor.getByLabel("Evidência (obrigatória)").first().fill("Conferido em vídeo de treino");
  await gestor.getByRole("button", { name: "Salvar avaliação" }).click();
  await expect(gestor.getByText(/Avaliação lançada\. Novo score/)).toBeVisible();
}

test("revisão ligada ao lançamento mostra a nota anterior e a nova à atleta", async ({
  browser,
}) => {
  const motivo = `Revisão ligada ao lançamento ${Date.now()}`;
  const atleta = await (await browser.newContext()).newPage();
  await atletaPedeRevisao(atleta, motivo);

  const gestor = await (await browser.newContext()).newPage();
  await entrar(gestor, "gestor");
  await gestorLancaNota(gestor);

  await linkDoMenu(gestor, "Revisões").click();
  await gestor
    .getByRole("row", { name: new RegExp(motivo) })
    .getByRole("button", { name: "Responder" })
    .click();
  const resp = gestor.getByRole("dialog");
  const lancamento = resp.getByLabel("Lançamento que corrigiu a nota (opcional)");
  const valor = await lancamento
    .locator("option", { hasText: SEED.indicador.nome })
    .first()
    .getAttribute("value");
  await lancamento.selectOption(valor!);
  await resp.getByLabel("Resposta", { exact: true }).fill("Nota corrigida após conferência.");
  await resp.getByRole("button", { name: "Enviar resposta" }).click();
  await expect(gestor.getByText("Resposta registrada.")).toBeVisible();

  await atleta.reload();
  const cartao = atleta.locator(".painel-revisao", { hasText: motivo });
  await expect(cartao.getByText("Nota corrigida após conferência.")).toBeVisible();
  await expect(cartao.getByText(/^\d(\.\d)? → \d(\.\d)?$/)).toBeVisible();
});

test("o balão de Revisões sobe com o pedido da atleta e desce com a resposta", async ({
  browser,
}) => {
  const motivo = `Balão de revisões ${Date.now()}`;
  const gestor = await (await browser.newContext()).newPage();
  await entrar(gestor, "gestor");
  await gestor.waitForLoadState("networkidle");
  const antes = await pendenciasDoMenu(gestor, "Revisões");

  const atleta = await (await browser.newContext()).newPage();
  await atletaPedeRevisao(atleta, motivo);

  await gestor.reload();
  await expect(linkDoMenu(gestor, "Revisões")).toHaveAttribute(
    "aria-label",
    new RegExp(`${antes + 1}\\+?.*pendente`),
  );

  await linkDoMenu(gestor, "Revisões").click();
  await gestor
    .getByRole("row", { name: new RegExp(motivo) })
    .getByRole("button", { name: "Responder" })
    .click();
  const resp = gestor.getByRole("dialog");
  await resp.getByLabel("Resposta", { exact: true }).fill("Resposta do teste de balão.");
  await resp.getByRole("button", { name: "Enviar resposta" }).click();
  await expect(gestor.getByText("Resposta registrada.")).toBeVisible();

  await gestor.reload();
  await expect(linkDoMenu(gestor, "Revisões")).toBeVisible();
  await expect.poll(() => pendenciasDoMenu(gestor, "Revisões")).toBe(antes);
});
