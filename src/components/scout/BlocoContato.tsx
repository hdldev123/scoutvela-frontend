import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialogo } from "./Dialogo";
import {
  AVISO_PASSAPORTE,
  estadoPassaporte,
  fmtMesAno,
  textoAptidao,
  type Aptidao,
} from "./contato-util";
import { mensagemDeErro } from "@/lib/api/cliente";
import { registrarAptidao } from "@/lib/api/mutacoes-ficha";

export interface ContatoFicha {
  telefone: string | null;
  passaporteValidoAte: string | null;
  aptidao: Aptidao | null;
}

/** Diálogo do gestor: Apto/Não apto. O atestado é conferido fora do sistema e não é guardado. */
function AptidaoDialog({ atletaId, aoFechar }: { atletaId: string; aoFechar: () => void }) {
  const qc = useQueryClient();
  const [apto, setApto] = useState<"sim" | "nao" | "">("");
  const [erro, setErro] = useState("");
  const registrar = useMutation({
    mutationFn: (v: boolean) => registrarAptidao(atletaId, v),
    onSuccess: async () => {
      toast.success("Aptidão registrada.");
      await qc.invalidateQueries({ queryKey: ["atleta", atletaId] });
      aoFechar();
    },
    onError: (e) => setErro(mensagemDeErro(e)),
  });
  const enviar = (e: FormEvent) => {
    e.preventDefault();
    if (!apto) return;
    setErro("");
    registrar.mutate(apto === "sim");
  };
  return (
    <Dialogo titulo="Registrar aptidão" aoFechar={aoFechar} bloqueado={registrar.isPending}>
      <form className="stack" style={{ gap: 12 }} onSubmit={enviar}>
        <div className="note" role="note">
          Confira o atestado médico fora do sistema. O Scout Vela não guarda o atestado nem o laudo:
          registra só “apto” ou “não apto”, quem conferiu e a data.
        </div>
        <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend>Resultado da conferência</legend>
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="radio"
              name="aptidao"
              value="sim"
              checked={apto === "sim"}
              onChange={() => setApto("sim")}
            />
            Apto
          </label>
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="radio"
              name="aptidao"
              value="nao"
              checked={apto === "nao"}
              onChange={() => setApto("nao")}
            />
            Não apto
          </label>
        </fieldset>
        {erro && (
          <div className="note" role="alert">
            {erro}
          </div>
        )}
        <div className="btn-row">
          <button type="submit" className="btn primary" disabled={!apto || registrar.isPending}>
            {registrar.isPending ? "Registrando…" : "Registrar"}
          </button>
          <button type="button" className="btn" disabled={registrar.isPending} onClick={aoFechar}>
            Cancelar
          </button>
        </div>
      </form>
    </Dialogo>
  );
}

/**
 * Contato do atleta na ficha (gestor, treinador do atleta e o próprio atleta): telefone, validade
 * do passaporte e aptidão conferida. O IBVAR não recebe `contato`, então nem renderiza o bloco.
 */
export function BlocoContato({
  atletaId,
  contato,
  papel,
}: {
  atletaId: string;
  contato: ContatoFicha;
  papel: string;
}) {
  const [registrando, setRegistrando] = useState(false);
  const estado = contato.passaporteValidoAte ? estadoPassaporte(contato.passaporteValidoAte) : "ok";
  return (
    <section className="panel ordem-contato" aria-labelledby="ficha-contato-t">
      <div className="panel-head">
        <h2 id="ficha-contato-t">Contato e viagens</h2>
        {papel === "gestor" && (
          <button type="button" className="btn sm" onClick={() => setRegistrando(true)}>
            Registrar aptidão
          </button>
        )}
      </div>
      <dl className="ficha-contato">
        <div>
          <dt>Telefone</dt>
          <dd>{contato.telefone ?? "Não informado"}</dd>
        </div>
        <div>
          <dt>Passaporte</dt>
          <dd>
            {contato.passaporteValidoAte
              ? `válido até ${fmtMesAno(contato.passaporteValidoAte)}`
              : "Validade não informada"}
            {estado !== "ok" && (
              <>
                {" "}
                <span className="pill st-alerta" role="status">
                  {AVISO_PASSAPORTE[estado]}
                </span>
              </>
            )}
          </dd>
        </div>
        <div>
          <dt>Aptidão para a prática esportiva</dt>
          <dd>
            <span className={`pill ${contato.aptidao?.apto ? "st-apto" : "st-neutro"}`}>
              {textoAptidao(contato.aptidao)}
            </span>
          </dd>
        </div>
      </dl>
      {registrando && <AptidaoDialog atletaId={atletaId} aoFechar={() => setRegistrando(false)} />}
    </section>
  );
}
