import { textoDoStatus, type StatusGate } from "./status-gate";

const CLASSE: Record<StatusGate, string> = {
  apto: "st-apto",
  condicional: "st-cond",
  nao_prioritario: "st-nao",
  alerta: "st-alerta",
};

/** Pill de status de gate/atleta. `ponto` acrescenta o círculo (usado no ranking). */
export function StatusPill({ status, ponto = false }: { status: StatusGate; ponto?: boolean }) {
  return (
    <span className={`pill ${CLASSE[status]}`}>
      {ponto && <span className="dot" />}
      {textoDoStatus(status)}
    </span>
  );
}
