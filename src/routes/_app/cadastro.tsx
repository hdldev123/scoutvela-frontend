import { createFileRoute } from "@tanstack/react-router";
import { SemAcesso } from "@/components/scout/SemAcesso";
import { TelaCadastro } from "@/components/scout/TelaCadastro";
import { useMe } from "@/lib/auth/sessao";

export const Route = createFileRoute("/_app/cadastro")({
  head: () => ({ meta: [{ title: "Cadastrar atleta · Scout Vela" }] }),
  component: RotaCadastro,
});

function RotaCadastro() {
  const { data: me } = useMe();
  if (!me) return null;
  if (!me.telas.includes("cadastro")) return <SemAcesso />;
  return <TelaCadastro />;
}
