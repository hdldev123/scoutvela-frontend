import { urlPerfilWorldSailing } from "@/lib/world-sailing";

/**
 * WS ID como link para o perfil no World Sailing (nova aba). O nome acessível começa pelo texto
 * visível (o ID) e termina com "Perfil de <nome> no World Sailing (abre em nova aba)"; `nome`
 * entra no rótulo, e sem ele (cadastro incompleto) o rótulo usa o próprio ID.
 */
export function LinkWsId({ wsId, nome }: { wsId: string; nome?: string | null }) {
  return (
    <a
      className="ws-link"
      href={urlPerfilWorldSailing(wsId)}
      target="_blank"
      rel="noopener noreferrer"
    >
      <code>{wsId}</code>
      <i className="ph ph-arrow-square-out" aria-hidden="true" />
      <span className="sr-only"> Perfil de {nome || wsId} no World Sailing (abre em nova aba)</span>
    </a>
  );
}
