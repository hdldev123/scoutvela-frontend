import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Dialogo } from "./Dialogo";
import { AbrirEvidencia } from "./EvidenciasSecao";
import { MensagemCampo } from "./MensagemCampo";
import { atributosDoCampo } from "./campo-util";
import { fmtData } from "./formato";
import { rotuloNivelHistorico } from "./niveis";
import { errosPorCampo, mensagemDeErro } from "@/lib/api/cliente";
import {
  MAX_MOTIVO_RESULTADO,
  useDecidirResultado,
  useResultados,
  type ResultadoAtleta,
} from "@/lib/api/resultados";
import "@/styles/autoavaliacao.css";

const linkSeguro = (url: string | null): string | null =>
  url && /^https:\/\//i.test(url) ? url : null;

const descricao = (r: ResultadoAtleta) => `${r.posicao}º em ${r.evento} ${r.edicao}`;

/**
 * Resultados enviados pelo atleta e ainda sem decisão (treinador do atleta e gestor): abrir a
 * súmula ou o link, "Validar" e "Recusar" (motivo obrigatório). Só o validado entra na nota e
 * nos gates. Sem pendência, não ocupa lugar na ficha.
 */
export function ResultadosParaValidar({ atletaId }: { atletaId: string }) {
  const lista = useResultados(atletaId, "pendente");
  const decidir = useDecidirResultado(atletaId);
  const [recusando, setRecusando] = useState<ResultadoAtleta | null>(null);
  const pendentes = lista.data?.itens ?? [];
  if (pendentes.length === 0) return null;

  return (
    <section className="panel ordem-resultados" aria-labelledby="res-pend-titulo">
      <div className="panel-head">
        <h2 id="res-pend-titulo">Resultados para validar</h2>
      </div>
      <p className="panel-dica">
        Confira a colocação na súmula ou no link oficial. Só o resultado validado entra na nota do
        indicador e nos gates G2 e G3. Se recusar, explique o motivo ao atleta.
      </p>
      <ul className="pes-lista">
        {pendentes.map((r) => {
          const link = linkSeguro(r.linkOficial);
          return (
            <li key={r.id}>
              <span className="pes-peso">{descricao(r)}</span>
              <span className="muted">
                {rotuloNivelHistorico(r.nivel)}
                {r.tamanhoFrota != null ? ` · frota de ${r.tamanhoFrota}` : ""}
              </span>
              <span className="res-pend">
                {r.anexo && (
                  <AbrirEvidencia
                    id={r.anexo.id}
                    nomeArquivo={r.anexo.nomeArquivo}
                    className="btn sm"
                    rotulo={`Ver súmula de ${descricao(r)}`}
                  >
                    Ver súmula
                  </AbrirEvidencia>
                )}
                {link && (
                  <a
                    className="btn sm"
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Abrir link oficial de ${descricao(r)}`}
                  >
                    Abrir link oficial
                  </a>
                )}
              </span>
              <span className="pes-acoes">
                <button
                  type="button"
                  className="btn sm primary"
                  disabled={decidir.isPending}
                  aria-label={`Validar ${descricao(r)}`}
                  onClick={() =>
                    decidir.mutate(
                      { id: r.id, decisao: "validar" },
                      {
                        onSuccess: () =>
                          toast.success("Resultado validado. A nota do indicador foi recalculada."),
                        onError: (e) =>
                          toast.error(mensagemDeErro(e, "Não foi possível validar o resultado.")),
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
                  aria-label={`Recusar ${descricao(r)}`}
                  onClick={() => {
                    decidir.reset();
                    setRecusando(r);
                  }}
                >
                  Recusar
                </button>
              </span>
              <span className="muted pes-motivo">Data do evento: {fmtData(r.data)}</span>
            </li>
          );
        })}
      </ul>
      {recusando && (
        <RecusarDialogo
          resultado={recusando}
          aoFechar={() => setRecusando(null)}
          decidir={decidir}
        />
      )}
    </section>
  );
}

function RecusarDialogo({
  resultado,
  aoFechar,
  decidir,
}: {
  resultado: ResultadoAtleta;
  aoFechar: () => void;
  decidir: ReturnType<typeof useDecidirResultado>;
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
      { id: resultado.id, decisao: "recusar", motivo: texto },
      {
        onSuccess: () => {
          toast("Resultado recusado. O atleta foi avisado.");
          aoFechar();
        },
      },
    );
  }

  return (
    <Dialogo
      titulo={`Recusar ${descricao(resultado)}`}
      aoFechar={aoFechar}
      bloqueado={decidir.isPending}
    >
      <form className="stack" onSubmit={submeter} noValidate>
        <label className="field" htmlFor="res-motivo">
          Motivo (obrigatório)
          <textarea
            id="res-motivo"
            autoFocus
            rows={3}
            maxLength={MAX_MOTIVO_RESULTADO}
            value={motivo}
            {...atributosDoCampo("res-motivo-erro", erro)}
            onChange={(e) => {
              if (decidir.isError) decidir.reset();
              setErroLocal("");
              setMotivo(e.target.value);
            }}
          />
        </label>
        <MensagemCampo id="res-motivo-erro" texto={erro} />
        {decidir.isError && !erroMotivo && (
          <div className="note" role="alert">
            {mensagemDeErro(decidir.error, "Não foi possível recusar o resultado.")}
          </div>
        )}
        <div className="btn-row">
          <button type="submit" className="btn primary" disabled={decidir.isPending}>
            {decidir.isPending ? "Recusando…" : "Recusar resultado"}
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
