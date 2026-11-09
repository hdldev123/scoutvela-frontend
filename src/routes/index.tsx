import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { EntryScreen } from "@/components/scout/EntryScreen";
import { CommandPalette, type Visivel } from "@/components/scout/CommandPalette";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Scout Vela · Talent ID da vela olímpica" },
      {
        name: "description",
        content: "Protótipo de Talent ID da vela olímpica: ranking, fichas, avaliações e painel de investimento com dados fictícios.",
      },
      { property: "og:title", content: "Scout Vela · Talent ID da vela olímpica" },
      {
        property: "og:description",
        content: "Ranking de talento, avaliações por pilar e gates aos 18 anos. Dados fictícios.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const rootRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<{ visiveis: () => Visivel[] } | null>(null);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (!entered) return;
    let cleanup: (() => void) | undefined;
    import("@/lib/scout/engine.js").then(({ createScout }) => {
      if (!rootRef.current) return;
      const eng = createScout(rootRef.current);
      engineRef.current = eng;
      cleanup = eng.cleanup;
    });
    return () => cleanup?.();
  }, [entered]);

  const getItems = useCallback(() => engineRef.current?.visiveis() ?? [], []);

  if (!entered)
    return (
      <EntryScreen
        onEnter={(perfil) => {
          try {
            localStorage.setItem("scout-perfil", perfil);
          } catch {
            /* ignore */
          }
          history.replaceState(null, "", location.pathname);
          setEntered(true);
        }}
      />
    );

  const sair = () => {
    try {
      localStorage.removeItem("scout-perfil");
    } catch {
      /* ignore */
    }
    history.replaceState(null, "", location.pathname);
    setEntered(false);
  };
  const perfilAtual = (() => {
    try {
      return localStorage.getItem("scout-perfil") ?? "gestor";
    } catch {
      return "gestor";
    }
  })();
  const usuario = USUARIOS[perfilAtual] ?? USUARIOS["gestor"]!;

  return (
    <div className="scout" ref={rootRef}>
      <aside className="side" aria-label="Menu">
        <div className="side-brand">
          <span className="side-logo" aria-hidden="true">
            <i className="ph ph-sailboat" />
          </span>
          <span className="brand-name">Scout Vela</span>
          <span className="side-badge">IBVAR</span>
        </div>
        <CommandPalette getItems={getItems} />
        <nav className="tabs" id="tabs" aria-label="Telas" />
        <div className="side-foot">
          <div className="side-user">
            <span className="avatar" aria-hidden="true">{usuario.ini}</span>
            <span className="side-user-txt">
              <b>{usuario.nome}</b>
              <small>{usuario.papel}</small>
            </span>
          </div>
          <button className="side-logout" onClick={sair}>
            <i className="ph ph-sign-out" aria-hidden="true" /> Sair
          </button>
          <span className="side-demo">Protótipo · dados fictícios</span>
        </div>
        <label className="who-as" htmlFor="perfil" hidden>
          Ver como
          <select id="perfil" defaultValue="gestor">
            <option value="gestor">Gestor CBVela</option>
            <option value="treinador">Treinadora · Ana Ribeiro</option>
            <option value="atleta">Atleta · Helena Vasques</option>
            <option value="ibvar">IBVAR</option>
          </select>
        </label>
      </aside>
      <main className="wrap" id="app" />
      <div id="toast" role="status" aria-live="polite" />
    </div>
  );
}

const USUARIOS: Record<string, { nome: string; papel: string; ini: string }> = {
  gestor: { nome: "Gestor", papel: "Gestão técnica", ini: "GC" },
  treinador: { nome: "Ana Ribeiro", papel: "Treinadora", ini: "AR" },
  atleta: { nome: "Helena Vasques", papel: "Atleta", ini: "HV" },
  ibvar: { nome: "IBVAR", papel: "Investidor", ini: "IB" },
};
