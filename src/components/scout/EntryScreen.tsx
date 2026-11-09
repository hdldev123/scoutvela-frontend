import { useEffect, useState, type FormEvent } from "react";
import heroPhoto from "@/assets/olympic-dinghy-sailing.jpg";

/* Imagem padrão do fundo. O vídeo só entra se VITE_LOGIN_VIDEO_URL existir. */
const HERO_MEDIA_URL = heroPhoto;
const VIDEO_URL = import.meta.env.VITE_LOGIN_VIDEO_URL || "";

export const MENSAGEM_RECUPERACAO = "Se o e-mail tiver conta, você vai receber um link.";

function useMovimentoReduzido() {
  const [reduzido, setReduzido] = useState(true);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduzido(m.matches);
    const aoMudar = (e: MediaQueryListEvent) => setReduzido(e.matches);
    m.addEventListener?.("change", aoMudar);
    return () => m.removeEventListener?.("change", aoMudar);
  }, []);
  return reduzido;
}

/** Tela de login. As contas são criadas pela CBVela: não há autocadastro nem escolha de perfil. */
export function EntryScreen({
  onEntrar,
  onRecuperar,
}: {
  onEntrar: (email: string, senha: string) => Promise<void>;
  /** Pede o link de redefinição de senha. Opcional: sem ela, o link "Esqueci a senha" some. */
  onRecuperar?: (email: string) => Promise<void>;
}) {
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [recuperando, setRecuperando] = useState(false);
  const [aviso, setAviso] = useState("");
  // Antes da hidratação o formulário não pode ser enviado pelo navegador:
  // o envio nativo poria e-mail e senha na URL (e nos logs do servidor).
  const [pronto, setPronto] = useState(false);
  useEffect(() => setPronto(true), []);
  const reduzido = useMovimentoReduzido();
  const comVideo = !!VIDEO_URL && !reduzido;

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

  async function onRecuperarSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!onRecuperar) return;
    const f = new FormData(e.currentTarget);
    setEnviando(true);
    try {
      await onRecuperar(String(f.get("email")).trim());
    } catch {
      // Sem revelar se a conta existe: a mensagem é sempre a mesma.
    }
    setAviso(MENSAGEM_RECUPERACAO);
    setEnviando(false);
  }

  return (
    <div className="entry">
      <div className="entry-scene" aria-hidden>
        {comVideo ? (
          <video
            className="entry-photo entry-video object-cover object-right w-full h-full"
            src={VIDEO_URL}
            poster={HERO_MEDIA_URL}
            autoPlay
            loop
            muted
            playsInline
            onLoadedMetadata={(e) => {
              e.currentTarget.playbackRate = 0.6;
            }}
          />
        ) : (
          <img className="entry-photo" src={HERO_MEDIA_URL} alt="" />
        )}
      </div>
      <div className="entry-coord tl">22°54′S · 43°10′W</div>
      <div className="entry-coord br">PILOTO 18+ · CICLO NOV/2026</div>
      <div className="entry-panel">
        <p className="eyebrow">Talent ID · vela olímpica · IBVAR</p>
        <h1 className="entry-title">
          Scout <span>Vela</span>
        </h1>
        {recuperando ? (
          <>
            <p className="entry-lead">
              Informe o e-mail da sua conta. Enviaremos um link para definir uma nova senha.
            </p>
            <form className="auth-form" method="post" onSubmit={onRecuperarSubmit}>
              <label className="auth-field">
                E-mail
                <input name="email" type="email" autoComplete="email" maxLength={255} required />
              </label>
              {aviso && (
                <p className="entry-lead" role="status">
                  {aviso}
                </p>
              )}
              <button className="auth-primary" type="submit" disabled={!pronto || enviando}>
                {enviando ? "Enviando…" : "Enviar link"}
              </button>
              <button
                className="auth-link"
                type="button"
                onClick={() => {
                  setRecuperando(false);
                  setAviso("");
                }}
              >
                Voltar ao login
              </button>
            </form>
          </>
        ) : (
          <>
            <p className="entry-lead">Entre com sua conta. Cada perfil só vê o que precisa.</p>
            <form className="auth-form" method="post" onSubmit={onSubmit}>
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
              <button className="auth-primary" type="submit" disabled={!pronto || enviando}>
                {enviando ? "Entrando…" : "Entrar →"}
              </button>
              {onRecuperar && (
                <button className="auth-link" type="button" onClick={() => setRecuperando(true)}>
                  Esqueci a senha
                </button>
              )}
            </form>
          </>
        )}
        <p className="entry-note">Ambiente de desenvolvimento com dados fictícios.</p>
      </div>
    </div>
  );
}
