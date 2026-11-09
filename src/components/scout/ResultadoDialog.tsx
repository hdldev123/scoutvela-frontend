import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Dialogo } from "./Dialogo";
import { mensagemDeErro } from "@/lib/api/cliente";
import { lancarResultado, type CorpoResultado } from "@/lib/api/mutacoes-ficha";

export const NIVEIS: { valor: CorpoResultado["nivel"]; rotulo: string }[] = [
  { valor: "mundial", rotulo: "Mundial" },
  { valor: "sul_americano", rotulo: "Sul-Americano" },
  { valor: "continental", rotulo: "Continental" },
  { valor: "internacional_aberto", rotulo: "Internacional aberto" },
];

/** Rótulo legível do nível (a API pode devolver o código ou o texto já pronto). */
export const rotuloNivel = (nivel: string): string =>
  NIVEIS.find((n) => n.valor === nivel)?.rotulo ?? nivel;

const hojeISO = () => new Date().toISOString().slice(0, 10);

/** Diálogo "Lançar resultado internacional": lançamento manual com link oficial https obrigatório. */
export function ResultadoDialog({
  atletaId,
  aoFechar,
}: {
  atletaId: string;
  aoFechar: () => void;
}) {
  const queryClient = useQueryClient();
  const [nivel, setNivel] = useState<CorpoResultado["nivel"]>("mundial");
  const [evento, setEvento] = useState("");
  const [data, setData] = useState("");
  const [posicao, setPosicao] = useState("");
  const [frota, setFrota] = useState("");
  const [link, setLink] = useState("");
  const [erro, setErro] = useState("");

  const enviar = useMutation({
    mutationFn: (corpo: CorpoResultado) => lancarResultado(atletaId, corpo),
    onSuccess: async () => {
      toast("Resultado internacional lançado");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["atleta", atletaId] }),
        queryClient.invalidateQueries({ queryKey: ["ranking"] }),
        queryClient.invalidateQueries({ queryKey: ["investimento"] }),
      ]);
      aoFechar();
    },
    onError: (e) => setErro(mensagemDeErro(e, "Não foi possível lançar o resultado.")),
  });

  function submeter(e: FormEvent) {
    e.preventDefault();
    const pos = Number(posicao);
    const tam = Number(frota);
    const url = link.trim();
    if (!evento.trim()) return setErro("Informe o evento.");
    if (!data) return setErro("Informe a data do evento.");
    if (data > hojeISO()) return setErro("A data não pode ser futura.");
    if (!Number.isInteger(pos) || pos < 1) return setErro("A posição deve ser um número inteiro.");
    if (!Number.isInteger(tam) || tam < pos) {
      return setErro("O tamanho da frota deve ser um inteiro, no mínimo igual à posição.");
    }
    if (!/^https:\/\//i.test(url)) {
      return setErro("O link do resultado oficial é obrigatório e deve começar com https://.");
    }
    setErro("");
    enviar.mutate({
      nivel,
      evento: evento.trim(),
      data,
      posicao: pos,
      tamanhoFrota: tam,
      linkOficial: url,
    });
  }

  return (
    <Dialogo titulo="Lançar resultado internacional" aoFechar={aoFechar}>
      <form className="stack" onSubmit={submeter} noValidate>
        <p className="muted ficha-dica">
          Resultados internacionais são lançados à mão, sempre com o link do resultado oficial. Eles
          não somam pontos do Ranking CBVela.
        </p>
        <label className="field" htmlFor="res-nivel">
          Nível
          <select
            id="res-nivel"
            autoFocus
            value={nivel}
            onChange={(e) => setNivel(e.target.value as CorpoResultado["nivel"])}
          >
            {NIVEIS.map((n) => (
              <option key={n.valor} value={n.valor}>
                {n.rotulo}
              </option>
            ))}
          </select>
        </label>
        <label className="field" htmlFor="res-evento">
          Evento
          <input
            id="res-evento"
            value={evento}
            maxLength={200}
            onChange={(e) => setEvento(e.target.value)}
          />
        </label>
        <label className="field" htmlFor="res-data">
          Data
          <input
            id="res-data"
            type="date"
            max={hojeISO()}
            value={data}
            onChange={(e) => setData(e.target.value)}
          />
        </label>
        <div className="ficha-duas-colunas">
          <label className="field" htmlFor="res-posicao">
            Posição
            <input
              id="res-posicao"
              type="number"
              inputMode="numeric"
              min={1}
              value={posicao}
              onChange={(e) => setPosicao(e.target.value)}
            />
          </label>
          <label className="field" htmlFor="res-frota">
            Tamanho da frota
            <input
              id="res-frota"
              type="number"
              inputMode="numeric"
              min={1}
              value={frota}
              onChange={(e) => setFrota(e.target.value)}
            />
          </label>
        </div>
        <label className="field" htmlFor="res-link">
          Link do resultado oficial (https)
          <input
            id="res-link"
            type="url"
            inputMode="url"
            placeholder="https://"
            value={link}
            onChange={(e) => setLink(e.target.value)}
          />
        </label>
        {erro && (
          <p className="note" role="alert">
            {erro}
          </p>
        )}
        <div className="btn-row">
          <button type="submit" className="btn primary" disabled={enviar.isPending}>
            {enviar.isPending ? "Lançando…" : "Lançar resultado"}
          </button>
          <button type="button" className="btn" onClick={aoFechar}>
            Cancelar
          </button>
        </div>
      </form>
    </Dialogo>
  );
}
