type Props = {
  id: string;
  ligado: boolean;
  aoMudar: (v: boolean) => void;
  rotulo: string;
  descricao?: string;
  desabilitado?: boolean;
};

/** Interruptor (role="switch") com o estado em texto ao lado. */
export function Interruptor({ id, ligado, aoMudar, rotulo, descricao, desabilitado }: Props) {
  return (
    <div className="interruptor">
      <button
        type="button"
        role="switch"
        id={id}
        aria-checked={ligado}
        aria-label={rotulo}
        aria-describedby={descricao ? `${id}-desc` : undefined}
        aria-disabled={desabilitado ? true : undefined}
        className="interruptor-botao"
        onClick={() => {
          // aria-disabled (e não disabled) mantém o foco no botão durante a gravação.
          if (!desabilitado) aoMudar(!ligado);
        }}
      >
        <span className="interruptor-bolinha" aria-hidden="true" />
      </button>
      <span className="interruptor-texto">
        <span className="interruptor-estado" aria-hidden="true">
          {ligado ? "Ativado" : "Desativado"}
        </span>
        {descricao && (
          <span id={`${id}-desc`} className="interruptor-desc">
            {descricao}
          </span>
        )}
      </span>
    </div>
  );
}
