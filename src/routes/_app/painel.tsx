import { createFileRoute } from "@tanstack/react-router";
import { EmConstrucao } from "@/components/scout/EmConstrucao";

export const Route = createFileRoute("/_app/painel")({
  head: () => ({ meta: [{ title: "Meu painel · Scout Vela" }] }),
  component: () => <EmConstrucao tela="painel" titulo="Meu painel" />,
});
