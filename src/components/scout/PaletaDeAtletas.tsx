import { useNavigate } from "@tanstack/react-router";
import { useRanking } from "@/lib/api/consultas";
import { CommandPalette, type Visivel } from "./CommandPalette";
import { textoDoStatus } from "./status-gate";

interface MeMinimo {
  usuario: { papel: string; fotoUrl?: string | null };
  atleta: { id: string; nome: string } | null;
  telas: string[];
}

/**
 * Liga o CommandPalette aos dados: gestor, treinador e IBVAR buscam nos itens de `/ranking`
 * (a API já filtra pelo acesso); o atleta só tem "Minha ficha". Navega para a ficha.
 */
export function PaletaDeAtletas({ me }: { me: MeMinimo | null }) {
  const navigate = useNavigate();
  const listaRanking = !!me && me.telas.includes("ranking");
  const { data } = useRanking({}, { enabled: listaRanking });

  let itens: Visivel[] = [];
  if (me && listaRanking && data) {
    itens = data.itens.map((i) => ({
      id: i.atleta.id,
      nome: i.atleta.nome,
      classe: i.atleta.classe.nome,
      score: i.score,
      faixa: i.faixa.nome,
      status: textoDoStatus(i.statusGates),
      avatar: { nome: i.atleta.nome, fotoUrl: i.atleta.fotoUrl },
    }));
  } else if (me && me.usuario.papel === "atleta" && me.atleta) {
    itens = [
      {
        id: me.atleta.id,
        nome: "Minha ficha",
        classe: me.atleta.nome,
        score: null,
        faixa: "",
        status: "",
        avatar: { nome: me.atleta.nome, fotoUrl: me.usuario.fotoUrl ?? null },
      },
    ];
  }

  return (
    <CommandPalette
      itens={itens}
      aoSelecionar={(id) => void navigate({ to: "/atletas/$id", params: { id } })}
    />
  );
}
