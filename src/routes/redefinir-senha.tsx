import { createFileRoute } from "@tanstack/react-router";
import { TelaRedefinirSenha } from "@/components/scout/TelaRedefinirSenha";

/** Fora do layout autenticado: a pessoa chega aqui pelo link do e-mail de redefinição ou de convite. */
export const Route = createFileRoute("/redefinir-senha")({
  head: () => ({ meta: [{ title: "Redefinir senha · Scout Vela" }] }),
  ssr: false,
  component: TelaRedefinirSenha,
});
