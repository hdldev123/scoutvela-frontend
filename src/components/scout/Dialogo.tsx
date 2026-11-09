import { useEffect, useId, type ReactNode } from "react";

export interface DialogoProps {
  titulo: string;
  aoFechar: () => void;
  children: ReactNode;
}

/** Diálogo modal simples (Esc e clique fora fecham). Renderize só quando estiver aberto. */
export function Dialogo({ titulo, aoFechar, children }: DialogoProps) {
  const idTitulo = useId();

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") aoFechar();
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [aoFechar]);

  return (
    <div className="dialogo-overlay" onClick={aoFechar}>
      <div
        className="dialogo panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="panel-head">
          <h2 id={idTitulo}>{titulo}</h2>
          <button type="button" className="btn" onClick={aoFechar} aria-label="Fechar">
            <i className="ph ph-x" aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
