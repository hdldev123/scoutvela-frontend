import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { EntryScreen } from "@/components/scout/EntryScreen";
import { useSessao } from "@/lib/auth/sessao";

export const Route = createFileRoute("/entrar")({
  head: () => ({ meta: [{ title: "Entrar · Scout Vela" }] }),
  component: Entrar,
});

function Entrar() {
  const { sessao, entrar } = useSessao();
  const navigate = useNavigate();

  // Com sessão (login recém-feito ou já existente), "/" resolve a tela inicial pelo /me.
  useEffect(() => {
    if (sessao) void navigate({ to: "/", replace: true });
  }, [sessao, navigate]);

  return <EntryScreen onEntrar={entrar} />;
}
