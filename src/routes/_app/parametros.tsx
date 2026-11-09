import { createFileRoute } from "@tanstack/react-router";
import { EmConstrucao } from "@/components/scout/EmConstrucao";

export const Route = createFileRoute("/_app/parametros")({
  head: () => ({ meta: [{ title: "Parâmetros · Scout Vela" }] }),
  component: () => <EmConstrucao tela="parametros" titulo="Parâmetros" />,
});
