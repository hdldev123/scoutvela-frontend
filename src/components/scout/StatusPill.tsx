export type StatusGate = "apto" | "condicional" | "nao_prioritario" | "alerta";

const TEXTO: Record<StatusGate, string> = {
  apto: "Apto",
  condicional: "Condicional",
  nao_prioritario: "Não prioritário",
  alerta: "Sinal de alerta",
};

const CLASSE: Record<StatusGate, string> = {
  apto: "st-apto",
  condicional: "st-cond",
  nao_prioritario: "st-nao",
  alerta: "st-alerta",
};

export const textoDoStatus = (status: StatusGate): string => TEXTO[status];

/** Pill de status de gate/atleta. `ponto` acrescenta o círculo (usado no ranking). */
export function StatusPill({ status, ponto = false }: { status: StatusGate; ponto?: boolean }) {
  return (
    <span className={`pill ${CLASSE[status]}`}>
      {ponto && <span className="dot" />}
      {TEXTO[status]}
    </span>
  );
}
