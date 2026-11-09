import { createFileRoute } from "@tanstack/react-router";
import { TelaVerificacao } from "@/components/scout/TelaVerificacao";

/** Fora do layout autenticado: cadastro e desafio do segundo fator (TOTP), exigido pela API para gestor e IBVAR. */
export const Route = createFileRoute("/verificacao")({
  head: () => ({ meta: [{ title: "Verificação em duas etapas · Scout Vela" }] }),
  ssr: false,
  component: TelaVerificacao,
});
