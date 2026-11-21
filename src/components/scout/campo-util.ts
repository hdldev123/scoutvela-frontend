/** Atributos de acessibilidade de um campo com (ou sem) erro. */
export function atributosDoCampo(idErro: string, texto: string | null | undefined) {
  return texto
    ? ({ "aria-invalid": true, "aria-describedby": idErro } as const)
    : ({ "aria-invalid": false } as const);
}
