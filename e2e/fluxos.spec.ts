import { expect, test } from "@playwright/test";
import { atletaPedeRevisao, entrar, linkDoMenu, SEED } from "./apoio";

test("gestor lança uma avaliação com prévia", async ({ page }) => {
  await entrar(page, "gestor");
  await linkDoMenu(page, "Lançar avaliação").click();
  // Pelo papel e nome: a grade de cartões ("Escolha um atleta") também casa com getByLabel("Atleta").
  const escolha = page.getByRole("combobox", { name: /^Atleta/ });
  await escolha.selectOption({ index: 1 });
  // A evidência só aparece quando a nota muda: escolhe uma nota diferente da atual.
  const grupo = page.getByRole("radiogroup").first();
  await grupo.locator("label:not(:has(input:checked))").first().click();
  await page.getByLabel("Evidência (obrigatória)").first().fill("Observado no treino de sábado");
  await expect(page.getByText("Prévia do cálculo")).toBeVisible();
  await expect(page.getByText(/Score\s*\d/)).toBeVisible();
  await page.getByRole("button", { name: "Salvar avaliação" }).click();
  await expect(page.getByText(/Avaliação lançada\. Novo score/)).toBeVisible();
});

test("gestor cadastra atleta pelo WS ID e registra o aceite do termo", async ({ page }) => {
  await entrar(page, "gestor");
  await linkDoMenu(page, "Cadastrar atleta").click();
  await page.getByLabel("ID World Sailing").fill("braxx 01");
  await page.getByLabel("E-mail do atleta").fill("novo.atleta@scoutvela.dev");
  await page.getByLabel("Classe e função projetadas").selectOption({ index: 1 });
  await page.getByLabel("Treinador(a) responsável").selectOption({ index: 1 });
  // O VelaID é opcional: a busca só mostra os dados de referência.
  await page.getByLabel("Código VelaID").fill(SEED.velaid.codigo);
  await page.getByRole("button", { name: "Buscar no VelaID" }).click();
  await expect(page.getByText(SEED.velaid.nome)).toBeVisible();
  // Sem a confirmação de 18+, o envio é barrado no formulário.
  await page.getByRole("button", { name: "Enviar termo de consentimento" }).click();
  await expect(page.getByText("Confirme que o atleta tem 18 anos ou mais.")).toBeVisible();
  await page.getByLabel("Confirmo que o atleta tem 18 anos ou mais").check();
  await page.getByRole("button", { name: "Enviar termo de consentimento" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Termo enviado (" })).toBeVisible();

  // Atleta incompleto: sem nome, aparece pelo WS ID.
  const linha = page.getByRole("row", { name: /BRAXX01/ });
  await linha.getByRole("button", { name: "Registrar aceite recebido" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Confirmar aceite" }).click();
  await expect(page.getByText(/Aceite de BRAXX01 registrado/)).toBeVisible();
  await expect(page.getByRole("row", { name: /BRAXX01/ })).toHaveCount(0);
});

test("gestor fecha o ciclo e abre o próximo", async ({ page }) => {
  await entrar(page, "gestor");
  await linkDoMenu(page, "Ciclos").click();
  await expect(
    page.getByRole("heading", { name: new RegExp(`Ciclo aberto: ${SEED.cicloAberto}`) }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Fechar ciclo" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Confirmar fechamento" }).click();
  await expect(page.getByRole("heading", { name: /Ciclo aberto:/ })).toHaveCount(0);

  await page.getByLabel("Nome", { exact: true }).fill("Dezembro de 2026");
  await page.getByLabel("Início").fill("2026-12-01");
  await page.getByLabel("Prazo").fill("2026-12-31");
  await page.getByRole("button", { name: "Abrir ciclo", exact: true }).click();
  await expect(page.getByRole("heading", { name: /Ciclo aberto: Dezembro de 2026/ })).toBeVisible();
});

test("atleta muda o consentimento do IBVAR", async ({ page }) => {
  await entrar(page, "atleta");
  const chave = page.getByRole("switch", { name: /Compartilhar meu score com o IBVAR/ });
  const antes = await chave.isChecked();
  await chave.click();
  await expect(chave).toBeChecked({ checked: !antes });
  await page.reload();
  await expect(chave).toBeChecked({ checked: !antes });
});

test("atleta pede revisão e o gestor responde", async ({ browser }) => {
  const atleta = await (await browser.newContext()).newPage();
  const motivo = `Acho que esta nota deveria ser revista ${Date.now()}`;
  await atletaPedeRevisao(atleta, motivo);

  const gestor = await (await browser.newContext()).newPage();
  await entrar(gestor, "gestor");
  await linkDoMenu(gestor, "Revisões").click();
  // A linha certa pelo motivo: o seed pode ter outros pedidos abertos.
  await gestor
    .getByRole("row", { name: new RegExp(motivo) })
    .getByRole("button", { name: "Responder" })
    .click();
  const resp = gestor.getByRole("dialog");
  await resp.getByLabel("Resposta").fill("Nota conferida e mantida.");
  await resp.getByRole("button", { name: "Enviar resposta" }).click();
  await expect(gestor.getByText("Resposta registrada.")).toBeVisible();

  await atleta.reload();
  await expect(atleta.getByText("Nota conferida e mantida.")).toBeVisible();
});
