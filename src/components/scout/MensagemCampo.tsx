/** Mensagem de erro de um campo. Ligue-a ao campo com `aria-describedby={id}` e `aria-invalid`. */
export function MensagemCampo({ id, texto }: { id: string; texto: string | null | undefined }) {
  if (!texto) return null;
  return (
    <span id={id} className="campo-erro">
      {texto}
    </span>
  );
}
