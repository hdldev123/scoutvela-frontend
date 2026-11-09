import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { mensagemDeErro } from "@/lib/api/cliente";
import { criarRevisao, type CorpoRevisao } from "@/lib/api/mutacoes-ficha";
import { Dialogo } from "./Dialogo";

export interface OpcaoPilarRevisao {
  id: string;
  nome: string;
  indicadores: { id: string; nome: string }[];
}

const MIN = 10;
const MAX = 2000;

/** Diálogo "Pedir revisão de uma nota": pilar (obrigatório), indicador (opcional) e motivo. */
export function PedirRevisaoDialog({
  pilares,
  aoFechar,
}: {
  pilares: OpcaoPilarRevisao[];
  aoFechar: () => void;
}) {
  const queryClient = useQueryClient();
  const [pilarId, setPilarId] = useState("");
  const [indicadorId, setIndicadorId] = useState("");
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState("");

  const indicadores = pilares.find((p) => p.id === pilarId)?.indicadores ?? [];

  const enviar = useMutation({
    mutationFn: (corpo: CorpoRevisao) => criarRevisao(corpo),
    onSuccess: async () => {
      toast("Pedido de revisão enviado ao gestor da CBVela");
      await queryClient.invalidateQueries({ queryKey: ["revisoes"] });
      aoFechar();
    },
    onError: (e) => setErro(mensagemDeErro(e, "Não foi possível enviar o pedido.")),
  });

  function submeter(e: FormEvent) {
    e.preventDefault();
    const texto = motivo.trim();
    if (!pilarId) return setErro("Escolha o pilar da nota que você quer revisar.");
    if (texto.length < MIN) return setErro(`Conte o motivo com pelo menos ${MIN} caracteres.`);
    setErro("");
    enviar.mutate({ pilarId, ...(indicadorId ? { indicadorId } : {}), motivo: texto });
  }

  return (
    <Dialogo titulo="Pedir revisão de uma nota" aoFechar={aoFechar}>
      <form className="stack" onSubmit={submeter} noValidate>
        <label className="field" htmlFor="rev-pilar">
          Pilar
          <select
            id="rev-pilar"
            autoFocus
            value={pilarId}
            onChange={(e) => {
              setPilarId(e.target.value);
              setIndicadorId("");
            }}
          >
            <option value="">Escolha um pilar</option>
            {pilares.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        </label>
        <label className="field" htmlFor="rev-indicador">
          Indicador (opcional)
          <select
            id="rev-indicador"
            value={indicadorId}
            disabled={!pilarId}
            onChange={(e) => setIndicadorId(e.target.value)}
          >
            <option value="">Pilar inteiro</option>
            {indicadores.map((i) => (
              <option key={i.id} value={i.id}>
                {i.nome}
              </option>
            ))}
          </select>
        </label>
        <label className="field" htmlFor="rev-motivo">
          Motivo
          <textarea
            id="rev-motivo"
            value={motivo}
            maxLength={MAX}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Explique por que a nota deveria ser revista."
          />
        </label>
        {erro && (
          <p className="note" role="alert">
            {erro}
          </p>
        )}
        <div className="btn-row">
          <button type="submit" className="btn primary" disabled={enviar.isPending}>
            Enviar pedido
          </button>
          <button type="button" className="btn" onClick={aoFechar}>
            Cancelar
          </button>
        </div>
      </form>
    </Dialogo>
  );
}
