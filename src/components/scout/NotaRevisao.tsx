/** "2 → 4" quando há nota anterior; "Nota nova: 4" sem ela; nada sem vínculo. Só apresentação. */
export function NotaRevisao({
  notaAnterior,
  notaNova,
}: {
  notaAnterior: number | null;
  notaNova: number | null;
}) {
  if (typeof notaNova !== "number") return null;
  return (
    <span className="num">
      {typeof notaAnterior !== "number"
        ? `Nota nova: ${notaNova}`
        : `${notaAnterior} → ${notaNova}`}
    </span>
  );
}
