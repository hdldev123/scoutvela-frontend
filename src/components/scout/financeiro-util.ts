/** Mapeia o nível de autonomia e de apoio da CBVela para o selo da interface. Só apresentação. */
export interface SeloNivel {
  rotulo: string;
  classe: "st-apto" | "st-cond" | "st-alerta" | "st-neutro";
}

const norm = (v: string): string =>
  v
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

/** Autonomia: alta = bom; média/parcial = atenção; baixa = alerta. */
export function seloAutonomia(valor: string): SeloNivel {
  switch (norm(valor)) {
    case "alta":
      return { rotulo: "Alta", classe: "st-apto" };
    case "media":
    case "parcial":
      return { rotulo: "Média", classe: "st-cond" };
    case "baixa":
      return { rotulo: "Baixa", classe: "st-alerta" };
    default:
      return { rotulo: valor, classe: "st-neutro" };
  }
}

/** Apoio da CBVela: alto = precisa de muito apoio (alerta); baixo = neutro. */
export function seloApoio(valor: string): SeloNivel {
  switch (norm(valor)) {
    case "alta":
      return { rotulo: "Alta", classe: "st-alerta" };
    case "media":
    case "parcial":
      return { rotulo: "Média", classe: "st-cond" };
    case "baixa":
      return { rotulo: "Baixa", classe: "st-neutro" };
    default:
      return { rotulo: valor, classe: "st-neutro" };
  }
}
