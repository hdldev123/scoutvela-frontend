import { useState, type FormEvent } from "react";
import heroPhoto from "@/assets/olympic-dinghy-sailing.jpg";
import loginVideo from "@/assets/login-bg-v2.mp4.asset.json";
import { CONTAS_DEMO, cadastrar, entrarNoNavegador, type Perfil } from "@/lib/scout/mock-auth";

/* Swap this to change the entry background (image URL or import). */
const HERO_MEDIA_URL = heroPhoto;

const NOME_PERFIL: Record<Perfil, string> = {
  gestor: "Gestor CBVela",
  treinador: "Treinador(a)",
  atleta: "Atleta",
  ibvar: "IBVAR",
};

function GoogleLogo() {
  return (
    <svg aria-hidden="true" width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>
  );
}

export function EntryScreen({ onEnter }: { onEnter: (perfil: Perfil) => void }) {
  const [modo, setModo] = useState<"login" | "cadastro" | "google">("login");
  const [erro, setErro] = useState("");

  function onLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const c = entrarNoNavegador(String(f.get("email")), String(f.get("senha")));
    if (!c) return setErro("E-mail ou senha incorretos.");
    onEnter(c.perfil);
  }

  function onCadastro(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const perfil = String(f.get("perfil")) as Perfil;
    const msg = cadastrar({ nome: String(f.get("nome")), email: String(f.get("email")), senha: String(f.get("senha")), perfil });
    if (msg) return setErro(msg);
    onEnter(perfil);
  }

  const trocar = (m: typeof modo) => {
    setErro("");
    setModo(m);
  };

  return (
    <div className="entry">
      <div className="entry-scene" aria-hidden>
        <video
          className="entry-photo entry-video object-cover object-right w-full h-full"
          src={loginVideo.url}
          poster={HERO_MEDIA_URL}
          autoPlay
          loop
          muted
          playsInline
          onLoadedMetadata={(e) => {
            e.currentTarget.playbackRate = 0.6;
          }}
        />
      </div>
      <div className="entry-coord tl">22°54′S · 43°10′W</div>
      <div className="entry-coord br">PILOTO 18+ · CICLO NOV/2026</div>
      <div className="entry-panel">
        <p className="eyebrow">Talent ID · vela olímpica · IBVAR</p>
        <h1 className="entry-title">
          Scout <span>Vela</span>
        </h1>

        {modo === "login" && (
          <>
            <p className="entry-lead">Entre com sua conta. Cada perfil só vê o que precisa.</p>
            <form className="auth-form" onSubmit={onLogin}>
              <label className="auth-field">E-mail<input name="email" type="email" autoComplete="email" required /></label>
              <label className="auth-field">Senha<input name="senha" type="password" autoComplete="current-password" required /></label>
              {erro && <p className="auth-error" role="alert">{erro}</p>}
              <button className="auth-primary" type="submit">Entrar →</button>
              <div className="auth-or"><span>ou</span></div>
              <button type="button" className="auth-google" onClick={() => trocar("google")}>
                <GoogleLogo /> Continuar com Google
              </button>
              <button type="button" className="auth-link" onClick={() => trocar("cadastro")}>
                Não tem conta? <b>Cadastrar</b>
              </button>
            </form>
          </>
        )}

        {modo === "google" && (
          <>
            <p className="entry-lead">Escolha uma conta Google (simulado).</p>
            <div className="entry-list">
              {CONTAS_DEMO.map((c, i) => (
                <button key={c.email} className="entry-opt" onClick={() => onEnter(c.perfil)}>
                  <span className="entry-idx">0{i + 1}</span>
                  <span><b>{c.nome}</b><small>{c.email}</small></span>
                  <span aria-hidden>→</span>
                </button>
              ))}
            </div>
            <button type="button" className="auth-link" onClick={() => trocar("login")}>← Voltar ao login</button>
          </>
        )}

        {modo === "cadastro" && (
          <>
            <p className="entry-lead">Crie sua conta de acesso ao piloto.</p>
            <form className="auth-form" onSubmit={onCadastro}>
              <label className="auth-field">Nome<input name="nome" maxLength={100} required /></label>
              <label className="auth-field">E-mail<input name="email" type="email" maxLength={255} required /></label>
              <label className="auth-field">Senha<input name="senha" type="password" minLength={6} autoComplete="new-password" required /></label>
              <label className="auth-field">Perfil
                <select name="perfil" defaultValue="atleta">
                  {(Object.keys(NOME_PERFIL) as Perfil[]).map((p) => <option key={p} value={p}>{NOME_PERFIL[p]}</option>)}
                </select>
              </label>
              {erro && <p className="auth-error" role="alert">{erro}</p>}
              <button className="auth-primary" type="submit">Criar conta →</button>
              <button type="button" className="auth-link" onClick={() => trocar("login")}>Já tenho conta. <b>Entrar</b></button>
            </form>
          </>
        )}

        <p className="entry-note">Protótipo com dados fictícios. Login simulado, sem segurança real.</p>
      </div>
    </div>
  );
}
