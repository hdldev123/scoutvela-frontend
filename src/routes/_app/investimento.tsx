import { createFileRoute } from "@tanstack/react-router";
import { SemAcesso } from "@/components/scout/SemAcesso";
import { TelaInvestimento } from "@/components/scout/TelaInvestimento";
import { useMe } from "@/lib/auth/sessao";

export const Route = createFileRoute("/_app/investimento")({
  head: () => ({ meta: [{ title: "Investimento · Scout Vela" }] }),
  component: RotaInvestimento,
});

function RotaInvestimento() {
  const { data: me } = useMe();
  if (!me) return null;
  if (!me.telas.includes("investimento")) return <SemAcesso />;
  return <TelaInvestimento papel={me.usuario.papel} />;
}
