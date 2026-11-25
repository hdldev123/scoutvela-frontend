import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Dialogo } from "./Dialogo";
import { AbrirEvidencia } from "./EvidenciasSecao";
import { MensagemCampo } from "./MensagemCampo";
import { atributosDoCampo } from "./campo-util";
import { fmt1, fmtInstante } from "./formato";
import { errosPorCampo, mensagemDeErro } from "@/lib/api/cliente";
import {
  MAX_MOTIVO_PESAGEM,
  useDecidirPesagem,
  usePesagens,
  type Pesagem,
} from "@/lib/api/pesagens";
import "@/styles/autoavaliacao.css";

/**
 * Pesagens enviadas pelo atleta e ainda sem decisão (treinador do atleta e gestor): "Ver foto",
 * "Validar" e "Recusar" (motivo obrigatório). Sem pendência, não ocupa lugar na ficha.
 */
export function PesagensPendentes({ atletaId }: { atletaId: string }) {
  const lista = usePesagens(atletaId);
  const decidir = useDecidirPesagem(atletaId);
  const [recusando, setRecusando] = useState<Pesagem | null>(null);
  const pendentes = (lista.data?.itens ?? []).filter((p) => p.status === "pendente");
  if (pendentes.length === 0) return null;

  return (
    <section className="panel ordem-pesagens" aria-labelledby="pes-pend-titulo">
      <div className="panel-head">
        <h2 id="pes-pend-titulo">Pesagem para validar</h2>
      </div>
      <p className="panel-dica">
        Confira se o número da foto é o peso informado. Só o peso validado entra no Class Fit e no
        G1, e a foto é apagada depois da decisão.
      </p>
      <ul className="pes-lista">
        {pendentes.map((p) => (
          <li key={p.id}>
            <span className="pes-peso">{fmt1(p.pesoKg)} kg</span>
            <span className="muted">enviada em {fmtInstante(p.enviadoEm)}</span>
            <span className="pes-acoes">
              {p.anexoId && (
                <AbrirEvidencia
                  id={p.anexoId}
                  nomeArquivo="foto-balanca"
                  className="btn sm"
                  rotulo={`Ver foto da pesagem de ${fmt1(p.pesoKg)} kg`}
                >
                  Ver foto
                </AbrirEvidencia>
              )}
              <button
                type="button"
                className="btn sm primary"
                disabled={decidir.isPending}
                aria-label={`Validar pesagem de ${fmt1(p.pesoKg)} kg`}
                onClick={() =>
                  decidir.mutate(
                    { id: p.id, decisao: "validar" },
                    {
                      onSuccess: () => toast.success("Peso validado. O Class Fit foi recalculado."),
                      onError: (e) =>
                        toast.error(mensagemDeErro(e, "Não foi possível validar o peso.")),
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
                aria-label={`Recusar pesagem de ${fmt1(p.pesoKg)} kg`}
                onClick={() => {
                  decidir.reset();
                  setRecusando(p);
                }}
              >
                Recusar
              </button>
            </span>
          </li>
        ))}
      </ul>
      {recusando && (
        <RecusarDialogo pesagem={recusando} aoFechar={() => setRecusando(null)} decidir={decidir} />
      )}
    </section>
  );
}

function RecusarDialogo({
  pesagem,
  aoFechar,
  decidir,
}: {
  pesagem: Pesagem;
  aoFechar: () => void;
  decidir: ReturnType<typeof useDecidirPesagem>;
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
      { id: pesagem.id, decisao: "recusar", motivo: texto },
      {
        onSuccess: () => {
          toast("Peso recusado. O atleta foi avisado.");
          aoFechar();
        },
      },
    );
  }

  return (
    <Dialogo
      titulo={`Recusar pesagem de ${fmt1(pesagem.pesoKg)} kg`}
      aoFechar={aoFechar}
      bloqueado={decidir.isPending}
    >
      <form className="stack" onSubmit={submeter} noValidate>
        <label className="field" htmlFor="pes-motivo">
          Motivo (obrigatório)
          <textarea
            id="pes-motivo"
            autoFocus
            rows={3}
            maxLength={MAX_MOTIVO_PESAGEM}
            value={motivo}
            {...atributosDoCampo("pes-motivo-erro", erro)}
            onChange={(e) => {
              if (decidir.isError) decidir.reset();
              setErroLocal("");
              setMotivo(e.target.value);
            }}
          />
        </label>
        <MensagemCampo id="pes-motivo-erro" texto={erro} />
        {decidir.isError && !erroMotivo && (
          <div className="note" role="alert">
            {mensagemDeErro(decidir.error, "Não foi possível recusar o peso.")}
          </div>
        )}
        <div className="btn-row">
          <button type="submit" className="btn primary" disabled={decidir.isPending}>
            {decidir.isPending ? "Recusando…" : "Recusar peso"}
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
