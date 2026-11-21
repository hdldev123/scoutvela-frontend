import { fmt1 } from "./formato";

export interface PilarNota {
  id: string;
  nomeCurto: string;
  nota: number | null;
}

/** Barras dos pilares (altura = nota/5); tracejado quando o pilar ainda não tem nota. */
export function PilaresStrip({ pilares }: { pilares: PilarNota[] }) {
  const rotulo = `Notas dos ${pilares.length} pilares: ${pilares
    .map((p) => `${p.nomeCurto} ${p.nota == null ? "sem nota" : fmt1(p.nota)}`)
    .join("; ")}`;
  return (
    <span className="strip" role="img" aria-label={rotulo}>
      {pilares.map((p) =>
        p.nota == null ? (
          <i key={p.id} className="empty" title={`${p.nomeCurto}: sem nota`} />
        ) : (
          <i
            key={p.id}
            style={{ height: `${Math.max(8, (p.nota / 5) * 100)}%` }}
            title={`${p.nomeCurto}: ${fmt1(p.nota)} de 5`}
          />
        ),
      )}
    </span>
  );
}
