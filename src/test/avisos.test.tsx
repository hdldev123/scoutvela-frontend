import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const GET = vi.fn();
const PUT = vi.fn();
const POST = vi.fn();
const toastFn = vi.hoisted(() => Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }));
vi.mock("@/lib/api/cliente", async (importar) => ({
  ...(await importar<typeof import("@/lib/api/cliente")>()),
  api: {
    GET: (...a: unknown[]) => GET(...a),
    PUT: (...a: unknown[]) => PUT(...a),
    POST: (...a: unknown[]) => POST(...a),
  },
}));
vi.mock("sonner", () => ({ toast: toastFn }));
vi.mock("@/components/scout/PaletaDeAtletas", () => ({ PaletaDeAtletas: () => null }));

import { PedirAjusteDialog } from "@/components/scout/PedirAjusteDialog";
import { Shell } from "@/components/scout/Shell";
import { destinoDoAviso, fraseDoAviso } from "@/components/scout/avisos-util";
import type { Aviso } from "@/lib/api/avisos";

type Me = Parameters<typeof Shell>[0]["me"];

const GESTOR: Me = {
  usuario: { nome: "Ana Souza", papel: "gestor" },
  atleta: null,
  telas: ["ranking", "revisoes"],
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

function aviso(extra: Partial<Aviso> & Pick<Aviso, "id" | "tipo">): Aviso {
  return {
    criadoEm: "2026-11-24T12:00:00.000Z",
    lidoEm: null,
    atleta: { id: "a07", nome: "Helena Vasques" },
    referencia: {},
    criadoPor: null,
    mensagem: null,
    indicador: null,
    ...extra,
  };
}

const AVISOS: Aviso[] = [
  aviso({
    id: "1",
    tipo: "atleta_respondeu",
    referencia: { indicadorId: "amb_apoio" },
    indicador: { id: "amb_apoio", nome: "Apoio familiar" },
  }),
  aviso({ id: "2", tipo: "atleta_anexou", referencia: { anexoId: "9", categoria: "sumula" } }),
  aviso({
    id: "3",
    tipo: "atleta_atualizou_perfil",
    referencia: { campos: ["telefone", "passaporteValidoAte"] },
  }),
  aviso({ id: "4", tipo: "atleta_completou_cadastro" }),
  aviso({
    id: "5",
    tipo: "pedido_ajuste",
    referencia: { pedidoAjusteId: "3" },
    criadoPor: { nome: "Ana Ribeiro", papel: "treinador" },
    mensagem: "Revise <i>tática</i>, por favor.",
    indicador: { id: "tat_leitura", nome: "Tática" },
  }),
  aviso({
    id: "6",
    tipo: "sugestao_respondida",
    atleta: null,
    referencia: { sugestaoId: "4", status: "aprovada" },
    criadoPor: { nome: "Ana Souza", papel: "gestor" },
  }),
  aviso({ id: "7", tipo: "atleta_respondeu", lidoEm: "2026-11-24T13:00:00.000Z" }),
];

function api(opcoes: { avisos?: number; paginas?: Aviso[][] } = {}) {
  const paginas = opcoes.paginas ?? [AVISOS];
  GET.mockImplementation(
    async (caminho: string, o?: { params?: { query?: { antesDe?: string } } }) => {
      if (caminho === "/me/notificacoes") {
        const contagens = { avisos: opcoes.avisos ?? 0 };
        return { data: { contagens, total: contagens.avisos }, response: { status: 200 } };
      }
      if (caminho === "/me/avisos") {
        const antesDe = o?.params?.query?.antesDe;
        const i = antesDe ? Number(antesDe.slice(0, 4)) - 2000 : 0;
        const itens = paginas[i] ?? [];
        return {
          data: {
            itens,
            proximoAntesDe: i + 1 < paginas.length ? `${2000 + i + 1}-01-01T00:00:00.000Z` : null,
            naoLidos: itens.filter((a) => a.lidoEm === null).length,
          },
          response: { status: 200 },
        };
      }
      return { data: [], response: { status: 200 } };
    },
  );
}

async function montar(me: Me) {
  const raiz = createRootRoute({
    component: () => (
      <Shell me={me} onSair={() => {}}>
        <p>conteúdo</p>
      </Shell>
    ),
  });
  const rotas = ["/", "/ranking", "/painel", "/sugestoes", "/atletas/$id"].map((path) =>
    createRoute({ getParentRoute: () => raiz, path }),
  );
  const router = createRouter({
    routeTree: raiz.addChildren(rotas),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  await act(async () => {
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );
  });
  return router;
}

beforeEach(() => {
  GET.mockReset();
  PUT.mockReset();
  POST.mockReset();
  toastFn.success.mockReset();
  PUT.mockResolvedValue({ response: { status: 204 } });
});

describe("Sino de avisos", () => {
  it("mostra a contagem de não lidos no nome acessível e no selo", async () => {
    api({ avisos: 3 });
    await montar(GESTOR);
    const sino = await screen.findByRole("button", { name: "Avisos, 3 não lidos" });
    expect(within(sino).getByText("3")).toHaveAttribute("aria-hidden", "true");
  });

  it("sem não lidos o sino aparece sem selo; singular com um aviso", async () => {
    api({ avisos: 0 });
    await montar(TREINADOR);
    const sino = await screen.findByRole("button", { name: "Avisos" });
    expect(within(sino).queryByText("0")).not.toBeInTheDocument();
  });

  it("gestor, treinador e atleta têm o sino; o IBVAR não", async () => {
    for (const me of [GESTOR, TREINADOR, ATLETA]) {
      api({ avisos: 1 });
      await montar(me);
      expect(await screen.findByRole("button", { name: "Avisos, 1 não lido" })).toBeInTheDocument();
      cleanup();
    }
    api({ avisos: 0 });
    await montar(IBVAR);
    await screen.findByRole("link", { name: "Investimento" });
    expect(screen.queryByRole("button", { name: /^Avisos/ })).not.toBeInTheDocument();
    expect(GET).not.toHaveBeenCalledWith("/me/avisos", expect.anything());
  });

  it("abre o painel com foco preso, região com rótulo, frases por tipo e contagem anunciada", async () => {
    api({ avisos: 6 });
    await montar(GESTOR);
    const sino = await screen.findByRole("button", { name: "Avisos, 6 não lidos" });
    sino.focus();
    fireEvent.click(sino);
    const dialogo = await screen.findByRole("dialog", { name: "Avisos" });
    expect(await within(dialogo).findByText("6 avisos não lidos.")).toBeInTheDocument();
    const regiao = within(dialogo).getByRole("region", { name: "Lista de avisos" });
    expect(within(regiao).getAllByRole("listitem")).toHaveLength(7);
    for (const frase of [
      "Helena Vasques respondeu a pergunta: Apoio familiar",
      "Helena Vasques anexou uma súmula",
      "Helena Vasques atualizou o perfil (telefone, validade do passaporte)",
      "Helena Vasques completou o cadastro",
      "Pedido de ajuste de Ana Ribeiro em Tática",
      "Sua sugestão foi aprovada por Ana Souza",
    ]) {
      expect(within(regiao).getByText(frase)).toBeInTheDocument();
    }
    // A mensagem do pedido de ajuste é texto, nunca HTML.
    expect(within(regiao).getByText("Revise <i>tática</i>, por favor.")).toBeInTheDocument();
    expect(regiao.querySelector("i")).toBeNull();
    // Não lido é anunciado; lido não.
    expect(within(regiao).getAllByText(/^Não lido\./)).toHaveLength(6);
    // Links para a tela certa.
    expect(within(regiao).getByRole("link", { name: /Helena Vasques anexou/ })).toHaveAttribute(
      "href",
      "/atletas/a07",
    );
    expect(within(regiao).getByRole("link", { name: /Pedido de ajuste/ })).toHaveAttribute(
      "href",
      "/painel",
    );
    expect(within(regiao).getByRole("link", { name: /Sua sugestão/ })).toHaveAttribute(
      "href",
      "/sugestoes",
    );
    // Esc fecha e devolve o foco ao sino.
    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(sino).toHaveFocus();
  });

  it("abrir um item marca como lido e fecha o painel", async () => {
    api({ avisos: 6 });
    await montar(GESTOR);
    fireEvent.click(await screen.findByRole("button", { name: "Avisos, 6 não lidos" }));
    const dialogo = await screen.findByRole("dialog", { name: "Avisos" });
    fireEvent.click(await within(dialogo).findByRole("link", { name: /anexou uma súmula/ }));
    await waitFor(() =>
      expect(PUT).toHaveBeenCalledWith("/me/avisos/{id}/lido", { params: { path: { id: "2" } } }),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("item já lido não chama a API ao abrir", async () => {
    api({ avisos: 6 });
    await montar(GESTOR);
    fireEvent.click(await screen.findByRole("button", { name: "Avisos, 6 não lidos" }));
    const dialogo = await screen.findByRole("dialog", { name: "Avisos" });
    const itens = await within(dialogo).findAllByRole("link", { name: /respondeu/ });
    fireEvent.click(itens[itens.length - 1]!);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(PUT).not.toHaveBeenCalled();
  });

  it("Marcar todos como lidos chama a API e fica desabilitado sem não lidos", async () => {
    api({ avisos: 6 });
    await montar(ATLETA);
    fireEvent.click(await screen.findByRole("button", { name: "Avisos, 6 não lidos" }));
    const dialogo = await screen.findByRole("dialog", { name: "Avisos" });
    PUT.mockResolvedValue({ data: { marcados: 6 }, response: { status: 200 } });
    const todos = await within(dialogo).findByRole("button", { name: "Marcar todos como lidos" });
    await waitFor(() => expect(todos).toBeEnabled());
    fireEvent.click(todos);
    await waitFor(() => expect(PUT).toHaveBeenCalledWith("/me/avisos/lidos"));
  });

  it("Carregar mais usa o proximoAntesDe da página anterior", async () => {
    const pagina1 = [aviso({ id: "10", tipo: "atleta_completou_cadastro" })];
    const pagina2 = [
      aviso({ id: "11", tipo: "atleta_anexou", referencia: { categoria: "balanca" } }),
    ];
    api({ avisos: 2, paginas: [pagina1, pagina2] });
    await montar(TREINADOR);
    fireEvent.click(await screen.findByRole("button", { name: "Avisos, 2 não lidos" }));
    const dialogo = await screen.findByRole("dialog", { name: "Avisos" });
    expect(await within(dialogo).findByText(/completou o cadastro/)).toBeInTheDocument();
    fireEvent.click(within(dialogo).getByRole("button", { name: "Carregar mais" }));
    expect(await within(dialogo).findByText(/anexou uma foto da balança/)).toBeInTheDocument();
    expect(GET).toHaveBeenCalledWith("/me/avisos", {
      params: { query: { limite: 20, antesDe: "2001-01-01T00:00:00.000Z" } },
    });
    expect(
      within(dialogo).queryByRole("button", { name: "Carregar mais" }),
    ).not.toBeInTheDocument();
  });

  it("sem avisos mostra o estado vazio", async () => {
    api({ avisos: 0, paginas: [[]] });
    await montar(GESTOR);
    fireEvent.click(await screen.findByRole("button", { name: "Avisos" }));
    expect(await screen.findByText("Nenhum aviso por enquanto.")).toBeInTheDocument();
    expect(screen.getByText("Nenhum aviso não lido.")).toBeInTheDocument();
  });
});

describe("frases dos avisos", () => {
  it("cai em frases genéricas quando falta referência", () => {
    expect(fraseDoAviso(aviso({ id: "x", tipo: "atleta_anexou" }))).toBe(
      "Helena Vasques anexou um arquivo",
    );
    expect(fraseDoAviso(aviso({ id: "x", tipo: "atleta_atualizou_perfil" }))).toBe(
      "Helena Vasques atualizou o perfil",
    );
    expect(fraseDoAviso(aviso({ id: "x", tipo: "pedido_ajuste" }))).toBe(
      "Pedido de ajuste de seu treinador",
    );
    expect(
      fraseDoAviso(
        aviso({ id: "x", tipo: "sugestao_respondida", referencia: { status: "recusada" } }),
      ),
    ).toBe("Sua sugestão foi recusada");
  });
});

describe("frases dos avisos da autoavaliação e da pesagem (D9)", () => {
  it("monta a frase de cada tipo novo a partir da referência", () => {
    expect(
      fraseDoAviso(aviso({ id: "a", tipo: "atleta_autoavaliou", referencia: { quantidade: 5 } })),
    ).toBe("Helena Vasques enviou a autoavaliação (5 indicadores)");
    expect(
      fraseDoAviso(aviso({ id: "a", tipo: "atleta_autoavaliou", referencia: { quantidade: 1 } })),
    ).toBe("Helena Vasques enviou a autoavaliação (1 indicador)");
    expect(fraseDoAviso(aviso({ id: "a", tipo: "atleta_autoavaliou" }))).toBe(
      "Helena Vasques enviou a autoavaliação",
    );
    expect(
      fraseDoAviso(
        aviso({
          id: "b",
          tipo: "autoavaliacao_corrigida",
          referencia: { indicadorId: "tec_1" },
          indicador: { id: "tec_1", nome: "Leitura de vento" },
          criadoPor: { nome: "Ana Ribeiro", papel: "treinador" },
        }),
      ),
    ).toBe("Sua sugestão em Leitura de vento foi corrigida por Ana Ribeiro");
    expect(fraseDoAviso(aviso({ id: "b", tipo: "autoavaliacao_corrigida" }))).toBe(
      "Uma sugestão da sua autoavaliação foi corrigida",
    );
    expect(fraseDoAviso(aviso({ id: "c", tipo: "atleta_enviou_pesagem" }))).toBe(
      "Helena Vasques enviou o peso para validar",
    );
    expect(fraseDoAviso(aviso({ id: "d", tipo: "pesagem_validada" }))).toBe(
      "Seu peso foi validado",
    );
    expect(fraseDoAviso(aviso({ id: "e", tipo: "pesagem_recusada" }))).toBe(
      "Seu peso foi recusado",
    );
  });

  it("monta as frases dos avisos de resultado (D10)", () => {
    expect(
      fraseDoAviso(
        aviso({ id: "f", tipo: "atleta_lancou_resultado", referencia: { resultadoId: "r1" } }),
      ),
    ).toBe("Helena Vasques enviou um resultado para validar");
    expect(fraseDoAviso(aviso({ id: "g", tipo: "resultado_validado" }))).toBe(
      "Seu resultado foi validado",
    );
    expect(fraseDoAviso(aviso({ id: "h", tipo: "resultado_recusado" }))).toBe(
      "Seu resultado foi recusado",
    );
  });

  it("leva cada aviso à tela certa", () => {
    const ficha = { to: "/atletas/$id", params: { id: "a07" } };
    expect(destinoDoAviso(aviso({ id: "a", tipo: "atleta_autoavaliou" }))).toEqual(ficha);
    expect(destinoDoAviso(aviso({ id: "c", tipo: "atleta_enviou_pesagem" }))).toEqual(ficha);
    expect(destinoDoAviso(aviso({ id: "r", tipo: "atleta_lancou_resultado" }))).toEqual(ficha);
    for (const tipo of [
      "autoavaliacao_corrigida",
      "pesagem_validada",
      "pesagem_recusada",
      "resultado_validado",
      "resultado_recusado",
    ] as const) {
      expect(destinoDoAviso(aviso({ id: tipo, tipo }))).toEqual({ to: "/painel" });
    }
  });
});

describe("Pedir ajuste", () => {
  const PILARES = [
    {
      id: "tat",
      nome: "Tática e decisão",
      indicadores: [{ id: "tat_leitura", nome: "Leitura de jogo" }],
    },
    { id: "vazio", nome: "Sem indicadores", indicadores: [] },
  ];

  function abrir(aoFechar = vi.fn()) {
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <PedirAjusteDialog
          atletaId="a07"
          atletaNome="Helena Vasques"
          pilares={PILARES}
          aoFechar={aoFechar}
        />
      </QueryClientProvider>,
    );
    return aoFechar;
  }

  it("envia indicador e mensagem, mostra o contador e fecha com aviso de sucesso", async () => {
    POST.mockResolvedValue({ data: { id: "3", avisoEnviado: true }, response: { status: 201 } });
    const aoFechar = abrir();
    const dialogo = screen.getByRole("dialog", { name: "Pedir ajuste" });
    expect(within(dialogo).getByText("0 de 300 caracteres")).toBeInTheDocument();
    expect(within(dialogo).queryByText("Sem indicadores")).not.toBeInTheDocument();
    fireEvent.change(within(dialogo).getByLabelText("Indicador (opcional)"), {
      target: { value: "tat_leitura" },
    });
    fireEvent.change(within(dialogo).getByLabelText("Mensagem"), {
      target: { value: "  Revise a leitura de jogo.  " },
    });
    expect(within(dialogo).getByText("29 de 300 caracteres")).toBeInTheDocument();
    fireEvent.click(within(dialogo).getByRole("button", { name: "Enviar pedido" }));
    await waitFor(() =>
      expect(POST).toHaveBeenCalledWith("/atletas/{id}/pedidos-ajuste", {
        params: { path: { id: "a07" } },
        body: { mensagem: "Revise a leitura de jogo.", indicadorId: "tat_leitura" },
      }),
    );
    await waitFor(() => expect(aoFechar).toHaveBeenCalled());
    expect(toastFn.success).toHaveBeenCalledWith("Pedido de ajuste enviado a Helena Vasques.");
  });

  it("sem indicador o corpo leva só a mensagem; mensagem vazia não envia", async () => {
    POST.mockResolvedValue({ data: { id: "3", avisoEnviado: true }, response: { status: 201 } });
    abrir();
    fireEvent.click(screen.getByRole("button", { name: "Enviar pedido" }));
    expect(screen.getByText("Informe a mensagem.")).toBeInTheDocument();
    expect(POST).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Mensagem"), {
      target: { value: "Atualize o perfil." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enviar pedido" }));
    await waitFor(() =>
      expect(POST).toHaveBeenCalledWith("/atletas/{id}/pedidos-ajuste", {
        params: { path: { id: "a07" } },
        body: { mensagem: "Atualize o perfil." },
      }),
    );
  });

  it("mostra o 400 no campo", async () => {
    POST.mockResolvedValue({
      error: {
        erro: "requisicao_invalida",
        mensagem: "Dados inválidos.",
        campos: [{ campo: "indicadorId", mensagem: "Indicador inexistente." }],
      },
      response: { status: 400 },
    });
    abrir();
    fireEvent.change(screen.getByLabelText("Mensagem"), { target: { value: "Oi" } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar pedido" }));
    expect(await screen.findByText("Indicador inexistente.")).toBeInTheDocument();
    expect(screen.getByLabelText("Indicador (opcional)")).toHaveAttribute("aria-invalid", "true");
  });

  it("avisa quando o atleta ainda não tem conta (avisoEnviado falso)", async () => {
    POST.mockResolvedValue({ data: { id: "3", avisoEnviado: false }, response: { status: 201 } });
    const aoFechar = abrir();
    fireEvent.change(screen.getByLabelText("Mensagem"), { target: { value: "Revise." } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar pedido" }));
    expect(
      await screen.findByText(/O atleta ainda não tem conta; o pedido ficou registrado/),
    ).toBeInTheDocument();
    expect(toastFn.success).not.toHaveBeenCalled();
    expect(aoFechar).not.toHaveBeenCalled();
  });
});
