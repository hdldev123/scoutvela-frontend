import { useQueryClient } from "@tanstack/react-query";
import { Navigate, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useSessao } from "@/lib/auth/sessao";
import { getSupabase } from "@/lib/auth/supabase";

import { CascaConta } from "./TelaRedefinirSenha";

interface Cadastro {
  factorId: string;
  qr: string;
  segredo: string;
}

/**
 * Segundo fator (TOTP) exigido pela API para gestor e IBVAR. Sem fator verificado, cadastra um
 * (QR code e segredo); com fator, só pede o código de 6 dígitos.
 */
export function TelaVerificacao() {
  const { carregando, sessao, sair } = useSessao();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [cadastro, setCadastro] = useState<Cadastro | null>(null);
  const [erroInicial, setErroInicial] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const iniciou = useRef(false);

  useEffect(() => {
    if (!sessao || iniciou.current) return;
    iniciou.current = true;
    const mfa = getSupabase().auth.mfa;
    (async () => {
      const { data, error } = await mfa.listFactors();
      if (error) throw error;
      const verificado = data?.totp?.[0];
      if (verificado) {
        setFactorId(verificado.id);
        return;
      }
      // Cadastros abandonados (nunca verificados) ficam para trás e bloqueiam um novo.
      for (const f of data?.all ?? []) {
        if (f.factor_type === "totp" && f.status !== "verified") {
          await mfa.unenroll({ factorId: f.id });
        }
      }
      const { data: novo, error: erroCadastro } = await mfa.enroll({ factorType: "totp" });
      if (erroCadastro || !novo) throw erroCadastro ?? new Error("sem fator");
      setFactorId(novo.id);
      setCadastro({ factorId: novo.id, qr: novo.totp.qr_code, segredo: novo.totp.secret });
    })().catch(() => setErroInicial("Não foi possível preparar a verificação. Tente de novo."));
  }, [sessao]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!factorId) return;
    const codigo = String(new FormData(e.currentTarget).get("codigo")).replace(/\s/g, "");
    if (!/^\d{6}$/.test(codigo)) {
      setErro("Digite o código de 6 dígitos.");
      return;
    }
    setErro("");
    setEnviando(true);
    const mfa = getSupabase().auth.mfa;
    const { data: desafio, error: erroDesafio } = await mfa.challenge({ factorId });
    const { error: erroVerificar } = erroDesafio
      ? { error: erroDesafio }
      : await mfa.verify({ factorId, challengeId: desafio.id, code: codigo });
    if (erroVerificar) {
      setErro("Código incorreto ou expirado. Confira o app e tente de novo.");
      setEnviando(false);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["me"] });
    await navigate({ to: "/", replace: true });
  }

  if (carregando) {
    return (
      <CascaConta>
        <p className="entry-lead" role="status">
          Carregando…
        </p>
      </CascaConta>
    );
  }
  if (!sessao) return <Navigate to="/entrar" replace />;

  return (
    <CascaConta>
      <h1 className="entry-title" style={{ fontSize: "2.2rem" }}>
        Verificação em duas etapas
      </h1>
      <p className="entry-lead">
        Seu perfil acessa dados de todos os atletas, por isso a API exige um segundo fator.
      </p>
      {erroInicial && (
        <p className="auth-error" role="alert">
          {erroInicial}
        </p>
      )}
      {cadastro && (
        <div className="stack" style={{ gap: 10 }}>
          <p className="entry-lead">
            Leia o QR code com um app autenticador (Google Authenticator, Authy, 1Password) ou
            digite o segredo.
          </p>
          <img className="conta-qr" src={cadastro.qr} alt="QR code para o app autenticador" />
          <p className="conta-segredo">
            Segredo: <b>{cadastro.segredo}</b>
          </p>
        </div>
      )}
      {factorId && (
        <form className="auth-form" onSubmit={onSubmit}>
          <label className="auth-field">
            Código de 6 dígitos
            <input
              name="codigo"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={7}
              required
            />
          </label>
          {erro && (
            <p className="auth-error" role="alert">
              {erro}
            </p>
          )}
          <button className="auth-primary" type="submit" disabled={enviando}>
            {enviando ? "Verificando…" : cadastro ? "Ativar e entrar →" : "Verificar →"}
          </button>
        </form>
      )}
      <button
        className="auth-link"
        type="button"
        onClick={async () => {
          await sair();
          await navigate({ to: "/entrar", replace: true });
        }}
      >
        Sair
      </button>
    </CascaConta>
  );
}
