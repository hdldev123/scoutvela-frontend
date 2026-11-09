import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
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
  return (
    <div className="scout">
      <aside className="side" aria-label="Menu">
        <div className="side-brand">
          <span className="side-logo" aria-hidden="true">
            <i className="ph ph-sailboat" />
          </span>
          <span className="brand-name">Scout Vela</span>
          <span className="side-badge">IBVAR</span>
        </div>
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
          <span className="side-demo">Protótipo · dados fictícios</span>
        </div>
      </aside>
      <main className="wrap" id="app">
        {children}
        <footer>
          Protótipo navegável com dados fictícios · metodologia do Word “Sistema de Talent
          Identification & Scouting” (29/09/2026) · VelaID e Ranking CBVela simulados.
        </footer>
      </main>
    </div>
  );
}
