import { fmt1 } from "./formato";
import { fmtPontosSinal } from "./evolucao-util";
import "@/styles/investimento.css";
import type { FichaAtleta } from "@/lib/api/consultas";

const POSICAO = {
  acima: { rotulo: "Acima da média", icone: "ph-arrow-up", cls: "st-apto" },
  na_media: { rotulo: "Na média", icone: "ph-equals", cls: "st-neutro" },
  abaixo: { rotulo: "Abaixo da média", icone: "ph-arrow-down", cls: "st-cond" },
} as const;

const TENDENCIA = {
  subindo: { rotulo: "subindo", icone: "ph-trend-up" },
  estavel: { rotulo: "estável", icone: "ph-minus" },
  caindo: { rotulo: "caindo", icone: "ph-trend-down" },
} as const;

/** Atleta contra a média da turma no último ciclo fechado e tendência entre os dois últimos (D13). */
export function ComparacaoTurma({ ficha }: { ficha: FichaAtleta }) {
  const comp = ficha.comparacaoTurma;
  const tend = ficha.tendencia ? TENDENCIA[ficha.tendencia] : null;
  if (!comp && !tend) return null;
  const pos = comp ? POSICAO[comp.posicao] : null;
  return (
    <section className="panel comp-turma" aria-labelledby="comp-turma-t">
      <div className="panel-head">
        <h2 id="comp-turma-t">Comparação com a média da turma</h2>
      </div>
      {comp && pos && (
        <>
          <p className="comp-selo">
            <span className={`pill ${pos.cls}`} data-testid="comp-posicao">
              <i className={`ph ${pos.icone}`} aria-hidden="true" /> {pos.rotulo}
            </span>{" "}
            <span data-testid="comp-diferenca">
              {fmtPontosSinal(comp.diferenca)} pontos em relação à média da turma
            </span>
          </p>
          <ul className="inv-lista comp-barras">
            {[
              { rot: "Atleta", v: comp.scoreAtual, cls: "seg-sea" },
              { rot: "Média da turma", v: comp.mediaTurma, cls: "evo-cor-ant" },
            ].map((b) => (
              <li className="comp-linha" key={b.rot}>
                <span>{b.rot}</span>
                <span className="evo-trilho" aria-hidden="true">
                  <span
                    className={b.cls}
                    style={{ width: `${Math.min(100, Math.max(0, b.v))}%` }}
                  />
                </span>
                <span className="n">{fmt1(b.v)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
      {tend && (
        <p className="comp-tendencia" data-testid="comp-tendencia">
          <i className={`ph ${tend.icone}`} aria-hidden="true" /> Tendência: <b>{tend.rotulo}</b>
          <span className="muted"> (comparando os dois últimos ciclos fechados)</span>
        </p>
      )}
    </section>
  );
}
