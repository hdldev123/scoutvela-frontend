import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { atributosDoCampo } from "./campo-util";
import { Dialogo } from "./Dialogo";
import { MensagemCampo } from "./MensagemCampo";
import { errosPorCampo, mensagemDeErro } from "@/lib/api/cliente";
import { useAcessoSupervisao } from "@/lib/api/conversas";

export const MOTIVO_MIN = 5;
export const MOTIVO_MAX = 500;

/**
 * Pede o motivo (5 a 500 caracteres) para ler uma conversa entre treinador e atleta. O acesso
 * fica registrado na auditoria, com o motivo e sem o conteúdo, e vale por 24 horas.
 */
export function SupervisaoDialog({
  conversaId,
  titulo,
  aoFechar,
  aoLiberar,
}: {
  conversaId: string;
  titulo: string;
  aoFechar: () => void;
  aoLiberar: (expiraEm: string) => void;
}) {
  const acesso = useAcessoSupervisao();
  const [motivo, setMotivo] = useState("");
  const [local, setLocal] = useState<string | undefined>();
  const doServidor = errosPorCampo(acesso.error);
  const erroMotivo = local ?? doServidor["motivo"];
  const erroGeral =
    acesso.error && Object.keys(doServidor).length === 0
      ? mensagemDeErro(acesso.error, "Não foi possível liberar a leitura.")
      : null;

  function submeter(e: FormEvent) {
    e.preventDefault();
    const m = motivo.trim();
    if (m.length < MOTIVO_MIN || m.length > MOTIVO_MAX) {
      return setLocal(`Informe o motivo, de ${MOTIVO_MIN} a ${MOTIVO_MAX} caracteres.`);
    }
    setLocal(undefined);
    acesso.mutate(
      { id: conversaId, motivo: m },
      {
        onSuccess: (r) => {
          toast.success("Leitura liberada por 24 horas.");
          aoLiberar(r.expiraEm);
        },
      },
    );
  }

  return (
    <Dialogo titulo="Abrir para supervisão" aoFechar={aoFechar} bloqueado={acesso.isPending}>
      <form className="stack" onSubmit={submeter} noValidate>
        <p>
          Conversa: <strong>{titulo}</strong>. A conversa entre treinador e atleta é privada. Este
          acesso fica registrado na auditoria, com o seu nome e o motivo (sem o conteúdo das
          mensagens), e libera a leitura por 24 horas. Você só lê: não envia mensagens.
        </p>
        <div>
          <label className="field" htmlFor="sup-motivo">
            Motivo (por exemplo, a denúncia)
            <textarea
              id="sup-motivo"
              rows={4}
              value={motivo}
              maxLength={MOTIVO_MAX}
              onChange={(e) => setMotivo(e.target.value)}
              aria-describedby={erroMotivo ? "sup-motivo-erro sup-motivo-cont" : "sup-motivo-cont"}
              {...atributosDoCampo("sup-motivo-erro", erroMotivo)}
            />
          </label>
          <div className="msg-contador" id="sup-motivo-cont">
            {motivo.length} de {MOTIVO_MAX} caracteres (mínimo {MOTIVO_MIN})
          </div>
          <MensagemCampo id="sup-motivo-erro" texto={erroMotivo} />
        </div>
        {erroGeral && (
          <p className="note" role="alert">
            {erroGeral}
          </p>
        )}
        <div className="btn-row">
          <button type="submit" className="btn primary" disabled={acesso.isPending}>
            {acesso.isPending ? "Liberando…" : "Abrir para supervisão"}
          </button>
          <button type="button" className="btn" onClick={aoFechar} disabled={acesso.isPending}>
            Cancelar
          </button>
        </div>
      </form>
    </Dialogo>
  );
}
