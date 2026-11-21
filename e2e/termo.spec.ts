import { expect, test } from "@playwright/test";
import { entrar, SEED } from "./apoio";

test("gestor agenda um termo novo e a atleta o aceita antes da vigência", async ({ browser }) => {
  const versao = `v-e2e-${Date.now()}`;
  const gestor = await (await browser.newContext()).newPage();
  await entrar(gestor, "gestor");
  await gestor.goto("/parametros#termo");
  await gestor.getByRole("button", { name: "Publicar nova versão" }).click();
  const dialogo = gestor.getByRole("dialog");
  await dialogo.getByLabel("Versão", { exact: true }).fill(versao);
  await dialogo.getByLabel("Título").fill("Termo de consentimento do E2E");
  await dialogo
    .getByLabel("Texto", { exact: true })
    .fill("Texto de teste do termo de consentimento, com mais de cinquenta caracteres.");
  // Vigência daqui a 7 dias, no formato do datetime-local.
  const d = new Date(Date.now() + 7 * 86_400_000);
  const p = (n: number) => String(n).padStart(2, "0");
  await dialogo
    .getByLabel("Vigente a partir de")
    .fill(`${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T09:00`);
  await dialogo.getByRole("button", { name: "Revisar e publicar" }).click();
  await dialogo.getByRole("button", { name: "Confirmar e publicar" }).click();
  await expect(gestor.getByText(`Versão ${versao} do termo publicada.`)).toBeVisible();

  const atleta = await (await browser.newContext()).newPage();
  await entrar(atleta, "atleta");
  await expect(atleta.getByRole("heading", { level: 1, name: SEED.atleta.saudacao })).toBeVisible();
  const bloco = atleta.getByRole("heading", {
    level: 2,
    name: new RegExp(`Nova versão do termo \\(${versao}\\)`),
  });
  await expect(bloco).toBeVisible();
  await atleta.getByRole("button", { name: "Aceitar agora" }).click();
  await expect(atleta.getByText("Nova versão do termo aceita")).toBeVisible();
  await expect(bloco).toHaveCount(0);
  await atleta.reload();
  await expect(atleta.getByRole("heading", { level: 1, name: SEED.atleta.saudacao })).toBeVisible();
  await atleta.waitForLoadState("networkidle");
  await expect(bloco).toHaveCount(0);
});
