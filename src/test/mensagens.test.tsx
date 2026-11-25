import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const GET = vi.fn();
const POST = vi.fn();
const PUT = vi.fn();
const toastFn = vi.hoisted(() => Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }));

vi.mock("@/lib/api/cliente", async (importar) => ({
  ...(await importar<typeof import("@/lib/api/cliente")>()),
  api: {
    GET: (...a: unknown[]) => GET(...a),
    POST: (...a: unknown[]) => POST(...a),
    PUT: (...a: unknown[]) => PUT(...a),
  },
}));
vi.mock("sonner", () => ({ toast: toastFn }));
vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    search,
    ...resto
  }: {
    children: ReactNode;
    to: string;
    search?: unknown;
  }) => (
    <a href={to} data-search={JSON.stringify(search ?? null)} {...resto}>
      {children}
    </a>
  ),
}));

import { TelaMensagens } from "@/components/scout/TelaMensagens";
import { destinoDoAviso, fraseDoAviso } from "@/components/scout/avisos-util";
import { AVISO_PRIVACIDADE } from "@/components/scout/conversas-util";
import type { Aviso } from "@/lib/api/avisos";
import type { Conversa, Mensagem } from "@/lib/api/conversas";
import { contagemDaTela, itensDeNavegacao } from "@/lib/auth/navegacao";

function conv(extra: Partial<Conversa> = {}): Conversa {
  return {
    id: "c1",
    tipo: "treinador_atleta",
    com: { nome: "Bia Lima", papel: "treinador" },
    atleta: { id: "a1", nome: "Helena Vasques" },
    treinador: { id: "t1", nome: "Bia Lima" },
    criadaEm: "2026-11-20T12:00:00Z",
    ultimaMensagemEm: "2026-11-24T15:30:00Z",
    naoLidas: 0,
    somenteLeitura: false,
    supervisaoAte: null,
    ...extra,
  };
}

function msg(id: string, texto: string, extra: Partial<Mensagem> = {}): Mensagem {
  return {
    id,
    autor: { nome: "Bia Lima", papel: "treinador" },
    propria: false,
    texto,
    enviadaEm: `2026-11-24T15:3${id}:00Z`,
    ...extra,
  };
}

interface Cenario {
  conversas?: Conversa[];
  supervisao?: Conversa[];
  mensagens?: Mensagem[];
  proximoAntesDe?: string | null;
  ranking?: unknown;
  atletas?: unknown;
  usuarios?: unknown;
}

function api(c: Cenario = {}) {
  GET.mockImplementation(
    async (url: string, opcoes?: { params?: { query?: Record<string, string> } }) => {
      const ok = (data: unknown) => ({ data, error: undefined, response: { status: 200 } });
      if (url === "/conversas") {
        const sup = opcoes?.params?.query?.["supervisao"] === "true";
        return ok({ itens: sup ? (c.supervisao ?? []) : (c.conversas ?? []) });
      }
      if (url === "/conversas/{id}/mensagens") {
        return ok({ itens: c.mensagens ?? [], proximoAntesDe: c.proximoAntesDe ?? null });
      }
      if (url === "/ranking") return ok(c.ranking ?? { ciclo: null, itens: [] });
      if (url === "/atletas") return ok(c.atletas ?? []);
      if (url === "/usuarios") return ok(c.usuarios ?? []);
      throw new Error(`GET inesperado: ${url}`);
    },
  );
  PUT.mockResolvedValue({ error: undefined, response: { status: 204 } });
  POST.mockResolvedValue({ data: undefined, error: undefined, response: { status: 201 } });
}

function erro(status: number, corpo: Record<string, unknown>) {
  return { data: undefined, error: corpo, response: { status } };
}

function montar(papel: string, conversaId: string | null = null, aoSelecionar = vi.fn()) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const r = render(
    <QueryClientProvider client={qc}>
      <TelaMensagens papel={papel} conversaId={conversaId} aoSelecionar={aoSelecionar} />
    </QueryClientProvider>,
  );
  return { ...r, aoSelecionar };
}

const chamadasMensagens = () => GET.mock.calls.filter((c) => c[0] === "/conversas/{id}/mensagens");

beforeEach(() => {
  GET.mockReset();
  POST.mockReset();
  PUT.mockReset();
  toastFn.error.mockReset();
  toastFn.success.mockReset();
});
afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

describe("lista de conversas", () => {
  it("atleta: nome do outro lado, Gestão CBVela, não lidas e somente leitura", async () => {
    api({
      conversas: [
        conv({ naoLidas: 3 }),
        conv({
          id: "c2",
          tipo: "gestao_atleta",
          com: { gestao: true },
          treinador: null,
          naoLidas: 0,
          ultimaMensagemEm: null,
        }),
        conv({
          id: "c3",
          com: { nome: "Carlos Dias", papel: "treinador" },
          somenteLeitura: true,
        }),
      ],
    });
    const { aoSelecionar } = montar("atleta");
    const lista = await screen.findByRole("list");
    expect(within(lista).getByText("Bia Lima")).toBeInTheDocument();
    expect(within(lista).getByText("Gestão CBVela")).toBeInTheDocument();
    expect(within(lista).getByText("Sem mensagens")).toBeInTheDocument();
    expect(within(lista).getByText("3 mensagens não lidas")).toBeInTheDocument();
    expect(within(lista).getByText("Somente leitura")).toBeInTheDocument();
    fireEvent.click(within(lista).getByRole("button", { name: /Gestão CBVela/ }));
    expect(aoSelecionar).toHaveBeenCalledWith("c2");
  });

  it("gestor: caixas com o nome do atleta e do treinador; a supervisão só tem metadados", async () => {
    api({
      conversas: [
        conv({
          id: "g1",
          tipo: "gestao_atleta",
          com: { nome: "Helena Vasques", papel: "atleta" },
          naoLidas: 1,
        }),
        conv({
          id: "g2",
          tipo: "gestao_treinador",
          com: { nome: "Bia Lima", papel: "treinador" },
          atleta: null,
        }),
      ],
      supervisao: [conv({ id: "s1", naoLidas: 0, somenteLeitura: true })],
    });
    montar("gestor");
    const caixas = await screen.findByRole("tabpanel", { name: "Caixas da gestão" });
    expect(await within(caixas).findByText("Helena Vasques")).toBeInTheDocument();
    expect(within(caixas).getByText("Bia Lima")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Supervisão" }));
    const sup = await screen.findByRole("tabpanel", { name: "Supervisão" });
    expect(await within(sup).findByText("Bia Lima e Helena Vasques")).toBeInTheDocument();
    expect(within(sup).getByRole("button", { name: "Abrir para supervisão" })).toBeInTheDocument();
    expect(within(sup).queryByText("Somente leitura")).not.toBeInTheDocument();
    expect(GET).toHaveBeenCalledWith("/conversas", { params: { query: { supervisao: "true" } } });
  });

  it("papéis sem supervisão não consultam a lista de supervisão", async () => {
    api({ conversas: [] });
    montar("treinador");
    expect(await screen.findByText("Nenhuma conversa por aqui.")).toBeInTheDocument();
    expect(GET).not.toHaveBeenCalledWith("/conversas", {
      params: { query: { supervisao: "true" } },
    });
    expect(screen.queryByRole("tab", { name: "Supervisão" })).not.toBeInTheDocument();
  });
});

describe("nova conversa", () => {
  const nova = (c: Conversa, status = 201) => ({ data: c, error: undefined, response: { status } });

  it("atleta: meu treinador e Gestão CBVela, sem ids no corpo", async () => {
    api();
    const { aoSelecionar } = montar("atleta");
    fireEvent.click(await screen.findByRole("button", { name: /Nova conversa/ }));
    const d = screen.getByRole("dialog");
    expect(within(d).getByRole("option", { name: "Meu treinador" })).toBeInTheDocument();
    POST.mockResolvedValueOnce(nova(conv({ id: "n1" })));
    fireEvent.click(within(d).getByRole("button", { name: "Abrir conversa" }));
    await waitFor(() => expect(aoSelecionar).toHaveBeenCalledWith("n1"));
    expect(POST).toHaveBeenCalledWith("/conversas", { body: { tipo: "treinador_atleta" } });
    expect(toastFn.success).toHaveBeenCalledWith("Conversa aberta.");

    fireEvent.click(screen.getByRole("button", { name: /Nova conversa/ }));
    const d2 = screen.getByRole("dialog");
    fireEvent.change(within(d2).getByLabelText("Conversar com"), { target: { value: "gestao" } });
    POST.mockResolvedValueOnce(nova(conv({ id: "n2", tipo: "gestao_atleta" }), 200));
    fireEvent.click(within(d2).getByRole("button", { name: "Abrir conversa" }));
    await waitFor(() => expect(aoSelecionar).toHaveBeenCalledWith("n2"));
    expect(POST).toHaveBeenLastCalledWith("/conversas", { body: { tipo: "gestao_atleta" } });
    expect(toastFn.success).toHaveBeenLastCalledWith("Você já tinha essa conversa: abrimos ela.");
  });

  it("atleta sem treinador: mostra o 404 da API", async () => {
    api();
    montar("atleta");
    fireEvent.click(await screen.findByRole("button", { name: /Nova conversa/ }));
    POST.mockResolvedValueOnce(
      erro(404, { erro: "nao_encontrado", mensagem: "Você ainda não tem treinador." }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Abrir conversa" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Você ainda não tem treinador.");
  });

  it("treinador: escolhe um dos próprios atletas (atletaId) ou a gestão; 400 por campo", async () => {
    api({
      ranking: {
        ciclo: null,
        itens: [
          { atleta: { id: "a1", nome: "Helena Vasques" } },
          { atleta: { id: "a2", nome: "Rui Melo" } },
        ],
      },
    });
    const { aoSelecionar } = montar("treinador");
    fireEvent.click(await screen.findByRole("button", { name: /Nova conversa/ }));
    const d = screen.getByRole("dialog");
    // Sem escolher o atleta, o front avisa antes de chamar a API.
    fireEvent.click(within(d).getByRole("button", { name: "Abrir conversa" }));
    expect(await within(d).findByText("Selecione o atleta.")).toBeInTheDocument();
    expect(POST).not.toHaveBeenCalled();
    await within(d).findByRole("option", { name: "Rui Melo" });
    fireEvent.change(within(d).getByLabelText("Atleta"), { target: { value: "a2" } });
    POST.mockResolvedValueOnce(
      erro(400, {
        erro: "requisicao_invalida",
        mensagem: "Dados inválidos.",
        campos: [{ campo: "atletaId", mensagem: "Informe o atleta." }],
      }),
    );
    fireEvent.click(within(d).getByRole("button", { name: "Abrir conversa" }));
    expect(await within(d).findByText("Informe o atleta.")).toBeInTheDocument();
    expect(POST).toHaveBeenCalledWith("/conversas", {
      body: { tipo: "treinador_atleta", atletaId: "a2" },
    });
    POST.mockResolvedValueOnce(nova(conv({ id: "n3" })));
    fireEvent.click(within(d).getByRole("button", { name: "Abrir conversa" }));
    await waitFor(() => expect(aoSelecionar).toHaveBeenCalledWith("n3"));

    fireEvent.click(screen.getByRole("button", { name: /Nova conversa/ }));
    const d2 = screen.getByRole("dialog");
    fireEvent.change(within(d2).getByLabelText("Conversar com"), { target: { value: "gestao" } });
    POST.mockResolvedValueOnce(nova(conv({ id: "n4", tipo: "gestao_treinador" })));
    fireEvent.click(within(d2).getByRole("button", { name: "Abrir conversa" }));
    await waitFor(() => expect(aoSelecionar).toHaveBeenCalledWith("n4"));
    expect(POST).toHaveBeenLastCalledWith("/conversas", { body: { tipo: "gestao_treinador" } });
  });

  it("gestor: atleta (gestao_atleta) ou treinador (gestao_treinador); 403 vira aviso", async () => {
    api({
      atletas: [
        { id: "a1", nome: "Helena Vasques", ativo: true, cadastroCompleto: true },
        { id: "a9", nome: "Inativo Silva", ativo: false, cadastroCompleto: true },
      ],
      usuarios: [
        { id: "t1", nome: "Bia Lima", papel: "treinador", ativo: true },
        { id: "g1", nome: "Ana Souza", papel: "gestor", ativo: true },
      ],
    });
    const { aoSelecionar } = montar("gestor");
    fireEvent.click(await screen.findByRole("button", { name: /Nova conversa/ }));
    const d = screen.getByRole("dialog");
    await within(d).findByRole("option", { name: "Helena Vasques" });
    expect(within(d).queryByRole("option", { name: "Inativo Silva" })).not.toBeInTheDocument();
    fireEvent.change(within(d).getByLabelText("Atleta"), { target: { value: "a1" } });
    POST.mockResolvedValueOnce(nova(conv({ id: "n5", tipo: "gestao_atleta" })));
    fireEvent.click(within(d).getByRole("button", { name: "Abrir conversa" }));
    await waitFor(() => expect(aoSelecionar).toHaveBeenCalledWith("n5"));
    expect(POST).toHaveBeenLastCalledWith("/conversas", {
      body: { tipo: "gestao_atleta", atletaId: "a1" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Nova conversa/ }));
    const d2 = screen.getByRole("dialog");
    fireEvent.change(within(d2).getByLabelText("Conversar com"), {
      target: { value: "treinador" },
    });
    await within(d2).findByRole("option", { name: "Bia Lima" });
    expect(within(d2).queryByRole("option", { name: "Ana Souza" })).not.toBeInTheDocument();
    fireEvent.change(within(d2).getByLabelText("Treinador"), { target: { value: "t1" } });
    POST.mockResolvedValueOnce(erro(403, { erro: "sem_acesso", mensagem: "Sem permissão." }));
    fireEvent.click(within(d2).getByRole("button", { name: "Abrir conversa" }));
    expect(await within(d2).findByRole("alert")).toHaveTextContent("Sem permissão.");
    expect(POST).toHaveBeenLastCalledWith("/conversas", {
      body: { tipo: "gestao_treinador", treinadorId: "t1" },
    });
  });
});

describe("conversa aberta", () => {
  it("mostra autor, papel e data/hora de Brasília; o texto é puro, com as quebras de linha", async () => {
    api({
      conversas: [conv()],
      mensagens: [
        msg("1", "Oi\n<b>negrito</b> <img src=x onerror=alert(1)>"),
        msg("2", "Tudo bem?", {
          propria: true,
          autor: { nome: "Helena Vasques", papel: "atleta" },
        }),
      ],
    });
    const { container } = montar("atleta", "c1");
    const log = await screen.findByRole("log", { name: "Mensagens da conversa" });
    expect(log).toHaveAttribute("aria-live", "polite");
    expect(log).toHaveAttribute("tabindex", "0");
    const itens = await within(log).findAllByRole("listitem");
    expect(itens).toHaveLength(2);
    expect(itens[0]).toHaveTextContent("Bia Lima");
    expect(itens[0]).toHaveTextContent("Treinador(a)");
    // 15:31 UTC = 12:31 em Brasília.
    expect(itens[0]).toHaveTextContent("24/11/2026 12:31");
    expect(itens[0]!.querySelector(".msg-texto")!.textContent).toBe(
      "Oi\n<b>negrito</b> <img src=x onerror=alert(1)>",
    );
    expect(container.querySelector("b")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
    expect(itens[1]).toHaveClass("propria");
    expect(itens[1]).toHaveTextContent("Você");
  });

  it("marca como lida ao abrir", async () => {
    api({ conversas: [conv({ naoLidas: 2 })], mensagens: [msg("1", "Oi")] });
    montar("atleta", "c1");
    await waitFor(() =>
      expect(PUT).toHaveBeenCalledWith("/conversas/{id}/lidas", { params: { path: { id: "c1" } } }),
    );
  });

  it("aviso de privacidade só nas conversas de treinador e atleta", async () => {
    api({
      conversas: [conv(), conv({ id: "c2", tipo: "gestao_atleta", com: { gestao: true } })],
    });
    const { unmount } = montar("atleta", "c1");
    expect(await screen.findByText(AVISO_PRIVACIDADE)).toBeInTheDocument();
    expect(AVISO_PRIVACIDADE).toBe(
      "Conversa privada. A gestão da CBVela só pode lê-la em caso de denúncia, com o motivo registrado.",
    );
    unmount();
    montar("atleta", "c2");
    await screen.findByRole("log");
    expect(screen.queryByText(AVISO_PRIVACIDADE)).not.toBeInTheDocument();
  });

  it("carrega anteriores pela paginação antesDe", async () => {
    api({
      conversas: [conv()],
      mensagens: [msg("5", "Recente")],
      proximoAntesDe: "2026-11-24T15:35:00Z",
    });
    montar("atleta", "c1");
    fireEvent.click(await screen.findByRole("button", { name: "Carregar anteriores" }));
    await waitFor(() =>
      expect(
        chamadasMensagens().some((c) => c[1].params.query.antesDe === "2026-11-24T15:35:00Z"),
      ).toBe(true),
    );
  });

  it("somente leitura: envio desabilitado, com a explicação", async () => {
    api({ conversas: [conv({ somenteLeitura: true })], mensagens: [msg("1", "Antiga")] });
    montar("atleta", "c1");
    const campo = await screen.findByLabelText("Mensagem");
    expect(campo).toBeDisabled();
    expect(screen.getByRole("button", { name: "Enviar" })).toBeDisabled();
    expect(screen.getByText(/somente leitura \(par anterior/)).toBeInTheDocument();
  });
});

describe("envio", () => {
  const criada = (texto: string) => ({
    data: msg("9", texto, { propria: true, autor: { nome: "Helena Vasques", papel: "atleta" } }),
    error: undefined,
    response: { status: 201 },
  });

  it("envia o texto, limpa o campo e mostra a mensagem; o contador acompanha", async () => {
    api({ conversas: [conv()], mensagens: [msg("1", "Oi")] });
    montar("atleta", "c1");
    const campo = await screen.findByLabelText("Mensagem");
    expect(screen.getByText("0 de 2.000 caracteres")).toBeInTheDocument();
    fireEvent.change(campo, { target: { value: "Olá, treinador" } });
    expect(screen.getByText("14 de 2.000 caracteres")).toBeInTheDocument();
    expect(campo).toHaveAttribute("maxlength", "2000");
    expect(
      screen.getByText(/Enter envia a mensagem\. Shift\+Enter quebra a linha/),
    ).toBeInTheDocument();
    POST.mockResolvedValueOnce(criada("Olá, treinador"));
    fireEvent.click(screen.getByRole("button", { name: "Enviar" }));
    await within(screen.getByRole("log")).findByText("Olá, treinador");
    expect(POST).toHaveBeenCalledWith("/conversas/{id}/mensagens", {
      params: { path: { id: "c1" } },
      body: { texto: "Olá, treinador" },
    });
    expect(campo).toHaveValue("");
  });

  it("Enter envia e Shift+Enter não", async () => {
    api({ conversas: [conv()], mensagens: [] });
    montar("atleta", "c1");
    const campo = await screen.findByLabelText("Mensagem");
    fireEvent.change(campo, { target: { value: "linha 1" } });
    fireEvent.keyDown(campo, { key: "Enter", shiftKey: true });
    expect(POST).not.toHaveBeenCalled();
    POST.mockResolvedValueOnce(criada("linha 1"));
    fireEvent.keyDown(campo, { key: "Enter" });
    await waitFor(() => expect(POST).toHaveBeenCalledTimes(1));
  });

  it("não envia texto só com espaços", async () => {
    api({ conversas: [conv()], mensagens: [] });
    montar("atleta", "c1");
    const campo = await screen.findByLabelText("Mensagem");
    fireEvent.change(campo, { target: { value: "   " } });
    expect(screen.getByRole("button", { name: "Enviar" })).toBeDisabled();
    fireEvent.keyDown(campo, { key: "Enter" });
    expect(POST).not.toHaveBeenCalled();
  });

  it("409: somente leitura, com mensagem clara e o texto preservado", async () => {
    api({ conversas: [conv()], mensagens: [] });
    montar("atleta", "c1");
    const campo = await screen.findByLabelText("Mensagem");
    fireEvent.change(campo, { target: { value: "Oi" } });
    POST.mockResolvedValueOnce(erro(409, { erro: "requisicao_invalida", mensagem: "x" }));
    fireEvent.click(screen.getByRole("button", { name: "Enviar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Esta conversa está somente leitura: não é possível enviar novas mensagens.",
    );
    expect(campo).toHaveValue("Oi");
  });

  it("429: limite de 30 por minuto", async () => {
    api({ conversas: [conv()], mensagens: [] });
    montar("atleta", "c1");
    const campo = await screen.findByLabelText("Mensagem");
    fireEvent.change(campo, { target: { value: "Oi" } });
    POST.mockResolvedValueOnce(erro(429, { erro: "limite_excedido", mensagem: "Muitas." }));
    fireEvent.click(screen.getByRole("button", { name: "Enviar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/limite de 30 por minuto/);
    expect(campo).toHaveValue("Oi");
  });

  it("400 em texto aparece ligado ao campo", async () => {
    api({ conversas: [conv()], mensagens: [] });
    montar("atleta", "c1");
    const campo = await screen.findByLabelText("Mensagem");
    fireEvent.change(campo, { target: { value: "Oi" } });
    POST.mockResolvedValueOnce(
      erro(400, {
        erro: "requisicao_invalida",
        mensagem: "Dados inválidos.",
        campos: [{ campo: "texto", mensagem: "Escreva a mensagem." }],
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Enviar" }));
    expect(await screen.findByText("Escreva a mensagem.")).toBeInTheDocument();
    expect(campo).toHaveAttribute("aria-invalid", "true");
  });
});

describe("polling", () => {
  it("consulta a cada 15 s com depoisDe e marca como lida a mensagem nova", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    api({ conversas: [conv()], mensagens: [msg("1", "Oi")] });
    montar("atleta", "c1");
    await screen.findByText("Oi");
    await waitFor(() => expect(PUT).toHaveBeenCalledTimes(1));
    expect(chamadasMensagens()).toHaveLength(1);

    GET.mockImplementation(
      async (url: string, o?: { params?: { query?: Record<string, string> } }) => {
        if (url === "/conversas/{id}/mensagens") {
          return {
            data: { itens: [msg("2", "Nova!")], proximoAntesDe: null },
            error: undefined,
            response: { status: 200 },
          };
        }
        void o;
        return { data: { itens: [conv()] }, error: undefined, response: { status: 200 } };
      },
    );
    await act(async () => {
      vi.advanceTimersByTime(15_000);
    });
    await screen.findByText("Nova!");
    const ultima = chamadasMensagens().at(-1)!;
    expect(ultima[1].params.query.depoisDe).toBe("2026-11-24T15:31:00Z");
    await waitFor(() => expect(PUT).toHaveBeenCalledTimes(2));
  });

  it("pára com a aba oculta e retoma, consultando na hora, ao voltar", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    api({ conversas: [conv()], mensagens: [msg("1", "Oi")] });
    montar("atleta", "c1");
    await screen.findByText("Oi");
    const antes = chamadasMensagens().length;

    const visibilidade = vi.spyOn(document, "visibilityState", "get");
    visibilidade.mockReturnValue("hidden");
    document.dispatchEvent(new Event("visibilitychange"));
    await act(async () => {
      vi.advanceTimersByTime(60_000);
    });
    expect(chamadasMensagens()).toHaveLength(antes);

    visibilidade.mockReturnValue("visible");
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await waitFor(() => expect(chamadasMensagens().length).toBe(antes + 1));
    visibilidade.mockRestore();
  });
});

describe("supervisão", () => {
  const sup = () => conv({ id: "s1", somenteLeitura: true });

  it("exige o motivo (5 a 500) e explica o registro e as 24 horas", async () => {
    api({ supervisao: [sup()] });
    const { aoSelecionar } = montar("gestor");
    fireEvent.click(await screen.findByRole("tab", { name: "Supervisão" }));
    const painel = await screen.findByRole("tabpanel", { name: "Supervisão" });
    fireEvent.click(await within(painel).findByRole("button", { name: "Abrir para supervisão" }));
    const d = screen.getByRole("dialog", { name: "Abrir para supervisão" });
    expect(d).toHaveTextContent(/registrado na auditoria/);
    expect(d).toHaveTextContent(/24 horas/);
    fireEvent.change(within(d).getByLabelText(/Motivo/), { target: { value: "abc" } });
    fireEvent.click(within(d).getByRole("button", { name: "Abrir para supervisão" }));
    expect(
      await within(d).findByText("Informe o motivo, de 5 a 500 caracteres."),
    ).toBeInTheDocument();
    expect(POST).not.toHaveBeenCalled();

    fireEvent.change(within(d).getByLabelText(/Motivo/), {
      target: { value: "Denúncia de assédio" },
    });
    POST.mockResolvedValueOnce({
      data: { conversaId: "s1", expiraEm: "2026-11-26T15:30:00Z" },
      error: undefined,
      response: { status: 201 },
    });
    fireEvent.click(within(d).getByRole("button", { name: "Abrir para supervisão" }));
    await waitFor(() => expect(aoSelecionar).toHaveBeenCalledWith("s1"));
    expect(POST).toHaveBeenCalledWith("/conversas/{id}/acesso-supervisao", {
      params: { path: { id: "s1" } },
      body: { motivo: "Denúncia de assédio" },
    });
  });

  it("sem acesso vigente, a conversa não abre: pede o motivo", async () => {
    api({ supervisao: [sup()] });
    montar("gestor", "s1");
    expect(await screen.findByText(/Esta conversa é privada/)).toBeInTheDocument();
    expect(chamadasMensagens()).toHaveLength(0);
    expect(screen.queryByLabelText("Mensagem")).not.toBeInTheDocument();
  });

  it("com acesso vigente, só leitura: faixa com a hora, sem envio e sem marcar lidas", async () => {
    api({
      supervisao: [conv({ id: "s1", somenteLeitura: true, supervisaoAte: "2026-12-30T15:30:00Z" })],
      mensagens: [msg("1", "Conteúdo privado")],
    });
    montar("gestor", "s1");
    expect(await screen.findByText("Conteúdo privado")).toBeInTheDocument();
    // 15:30 UTC = 12:30 em Brasília.
    expect(screen.getByText(/Leitura por supervisão até 12:30/)).toBeInTheDocument();
    expect(screen.getByLabelText("Mensagem")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Enviar" })).toBeDisabled();
    expect(screen.getByText(AVISO_PRIVACIDADE)).toBeInTheDocument();
    expect(PUT).not.toHaveBeenCalled();
  });
});

describe("menu, balão e avisos", () => {
  const me = (papel: string, telas: string[]) => ({
    usuario: { papel },
    atleta: null,
    telas,
  });

  it("o item Mensagens vem da tela `mensagens` do /me; o IBVAR não tem", () => {
    const tem = (papel: string, telas: string[]) =>
      itensDeNavegacao(me(papel, telas)).find((i) => i.tela === "mensagens");
    for (const papel of ["gestor", "treinador", "atleta"]) {
      expect(tem(papel, ["ranking", "mensagens"])).toMatchObject({
        rotulo: "Mensagens",
        to: "/mensagens",
      });
    }
    expect(tem("ibvar", ["investimento", "ranking"])).toBeUndefined();
  });

  it("o balão usa a chave `conversas` das notificações", () => {
    expect(contagemDaTela("mensagens", { conversas: 4 })).toBe(4);
    expect(contagemDaTela("mensagens", { mensagens: 4 })).toBe(0);
  });

  const aviso = (extra: Partial<Aviso> = {}): Aviso =>
    ({
      id: "v1",
      tipo: "mensagem_nova",
      atleta: null,
      indicador: null,
      criadoPor: { nome: "Bia Lima", papel: "treinador" },
      mensagem: null,
      referencia: { conversaId: "c1" },
      criadoEm: "2026-11-24T15:30:00Z",
      lidoEm: null,
      ...extra,
    }) as unknown as Aviso;

  it("frase e destino do aviso mensagem_nova", () => {
    expect(fraseDoAviso(aviso())).toBe("Nova mensagem de Bia Lima");
    expect(destinoDoAviso(aviso())).toEqual({ to: "/mensagens", search: { c: "c1" } });
    expect(destinoDoAviso(aviso({ referencia: {} }))).toEqual({ to: "/mensagens" });
  });
});
