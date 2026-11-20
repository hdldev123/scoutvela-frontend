import { useEffect, useId, useRef, type ReactNode } from "react";

export interface DialogoProps {
  titulo: string;
  aoFechar: () => void;
  children: ReactNode;
}

const FOCAVEIS =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Diálogo modal: foco preso (Tab e Shift+Tab), Esc e clique fora fecham, e o foco volta a quem
 * abriu. Renderize só quando estiver aberto.
 */
export function Dialogo({ titulo, aoFechar, children }: DialogoProps) {
  const idTitulo = useId();
  const caixa = useRef<HTMLDivElement>(null);
  const aoFecharRef = useRef(aoFechar);
  aoFecharRef.current = aoFechar;

  useEffect(() => {
    const origem = document.activeElement as HTMLElement | null;
    const dentro = () => caixa.current?.contains(document.activeElement) ?? false;
    if (!dentro()) caixa.current?.querySelector<HTMLElement>(FOCAVEIS)?.focus();

    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") return aoFecharRef.current();
      if (e.key !== "Tab" || !caixa.current) return;
      const itens = Array.from(caixa.current.querySelectorAll<HTMLElement>(FOCAVEIS));
      if (itens.length === 0) return e.preventDefault();
      const primeiro = itens[0]!;
      const ultimo = itens[itens.length - 1]!;
      const ativo = document.activeElement;
      if (e.shiftKey && (ativo === primeiro || !caixa.current.contains(ativo))) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && (ativo === ultimo || !caixa.current.contains(ativo))) {
        e.preventDefault();
        primeiro.focus();
      }
    };
    window.addEventListener("keydown", aoTeclar);
    return () => {
      window.removeEventListener("keydown", aoTeclar);
      if (origem?.isConnected) origem.focus();
    };
  }, []);

  return (
    <div className="dialogo-overlay" onClick={() => aoFechar()}>
      <div
        ref={caixa}
        className="dialogo panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="panel-head">
          <h2 id={idTitulo}>{titulo}</h2>
          <button type="button" className="btn" onClick={() => aoFechar()} aria-label="Fechar">
            <i className="ph ph-x" aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
