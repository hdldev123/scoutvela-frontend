import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

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
vi.mock("@/lib/auth/sessao", () => ({
  useMe: () => ({ data: { usuario: { id: "u-gestor" }, telas: ["usuarios"] } }),
}));

import { TelaUsuarios } from "@/components/scout/TelaUsuarios";

const ok = (data: unknown, status = 200) => ({ data, error: undefined, response: { status } });
const falha = (status: number, erro: string, mensagem: string) => ({
  data: undefined,
  error: { erro, mensagem },
  response: { status },
});

const usuario = (extra: Record<string, unknown> = {}) => ({
  id: "u1",
  nome: "Ana Ribeiro",
  email: "ana@cbvela.org",
  papel: "treinador",
  ativo: true,
  atleta: null,
  contaVinculada: false,
  convidadoEm: "2026-11-03T12:00:00.000Z",
  ...extra,
});

const itemRanking = {
  posicao: 1,
  atleta: {
    id: "a1",
    nome: "Bruno Lima",
    velaid: "MG-T15",
    numeroVela: "BRA 1766",
    uf: "MG",
    idade: 21,
    genero: "M",
    classe: { id: "ilca7", nome: "ILCA 7", evento: "ILCA 7" },
  },
  score: 80,
};

let usuarios: unknown[];

beforeEach(() => {
  vi.clearAllMocks();
  usuarios = [
    usuario(),
    usuario({
      id: "u-gestor",
      nome: "Gil Gestor",
      email: "gil@cbvela.org",
      papel: "gestor",
      contaVinculada: true,
    }),
    usuario({
      id: "u3",
      nome: "Inês Inativa",
      email: "ines@cbvela.org",
      ativo: false,
      contaVinculada: true,
    }),
  ];
  GET.mockImplementation(async (caminho: string) => {
    if (caminho === "/usuarios") return ok(usuarios);
    if (caminho === "/ranking") return ok({ ciclo: null, itens: [itemRanking] });
    if (caminho === "/parametros") {
      return ok({
        classes: [
          { id: "ilca7", ativa: true, nome: "ILCA 7" },
          { id: "ilca6", ativa: true, nome: "ILCA 6" },
          { id: "velha", ativa: false, nome: "Classe antiga" },
        ],
      });
    }
    if (caminho === "/treinadores") return ok([{ id: "t1", nome: "Ana Ribeiro" }]);
    return falha(404, "nao_encontrado", "?");
  });
});

function montar() {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <TelaUsuarios />
    </QueryClientProvider>,
  );
}

describe("TelaUsuarios", () => {
  it("lista as contas com papel, convite pendente e situação", async () => {
    montar();
    expect(screen.getByRole("heading", { level: 1, name: "Contas de acesso" })).toBeTruthy();
    expect(await screen.findByText("ana@cbvela.org")).toBeTruthy();
    expect(screen.getByText("Convite pendente desde 03/11/2026")).toBeTruthy();
    expect(screen.getAllByText("Gestor CBVela").length).toBeGreaterThan(0);
    expect(screen.getByText("Inativa")).toBeTruthy();
    expect(screen.getAllByText("Conta vinculada")).toHaveLength(2);
  });

  it("cria conta de atleta escolhendo o atleta do ranking", async () => {
    POST.mockResolvedValue(
      ok(
        { usuario: usuario({ nome: "Bruno Lima", email: "bruno@x.com" }), convite: "enviado" },
        201,
      ),
    );
    montar();
    await screen.findByText("ana@cbvela.org");
    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Bruno Lima" } });
    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "bruno@x.com" } });
    fireEvent.change(screen.getByLabelText("Papel"), { target: { value: "atleta" } });
    await screen.findByRole("option", { name: "Bruno Lima (MG-T15)" });
    const criar = screen.getByRole("button", { name: "Criar conta e enviar convite" });
    expect((criar as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Atleta"), { target: { value: "a1" } });
    fireEvent.click(criar);
    expect(await screen.findByText(/Convite enviado para bruno@x\.com/)).toBeTruthy();
    expect(POST).toHaveBeenCalledWith("/usuarios", {
      body: { nome: "Bruno Lima", email: "bruno@x.com", papel: "atleta", atletaId: "a1" },
    });
  });

  it("avisa quando o convite fica indisponível", async () => {
    POST.mockResolvedValue(ok({ usuario: usuario(), convite: "indisponivel" }, 201));
    montar();
    await screen.findByText("ana@cbvela.org");
    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Ana" } });
    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "ana@x.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Criar conta e enviar convite" }));
    expect(await screen.findByText(/convite está indisponível neste ambiente/)).toBeTruthy();
    expect(POST).toHaveBeenCalledWith("/usuarios", {
      body: { nome: "Ana", email: "ana@x.com", papel: "treinador" },
    });
  });

  it("reenviar convite mostra a mensagem da API no 409", async () => {
    POST.mockResolvedValue(falha(409, "requisicao_invalida", "A conta já foi vinculada."));
    montar();
    fireEvent.click(
      await screen.findByRole("button", { name: "Reenviar convite para Ana Ribeiro" }),
    );
    expect(await screen.findByText("A conta já foi vinculada.")).toBeTruthy();
    expect(POST).toHaveBeenCalledWith("/usuarios/{id}/convite", {
      params: { path: { id: "u1" } },
    });
  });

  it("desativa uma conta e não deixa o gestor desativar a si mesmo", async () => {
    PUT.mockResolvedValue(ok(usuario({ ativo: false })));
    montar();
    const proprio = await screen.findByRole("button", { name: "Desativar conta de Gil Gestor" });
    expect((proprio as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Desativar conta de Ana Ribeiro" }));
    await waitFor(() =>
      expect(PUT).toHaveBeenCalledWith("/usuarios/{id}", {
        params: { path: { id: "u1" } },
        body: { ativo: false },
      }),
    );
    expect(await screen.findByText("Conta de Ana Ribeiro desativada.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Ativar conta de Inês Inativa" })).toBeTruthy();
  });

  it("edita o atleta enviando só os campos alterados", async () => {
    PUT.mockResolvedValue(
      ok({ id: "a1", classeId: "ilca6", treinadorId: "t1", numeroVela: "BRA 99", ativo: true }),
    );
    montar();
    fireEvent.click(await screen.findByRole("button", { name: "Editar Bruno Lima" }));
    const dialogo = await screen.findByRole("dialog");
    await within(dialogo).findByRole("option", { name: "ILCA 6" });
    expect(within(dialogo).queryByRole("option", { name: "Classe antiga" })).toBeNull();
    await within(dialogo).findByRole("option", { name: "Ana Ribeiro" });
    fireEvent.change(within(dialogo).getByLabelText("Classe e função"), {
      target: { value: "ilca6" },
    });
    fireEvent.change(within(dialogo).getByLabelText("Treinador(a) responsável"), {
      target: { value: "t1" },
    });
    fireEvent.change(within(dialogo).getByLabelText("Número de vela"), {
      target: { value: "BRA 99" },
    });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Salvar" }));
    await waitFor(() =>
      expect(PUT).toHaveBeenCalledWith("/atletas/{id}", {
        params: { path: { id: "a1" } },
        body: { classeId: "ilca6", treinadorId: "t1", numeroVela: "BRA 99" },
      }),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});
