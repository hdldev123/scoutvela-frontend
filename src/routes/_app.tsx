import { createFileRoute } from "@tanstack/react-router";
import { LayoutAutenticado } from "@/components/scout/LayoutAutenticado";

export const Route = createFileRoute("/_app")({
  ssr: false,
  component: LayoutAutenticado,
});
