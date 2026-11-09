import { Command } from "cmdk";
import { useEffect, useState } from "react";
import { fmt1 } from "./formato";

export type Visivel = {
  id: string;
  nome: string;
  classe: string;
  /** Nulo quando não há score para mostrar (ex.: atleta abrindo a própria ficha). */
  score: number | null;
  faixa: string;
  status: string;
};

export interface CommandPaletteProps {
  itens: Visivel[];
  aoSelecionar: (id: string) => void;
}

export function CommandPalette({ itens, aoSelecionar }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <button type="button" className="cmdk-trigger" onClick={() => setOpen(true)}>
        <i className="ph ph-magnifying-glass" aria-hidden="true" />
        <span>Buscar atleta…</span>
        <kbd>⌘K</kbd>
      </button>
      {open && (
        <div className="cmdk-overlay" onClick={() => setOpen(false)}>
          <Command className="cmdk" label="Central de comando" onClick={(e) => e.stopPropagation()}>
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
                  <span className="cmdk-name">{a.nome}</span>
                  <span className="cmdk-meta">{a.classe}</span>
                  <span className="cmdk-meta">{a.status}</span>
                  <span className="cmdk-score">{a.score == null ? "" : fmt1(a.score)}</span>
                </Command.Item>
              ))}
            </Command.List>
          </Command>
        </div>
      )}
    </>
  );
}
