import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Dialogo } from "./Dialogo";
import { AbrirEvidencia } from "./EvidenciasSecao";
import { MensagemCampo } from "./MensagemCampo";
import { atributosDoCampo } from "./campo-util";
import { fmtInstante } from "./formato";
import { errosPorCampo, mensagemDeErro } from "@/lib/api/cliente";
import {
  MAX_MOTIVO_CONQUISTA,
  useConquistas,
  useDecidirConquista,
  type ConquistaManual,
} from "@/lib/api/conquistas";
import "@/styles/autoavaliacao.css";

const descricao = (c: ConquistaManual) => `${c.titulo} (${c.ano})`;

/**
 * Conquistas informadas pelo atleta e ainda sem decisão (treinador do atleta e gestor): abrir o
 * comprovante, "Validar" e "Recusar" (motivo obrigatório). Só a validada aparece na ficha, e o
 * IBVAR a vê apenas com o aceite do termo que inclui foto e bio. Sem pendência, não ocupa lugar.
 */
export function ConquistasParaValidar({ atletaId }: { atletaId: string }) {
  const lista = useConquistas(atletaId);
  const decidir = useDecidirConquista(atletaId);
  const [recusando, setRecusando] = useState<ConquistaManual | null>(null);
  const pendentes = (lista.data?.manuais ?? []).filter((c) => c.status === "pendente");
  if (pendentes.length === 0) return null;

  return (
    <section className="panel ordem-conquistas" aria-labelledby="conq-pend-titulo">
      <div className="panel-head">
        <h2 id="conq-pend-titulo">Conquistas para validar</h2>
      </div>
      <p className="panel-dica">
        Confira o comprovante antes de validar. A conquista validada aparece no perfil do atleta e,
        se ele aceitou o termo que inclui foto e bio, também para o IBVAR. A decisão não pode ser
        desfeita. Se recusar, explique o motivo ao atleta.
      </p>
      <ul className="pes-lista">
        {pendentes.map((c) => (
          <li key={c.id}>
            <span className="pes-peso">{descricao(c)}</span>
            <span className="muted">Enviada em {fmtInstante(c.criadoEm)}</span>
            <span className="res-pend">
              <AbrirEvidencia
                id={c.anexoId}
                nomeArquivo="comprovante"
                className="btn sm"
                rotulo={`Ver comprovante de ${descricao(c)}`}
              >
                Ver comprovante
              </AbrirEvidencia>
            </span>
            <span className="pes-acoes">
              <button
                type="button"
                className="btn sm primary"
                disabled={decidir.isPending}
                aria-label={`Validar ${descricao(c)}`}
                onClick={() =>
                  decidir.mutate(
                    { id: c.id, decisao: "validar" },
                    {
                      onSuccess: () => toast.success("Conquista validada."),
                      onError: (e) =>
                        toast.error(mensagemDeErro(e, "Não foi possível validar a conquista.")),
                    },
                  )
                }
              >
                Validar
              </button>
              <button
                type="button"
                className="btn sm"
                disabled={decidir.isPending}
                aria-label={`Recusar ${descricao(c)}`}
                onClick={() => {
                  decidir.reset();
                  setRecusando(c);
                }}
              >
                Recusar
              </button>
            </span>
          </li>
        ))}
      </ul>
      {recusando && (
        <RecusarDialogo
          conquista={recusando}
          aoFechar={() => setRecusando(null)}
          decidir={decidir}
        />
      )}
    </section>
  );
}

function RecusarDialogo({
  conquista,
  aoFechar,
  decidir,
}: {
  conquista: ConquistaManual;
  aoFechar: () => void;
  decidir: ReturnType<typeof useDecidirConquista>;
}) {
  const [motivo, setMotivo] = useState("");
  const [erroLocal, setErroLocal] = useState("");
  const erroMotivo = errosPorCampo(decidir.error)["motivo"];
  const erro = erroLocal || erroMotivo;

  function submeter(e: FormEvent) {
    e.preventDefault();
    const texto = motivo.trim();
    if (!texto) return setErroLocal("Explique o motivo da recusa para o atleta.");
    setErroLocal("");
    decidir.mutate(
      { id: conquista.id, decisao: "recusar", motivo: texto },
      {
        onSuccess: () => {
          toast("Conquista recusada. O atleta foi avisado.");
          aoFechar();
        },
      },
    );
  }

  return (
    <Dialogo
      titulo={`Recusar ${descricao(conquista)}`}
      aoFechar={aoFechar}
      bloqueado={decidir.isPending}
    >
      <form className="stack" onSubmit={submeter} noValidate>
        <label className="field" htmlFor="conq-motivo">
          Motivo (obrigatório)
          <textarea
            id="conq-motivo"
            autoFocus
            rows={3}
            maxLength={MAX_MOTIVO_CONQUISTA}
            value={motivo}
            {...atributosDoCampo("conq-motivo-erro", erro)}
            onChange={(e) => {
              if (decidir.isError) decidir.reset();
              setErroLocal("");
              setMotivo(e.target.value);
            }}
          />
        </label>
        <MensagemCampo id="conq-motivo-erro" texto={erro} />
        {decidir.isError && !erroMotivo && (
          <div className="note" role="alert">
            {mensagemDeErro(decidir.error, "Não foi possível recusar a conquista.")}
          </div>
        )}
        <div className="btn-row">
          <button type="submit" className="btn primary" disabled={decidir.isPending}>
            {decidir.isPending ? "Recusando…" : "Recusar conquista"}
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
