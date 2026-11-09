import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import heroPhoto from "@/assets/olympic-dinghy-sailing.jpg";
import { useSessao } from "@/lib/auth/sessao";
import { getSupabase } from "@/lib/auth/supabase";
import "@/styles/contas.css";

export const SENHA_MINIMA = 10;

type Tipo = "convite" | "recuperacao";

function tipoDoLink(): Tipo {
  if (typeof window === "undefined") return "recuperacao";
  const t = new URLSearchParams(window.location.hash.replace(/^#/, "")).get("type");
  return t === "invite" ? "convite" : "recuperacao";
}

/** Casca visual das telas de conta fora do layout autenticado (mesma cena do login). */
export function CascaConta({ children }: { children: React.ReactNode }) {
  return (
    <div className="entry">
      <div className="entry-scene" aria-hidden>
        <img className="entry-photo" src={heroPhoto} alt="" />
      </div>
      <div className="entry-panel">
        <p className="eyebrow">Talent ID · vela olímpica · IBVAR</p>
        {children}
      </div>
    </div>
  );
}

/**
 * Destino do link do e-mail de convite ou de redefinição. O supabase-js lê o hash da URL e
 * cria a sessão (eventos PASSWORD_RECOVERY e SIGNED_IN); sem sessão, o link é inválido ou expirou.
 */
export function TelaRedefinirSenha() {
  const { carregando, sessao } = useSessao();
  const navigate = useNavigate();
  const [tipo, setTipo] = useState<Tipo>(tipoDoLink);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    const { data } = getSupabase().auth.onAuthStateChange((evento) => {
      if (evento === "PASSWORD_RECOVERY") setTipo("recuperacao");
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const titulo = tipo === "convite" ? "Definir senha" : "Redefinir senha";

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const senha = String(f.get("senha"));
    const confirmacao = String(f.get("confirmacao"));
    if (senha.length < SENHA_MINIMA) {
      setErro(`A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.`);
      return;
    }
    if (senha !== confirmacao) {
      setErro("As senhas não coincidem.");
      return;
    }
    setErro("");
    setEnviando(true);
    const { error } = await getSupabase().auth.updateUser({ password: senha });
    if (error) {
      setErro("Não foi possível salvar a senha. Peça um novo link e tente de novo.");
      setEnviando(false);
      return;
    }
    await navigate({ to: "/", replace: true });
  }

  if (carregando) {
    return (
      <CascaConta>
        <p className="entry-lead" role="status">
          Validando o link…
        </p>
      </CascaConta>
    );
  }

  if (!sessao) {
    return (
      <CascaConta>
        <h1 className="entry-title" style={{ fontSize: "2.2rem" }}>
          Link inválido
        </h1>
        <p className="entry-lead" role="alert">
          Este link é inválido ou expirou. Peça outro pela opção “Esqueci a senha” no login.
        </p>
        <Link className="auth-link" to="/entrar">
          Ir para o login
        </Link>
      </CascaConta>
    );
  }

  return (
    <CascaConta>
      <h1 className="entry-title" style={{ fontSize: "2.2rem" }}>
        {titulo}
      </h1>
      <p className="entry-lead">
        Escolha uma senha com pelo menos {SENHA_MINIMA} caracteres. Ela vale só para o Scout Vela.
      </p>
      <form className="auth-form" onSubmit={onSubmit}>
        <label className="auth-field">
          Nova senha
          <input name="senha" type="password" autoComplete="new-password" required />
        </label>
        <label className="auth-field">
          Confirme a nova senha
          <input name="confirmacao" type="password" autoComplete="new-password" required />
        </label>
        {erro && (
          <p className="auth-error" role="alert">
            {erro}
          </p>
        )}
        <button className="auth-primary" type="submit" disabled={enviando}>
          {enviando ? "Salvando…" : "Salvar senha →"}
        </button>
      </form>
    </CascaConta>
  );
}
