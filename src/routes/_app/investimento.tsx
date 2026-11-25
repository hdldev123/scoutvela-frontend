import { createFileRoute } from "@tanstack/react-router";
import { SemAcesso } from "@/components/scout/SemAcesso";
import { TelaInvestimento } from "@/components/scout/TelaInvestimento";
import { useMe } from "@/lib/auth/sessao";

export const Route = createFileRoute("/_app/investimento")({
  head: () => ({ meta: [{ title: "Investimento · Scout Vela" }] }),
  validateSearch: (s: Record<string, unknown>): { ciclo?: string } =>
    typeof s["ciclo"] === "string" && s["ciclo"] ? { ciclo: s["ciclo"] } : {},
  component: RotaInvestimento,
});

function RotaInvestimento() {
  const { ciclo } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { data: me } = useMe();
  if (!me) return null;
  if (!me.telas.includes("investimento")) return <SemAcesso />;
  return (
    <TelaInvestimento
      papel={me.usuario.papel}
      ciclo={ciclo}
      aoMudarCiclo={(novo) => void navigate({ search: { ciclo: novo }, replace: true })}
    />
  );
}
