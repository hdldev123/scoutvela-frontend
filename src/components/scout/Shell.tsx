import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { AvisoAmbiente } from "./AvisoAmbiente";
import { PaletaDeAtletas } from "./PaletaDeAtletas";
import { iniciais, itensDeNavegacao, ROTULO_PAPEL } from "@/lib/auth/navegacao";

interface ShellProps {
  me: {
    usuario: { nome: string; papel: string };
    atleta: { id: string; nome: string } | null;
    telas: string[];
  } | null;
  onSair: () => void;
  children: ReactNode;
}

export function Shell({ me, onSair, children }: ShellProps) {
  const itens = me ? itensDeNavegacao(me) : [];
  const [aberta, setAberta] = useState(false);
  const botao = useRef<HTMLButtonElement>(null);
  const caminho = useRouterState({ select: (s) => s.location.pathname });

  // Fecha ao trocar de rota; o foco volta ao botão só se a gaveta estava aberta.
  useEffect(() => {
    setAberta((was) => {
      if (was) botao.current?.focus();
      return false;
    });
  }, [caminho]);

  useEffect(() => {
    if (!aberta) return;
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setAberta(false);
      botao.current?.focus();
    };
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [aberta]);

  return (
    <div className="scout">
      <aside className="side" aria-label="Menu">
        <div className="side-brand">
          <span className="side-logo" aria-hidden="true">
            <i className="ph ph-sailboat" />
          </span>
          <span className="brand-name">Scout Vela</span>
          <span className="side-badge">IBVAR</span>
          <button
            ref={botao}
            type="button"
            className="side-toggle"
            aria-expanded={aberta}
            aria-controls="menu-lateral"
            onClick={() => setAberta((v) => !v)}
          >
            <i className={`ph ph-${aberta ? "x" : "list"}`} aria-hidden="true" />
            <span className="sr-only">{aberta ? "Fechar menu" : "Abrir menu"}</span>
          </button>
        </div>
        <div id="menu-lateral" className="side-body" data-aberta={aberta}>
          <PaletaDeAtletas me={me} />
          <nav className="tabs" aria-label="Telas">
            {itens.map((i) => (
              <Link
                key={i.tela}
                to={i.to}
                {...(i.params ? { params: i.params } : {})}
                activeProps={{ "aria-current": "page" }}
              >
                <i className={`ph ph-${i.icone}`} aria-hidden="true" />
                {i.rotulo}
              </Link>
            ))}
          </nav>
          <div className="side-foot">
            {me && (
              <div className="side-user">
                <span className="avatar" aria-hidden="true">
                  {iniciais(me.usuario.nome)}
                </span>
                <span className="side-user-txt">
                  <b>{me.usuario.nome}</b>
                  <small>{ROTULO_PAPEL[me.usuario.papel] ?? me.usuario.papel}</small>
                </span>
              </div>
            )}
            <button className="side-logout" type="button" onClick={onSair}>
              <i className="ph ph-sign-out" aria-hidden="true" /> Sair
            </button>
          </div>
        </div>
      </aside>
      {aberta && <div className="side-fundo" aria-hidden="true" onClick={() => setAberta(false)} />}
      <main className="wrap" id="app">
        {children}
        <AvisoAmbiente />
      </main>
    </div>
  );
}
