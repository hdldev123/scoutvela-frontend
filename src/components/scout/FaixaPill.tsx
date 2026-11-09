export interface FaixaDados {
  id: string;
  nome: string;
  nomeCurto: string;
}

/** Pill da faixa de talento (classes f1..f4). `curto` usa o nome curto. */
export function FaixaPill({ faixa, curto = false }: { faixa: FaixaDados; curto?: boolean }) {
  return <span className={`pill ${faixa.id}`}>{curto ? faixa.nomeCurto : faixa.nome}</span>;
}
