import { grupoDoNivel } from "./niveis";
import type { ConquistaFicha } from "@/lib/api/conquistas";

/** Até este número a lista aparece inteira, sem resumo nem botão. */
export const MAX_DESTAQUES = 3;

/** 0 Jogos Olímpicos, 1 mundial, 2 continental, 3 demais, 4 conquista informada (sem nível). */
function prioridade(c: ConquistaFicha): number {
  if (c.tipo !== "resultado") return 4;
  if (
    /\bolympic games\b|\bjogos ol[ií]mpicos\b/i.test(
      `${c.nivel ?? ""} ${c.evento ?? ""} ${c.titulo}`,
    )
  )
    return 0;
  const grupo = c.nivel ? grupoDoNivel(c.nivel) : "outros";
  return grupo === "mundial" ? 1 : grupo === "continental" ? 2 : 3;
}

/** Nível mais alto primeiro; depois a melhor colocação e o ano mais recente. */
export function ordenarConquistas(lista: ConquistaFicha[]): ConquistaFicha[] {
  return [...lista].sort(
    (a, b) =>
      prioridade(a) - prioridade(b) || (a.posicao ?? 99) - (b.posicao ?? 99) || b.ano - a.ano,
  );
}

/** "14× 1º · 18× 2º · 12× 3º", mais as conquistas informadas, se houver. */
export function resumoConquistas(lista: ConquistaFicha[]): string {
  const partes: string[] = [];
  for (const pos of [1, 2, 3]) {
    const n = lista.filter((c) => c.tipo === "resultado" && c.posicao === pos).length;
    if (n > 0) partes.push(`${n}× ${pos}º`);
  }
  const outras = lista.filter((c) => !(c.tipo === "resultado" && c.posicao)).length;
  if (outras > 0) partes.push(`${outras}× ${outras === 1 ? "conquista informada" : "informadas"}`);
  return partes.join(" · ");
}
