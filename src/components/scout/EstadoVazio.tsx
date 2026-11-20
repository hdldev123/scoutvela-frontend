import type { ReactNode } from "react";

type Props = { icone: string; titulo: string; texto?: string; acao?: ReactNode };

/** Bloco centralizado para listas e telas sem conteúdo. */
export function EstadoVazio({ icone, titulo, texto, acao }: Props) {
  return (
    <div className="estado-vazio">
      <span className="estado-vazio-icone" aria-hidden="true">
        <i className={`ph ph-${icone}`} />
      </span>
      <p className="estado-vazio-titulo">{titulo}</p>
      {texto && <p className="estado-vazio-texto">{texto}</p>}
      {acao && <div className="estado-vazio-acao">{acao}</div>}
    </div>
  );
}
