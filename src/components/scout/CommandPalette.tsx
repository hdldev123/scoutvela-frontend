import { Command } from "cmdk";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Avatar } from "./Avatar";
import { fmt1 } from "./formato";
import { temSobreposicao, useSobreposicao } from "./sobreposicoes";

export type Visivel = {
  id: string;
  nome: string;
  classe: string;
  /** Nulo quando não há score para mostrar (ex.: atleta abrindo a própria ficha). */
  score: number | null;
  faixa: string;
  status: string;
  /** Pessoa do avatar: foto ou iniciais. */
  avatar: { nome: string; fotoUrl: string | null };
};

export interface CommandPaletteProps {
  itens: Visivel[];
  aoSelecionar: (id: string) => void;
}

/** Atalho da busca: "⌘K" no Mac e "Ctrl K" nos demais. Começa neutro para não divergir do SSR. */
function useRotuloAtalho(): string {
  const [rotulo, setRotulo] = useState("Ctrl K");
  useEffect(() => {
    const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
    const plataforma = nav.userAgentData?.platform ?? nav.platform ?? "";
    if (/mac|iphone|ipad|ipod/i.test(plataforma)) setRotulo("⌘K");
  }, []);
  return rotulo;
}

export function CommandPalette({ itens, aoSelecionar }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const aberta = useRef(false);
  aberta.current = open;
  const botao = useRef<HTMLButtonElement>(null);
  const caixa = useRef<HTMLDivElement>(null);
  const atalho = useRotuloAtalho();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        // Com um diálogo (ou a gaveta) aberto, a busca não abre por baixo dele.
        if (!aberta.current && temSobreposicao()) return;
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useSobreposicao({ ativa: open, aoEsc: () => setOpen(false), caixa: () => caixa.current });

  // Ao fechar, o foco volta ao botão "Buscar atleta".
  const estavaAberta = useRef(false);
  useEffect(() => {
    if (estavaAberta.current && !open) botao.current?.focus();
    estavaAberta.current = open;
  }, [open]);

  return (
    <>
      <button
        ref={botao}
        type="button"
        className="cmdk-trigger"
        aria-haspopup="dialog"
        aria-keyshortcuts="Control+K Meta+K"
        onClick={() => setOpen(true)}
      >
        <i className="ph ph-magnifying-glass" aria-hidden="true" />
        <span>Buscar atleta…</span>
        <kbd>{atalho}</kbd>
      </button>
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="cmdk-overlay scout" onClick={() => setOpen(false)}>
            <Command
              ref={caixa}
              className="cmdk"
              label="Buscar atleta"
              role="dialog"
              aria-modal="true"
              aria-label="Buscar atleta"
              onClick={(e) => e.stopPropagation()}
            >
              <Command.Input autoFocus placeholder="Nome, classe ou status do gate…" />
              <Command.List>
                <Command.Empty>Nenhum atleta visível para este perfil.</Command.Empty>
                {itens.map((a) => (
                  <Command.Item
                    key={a.id}
                    value={`${a.nome} ${a.classe} ${a.status} ${a.faixa}`}
                    onSelect={() => {
                      aoSelecionar(a.id);
                      setOpen(false);
                    }}
                  >
                    <Avatar nome={a.avatar.nome} fotoUrl={a.avatar.fotoUrl} />
                    <span className="cmdk-name">{a.nome}</span>
                    <span className="cmdk-meta">{a.classe}</span>
                    <span className="cmdk-meta">{a.status}</span>
                    <span className="cmdk-score">{a.score == null ? "" : fmt1(a.score)}</span>
                  </Command.Item>
                ))}
              </Command.List>
            </Command>
          </div>,
          document.body,
        )}
    </>
  );
}
