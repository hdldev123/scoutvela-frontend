import { Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import heroPhoto from "@/assets/olympic-dinghy-sailing.jpg";
import { lerLinkDeSenha } from "@/lib/auth/link-senha";
import { useSessao } from "@/lib/auth/sessao";
import { getSupabase } from "@/lib/auth/supabase";
import "@/styles/contas.css";

export const SENHA_MINIMA = 10;

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
 * Destino do link do e-mail de convite ou de redefinição. O supabase-js lê o hash da URL e cria a
 * sessão da conta do link. A tela só deixa trocar a senha se a sessão ativa for exatamente a conta
 * que o link autenticou: link com erro (inválido, expirado ou já usado), sem token ou de outra conta
 * nunca troca a senha da sessão que já estava aberta no navegador (auditoria A7).
 */
export function TelaRedefinirSenha() {
  const { carregando, sessao } = useSessao();
  const navigate = useNavigate();
  const [link] = useState(lerLinkDeSenha);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const tipo = link.tipo;

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
    // Confere de novo na hora de salvar: a senha só muda na conta que o link autenticou.
    const { data } = await getSupabase().auth.getSession();
    if (!link.sub || data.session?.user.id !== link.sub) {
      setErro("Este link não vale para a conta aberta neste navegador. Peça um novo link.");
      setEnviando(false);
      return;
    }
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

  if (!link.erro && !link.sub) {
    return (
      <CascaConta>
        <h1 className="entry-title" style={{ fontSize: "2.2rem" }}>
          Abra pelo link do e-mail
        </h1>
        <p className="entry-lead" role="alert">
          Esta página só funciona pelo link de convite ou de redefinição enviado por e-mail. Para
          trocar a senha da conta em uso, abra “Meu perfil”.
        </p>
        <Link className="auth-link" to="/entrar">
          Ir para o login
        </Link>
      </CascaConta>
    );
  }

  if (link.erro || !sessao || sessao.user.id !== link.sub) {
    return (
      <CascaConta>
        <h1 className="entry-title" style={{ fontSize: "2.2rem" }}>
          Link inválido
        </h1>
        <p className="entry-lead" role="alert">
          Este link é inválido, expirou ou já foi usado. Peça outro pela opção “Esqueci a senha” no
          login ou um novo convite à gestão.
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
