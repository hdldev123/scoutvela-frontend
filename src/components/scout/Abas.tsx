import type { KeyboardEvent, ReactNode } from "react";

export type ItemAba = { id: string; rotulo: string; contagem?: number };

type Props = {
  rotulo: string;
  itens: ItemAba[];
  ativa: string;
  aoMudar: (id: string) => void;
};

/** Controle segmentado acessível (tablist). Use com PainelAba. */
export function Abas({ rotulo, itens, ativa, aoMudar }: Props) {
  function aoTeclar(e: KeyboardEvent<HTMLDivElement>) {
    const i = itens.findIndex((x) => x.id === ativa);
    let alvo = -1;
    if (e.key === "ArrowRight") alvo = (i + 1) % itens.length;
    else if (e.key === "ArrowLeft") alvo = (i - 1 + itens.length) % itens.length;
    else if (e.key === "Home") alvo = 0;
    else if (e.key === "End") alvo = itens.length - 1;
    const item = itens[alvo];
    if (!item) return;
    e.preventDefault();
    aoMudar(item.id);
    document.getElementById(`aba-${item.id}`)?.focus();
  }
  return (
    <div className="abas" role="tablist" aria-label={rotulo} onKeyDown={aoTeclar}>
      {itens.map((it) => (
        <button
          key={it.id}
          type="button"
          role="tab"
          id={`aba-${it.id}`}
          aria-selected={it.id === ativa}
          aria-controls={`painel-${it.id}`}
          tabIndex={it.id === ativa ? 0 : -1}
          className="aba"
          onClick={() => aoMudar(it.id)}
        >
          {it.rotulo}
          {it.contagem !== undefined && <span className="aba-contagem">{it.contagem}</span>}
        </button>
      ))}
    </div>
  );
}

export function PainelAba({
  id,
  ativa,
  children,
}: {
  id: string;
  ativa: boolean;
  children: ReactNode;
}) {
  return (
    <div role="tabpanel" id={`painel-${id}`} aria-labelledby={`aba-${id}`} hidden={!ativa}>
      {ativa ? children : null}
    </div>
  );
}
