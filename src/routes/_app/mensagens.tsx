import { createFileRoute } from "@tanstack/react-router";
import { SemAcesso } from "@/components/scout/SemAcesso";
import { TelaMensagens } from "@/components/scout/TelaMensagens";
import { useMe } from "@/lib/auth/sessao";

/** Search params: a conversa aberta (`?c=<id>`). */
function validarBusca(busca: Record<string, unknown>): { c?: string } {
  return typeof busca["c"] === "string" && busca["c"] ? { c: busca["c"] } : {};
}

export const Route = createFileRoute("/_app/mensagens")({
  head: () => ({ meta: [{ title: "Mensagens · Scout Vela" }] }),
  validateSearch: validarBusca,
  component: RotaMensagens,
});

function RotaMensagens() {
  const { data: me } = useMe();
  const { c } = Route.useSearch();
  const navigate = Route.useNavigate();
  if (!me) return null;
  if (!me.telas.includes("mensagens")) return <SemAcesso />;
  return (
    <TelaMensagens
      papel={me.usuario.papel}
      conversaId={c ?? null}
      aoSelecionar={(id) => void navigate({ search: id ? { c: id } : {} })}
    />
  );
}
