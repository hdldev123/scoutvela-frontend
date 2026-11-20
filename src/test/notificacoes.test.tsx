import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const GET = vi.fn();
const PUT = vi.fn();
vi.mock("@/lib/api/cliente", async (importar) => ({
  ...(await importar<typeof import("@/lib/api/cliente")>()),
  api: { GET: (...a: unknown[]) => GET(...a), PUT: (...a: unknown[]) => PUT(...a) },
}));

vi.mock("@/components/scout/PaletaDeAtletas", () => ({ PaletaDeAtletas: () => null }));

import { Shell } from "@/components/scout/Shell";
import { invalidarNotificacoes, marcarPainelVisto } from "@/lib/api/notificacoes";
import { useResponderRevisao } from "@/lib/api/revisoes";

type Me = Parameters<typeof Shell>[0]["me"];

const GESTOR: Me = {
  usuario: { nome: "Ana Souza", papel: "gestor" },
  atleta: null,
  telas: ["ranking", "avaliar", "cadastro", "revisoes"],
};
const TREINADOR: Me = {
  usuario: { nome: "Bia Lima", papel: "treinador" },
  atleta: null,
  telas: ["ranking", "avaliar", "revisoes"],
};
const ATLETA: Me = {
  usuario: { nome: "Helena Vasques", papel: "atleta" },
  atleta: { id: "a07", nome: "Helena Vasques" },
  telas: ["painel", "ficha"],
};
const IBVAR: Me = {
  usuario: { nome: "Investidor", papel: "ibvar" },
  atleta: null,
  telas: ["ranking", "investimento"],
};

function resposta(contagens: Record<string, number>) {
  const total = Object.values(contagens).reduce((a, b) => a + b, 0);
  GET.mockImplementation(async (caminho: string) =>
    caminho === "/me/notificacoes"
      ? { data: { contagens, total }, error: undefined }
      : { data: [], error: undefined },
  );
}

async function montar(me: Me, qc = new QueryClient()) {
  const raiz = createRootRoute({
    component: () => (
      <Shell me={me} onSair={() => {}}>
        <p>conteúdo</p>
      </Shell>
    ),
  });
  const rotas = ["/", "/ranking", "/avaliar", "/cadastro", "/revisoes", "/painel"].map((path) =>
    createRoute({ getParentRoute: () => raiz, path }),
  );
  const router = createRouter({
    routeTree: raiz.addChildren(rotas),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  await act(async () => {
    render(
      <QueryClientProvider client={qc}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );
  });
  return qc;
}

beforeEach(() => {
  GET.mockReset();
  PUT.mockReset();
});

describe("Balões do menu lateral", () => {
  it("gestor: números nos itens certos, com nome acessível", async () => {
    resposta({ revisoes: 3, cadastro: 2 });
    await montar(GESTOR);
    const rev = await screen.findByRole("link", { name: "Revisões 3 pendentes" });
    expect(within(rev).getByText("3")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByRole("link", { name: "Cadastrar atleta 2 pendentes" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Lançar avaliação" })).toBeInTheDocument();
  });

  it("treinador: revisões e lançar avaliação", async () => {
    resposta({ revisoes: 2, avaliar: 7 });
    await montar(TREINADOR);
    expect(await screen.findByRole("link", { name: "Revisões 2 pendentes" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Lançar avaliação 7 pendentes" })).toBeInTheDocument();
  });

  it("atleta: Meu painel, singular com 1", async () => {
    resposta({ painel: 1 });
    await montar(ATLETA);
    expect(await screen.findByRole("link", { name: "Meu painel 1 pendente" })).toBeInTheDocument();
  });

  it('mostra "9+" acima de 9, mas o nome acessível guarda o número real', async () => {
    resposta({ painel: 12 });
    await montar(ATLETA);
    const link = await screen.findByRole("link", { name: "Meu painel 9+ (12 pendentes)" });
    expect(within(link).getByText("9+")).toBeInTheDocument();
  });

  it("não mostra nada com 0", async () => {
    resposta({ revisoes: 0, cadastro: 0 });
    await montar(GESTOR);
    await waitFor(() => expect(GET).toHaveBeenCalledWith("/me/notificacoes"));
    expect(document.querySelector(".balao")).toBeNull();
    expect(screen.getByRole("link", { name: "Revisões" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Abrir menu" })).toBeInTheDocument();
  });

  it("o botão da gaveta mostra o total e o inclui no nome", async () => {
    resposta({ revisoes: 3, cadastro: 4 });
    await montar(GESTOR);
    const botao = await screen.findByRole("button", { name: "Abrir menu (7 pendentes)" });
    expect(within(botao).getByText("7")).toHaveAttribute("aria-hidden", "true");
  });

  it("IBVAR não consulta nem mostra balões", async () => {
    resposta({});
    await montar(IBVAR);
    expect(GET).not.toHaveBeenCalled();
    expect(document.querySelector(".balao")).toBeNull();
  });

  it("erro de rede some com os balões, sem mensagem", async () => {
    GET.mockImplementation(async (caminho: string) => {
      if (caminho === "/me/notificacoes") throw new Error("rede");
      return { data: [], error: undefined };
    });
    await montar(GESTOR);
    await waitFor(() => expect(GET).toHaveBeenCalledWith("/me/notificacoes"));
    expect(document.querySelector(".balao")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("Atualização das notificações", () => {
  it("marcarPainelVisto chama PUT /me/notificacoes/vistas e invalida", async () => {
    PUT.mockResolvedValue({ response: { status: 204 } });
    const qc = new QueryClient();
    const espiao = vi.spyOn(qc, "invalidateQueries");
    await marcarPainelVisto(qc);
    expect(PUT).toHaveBeenCalledWith("/me/notificacoes/vistas", { body: { chave: "painel" } });
    expect(espiao).toHaveBeenCalledWith({ queryKey: ["notificacoes"] });
  });

  it("marcarPainelVisto falha em silêncio", async () => {
    PUT.mockRejectedValue(new Error("rede"));
    await expect(marcarPainelVisto(new QueryClient())).resolves.toBeUndefined();
  });

  it("responder uma revisão invalida as notificações", async () => {
    PUT.mockResolvedValue({ data: { id: "r1" }, error: undefined, response: { status: 200 } });
    const qc = new QueryClient();
    const espiao = vi.spyOn(qc, "invalidateQueries");
    function Teste() {
      const m = useResponderRevisao();
      return (
        <button onClick={() => m.mutate({ id: "r1", resposta: "ok" })} type="button">
          responder
        </button>
      );
    }
    render(
      <QueryClientProvider client={qc}>
        <Teste />
      </QueryClientProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "responder" }));
    await waitFor(() => expect(espiao).toHaveBeenCalledWith({ queryKey: ["notificacoes"] }));
  });

  it("helper invalida só a chave notificacoes", async () => {
    const qc = new QueryClient();
    const espiao = vi.spyOn(qc, "invalidateQueries");
    await invalidarNotificacoes(qc);
    expect(espiao).toHaveBeenCalledWith({ queryKey: ["notificacoes"] });
  });
});
