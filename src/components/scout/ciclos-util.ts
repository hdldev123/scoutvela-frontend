const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const dois = (n: number) => String(n).padStart(2, "0");
const isoLocal = (d: Date) => `${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}`;

/** Sugestão do formulário: "Mês de AAAA", início hoje, prazo no último dia do mês. */
export function sugestaoCiclo(hoje = new Date()) {
  const ultimo = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
  return {
    nome: `${MESES[hoje.getMonth()]} de ${hoje.getFullYear()}`,
    inicio: isoLocal(hoje),
    prazo: isoLocal(ultimo),
  };
}

/** Dias de calendário de hoje até o prazo (negativo = atrasado). */
export function diasAtePrazo(prazo: string, hoje = new Date()): number {
  const [a = 0, m = 1, d = 1] = prazo.split("-").map(Number);
  const alvo = Date.UTC(a, m - 1, d);
  const base = Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  return Math.round((alvo - base) / 86400000);
}
