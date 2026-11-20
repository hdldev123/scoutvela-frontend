import { useRef } from "react";

type Props = {
  id: string;
  /** Rótulo acessível do input. */
  rotulo: string;
  accept: string;
  textoBotao?: string;
  dica?: string;
  arquivo?: File | null;
  aoEscolher: (f: File | undefined) => void;
  desabilitado?: boolean;
};

/** Substitui o input de arquivo nativo ("Escolher arquivo / Nenhum arquivo escolhido"). */
export function CampoArquivo({
  id,
  rotulo,
  accept,
  textoBotao = "Escolher arquivo",
  dica,
  arquivo,
  aoEscolher,
  desabilitado,
}: Props) {
  const entrada = useRef<HTMLInputElement>(null);
  return (
    <div className="campo-arquivo">
      <input
        ref={entrada}
        id={id}
        className="sr-only"
        type="file"
        accept={accept}
        aria-label={rotulo}
        tabIndex={-1}
        disabled={desabilitado}
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          aoEscolher(f);
        }}
      />
      <button
        type="button"
        className="btn"
        disabled={desabilitado}
        onClick={() => entrada.current?.click()}
      >
        <i className="ph ph-paperclip" aria-hidden="true" /> {textoBotao}
      </button>
      {arquivo ? (
        <>
          <span className="campo-arquivo-nome">{arquivo.name}</span>
          <button
            type="button"
            className="btn sm ghost"
            disabled={desabilitado}
            aria-label={`Remover ${arquivo.name}`}
            onClick={() => aoEscolher(undefined)}
          >
            <i className="ph ph-x" aria-hidden="true" />
          </button>
        </>
      ) : (
        dica && <span className="campo-arquivo-nome">{dica}</span>
      )}
    </div>
  );
}
