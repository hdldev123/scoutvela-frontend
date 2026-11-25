import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { MSG_SALVO } from "./parametros-util";
import { mensagemDeErro } from "@/lib/api/cliente";
import { useSalvarParametros } from "@/lib/api/parametros";
import {
  lerRegraResultados,
  montarRegraResultados,
  NIVEIS_REGRA,
  type FaixaTexto,
  type NivelRegra,
  type RegraResultadosTexto,
} from "./resultados-regra-util";

/**
 * Editor da regra `PERF_RESULTADOS` (D10): quantas edições do mesmo evento valem, a nota de quem
 * não tem resultado validado e as faixas de colocação por nível. A última faixa vale para as
 * demais colocações. Valores provisórios (P12), à espera do texto da CBVela.
 */
export function FormPerfResultados({
  valor,
  atualizadoEm,
}: {
  valor: unknown;
  atualizadoEm: string;
}) {
  const salvar = useSalvarParametros();
  const inicial = JSON.stringify(lerRegraResultados(valor));
  const [estado, setEstado] = useState<RegraResultadosTexto>(() => lerRegraResultados(valor));
  const montada = montarRegraResultados(estado);
  const alterada = JSON.stringify(estado) !== inicial;
  const data = new Date(atualizadoEm);

  const mudarFaixas = (n: NivelRegra, f: (l: FaixaTexto[]) => FaixaTexto[]) => {
    if (salvar.isError) salvar.reset();
    setEstado((e) => ({ ...e, niveis: { ...e.niveis, [n]: f(e.niveis[n]) } }));
  };

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    if ("erro" in montada || !alterada) return;
    salvar.mutate(
      { regras: { PERF_RESULTADOS: montada.valor } },
      { onSuccess: () => toast.success(MSG_SALVO) },
    );
  };

  return (
    <form
      onSubmit={enviar}
      noValidate
      className="par-regra par-cartao par-cartao-largo"
      aria-label="PERF_RESULTADOS · Nota dos resultados"
    >
      <h3 className="par-cartao-titulo">
        <code className="par-cod">PERF_RESULTADOS</code>
        <span>Nota dos resultados</span>
      </h3>
      <p className="par-resumo">
        Valores provisórios (P12), tirados do exemplo da reunião de 23/11, à espera do texto da
        CBVela. A nota de cada nível vem da melhor colocação validada entre as últimas edições. Vale
        a posição, não o tamanho da frota.
      </p>
      <div className="par-regra-campos">
        <div className="field">
          <label htmlFor="pr-edicoes">Edições máximas</label>
          <input
            id="pr-edicoes"
            type="text"
            inputMode="numeric"
            aria-describedby="pr-edicoes-ajuda"
            value={estado.edicoesMax}
            onChange={(e) => setEstado((s) => ({ ...s, edicoesMax: e.target.value }))}
          />
          <small id="pr-edicoes-ajuda" className="par-ajuda">
            Quantas edições do mesmo evento o atleta pode informar e valem na nota (1 a 20).
          </small>
        </div>
        <div className="field">
          <label htmlFor="pr-sem">Nota sem resultado validado</label>
          <input
            id="pr-sem"
            type="text"
            inputMode="numeric"
            aria-describedby="pr-sem-ajuda"
            value={estado.semResultado}
            onChange={(e) => setEstado((s) => ({ ...s, semResultado: e.target.value }))}
          />
          <small id="pr-sem-ajuda" className="par-ajuda">
            Nota do nível em que o atleta não tem resultado validado (0 a 5).
          </small>
        </div>
      </div>
      {NIVEIS_REGRA.map((n) => {
        const faixas = estado.niveis[n.id];
        return (
          <fieldset key={n.id} className="par-evid-pilar">
            <legend>{n.rotulo}</legend>
            <table className="data par-res-faixas">
              <thead>
                <tr>
                  <th scope="col">Faixa</th>
                  <th scope="col">Até a colocação</th>
                  <th scope="col">Nota</th>
                  <th scope="col">
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {faixas.map((f, i) => {
                  const ultima = i === faixas.length - 1;
                  const nome = `${n.rotulo.split(" (")[0]}, faixa ${i + 1}`;
                  return (
                    <tr key={i}>
                      <th scope="row">{i + 1}</th>
                      <td>
                        {ultima ? (
                          <span>Demais colocações</span>
                        ) : (
                          <input
                            type="text"
                            inputMode="numeric"
                            aria-label={`${nome}, até a colocação`}
                            value={f.ate}
                            onChange={(e) =>
                              mudarFaixas(n.id, (l) =>
                                l.map((x, j) => (j === i ? { ...x, ate: e.target.value } : x)),
                              )
                            }
                          />
                        )}
                      </td>
                      <td>
                        <input
                          type="text"
                          inputMode="numeric"
                          aria-label={`${nome}, nota`}
                          value={f.nota}
                          onChange={(e) =>
                            mudarFaixas(n.id, (l) =>
                              l.map((x, j) => (j === i ? { ...x, nota: e.target.value } : x)),
                            )
                          }
                        />
                      </td>
                      <td>
                        {!ultima && faixas.length > 1 && (
                          <button
                            type="button"
                            className="btn sm ghost"
                            aria-label={`Remover ${nome}`}
                            onClick={() => mudarFaixas(n.id, (l) => l.filter((_, j) => j !== i))}
                          >
                            <i className="ph ph-trash" aria-hidden="true" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="btn-row">
              <button
                type="button"
                className="btn sm"
                onClick={() =>
                  mudarFaixas(n.id, (l) => [
                    ...l.slice(0, -1),
                    { ate: "", nota: l[l.length - 1]?.nota ?? "0" },
                    ...l.slice(-1),
                  ])
                }
              >
                <i className="ph ph-plus" aria-hidden="true" /> Adicionar faixa em{" "}
                {n.rotulo.split(" (")[0]}
              </button>
            </div>
          </fieldset>
        );
      })}
      {"erro" in montada && alterada && (
        <p className="par-erro" role="alert">
          {montada.erro}
        </p>
      )}
      {salvar.error && (
        <p className="par-erro" role="alert">
          {mensagemDeErro(salvar.error)}
        </p>
      )}
      <div className="par-regra-rodape">
        <button
          className="btn sm primary"
          type="submit"
          aria-label="Salvar PERF_RESULTADOS · Nota dos resultados"
          disabled={"erro" in montada || !alterada || salvar.isPending}
        >
          {salvar.isPending ? "Salvando…" : "Salvar"}
        </button>
        <span className="par-ajuda">
          Atualizada em{" "}
          {Number.isNaN(data.getTime())
            ? "—"
            : data.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}
        </span>
      </div>
    </form>
  );
}
