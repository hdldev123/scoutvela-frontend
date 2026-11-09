import { createFileRoute } from "@tanstack/react-router";
import { EmConstrucao } from "@/components/scout/EmConstrucao";

export const Route = createFileRoute("/_app/cadastro")({
  head: () => ({ meta: [{ title: "Cadastrar atleta · Scout Vela" }] }),
  component: () => <EmConstrucao tela="cadastro" titulo="Cadastrar atleta" />,
});
