import { createFileRoute } from "@tanstack/react-router";
import { EmConstrucao } from "@/components/scout/EmConstrucao";

export const Route = createFileRoute("/_app/ranking")({
  head: () => ({ meta: [{ title: "Ranking · Scout Vela" }] }),
  component: () => <EmConstrucao tela="ranking" titulo="Ranking" />,
});
