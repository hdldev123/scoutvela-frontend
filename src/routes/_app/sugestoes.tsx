import { createFileRoute } from "@tanstack/react-router";
import { SemAcesso } from "@/components/scout/SemAcesso";
import { TelaSugestoes } from "@/components/scout/TelaSugestoes";
import { temTela } from "@/lib/auth/navegacao";
import { useMe } from "@/lib/auth/sessao";

export const Route = createFileRoute("/_app/sugestoes")({
  head: () => ({ meta: [{ title: "Sugestões · Scout Vela" }] }),
  component: RotaSugestoes,
});

function RotaSugestoes() {
  const { data: me } = useMe();
  if (!me) return null;
  if (!temTela(me, "sugestoes")) return <SemAcesso />;
  return <TelaSugestoes papel={me.usuario.papel} />;
}
