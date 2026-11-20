export function AvisoAmbiente({ className = "" }: { className?: string }) {
  if (import.meta.env.VITE_AMBIENTE === "producao") return null;
  return (
    <p role="note" className={`aviso-ambiente ${className}`.trim()}>
      Ambiente de testes: os dados são fictícios.
    </p>
  );
}
