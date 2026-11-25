import { expect, test } from "@playwright/test";
import { entrar } from "./apoio";

// Cada conta de teste abre na sua tela inicial (a coluna "Abre em" das contas de teste).
const CASOS = [
  { conta: "gestor", url: /\/ranking$/, titulo: "Ranking de talento" },
  { conta: "treinadora", url: /\/ranking$/, titulo: "Meus atletas" },
  { conta: "atleta", url: /\/painel$/, titulo: /Olá, Helena/ },
  { conta: "ibvar", url: /\/investimento$/, titulo: "Painel de investimento" },
] as const;

for (const c of CASOS) {
  test(`${c.conta} entra e abre na tela inicial`, async ({ page }) => {
    await entrar(page, c.conta);
    await expect(page).toHaveURL(c.url);
    await expect(page.getByRole("heading", { level: 1, name: c.titulo })).toBeVisible();
  });
}

test("senha errada não entra", async ({ page }) => {
  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill("gestor@scoutvela.dev");
  await page.getByLabel("Senha").fill("errada123");
  await page.getByRole("button", { name: /Entrar/ }).click();
  await expect(page.getByRole("alert")).toHaveText("E-mail ou senha incorretos.");
  await expect(page).toHaveURL(/\/entrar/);
});

test("sair volta ao login e a rota protegida pede login de novo", async ({ page }) => {
  await entrar(page, "gestor");
  await page.getByRole("button", { name: /Sair/ }).click();
  await expect(page).toHaveURL(/\/entrar/);
  await page.goto("/ranking");
  await expect(page).toHaveURL(/\/entrar/);
});

// Auditoria de 25/11/2026, A7: um link de convite ou de redefinição inválido, aberto num navegador
// com outra conta logada, não pode mostrar o formulário (ele trocaria a senha da conta logada).
test("link de senha já usado, com o gestor logado, não mostra o formulário", async ({ page }) => {
  await entrar(page, "gestor");
  await page.goto("/redefinir-senha#error=access_denied&error_code=otp_expired");
  await expect(page.getByRole("heading", { level: 1, name: "Link inválido" })).toBeVisible();
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
});

test("link de senha de outra conta, com o gestor logado, não mostra o formulário", async ({
  page,
}) => {
  await entrar(page, "gestor");
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const token = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: "00000000-0000-4000-8000-000000000000" })}.x`;
  await page.goto(`/redefinir-senha#access_token=${token}&refresh_token=x&type=invite`);
  await expect(page.getByRole("heading", { level: 1, name: "Link inválido" })).toBeVisible();
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
});
