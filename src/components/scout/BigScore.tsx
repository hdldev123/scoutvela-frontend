import type { ReactNode } from "react";
import { FaixaPill, type FaixaDados } from "./FaixaPill";
import { fmt1 } from "./formato";

export interface BigScoreProps {
  score: number;
  faixa: FaixaDados;
  /** Mostra o pill "Parcial" quando a avaliação ainda está incompleta. */
  parcial?: boolean;
  /** Conteúdo à direita (ex.: `<SparkScore />`). */
  children?: ReactNode;
}

/** Score grande com "/100", faixa e (opcional) pill Parcial, como na ficha e no painel. */
export function BigScore({ score, faixa, parcial = false, children }: BigScoreProps) {
  return (
    <div className="bigscore">
      <div>
        <div className="val">{fmt1(score)}</div>
      </div>
      <div>
        <div className="of">/100</div>
        <FaixaPill faixa={faixa} />
        {parcial && (
          <>
            {" "}
            <span className="pill st-parcial">Parcial</span>
          </>
        )}
      </div>
      {children}
    </div>
  );
}
