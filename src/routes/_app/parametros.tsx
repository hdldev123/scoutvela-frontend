import { createFileRoute } from "@tanstack/react-router";
import { SemAcesso } from "@/components/scout/SemAcesso";
import { TelaParametros } from "@/components/scout/TelaParametros";
import { useMe } from "@/lib/auth/sessao";

export const Route = createFileRoute("/_app/parametros")({
  head: () => ({ meta: [{ title: "Parâmetros · Scout Vela" }] }),
  component: RotaParametros,
});

function RotaParametros() {
  const { data: me } = useMe();
  if (!me) return null;
  if (!me.telas.includes("parametros")) return <SemAcesso />;
  return <TelaParametros />;
}
