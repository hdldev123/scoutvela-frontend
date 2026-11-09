import { createFileRoute } from "@tanstack/react-router";
import { EmConstrucao } from "@/components/scout/EmConstrucao";

export const Route = createFileRoute("/_app/avaliar")({
  validateSearch: (s: Record<string, unknown>): { atleta?: string } =>
    typeof s["atleta"] === "string" && s["atleta"] ? { atleta: s["atleta"] } : {},
  head: () => ({ meta: [{ title: "Lançar avaliação · Scout Vela" }] }),
  component: () => <EmConstrucao tela="avaliar" titulo="Lançar avaliação" />,
});
