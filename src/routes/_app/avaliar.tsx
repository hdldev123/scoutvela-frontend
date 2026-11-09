import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { SemAcesso } from "@/components/scout/SemAcesso";
import { TelaAvaliar } from "@/components/scout/TelaAvaliar";
import { useMe } from "@/lib/auth/sessao";

export const Route = createFileRoute("/_app/avaliar")({
  validateSearch: (s: Record<string, unknown>): { atleta?: string } =>
    typeof s["atleta"] === "string" && s["atleta"] ? { atleta: s["atleta"] } : {},
  head: () => ({ meta: [{ title: "Lançar avaliação · Scout Vela" }] }),
  component: RotaAvaliar,
});

function RotaAvaliar() {
  const { atleta } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { data: me } = useMe();
  if (!me) return null;
  if (!me.telas.includes("avaliar")) return <SemAcesso />;
  return (
    <TelaAvaliar
      atletaId={atleta}
      aoEscolher={(id) => void navigate({ search: id ? { atleta: id } : {}, replace: true })}
    />
  );
}
