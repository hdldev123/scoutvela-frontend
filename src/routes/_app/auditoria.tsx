import { createFileRoute } from "@tanstack/react-router";
import { EmConstrucao } from "@/components/scout/EmConstrucao";

export const Route = createFileRoute("/_app/auditoria")({
  head: () => ({ meta: [{ title: "Trilha de auditoria · Scout Vela" }] }),
  component: () => <EmConstrucao tela="auditoria" titulo="Trilha de auditoria" />,
});
