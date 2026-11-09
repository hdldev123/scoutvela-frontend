import { Command } from "cmdk";
import { useEffect, useState } from "react";

export type Visivel = { id: string; nome: string; classe: string; score: number; faixa: string; status: string };

export function CommandPalette({ getItems }: { getItems: () => Visivel[] }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Visivel[]>([]);

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

  useEffect(() => {
    if (open) setItems(getItems());
  }, [open, getItems]);

  return (
    <>
      <button className="cmdk-trigger" onClick={() => setOpen(true)}>
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
              {items.map((a) => (
                <Command.Item
                  key={a.id}
                  value={`${a.nome} ${a.classe} ${a.status} ${a.faixa}`}
                  onSelect={() => {
                    location.hash = `atleta-${a.id}`;
                    setOpen(false);
                  }}
                >
                  <span className="cmdk-name">{a.nome}</span>
                  <span className="cmdk-meta">{a.classe}</span>
                  <span className="cmdk-meta">{a.status}</span>
                  <span className="cmdk-score">{a.score.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                </Command.Item>
              ))}
            </Command.List>
          </Command>
        </div>
      )}
    </>
  );
}
