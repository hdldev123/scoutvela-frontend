import { createFileRoute } from "@tanstack/react-router";
import { SemAcesso } from "@/components/scout/SemAcesso";
import { TelaRevisoes } from "@/components/scout/TelaRevisoes";
import { useMe } from "@/lib/auth/sessao";

export const Route = createFileRoute("/_app/revisoes")({
  head: () => ({ meta: [{ title: "Pedidos de revisão · Scout Vela" }] }),
  component: RotaRevisoes,
});

function RotaRevisoes() {
  const { data: me } = useMe();
  if (!me) return null;
  if (!me.telas.includes("revisoes")) return <SemAcesso />;
  return <TelaRevisoes papel={me.usuario.papel} />;
}
