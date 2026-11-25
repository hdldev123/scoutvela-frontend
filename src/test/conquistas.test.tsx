import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const GET = vi.fn();
const POST = vi.fn();
const DELETE = vi.fn();
const toastFn = vi.hoisted(() => Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }));

vi.mock("@/lib/api/cliente", async (importar) => ({
  ...(await importar<typeof import("@/lib/api/cliente")>()),
  api: {
    GET: (...a: unknown[]) => GET(...a),
    POST: (...a: unknown[]) => POST(...a),
    DELETE: (...a: unknown[]) => DELETE(...a),
  },
}));
vi.mock("sonner", () => ({ toast: toastFn }));

import { MinhasConquistas } from "@/components/scout/MinhasConquistas";

const manual = (extra: Record<string, unknown> = {}) => ({
  id: "q1",
  titulo: "Campeã da Semana de Vela",
  ano: 2024,
  status: "pendente",
  motivo: null,
  anexoId: "anx1",
  criadoEm: "2026-11-20T12:00:00.000Z",
  decididoPor: null,
  decididoEm: null,
  ...extra,
});

let manuais: unknown[] = [];

function montar() {
  GET.mockImplementation(() =>
    Promise.resolve({ data: { automaticas: [], manuais }, response: { status: 200 } }),
  );
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MinhasConquistas atletaId="a07" />
    </QueryClientProvider>,
  );
}

const comprovante = (nome = "comprovante.pdf") =>
  new File(["x"], nome, { type: "application/pdf" });
const chamadasPost = () => POST.mock.calls.map((c) => c[0] as string);

function preencher(v: { titulo?: string; ano?: string; arquivo?: File }) {
  if (v.titulo !== undefined) {
    fireEvent.change(screen.getByLabelText("Título da conquista"), { target: { value: v.titulo } });
  }
  if (v.ano !== undefined) {
    fireEvent.change(screen.getByLabelText("Ano"), { target: { value: v.ano } });
  }
  if (v.arquivo) {
    fireEvent.change(screen.getByLabelText("Comprovante da conquista"), {
      target: { files: [v.arquivo] },
    });
  }
}
const registrar = () =>
  fireEvent.click(screen.getByRole("button", { name: "Registrar conquista" }));

beforeEach(() => {
  vi.clearAllMocks();
  manuais = [];
  POST.mockImplementation((caminho: string) =>
    Promise.resolve(
      caminho === "/atletas/{id}/evidencias"
        ? {
            data: { id: "anx1", nomeArquivo: "comprovante.pdf", indicadorId: null },
            response: { status: 201 },
          }
        : { data: manual(), response: { status: 201 } },
    ),
  );
  DELETE.mockResolvedValue({ response: { status: 204 } });
});

describe("Minhas conquistas (atleta, D14)", () => {
  it("sobe o comprovante antes (categoria evidencia) e envia título, ano e anexoId", async () => {
    montar();
    await screen.findByRole("heading", { name: "Minhas conquistas" });
    preencher({ titulo: "  Campeã da Semana de Vela  ", ano: "2024", arquivo: comprovante() });
    registrar();
    await waitFor(() => expect(chamadasPost()).toHaveLength(2));
    expect(chamadasPost()).toEqual(["/atletas/{id}/evidencias", "/me/conquistas"]);
    const anexo = POST.mock.calls[0]?.[1] as { body: { categoria: string; tipoMime: string } };
    expect(anexo.body.categoria).toBe("evidencia");
    expect(anexo.body.tipoMime).toBe("application/pdf");
    expect(POST.mock.calls[1]?.[1]).toEqual({
      body: { titulo: "Campeã da Semana de Vela", ano: 2024, anexoId: "anx1" },
    });
    await waitFor(() => expect(toastFn.success).toHaveBeenCalled());
    await waitFor(() =>
      expect((screen.getByLabelText("Título da conquista") as HTMLInputElement).value).toBe(""),
    );
    expect(DELETE).not.toHaveBeenCalled();
  });

  it("valida no cliente: título curto, ano fora da faixa e comprovante ausente", async () => {
    montar();
    await screen.findByRole("heading", { name: "Minhas conquistas" });
    preencher({ titulo: "a", ano: "1900" });
    registrar();
    expect(await screen.findByText("O título precisa ter de 2 a 120 caracteres.")).toBeTruthy();
    expect(screen.getByText(/^Informe o ano, de 1950 a \d{4}\.$/)).toBeTruthy();
    expect(screen.getByText("Anexe o comprovante da conquista.")).toBeTruthy();
    expect(screen.getByLabelText("Ano")).toHaveAttribute("aria-invalid", "true");
    expect(POST).not.toHaveBeenCalled();
  });

  it("recusa no cliente um formato não aceito", async () => {
    montar();
    await screen.findByRole("heading", { name: "Minhas conquistas" });
    preencher({ arquivo: new File(["x"], "foto.gif", { type: "image/gif" }) });
    expect(await screen.findByText("Formato não aceito. Envie PDF, JPG ou PNG.")).toBeTruthy();
  });

  it("erro 400 em anexoId aparece sob o comprovante e o anexo recém-enviado é apagado", async () => {
    POST.mockImplementation((caminho: string) =>
      Promise.resolve(
        caminho === "/atletas/{id}/evidencias"
          ? { data: { id: "anx1", nomeArquivo: "comprovante.pdf" }, response: { status: 201 } }
          : {
              error: {
                erro: "requisicao_invalida",
                mensagem: "Dados inválidos.",
                campos: [{ campo: "anexoId", mensagem: "O comprovante já foi usado." }],
              },
              response: { status: 400 },
            },
      ),
    );
    montar();
    await screen.findByRole("heading", { name: "Minhas conquistas" });
    preencher({ titulo: "Campeã", ano: "2024", arquivo: comprovante() });
    registrar();
    expect(await screen.findByText("O comprovante já foi usado.")).toBeTruthy();
    await waitFor(() =>
      expect(DELETE).toHaveBeenCalledWith("/evidencias/{id}", { params: { path: { id: "anx1" } } }),
    );
    // O formulário continua preenchido para corrigir.
    expect((screen.getByLabelText("Título da conquista") as HTMLInputElement).value).toBe("Campeã");
  });

  it("lista as conquistas com status, motivo da recusa e quem decidiu", async () => {
    manuais = [
      manual(),
      manual({
        id: "q2",
        titulo: "Vice no Estadual",
        status: "recusada",
        motivo: "Comprovante ilegível.",
        decididoPor: { id: "u1", nome: "Ana Ribeiro" },
        decididoEm: "2026-11-22T12:00:00.000Z",
      }),
      manual({ id: "q3", titulo: "Troféu Regional", status: "validada" }),
    ];
    montar();
    const lista = (await screen.findByRole("heading", { name: "Conquistas registradas" }))
      .nextElementSibling as HTMLElement;
    const itens = within(lista).getAllByRole("listitem");
    expect(itens).toHaveLength(3);
    expect(within(itens[0]!).getByText("Aguardando validação")).toBeTruthy();
    expect(within(itens[1]!).getByText("Recusada")).toBeTruthy();
    expect(within(itens[1]!).getByText("Motivo da recusa: Comprovante ilegível.")).toBeTruthy();
    expect(within(itens[1]!).getByText(/por Ana Ribeiro em/)).toBeTruthy();
    expect(within(itens[2]!).getByText("Validada")).toBeTruthy();
  });

  it("sem conquistas mostra o texto de lista vazia", async () => {
    montar();
    expect(await screen.findByText("Você ainda não registrou conquistas.")).toBeTruthy();
  });
});
