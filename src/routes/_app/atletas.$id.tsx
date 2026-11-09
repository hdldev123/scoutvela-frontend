import { createFileRoute } from "@tanstack/react-router";
import { EmConstrucao } from "@/components/scout/EmConstrucao";

export const Route = createFileRoute("/_app/atletas/$id")({
  head: () => ({ meta: [{ title: "Ficha do atleta · Scout Vela" }] }),
  component: () => <EmConstrucao tela="ficha" titulo="Ficha do atleta" />,
});
