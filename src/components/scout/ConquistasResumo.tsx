import { useState } from "react";
import { Dialogo } from "./Dialogo";
import { MAX_DESTAQUES, ordenarConquistas, resumoConquistas } from "./conquistas-util";
import type { ConquistaFicha } from "@/lib/api/conquistas";

const ROTULO_PODIO: Record<number, string> = { 1: "1º lugar", 2: "2º lugar", 3: "3º lugar" };

/** Medalha ou troféu com o texto ao lado: o ícone é decorativo e a posição não depende dele. */
function ItemConquista({ c }: { c: ConquistaFicha }) {
  const podio = c.tipo === "resultado" && c.posicao ? ROTULO_PODIO[c.posicao] : null;
  return (
    <li className="cartao-conquista">
      <i className={`ph-fill ${podio ? "ph-medal" : "ph-trophy"}`} aria-hidden="true" />
      <span className={`pill ${podio ? "st-apto" : "st-info"}`}>{podio ?? "Conquista"}</span>
      <span className="cartao-conquista-texto">
        {c.titulo} <span className="muted">· {c.ano}</span>
      </span>
    </li>
  );
}

/**
 * Conquistas do cartão de perfil. Com até 3, a lista inteira; com mais, o resumo por colocação,
 * os 3 destaques e o botão que abre a lista completa.
 */
export function ConquistasResumo({
  conquistas,
  nome,
}: {
  conquistas: ConquistaFicha[];
  nome: string;
}) {
  const [aberto, setAberto] = useState(false);
  if (conquistas.length === 0) return null;
  const compacto = conquistas.length > MAX_DESTAQUES;
  const ordenadas = compacto ? ordenarConquistas(conquistas) : conquistas;
  const destaques = compacto ? ordenadas.slice(0, MAX_DESTAQUES) : conquistas;

  return (
    <section className="cartao-conquistas" aria-labelledby="cartao-conquistas-t">
      <h2 id="cartao-conquistas-t" className="cartao-subtitulo">
        Conquistas
      </h2>
      {compacto && (
        <p className="cartao-conquistas-resumo">
          <span className="sr-only">Total de conquistas: </span>
          {resumoConquistas(conquistas)}
        </p>
      )}
      <ul>
        {destaques.map((c, i) => (
          <ItemConquista key={`${c.tipo}-${c.ano}-${c.titulo}-${i}`} c={c} />
        ))}
      </ul>
      {compacto && (
        <button type="button" className="btn sm" onClick={() => setAberto(true)}>
          Ver todas as conquistas ({conquistas.length})
        </button>
      )}
      {aberto && (
        <Dialogo
          titulo={`Conquistas de ${nome} (${conquistas.length})`}
          aoFechar={() => setAberto(false)}
        >
          <ul className="cartao-conquistas-todas">
            {ordenadas.map((c, i) => (
              <ItemConquista key={`${c.tipo}-${c.ano}-${c.titulo}-${i}`} c={c} />
            ))}
          </ul>
        </Dialogo>
      )}
    </section>
  );
}
