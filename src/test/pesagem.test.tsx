import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const GET = vi.fn();
const POST = vi.fn();
const PUT = vi.fn();
const DELETE = vi.fn();
const toastFn = vi.hoisted(() => Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }));

vi.mock("@/lib/api/cliente", async (importar) => ({
  ...(await importar<typeof import("@/lib/api/cliente")>()),
  api: {
    GET: (...a: unknown[]) => GET(...a),
    POST: (...a: unknown[]) => POST(...a),
    PUT: (...a: unknown[]) => PUT(...a),
    DELETE: (...a: unknown[]) => DELETE(...a),
  },
}));
vi.mock("sonner", () => ({ toast: toastFn }));

import { PesagemAtleta } from "@/components/scout/PesagemAtleta";
import { PesagensPendentes } from "@/components/scout/PesagensPendentes";

const pesagem = (extra: Record<string, unknown> = {}) => ({
  id: "p1",
  pesoKg: 71.4,
  status: "pendente",
  enviadoEm: "2026-11-20T12:00:00.000Z",
  motivo: null,
  decididoPor: null,
  decididoEm: null,
  anexoId: "anx9",
  ...extra,
});

function montar(ui: React.ReactElement, itens: unknown[] = []) {
  GET.mockImplementation((caminho: string) =>
    Promise.resolve(
      caminho === "/evidencias/{id}/link"
        ? {
            data: { url: "https://storage.exemplo.com/foto.jpg", expiraEm: "2026-11-20T12:05:00Z" },
            response: { status: 200 },
          }
        : { data: { itens }, response: { status: 200 } },
    ),
  );
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      {ui}
    </QueryClientProvider>,
  );
}

const foto = () => new File(["x"], "visor.jpg", { type: "image/jpeg" });
const escolherFoto = () =>
  fireEvent.change(screen.getByLabelText("Foto do visor da balança"), {
    target: { files: [foto()] },
  });
const peso = (v: string) =>
  fireEvent.change(screen.getByLabelText("Peso (kg)"), { target: { value: v } });
const enviar = () => fireEvent.click(screen.getByRole("button", { name: "Enviar peso" }));
const corpoPesagem = () =>
  (POST.mock.calls.find((c) => c[0] === "/me/pesagens")?.[1] as { body: unknown } | undefined)
    ?.body;

beforeEach(() => {
  vi.clearAllMocks();
  POST.mockImplementation((caminho: string) =>
    Promise.resolve(
      caminho === "/atletas/{id}/evidencias"
        ? {
            data: { id: "anx1", nomeArquivo: "visor.jpg", indicadorId: null },
            response: { status: 201 },
          }
        : { data: pesagem(), response: { status: 201 } },
    ),
  );
  DELETE.mockResolvedValue({ response: { status: 204 } });
});

describe("Informar peso (atleta)", () => {
  it("pede só o visor da balança e avisa que a foto é apagada", async () => {
    montar(<PesagemAtleta atletaId="a07" />);
    expect(await screen.findByRole("heading", { name: "Informar peso" })).toBeTruthy();
    expect(screen.getByText(/Fotografe só o visor, sem o corpo/)).toBeTruthy();
    expect(screen.getByText(/A foto é\s+apagada depois da validação/)).toBeTruthy();
  });

  it("envia a foto com a categoria balança e depois o peso com o anexoId", async () => {
    montar(<PesagemAtleta atletaId="a07" />);
    await screen.findByRole("heading", { name: "Informar peso" });
    peso("71,4");
    escolherFoto();
    enviar();
    await waitFor(() => expect(corpoPesagem()).toEqual({ pesoKg: 71.4, anexoId: "anx1" }));
    const anexo = POST.mock.calls.find((c) => c[0] === "/atletas/{id}/evidencias")?.[1] as {
      body: { categoria: string };
    };
    expect(anexo.body.categoria).toBe("balanca");
    await waitFor(() => expect(toastFn.success).toHaveBeenCalled());
  });

  it("valida o peso (30 a 160, uma casa) e a foto antes de enviar", async () => {
    montar(<PesagemAtleta atletaId="a07" />);
    await screen.findByRole("heading", { name: "Informar peso" });
    peso("20");
    enviar();
    expect(await screen.findByText(/de 30 a 160, com no máximo uma casa decimal/)).toBeTruthy();
    expect(screen.getByText("Anexe a foto do visor da balança.")).toBeTruthy();
    expect(screen.getByLabelText("Peso (kg)").getAttribute("aria-invalid")).toBe("true");
    peso("71,45");
    enviar();
    expect(await screen.findByText(/uma casa decimal/)).toBeTruthy();
    expect(POST).not.toHaveBeenCalled();
  });

  it("mostra o 400 do anexoId no campo da foto e apaga o anexo enviado", async () => {
    POST.mockImplementation((caminho: string) =>
      Promise.resolve(
        caminho === "/atletas/{id}/evidencias"
          ? {
              data: { id: "anx1", nomeArquivo: "visor.jpg", indicadorId: null },
              response: { status: 201 },
            }
          : {
              error: {
                erro: "requisicao_invalida",
                mensagem: "Dados inválidos.",
                campos: [{ campo: "anexoId", mensagem: "Anexo de balança inválido." }],
              },
              response: { status: 400 },
            },
      ),
    );
    montar(<PesagemAtleta atletaId="a07" />);
    await screen.findByRole("heading", { name: "Informar peso" });
    peso("71");
    escolherFoto();
    enviar();
    expect(await screen.findByText("Anexo de balança inválido.")).toBeTruthy();
    await waitFor(() =>
      expect(DELETE).toHaveBeenCalledWith("/evidencias/{id}", { params: { path: { id: "anx1" } } }),
    );
  });

  it("409 com pesagem pendente: explica e não deixa enviar outra", async () => {
    POST.mockImplementation((caminho: string) =>
      Promise.resolve(
        caminho === "/atletas/{id}/evidencias"
          ? {
              data: { id: "anx1", nomeArquivo: "visor.jpg", indicadorId: null },
              response: { status: 201 },
            }
          : {
              error: { erro: "conflito", mensagem: "Pesagem pendente." },
              response: { status: 409 },
            },
      ),
    );
    montar(<PesagemAtleta atletaId="a07" />);
    await screen.findByRole("heading", { name: "Informar peso" });
    peso("71");
    escolherFoto();
    enviar();
    expect((await screen.findByRole("alert")).textContent).toContain("já tem um peso aguardando");
  });

  it("com pesagem pendente, esconde o formulário e lista o histórico com status e motivo", async () => {
    montar(<PesagemAtleta atletaId="a07" />, [
      pesagem(),
      pesagem({
        id: "p0",
        pesoKg: 80,
        status: "recusada",
        motivo: "Número ilegível na foto",
        anexoId: null,
        decididoPor: { id: "u1", nome: "Ana Ribeiro" },
        decididoEm: "2026-11-15T12:00:00.000Z",
      }),
      pesagem({ id: "p00", pesoKg: 70, status: "validada", anexoId: null }),
    ]);
    expect(await screen.findByText(/aguardando validação/i, { selector: "div" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Enviar peso" })).toBeNull();
    expect(screen.getByText("Aguardando validação", { selector: ".pill" })).toBeTruthy();
    expect(screen.getByText("Recusada")).toBeTruthy();
    expect(screen.getByText("Validada")).toBeTruthy();
    expect(screen.getByText("Motivo da recusa: Número ilegível na foto")).toBeTruthy();
  });
});

describe("Pesagem para validar (treinador e gestor)", () => {
  it("não ocupa lugar sem pesagem pendente", async () => {
    montar(<PesagensPendentes atletaId="a07" />, [pesagem({ status: "validada", anexoId: null })]);
    await waitFor(() => expect(GET).toHaveBeenCalled());
    expect(screen.queryByRole("heading", { name: "Pesagem para validar" })).toBeNull();
  });

  it("Validar envia a decisão sem motivo", async () => {
    PUT.mockResolvedValue({ data: pesagem({ status: "validada" }), response: { status: 200 } });
    montar(<PesagensPendentes atletaId="a07" />, [pesagem()]);
    fireEvent.click(await screen.findByRole("button", { name: "Validar pesagem de 71,4 kg" }));
    await waitFor(() =>
      expect(PUT).toHaveBeenCalledWith("/pesagens/{id}/validacao", {
        params: { path: { id: "p1" } },
        body: { decisao: "validar" },
      }),
    );
    await waitFor(() => expect(toastFn.success).toHaveBeenCalled());
  });

  it("Recusar exige o motivo e o envia", async () => {
    PUT.mockResolvedValue({ data: pesagem({ status: "recusada" }), response: { status: 200 } });
    montar(<PesagensPendentes atletaId="a07" />, [pesagem()]);
    fireEvent.click(await screen.findByRole("button", { name: "Recusar pesagem de 71,4 kg" }));
    const dialogo = await screen.findByRole("dialog");
    expect(dialogo).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Recusar peso" }));
    expect(await screen.findByText("Explique o motivo da recusa para o atleta.")).toBeTruthy();
    expect(PUT).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Motivo (obrigatório)"), {
      target: { value: "Número ilegível" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Recusar peso" }));
    await waitFor(() =>
      expect(PUT).toHaveBeenCalledWith("/pesagens/{id}/validacao", {
        params: { path: { id: "p1" } },
        body: { decisao: "recusar", motivo: "Número ilegível" },
      }),
    );
  });

  it("mostra o 400 do motivo vindo da API dentro do diálogo", async () => {
    PUT.mockResolvedValue({
      error: {
        erro: "requisicao_invalida",
        mensagem: "Dados inválidos.",
        campos: [{ campo: "motivo", mensagem: "Motivo longo demais." }],
      },
      response: { status: 400 },
    });
    montar(<PesagensPendentes atletaId="a07" />, [pesagem()]);
    fireEvent.click(await screen.findByRole("button", { name: "Recusar pesagem de 71,4 kg" }));
    fireEvent.change(await screen.findByLabelText("Motivo (obrigatório)"), {
      target: { value: "x" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Recusar peso" }));
    expect(await screen.findByText("Motivo longo demais.")).toBeTruthy();
  });

  it("Ver foto busca o link do anexo pendente", async () => {
    const aberto = { opener: null as unknown, location: { href: "" }, close: vi.fn() };
    const abrir = vi.spyOn(window, "open").mockReturnValue(aberto as unknown as Window);
    montar(<PesagensPendentes atletaId="a07" />, [pesagem()]);
    fireEvent.click(await screen.findByRole("button", { name: "Ver foto da pesagem de 71,4 kg" }));
    await waitFor(() =>
      expect(GET).toHaveBeenCalledWith("/evidencias/{id}/link", {
        params: { path: { id: "anx9" } },
      }),
    );
    await waitFor(() => expect(aberto.location.href).toBe("https://storage.exemplo.com/foto.jpg"));
    abrir.mockRestore();
  });
});
