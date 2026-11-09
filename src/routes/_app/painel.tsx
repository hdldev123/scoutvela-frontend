import { createFileRoute } from "@tanstack/react-router";
import { SemAcesso } from "@/components/scout/SemAcesso";
import { TelaPainel } from "@/components/scout/TelaPainel";
import { useMe } from "@/lib/auth/sessao";

export const Route = createFileRoute("/_app/painel")({
  head: () => ({ meta: [{ title: "Meu painel · Scout Vela" }] }),
  component: RotaPainel,
});

function RotaPainel() {
  const { data: me } = useMe();
  if (!me) return null;
  if (!me.telas.includes("painel")) return <SemAcesso />;
  return <TelaPainel />;
}
