import { createFileRoute } from "@tanstack/react-router";
import { EmConstrucao } from "@/components/scout/EmConstrucao";

export const Route = createFileRoute("/_app/ciclos")({
  head: () => ({ meta: [{ title: "Ciclos de avaliação · Scout Vela" }] }),
  component: () => <EmConstrucao tela="ciclos" titulo="Ciclos de avaliação" />,
});
