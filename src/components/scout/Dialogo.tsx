import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { FOCAVEIS, useSobreposicao } from "./sobreposicoes";

export interface DialogoProps {
  titulo: string;
  aoFechar: () => void;
  /** Enquanto verdadeiro (ex.: gravando), Esc, clique no fundo e o botão de fechar não fecham. */
  bloqueado?: boolean;
  children: ReactNode;
}

/**
 * Diálogo modal: foco preso (Tab e Shift+Tab), Esc e clique fora fecham, e o foco volta a quem
 * abriu. Só o diálogo do topo da pilha de sobreposições trata Esc e Tab. A rolagem da página
 * fica travada enquanto ele está aberto. Renderize só quando estiver aberto.
 */
export function Dialogo({ titulo, aoFechar, bloqueado = false, children }: DialogoProps) {
  const idTitulo = useId();
  const caixa = useRef<HTMLDivElement>(null);
  // Quem abriu o diálogo é lido no render, antes de qualquer `autoFocus` dos filhos (que roda
  // na montagem e já teria tirado o foco do botão).
  const [origem] = useState<HTMLElement | null>(() =>
    typeof document === "undefined" ? null : (document.activeElement as HTMLElement | null),
  );
  const bloqueadoRef = useRef(bloqueado);
  bloqueadoRef.current = bloqueado;
  const aoFecharRef = useRef(aoFechar);
  aoFecharRef.current = aoFechar;
  const fechar = () => {
    if (!bloqueadoRef.current) aoFecharRef.current();
  };
  // O clique só fecha se o botão do mouse também foi pressionado no fundo: arrastar uma
  // seleção de dentro para fora não pode fechar o diálogo.
  const pressionouNoFundo = useRef(false);

  useSobreposicao({ aoEsc: fechar, caixa: () => caixa.current });

  // Último elemento focado dentro da caixa (ex.: o campo com `autoFocus`). No StrictMode (dev) o
  // efeito roda, é desfeito e roda de novo: a limpeza devolve o foco a quem abriu, e o segundo efeito
  // volta a este elemento em vez de cair no primeiro focável (o botão Fechar).
  const ultimoFocoInterno = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const dentro = caixa.current;
    if (dentro && !dentro.contains(document.activeElement)) {
      const anterior = ultimoFocoInterno.current;
      const alvo =
        anterior?.isConnected && dentro.contains(anterior)
          ? anterior
          : dentro.querySelector<HTMLElement>(FOCAVEIS);
      alvo?.focus();
    }
    return () => {
      if (origem?.isConnected) origem.focus();
    };
  }, [origem]);

  // Portal no body: o diálogo não depende do contexto de empilhamento de quem o renderiza.
  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      className="dialogo-overlay scout"
      onMouseDown={(e) => {
        pressionouNoFundo.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        const valeu = pressionouNoFundo.current && e.target === e.currentTarget;
        pressionouNoFundo.current = false;
        if (valeu) fechar();
      }}
    >
      <div
        ref={caixa}
        className="dialogo panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        onFocus={(e) => {
          ultimoFocoInterno.current = e.target as HTMLElement;
        }}
      >
        <div className="panel-head">
          <h2 id={idTitulo}>{titulo}</h2>
          <button
            type="button"
            className="btn"
            onClick={fechar}
            aria-label="Fechar"
            aria-disabled={bloqueado || undefined}
          >
            <i className="ph ph-x" aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
