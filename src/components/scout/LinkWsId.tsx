import { urlPerfilWorldSailing } from "@/lib/world-sailing";

/**
 * WS ID como link para o perfil no World Sailing (nova aba). `nome` entra no rótulo acessível;
 * sem nome (cadastro incompleto), o rótulo usa o próprio ID.
 */
export function LinkWsId({ wsId, nome }: { wsId: string; nome?: string | null }) {
  return (
    <a
      className="ws-link"
      href={urlPerfilWorldSailing(wsId)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Perfil de ${nome || wsId} no World Sailing (abre em nova aba)`}
    >
      <code>{wsId}</code>
      <i className="ph ph-arrow-square-out" aria-hidden="true" />
    </a>
  );
}
