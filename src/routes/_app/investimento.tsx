import { createFileRoute } from "@tanstack/react-router";
import { EmConstrucao } from "@/components/scout/EmConstrucao";

export const Route = createFileRoute("/_app/investimento")({
  head: () => ({ meta: [{ title: "Investimento · Scout Vela" }] }),
  component: () => <EmConstrucao tela="investimento" titulo="Investimento" />,
});
