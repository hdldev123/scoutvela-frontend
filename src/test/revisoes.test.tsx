import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const GET = vi.fn();
const PUT = vi.fn();
const POST = vi.fn();
const toastFn = vi.hoisted(() => Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }));

vi.mock("@/lib/api/cliente", async (importar) => ({
  ...(await importar<typeof import("@/lib/api/cliente")>()),
  api: {
    GET: (...args: unknown[]) => GET(...args),
    PUT: (...args: unknown[]) => PUT(...args),
    POST: (...args: unknown[]) => POST(...args),
  },
}));
vi.mock("sonner", () => ({ toast: toastFn }));
vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    params,
  }: {
    children: ReactNode;
    to: string;
    params?: { id: string };
  }) => <a href={params ? to.replace("$id", params.id) : to}>{children}</a>,
}));

import { TelaRevisoes } from "@/components/scout/TelaRevisoes";

const ok = (data: unknown) => ({ data, error: undefined, response: { status: 200 } });

const revisao = {
  id: "r1",
  atleta: { id: "a1", nome: "Helena Prado" },
  pilar: { id: "p1", nomeCurto: "Técnica" },
  indicador: null,
  motivo: "A nota de largada parece baixa.",
  status: "aberto",
  criadoEm: "2026-11-05T12:00:00.000Z",
  resposta: null,
  respondidoEm: null,
};
const pedido = {
  id: "t1",
  atleta: { id: "a2", nome: "Bruno Lima" },
  tipo: "exclusao",
  descricao: "Quero excluir meus dados.",
  status: "aberto",
  criadoEm: "2026-11-04T12:00:00.000Z",
  resposta: null,
  respondidoEm: null,
  anonimizacao: null,
};

const lancamento = {
  id: "av9",
  indicadorId: "i1",
  indicadorNome: "Largada",
  valor: 4,
  lancadoEm: "2026-11-08T12:00:00.000Z",
  origem: "treinador",
  avaliador: { id: "u1", nome: "Ana Ribeiro" },
};
let lancamentos: unknown[];

beforeEach(() => {
  vi.clearAllMocks();
  lancamentos = [lancamento];
  GET.mockImplementation(async (caminho: string) => {
    if (caminho === "/revisoes/{id}/lancamentos") return ok({ lancamentos });
    return ok(caminho === "/revisoes" ? [revisao] : [pedido]);
  });
});

function montar(papel: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const inv = vi.spyOn(qc, "invalidateQueries");
  render(
    <QueryClientProvider client={qc}>
      <TelaRevisoes papel={papel} />
    </QueryClientProvider>,
  );
  return inv;
}

describe("TelaRevisoes", () => {
  it("gestor filtra e responde uma revisão", async () => {
    PUT.mockResolvedValue(ok({ ...revisao, status: "respondido", resposta: "Revisada." }));
    const inv = montar("gestor");
    expect(
      await screen.findByRole("heading", { level: 1, name: "Pedidos de revisão" }),
    ).toBeTruthy();
    const link = await screen.findByRole("link", { name: "Helena Prado" });
    expect(link.getAttribute("href")).toBe("/atletas/a1");
    expect(GET).toHaveBeenCalledWith("/revisoes", { params: { query: { status: "aberto" } } });

    fireEvent.change(screen.getByLabelText(/Status/), { target: { value: "todos" } });
    await waitFor(() =>
      expect(GET).toHaveBeenLastCalledWith("/revisoes", { params: { query: {} } }),
    );

    fireEvent.click(await screen.findByRole("button", { name: "Responder" }));
    const dialogo = await screen.findByRole("dialog");
    fireEvent.change(within(dialogo).getByLabelText("Resposta"), {
      target: { value: "Revisada." },
    });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Enviar resposta" }));
    await waitFor(() =>
      expect(PUT).toHaveBeenCalledWith("/revisoes/{id}", {
        params: { path: { id: "r1" } },
        body: { resposta: "Revisada." },
      }),
    );
    await waitFor(() => expect(inv).toHaveBeenCalledWith({ queryKey: ["revisoes"] }));
  });

  it("o diálogo lista os lançamentos e envia o avaliacaoId escolhido", async () => {
    PUT.mockResolvedValue(ok({ ...revisao, status: "respondido", resposta: "Corrigida." }));
    montar("gestor");
    fireEvent.click(await screen.findByRole("button", { name: "Responder" }));
    const dialogo = await screen.findByRole("dialog");
    const select = await within(dialogo).findByLabelText(/Lançamento que corrigiu a nota/);
    expect(GET).toHaveBeenCalledWith("/revisoes/{id}/lancamentos", {
      params: { path: { id: "r1" } },
    });
    const opcoes = within(select)
      .getAllByRole("option")
      .map((o) => o.textContent);
    expect(opcoes[0]).toBe("Nenhum (resposta sem nova nota)");
    expect(opcoes[1]).toBe("Largada · nota 4 · 08/11/2026 · Ana Ribeiro");
    fireEvent.change(select, { target: { value: "av9" } });
    fireEvent.change(within(dialogo).getByLabelText("Resposta"), {
      target: { value: "Corrigida." },
    });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Enviar resposta" }));
    await waitFor(() =>
      expect(PUT).toHaveBeenCalledWith("/revisoes/{id}", {
        params: { path: { id: "r1" } },
        body: { resposta: "Corrigida.", avaliacaoId: "av9" },
      }),
    );
  });

  it("com lista vazia mostra a dica e não envia avaliacaoId", async () => {
    lancamentos = [];
    PUT.mockResolvedValue(ok({ ...revisao, status: "respondido", resposta: "Mantida." }));
    montar("gestor");
    fireEvent.click(await screen.findByRole("button", { name: "Responder" }));
    const dialogo = await screen.findByRole("dialog");
    expect(await within(dialogo).findByText(/Nenhum lançamento posterior ao pedido/)).toBeTruthy();
    fireEvent.change(within(dialogo).getByLabelText("Resposta"), { target: { value: "Mantida." } });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Enviar resposta" }));
    await waitFor(() =>
      expect(PUT).toHaveBeenCalledWith("/revisoes/{id}", {
        params: { path: { id: "r1" } },
        body: { resposta: "Mantida." },
      }),
    );
  });

  it("mostra a nota anterior e a nova na lista", async () => {
    GET.mockImplementation(async (caminho: string) =>
      ok(
        caminho === "/revisoes"
          ? [
              {
                ...revisao,
                status: "respondido",
                avaliacaoId: "av9",
                notaAnterior: 2,
                notaNova: 4,
              },
              { ...revisao, id: "r2", avaliacaoId: "av8", notaAnterior: null, notaNova: 3 },
            ]
          : [],
      ),
    );
    montar("treinador");
    expect(await screen.findByText("2 → 4")).toBeTruthy();
    expect(screen.getByText("Nota nova: 3")).toBeTruthy();
  });

  it("treinador só lê e não vê a aba LGPD", async () => {
    montar("treinador");
    await screen.findByRole("link", { name: "Helena Prado" });
    expect(screen.queryByRole("button", { name: "Responder" })).toBeNull();
    expect(screen.queryByRole("tab")).toBeNull();
    expect(screen.getByText(/Quem responde é o gestor/)).toBeTruthy();
    expect(GET).not.toHaveBeenCalledWith("/pedidos-titular");
  });

  it("gestor tem duas abas, a de notas começa ativa e o teclado troca de aba", async () => {
    montar("gestor");
    await screen.findByRole("link", { name: "Helena Prado" });
    const abas = screen.getAllByRole("tab");
    expect(abas.map((t) => t.textContent)).toEqual([
      "Revisões de nota",
      "Pedidos do titular (LGPD)",
    ]);
    expect(abas[0]).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(abas[0]!, { key: "ArrowRight" });
    expect(await screen.findByRole("heading", { name: "Pedidos do titular (LGPD)" })).toBeTruthy();
    expect(screen.getAllByRole("tab")[1]).toHaveAttribute("aria-selected", "true");
  });

  it("lista vazia de revisões mostra o estado vazio", async () => {
    GET.mockImplementation(async () => ok([]));
    montar("gestor");
    expect(await screen.findByText("Nenhum pedido de revisão neste filtro.")).toBeTruthy();
  });

  it("gestor responde pedido do titular que não é exclusão", async () => {
    GET.mockImplementation(async (caminho: string) =>
      ok(
        caminho === "/pedidos-titular"
          ? [{ ...pedido, tipo: "acesso", descricao: "Quero meus dados." }]
          : [],
      ),
    );
    PUT.mockResolvedValue(ok({ ...pedido, status: "respondido", resposta: "Feito." }));
    const inv = montar("gestor");
    fireEvent.click(await screen.findByRole("tab", { name: "Pedidos do titular (LGPD)" }));
    expect(await screen.findByText("Acesso")).toBeTruthy();
    expect(screen.getByRole("note").textContent).toContain("procedimento manual");
    fireEvent.click(screen.getByRole("button", { name: "Responder" }));
    const dialogo = await screen.findByRole("dialog");
    const campo = within(dialogo).getByLabelText("Resposta");
    fireEvent.change(campo, { target: { value: "ok" } });
    expect(within(dialogo).getByText(/pelo menos 3 caracteres/)).toBeTruthy();
    expect(campo.getAttribute("aria-invalid")).toBe("true");
    expect(within(dialogo).getByRole("button", { name: "Enviar resposta" })).toBeDisabled();
    fireEvent.change(campo, { target: { value: "Feito." } });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Enviar resposta" }));
    await waitFor(() =>
      expect(PUT).toHaveBeenCalledWith("/pedidos-titular/{id}", {
        params: { path: { id: "t1" } },
        body: { resposta: "Feito." },
      }),
    );
    await waitFor(() => expect(inv).toHaveBeenCalledWith({ queryKey: ["pedidos-titular"] }));
  });

  it("pedido de exclusão: 'Recusar pedido' exige 20 caracteres e envia recusar: true", async () => {
    PUT.mockResolvedValue(ok({ ...pedido, status: "respondido", resposta: "x".repeat(25) }));
    montar("gestor");
    fireEvent.click(await screen.findByRole("tab", { name: "Pedidos do titular (LGPD)" }));
    expect(screen.queryByRole("button", { name: "Responder" })).toBeNull();
    fireEvent.click(await screen.findByRole("button", { name: "Recusar pedido" }));
    const dialogo = await screen.findByRole("dialog", { name: "Recusar pedido de exclusão" });
    expect(within(dialogo).getByText(/A exclusão se faz por “Anonimizar atleta”/)).toBeTruthy();
    const campo = within(dialogo).getByLabelText("Justificativa da recusa");
    const enviar = within(dialogo).getByRole("button", { name: "Recusar pedido" });
    fireEvent.change(campo, { target: { value: "Curto demais" } });
    expect(within(dialogo).getByText(/pelo menos 20 caracteres/)).toBeTruthy();
    expect(enviar).toBeDisabled();
    const justificativa = "Há obrigação legal de guardar o registro.";
    fireEvent.change(campo, { target: { value: justificativa } });
    fireEvent.click(enviar);
    await waitFor(() =>
      expect(PUT).toHaveBeenCalledWith("/pedidos-titular/{id}", {
        params: { path: { id: "t1" } },
        body: { resposta: justificativa, recusar: true },
      }),
    );
  });

  describe("anonimização", () => {
    const abrirTitular = async () => {
      const inv = montar("gestor");
      fireEvent.click(await screen.findByRole("tab", { name: "Pedidos do titular (LGPD)" }));
      return inv;
    };

    it("só aparece em pedido de exclusão", async () => {
      GET.mockImplementation(async (caminho: string) =>
        ok(
          caminho === "/pedidos-titular"
            ? [pedido, { ...pedido, id: "t2", tipo: "acesso", descricao: "Quero meus dados." }]
            : [],
        ),
      );
      await abrirTitular();
      expect(await screen.findAllByRole("button", { name: "Responder" })).toHaveLength(1);
      expect(screen.getAllByRole("button", { name: "Recusar pedido" })).toHaveLength(1);
      expect(screen.getAllByRole("button", { name: /^Anonimizar atleta/ })).toHaveLength(1);
    });

    it("habilita o botão só com ANONIMIZAR exato, envia o corpo e mostra pendências", async () => {
      POST.mockResolvedValue(
        ok({
          atletaId: "a2",
          anonimizadoEm: "2026-11-12T12:00:00.000Z",
          evidenciasRemovidas: 3,
          pendencias: { arquivos: 2, conta: true },
        }),
      );
      const inv = await abrirTitular();
      fireEvent.click(await screen.findByRole("button", { name: /^Anonimizar atleta/ }));
      const dialogo = await screen.findByRole("dialog");
      expect(within(dialogo).getByText("Esta ação não pode ser desfeita.")).toBeTruthy();
      const botao = within(dialogo).getByRole("button", { name: "Anonimizar" });
      const campo = within(dialogo).getByLabelText("Digite ANONIMIZAR para confirmar");
      expect(botao).toBeDisabled();
      fireEvent.change(campo, { target: { value: "anonimizar" } });
      expect(botao).toBeDisabled();
      fireEvent.change(campo, { target: { value: "ANONIMIZAR" } });
      expect(botao).toBeEnabled();
      fireEvent.click(botao);
      await waitFor(() =>
        expect(POST).toHaveBeenCalledWith("/atletas/{id}/anonimizar", {
          params: { path: { id: "a2" } },
          body: { pedidoTitularId: "t1", confirmacao: "ANONIMIZAR" },
        }),
      );
      expect(await within(dialogo).findByText(/Evidências removidas: 3/)).toBeTruthy();
      expect(within(dialogo).getByText(/2 arquivo\(s\)/)).toBeTruthy();
      expect(within(dialogo).getByText(/conta de login ainda não foi apagada/)).toBeTruthy();
      const chaves = inv.mock.calls.map((c) => JSON.stringify(c[0]?.queryKey));
      expect(chaves).toEqual(
        expect.arrayContaining([
          '["pedidos-titular"]',
          '["atletas-gestao"]',
          '["usuarios"]',
          '["revisoes"]',
          '["atleta"]',
          '["ranking"]',
        ]),
      );
    });

    it("trava o diálogo enquanto anonimiza e mostra o resultado ao terminar", async () => {
      let terminar: (v: unknown) => void = () => {};
      POST.mockImplementation(() => new Promise((res) => (terminar = res)));
      await abrirTitular();
      fireEvent.click(await screen.findByRole("button", { name: /^Anonimizar atleta/ }));
      const dialogo = await screen.findByRole("dialog");
      fireEvent.change(within(dialogo).getByLabelText("Digite ANONIMIZAR para confirmar"), {
        target: { value: "ANONIMIZAR" },
      });
      fireEvent.click(within(dialogo).getByRole("button", { name: "Anonimizar" }));
      const andamento = await within(dialogo).findByRole("button", { name: "Anonimizando…" });
      expect(andamento).toBeDisabled();
      expect(within(dialogo).getByRole("button", { name: "Cancelar" })).toBeDisabled();
      fireEvent.keyDown(window, { key: "Escape" });
      const fundo = document.querySelector(".dialogo-overlay")!;
      fireEvent.mouseDown(fundo);
      fireEvent.click(fundo);
      expect(screen.getByRole("dialog")).toBeTruthy();
      terminar(
        ok({
          atletaId: "a2",
          anonimizadoEm: "2026-11-12T12:00:00.000Z",
          evidenciasRemovidas: 1,
          pendencias: { arquivos: 0, conta: false },
        }),
      );
      expect(await within(dialogo).findByText(/Evidências removidas: 1/)).toBeTruthy();
      expect(within(dialogo).getByText("Sem pendências.")).toBeTruthy();
    });

    it("oferece concluir pendências num pedido já anonimizado", async () => {
      GET.mockImplementation(async (caminho: string) =>
        ok(
          caminho === "/pedidos-titular"
            ? [
                {
                  ...pedido,
                  status: "respondido",
                  resposta: "Dados pessoais anonimizados em 12/11/2026.",
                  anonimizacao: {
                    em: "2026-11-12T12:00:00.000Z",
                    pendencias: { arquivos: 2, conta: false },
                  },
                },
              ]
            : [],
        ),
      );
      await abrirTitular();
      expect(
        await screen.findByRole("button", { name: /^Concluir pendências da anonimização/ }),
      ).toBeTruthy();
      expect(screen.queryByRole("button", { name: /^Anonimizar atleta/ })).toBeNull();
    });

    it("sem pendências na anonimização, não oferece concluir nada (mesmo com outra resposta)", async () => {
      GET.mockImplementation(async (caminho: string) =>
        ok(
          caminho === "/pedidos-titular"
            ? [
                {
                  ...pedido,
                  status: "respondido",
                  resposta: "Atendido.",
                  anonimizacao: {
                    em: "2026-11-12T12:00:00.000Z",
                    pendencias: { arquivos: 0, conta: false },
                  },
                },
              ]
            : [],
        ),
      );
      await abrirTitular();
      await screen.findByText("Exclusão");
      expect(screen.queryByRole("button", { name: /Concluir pendências/ })).toBeNull();
      expect(screen.queryByRole("button", { name: /^Anonimizar atleta/ })).toBeNull();
    });

    it("pendência só da conta também oferece concluir", async () => {
      GET.mockImplementation(async (caminho: string) =>
        ok(
          caminho === "/pedidos-titular"
            ? [
                {
                  ...pedido,
                  status: "respondido",
                  resposta: "Atendido.",
                  anonimizacao: {
                    em: "2026-11-12T12:00:00.000Z",
                    pendencias: { arquivos: 0, conta: true },
                  },
                },
              ]
            : [],
        ),
      );
      await abrirTitular();
      expect(
        await screen.findByRole("button", { name: /^Concluir pendências da anonimização/ }),
      ).toBeTruthy();
    });

    it("exibe o erro da API no diálogo", async () => {
      POST.mockResolvedValue({
        error: { erro: "requisicao_invalida", mensagem: "Pedido já respondido." },
        response: { status: 409 },
      });
      await abrirTitular();
      fireEvent.click(await screen.findByRole("button", { name: /^Anonimizar atleta/ }));
      const dialogo = await screen.findByRole("dialog");
      fireEvent.change(within(dialogo).getByLabelText("Digite ANONIMIZAR para confirmar"), {
        target: { value: "ANONIMIZAR" },
      });
      fireEvent.click(within(dialogo).getByRole("button", { name: "Anonimizar" }));
      expect(await within(dialogo).findByText("Pedido já respondido.")).toBeTruthy();
    });
  });
});
