import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Dialogo } from "./Dialogo";
import { MensagemCampo } from "./MensagemCampo";
import { atributosDoCampo } from "./campo-util";
import { errosPorCampo, mensagemDeErro } from "@/lib/api/cliente";
import {
  MAX_MOTIVO_RESULTADO,
  useDecidirResultado,
  type ResultadoAtleta,
} from "@/lib/api/resultados";

const descricao = (r: Pick<ResultadoAtleta, "posicao" | "evento" | "edicao">) =>
  `${r.posicao}º em ${r.evento} ${r.edicao}`;

/**
 * Ações sobre um resultado importado da World Sailing (treinador do atleta e gestor): "Invalidar"
 * (motivo obrigatório) enquanto vigente e "Revalidar" depois de invalidado. A API não aceita
 * "validar" num resultado da World Sailing que nunca foi invalidado, então o botão não existe.
 */
export function AcoesResultadoWorldSailing({
  atletaId,
  resultado,
}: {
  atletaId: string;
  resultado: ResultadoAtleta;
}) {
  const decidir = useDecidirResultado(atletaId);
  const [invalidando, setInvalidando] = useState(false);
  if (resultado.fonte !== "world_sailing") return null;

  if (resultado.status === "recusado") {
    return (
      <button
        type="button"
        className="btn sm"
        disabled={decidir.isPending}
        aria-label={`Revalidar ${descricao(resultado)}`}
        onClick={() =>
          decidir.mutate(
            { id: resultado.id, decisao: "validar" },
            {
              onSuccess: () => toast.success("Resultado revalidado. A nota foi recalculada."),
              onError: (e) =>
                toast.error(mensagemDeErro(e, "Não foi possível revalidar o resultado.")),
            },
          )
        }
      >
        Revalidar
      </button>
    );
  }
  if (resultado.status !== "validado") return null;
  return (
    <>
      <button
        type="button"
        className="btn sm"
        aria-label={`Invalidar ${descricao(resultado)}`}
        onClick={() => {
          decidir.reset();
          setInvalidando(true);
        }}
      >
        Invalidar
      </button>
      {invalidando && (
        <InvalidarDialogo
          resultado={resultado}
          decidir={decidir}
          aoFechar={() => setInvalidando(false)}
        />
      )}
    </>
  );
}

function InvalidarDialogo({
  resultado,
  decidir,
  aoFechar,
}: {
  resultado: ResultadoAtleta;
  decidir: ReturnType<typeof useDecidirResultado>;
  aoFechar: () => void;
}) {
  const [motivo, setMotivo] = useState("");
  const [erroLocal, setErroLocal] = useState("");
  const erroMotivo = errosPorCampo(decidir.error)["motivo"];
  const erro = erroLocal || erroMotivo;

  function submeter(e: FormEvent) {
    e.preventDefault();
    const texto = motivo.trim();
    if (!texto) return setErroLocal("Explique o motivo da invalidação.");
    setErroLocal("");
    decidir.mutate(
      { id: resultado.id, decisao: "recusar", motivo: texto },
      {
        onSuccess: () => {
          toast("Resultado invalidado. Ele sai da nota até ser revalidado.");
          aoFechar();
        },
      },
    );
  }

  return (
    <Dialogo
      titulo={`Invalidar ${descricao(resultado)}`}
      aoFechar={aoFechar}
      bloqueado={decidir.isPending}
    >
      <form className="stack" onSubmit={submeter} noValidate>
        <p className="muted">
          O resultado veio da World Sailing e já vale na nota. Invalide só se estiver errado: ele
          sai da nota e dos gates, e dá para revalidar depois. O atleta é avisado.
        </p>
        <label className="field" htmlFor="ws-motivo">
          Motivo (obrigatório)
          <textarea
            id="ws-motivo"
            autoFocus
            rows={3}
            maxLength={MAX_MOTIVO_RESULTADO}
            value={motivo}
            {...atributosDoCampo("ws-motivo-erro", erro)}
            onChange={(e) => {
              if (decidir.isError) decidir.reset();
              setErroLocal("");
              setMotivo(e.target.value);
            }}
          />
        </label>
        <MensagemCampo id="ws-motivo-erro" texto={erro} />
        {decidir.isError && !erroMotivo && (
          <div className="note" role="alert">
            {mensagemDeErro(decidir.error, "Não foi possível invalidar o resultado.")}
          </div>
        )}
        <div className="btn-row">
          <button type="submit" className="btn primary" disabled={decidir.isPending}>
            {decidir.isPending ? "Invalidando…" : "Invalidar resultado"}
          </button>
          <button
            type="button"
            className="btn ghost"
            disabled={decidir.isPending}
            onClick={aoFechar}
          >
            Cancelar
          </button>
        </div>
      </form>
    </Dialogo>
  );
}
