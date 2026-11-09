import { createFileRoute } from "@tanstack/react-router";
import { SemAcesso } from "@/components/scout/SemAcesso";
import { TelaAuditoria } from "@/components/scout/TelaAuditoria";
import { useMe } from "@/lib/auth/sessao";

export const Route = createFileRoute("/_app/auditoria")({
  head: () => ({ meta: [{ title: "Trilha de auditoria · Scout Vela" }] }),
  component: RotaAuditoria,
});

function RotaAuditoria() {
  const { data: me } = useMe();
  if (!me) return null;
  if (!me.telas.includes("auditoria")) return <SemAcesso />;
  return <TelaAuditoria />;
}
