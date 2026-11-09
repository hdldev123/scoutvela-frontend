import { createFileRoute } from "@tanstack/react-router";
import { SemAcesso } from "@/components/scout/SemAcesso";
import { TelaUsuarios } from "@/components/scout/TelaUsuarios";
import { useMe } from "@/lib/auth/sessao";

export const Route = createFileRoute("/_app/usuarios")({
  head: () => ({ meta: [{ title: "Contas de acesso · Scout Vela" }] }),
  component: RotaUsuarios,
});

function RotaUsuarios() {
  const { data: me } = useMe();
  if (!me) return null;
  if (!me.telas.includes("usuarios")) return <SemAcesso />;
  return <TelaUsuarios />;
}
