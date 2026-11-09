import { createFileRoute } from "@tanstack/react-router";
import { EmConstrucao } from "@/components/scout/EmConstrucao";

export const Route = createFileRoute("/_app/revisoes")({
  head: () => ({ meta: [{ title: "Pedidos de revisão · Scout Vela" }] }),
  component: () => <EmConstrucao tela="revisoes" titulo="Pedidos de revisão" />,
});
