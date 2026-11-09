import { createFileRoute } from "@tanstack/react-router";
import { SemAcesso } from "@/components/scout/SemAcesso";
import { TelaCiclos } from "@/components/scout/TelaCiclos";
import { useMe } from "@/lib/auth/sessao";

export const Route = createFileRoute("/_app/ciclos")({
  head: () => ({ meta: [{ title: "Ciclos de avaliação · Scout Vela" }] }),
  component: RotaCiclos,
});

function RotaCiclos() {
  const { data: me } = useMe();
  if (!me) return null;
  if (!me.telas.includes("ciclos")) return <SemAcesso />;
  return <TelaCiclos />;
}
