import { createFileRoute } from "@tanstack/react-router";
import { EmConstrucao } from "@/components/scout/EmConstrucao";

export const Route = createFileRoute("/_app/usuarios")({
  head: () => ({ meta: [{ title: "Contas de acesso · Scout Vela" }] }),
  component: () => <EmConstrucao tela="usuarios" titulo="Contas de acesso" />,
});
