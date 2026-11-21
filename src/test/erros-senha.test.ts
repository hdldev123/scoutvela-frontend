import { describe, expect, it } from "vitest";
import { mensagemErroSenha } from "@/lib/auth/erros-senha";

describe("mensagemErroSenha", () => {
  it.each([
    [{ code: "weak_password", weak_password: { reasons: ["length"] } }, /é curta demais/],
    [{ code: "weak_password" }, /fraca demais/],
    [{ code: "same_password" }, /diferente da atual/],
    [{ code: "reauthentication_needed" }, /saia e entre de novo/],
    [{ code: "session_not_found" }, /sessão expirou/],
    [{ code: "over_request_rate_limit" }, /Muitas tentativas/],
    [{ name: "AuthRetryableFetchError", status: 0 }, /Sem conexão/],
    [{ message: "algo estranho" }, /Não foi possível trocar a senha/],
  ])("%j", (erro, texto) => {
    const r = mensagemErroSenha(erro);
    expect(r.texto).toMatch(texto);
    expect(r.pedeVerificacao).toBe(false);
  });

  it("AAL2 pede a verificação em duas etapas", () => {
    expect(mensagemErroSenha({ code: "insufficient_aal" }).pedeVerificacao).toBe(true);
    expect(mensagemErroSenha({ message: "AAL2 session is required" }).pedeVerificacao).toBe(true);
  });
});
