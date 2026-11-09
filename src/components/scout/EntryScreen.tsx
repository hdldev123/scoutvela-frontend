import { useState, type FormEvent } from "react";
import heroPhoto from "@/assets/olympic-dinghy-sailing.jpg";
import loginVideo from "@/assets/login-bg-v2.mp4.asset.json";

/* Swap this to change the entry background (image URL or import). */
const HERO_MEDIA_URL = heroPhoto;

/** Tela de login. As contas são criadas pela CBVela: não há autocadastro nem escolha de perfil. */
export function EntryScreen({ onEntrar }: { onEntrar: (email: string, senha: string) => Promise<void> }) {
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setErro("");
    setEnviando(true);
    try {
      await onEntrar(String(f.get("email")).trim(), String(f.get("senha")));
    } catch {
      setErro("E-mail ou senha incorretos.");
      setEnviando(false);
    }
  }

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
        <p className="entry-lead">Entre com sua conta. Cada perfil só vê o que precisa.</p>
        <form className="auth-form" onSubmit={onSubmit}>
          <label className="auth-field">
            E-mail
            <input name="email" type="email" autoComplete="email" maxLength={255} required />
          </label>
          <label className="auth-field">
            Senha
            <input name="senha" type="password" autoComplete="current-password" required />
          </label>
          {erro && (
            <p className="auth-error" role="alert">
              {erro}
            </p>
          )}
          <button className="auth-primary" type="submit" disabled={enviando}>
            {enviando ? "Entrando…" : "Entrar →"}
          </button>
        </form>
        <p className="entry-note">Ambiente de desenvolvimento com dados fictícios.</p>
      </div>
    </div>
  );
}
