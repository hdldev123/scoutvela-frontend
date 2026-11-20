import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { AvisoAmbiente } from "./AvisoAmbiente";
import { Avatar } from "./Avatar";
import { PerfilDialog } from "./PerfilDialog";
import { PaletaDeAtletas } from "./PaletaDeAtletas";
import { useNotificacoes } from "@/lib/api/notificacoes";
import {
  contagemDaTela,
  itensDeNavegacao,
  ROTULO_PAPEL,
  textoDoBalao,
  textoPendentes,
} from "@/lib/auth/navegacao";

interface ShellProps {
  me: {
    usuario: { nome: string; papel: string; fotoUrl?: string | null };
    atleta: { id: string; nome: string } | null;
    telas: string[];
  } | null;
  onSair: () => void;
  children: ReactNode;
}

function UsuarioDoShell({
  me,
  aoAbrirPerfil,
}: {
  me: NonNullable<ShellProps["me"]>;
  aoAbrirPerfil: () => void;
}) {
  const conteudo = (
    <>
      <Avatar nome={me.usuario.nome} fotoUrl={me.usuario.fotoUrl} />
      <span className="side-user-txt">
        <b>{me.usuario.nome}</b>
        <small>{ROTULO_PAPEL[me.usuario.papel] ?? me.usuario.papel}</small>
      </span>
    </>
  );
  // O IBVAR não tem perfil: o bloco continua só informativo.
  if (me.usuario.papel === "ibvar") return <div className="side-user">{conteudo}</div>;
  return (
    <button type="button" className="side-user side-user-btn" onClick={aoAbrirPerfil}>
      {conteudo}
      <span className="sr-only">Abrir meu perfil</span>
    </button>
  );
}

export function Shell({ me, onSair, children }: ShellProps) {
  const itens = me ? itensDeNavegacao(me) : [];
  // Sem sessão (me nulo) ou como IBVAR não há balões; erro de rede só some com eles.
  const notificacoes = useNotificacoes(!!me && me.usuario.papel !== "ibvar");
  const contagens = notificacoes.data?.contagens;
  const total = notificacoes.data?.total ?? 0;
  const [aberta, setAberta] = useState(false);
  const botao = useRef<HTMLButtonElement>(null);
  const [perfilAberto, setPerfilAberto] = useState(false);
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
            <span className="sr-only">
              {aberta ? "Fechar menu" : "Abrir menu"}
              {total > 0 && ` (${textoPendentes(total)})`}
            </span>
            {total > 0 && !aberta && (
              <span className="balao balao-toggle" aria-hidden="true">
                {textoDoBalao(total)}
              </span>
            )}
          </button>
        </div>
        <div id="menu-lateral" className="side-body" data-aberta={aberta}>
          <PaletaDeAtletas me={me} />
          <nav className="tabs" aria-label="Telas">
            {itens.map((i) => {
              const n = contagemDaTela(i.tela, contagens);
              return (
                <Link
                  key={i.tela}
                  to={i.to}
                  {...(i.params ? { params: i.params } : {})}
                  activeProps={{ "aria-current": "page" }}
                >
                  <i className={`ph ph-${i.icone}`} aria-hidden="true" />
                  {i.rotulo}
                  {n > 0 && (
                    <>
                      <span className="balao" aria-hidden="true">
                        {textoDoBalao(n)}
                      </span>
                      <span className="sr-only">, {textoPendentes(n)}</span>
                    </>
                  )}
                </Link>
              );
            })}
          </nav>
          <div className="side-foot">
            {me && <UsuarioDoShell me={me} aoAbrirPerfil={() => setPerfilAberto(true)} />}
            <button className="side-logout" type="button" onClick={onSair}>
              <i className="ph ph-sign-out" aria-hidden="true" /> Sair
            </button>
          </div>
        </div>
      </aside>
      {perfilAberto && <PerfilDialog aoFechar={() => setPerfilAberto(false)} />}
      {aberta && <div className="side-fundo" aria-hidden="true" onClick={() => setAberta(false)} />}
      <main className="wrap" id="app">
        {children}
        <AvisoAmbiente />
      </main>
    </div>
  );
}
