export type StatusGate = "apto" | "condicional" | "nao_prioritario" | "alerta";

const TEXTO: Record<StatusGate, string> = {
  apto: "Apto",
  condicional: "Condicional",
  nao_prioritario: "Não prioritário",
  alerta: "Sinal de alerta",
};

export const textoDoStatus = (status: StatusGate): string => TEXTO[status];
