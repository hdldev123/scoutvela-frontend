import { useEffect, useRef } from "react";

/**
 * Pilha de sobreposições (diálogos, busca, gaveta do menu). Só a do topo trata Esc e Tab; as
 * de baixo esperam. A rolagem do `body` fica travada enquanto houver uma sobreposição modal.
 */

export const FOCAVEIS =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface Entrada {
  /** Esc com esta sobreposição no topo. */
  aoEsc: () => void;
  /** Caixa onde o foco fica preso; sem ela, o Tab segue livre (ex.: gaveta do menu). */
  caixa: () => HTMLElement | null;
  /** Trava a rolagem da página enquanto estiver aberta. */
  modal: boolean;
}

const pilha: Entrada[] = [];
let travas = 0;
let guardado: { overflow: string; paddingRight: string } | null = null;

function aoTeclar(e: KeyboardEvent) {
  const topo = pilha[pilha.length - 1];
  if (!topo) return;
  if (e.key === "Escape") {
    topo.aoEsc();
    return;
  }
  if (e.key !== "Tab") return;
  const caixa = topo.caixa();
  if (!caixa) return;
  const itens = Array.from(caixa.querySelectorAll<HTMLElement>(FOCAVEIS));
  if (itens.length === 0) return e.preventDefault();
  const primeiro = itens[0]!;
  const ultimo = itens[itens.length - 1]!;
  const ativo = document.activeElement;
  if (e.shiftKey && (ativo === primeiro || !caixa.contains(ativo))) {
    e.preventDefault();
    ultimo.focus();
  } else if (!e.shiftKey && (ativo === ultimo || !caixa.contains(ativo))) {
    e.preventDefault();
    primeiro.focus();
  }
}

function travarRolagem() {
  if (travas++ > 0) return;
  const corpo = document.body;
  guardado = { overflow: corpo.style.overflow, paddingRight: corpo.style.paddingRight };
  // Compensa a barra de rolagem que some, para o conteúdo não dar um salto.
  const barra = window.innerWidth - document.documentElement.clientWidth;
  if (barra > 0) {
    const atual = parseFloat(getComputedStyle(corpo).paddingRight) || 0;
    corpo.style.paddingRight = `${atual + barra}px`;
  }
  corpo.style.overflow = "hidden";
}

function soltarRolagem() {
  if (--travas > 0 || !guardado) return;
  document.body.style.overflow = guardado.overflow;
  document.body.style.paddingRight = guardado.paddingRight;
  guardado = null;
}

/** Entra na pilha; devolve a função que sai dela. */
export function registrarSobreposicao(entrada: Entrada): () => void {
  if (pilha.length === 0) window.addEventListener("keydown", aoTeclar);
  pilha.push(entrada);
  if (entrada.modal) travarRolagem();
  return () => {
    const i = pilha.indexOf(entrada);
    if (i >= 0) pilha.splice(i, 1);
    if (entrada.modal) soltarRolagem();
    if (pilha.length === 0) window.removeEventListener("keydown", aoTeclar);
  };
}

/** Há alguma sobreposição aberta (diálogo, busca ou gaveta)? */
export const temSobreposicao = (): boolean => pilha.length > 0;

/** Registra a sobreposição enquanto `ativa`; `aoEsc` e `caixa` valem sempre na versão mais nova. */
export function useSobreposicao(opcoes: {
  ativa?: boolean;
  modal?: boolean;
  aoEsc: () => void;
  caixa?: () => HTMLElement | null;
}) {
  const { ativa = true, modal = true } = opcoes;
  const recente = useRef(opcoes);
  recente.current = opcoes;
  useEffect(() => {
    if (!ativa) return;
    return registrarSobreposicao({
      aoEsc: () => recente.current.aoEsc(),
      caixa: () => recente.current.caixa?.() ?? null,
      modal,
    });
  }, [ativa, modal]);
}
