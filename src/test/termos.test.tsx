import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const GET = vi.fn();
const POST = vi.fn();
const toastFn = vi.hoisted(() => Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }));

vi.mock("@/lib/api/cliente", async (importar) => ({
  ...(await importar<typeof import("@/lib/api/cliente")>()),
  api: {
    GET: (...a: unknown[]) => GET(...a),
    POST: (...a: unknown[]) => POST(...a),
  },
}));
vi.mock("sonner", () => ({ toast: toastFn }));

import { SecaoTermos } from "@/components/scout/ParametrosTermos";
import { TelaParametros } from "@/components/scout/TelaParametros";

const ok = (data: unknown) => ({ data, error: undefined, response: { status: 200 } });

const termos = [
  {
    versao: "v3",
    titulo: "Termo v3",
    vigenteDesde: "2030-01-15T12:00:00.000Z",
    criadoEm: "2026-11-01T12:00:00.000Z",
    vigente: false,
    futura: true,
    aceites: 0,
  },
  {
    versao: "v2",
    titulo: "Termo v2",
    vigenteDesde: "2026-06-10T12:00:00.000Z",
    criadoEm: "2026-06-01T12:00:00.000Z",
    vigente: true,
    futura: false,
    aceites: 12,
  },
  {
    versao: "v1",
    titulo: "Termo v1",
    vigenteDesde: "2026-01-10T12:00:00.000Z",
    criadoEm: "2026-01-01T12:00:00.000Z",
    vigente: false,
    futura: false,
    aceites: 5,
  },
];

function montar(ui = <SecaoTermos />) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const inv = vi.spyOn(qc, "invalidateQueries");
  render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
  return inv;
}

async function preencher() {
  fireEvent.click(await screen.findByRole("button", { name: "Publicar nova versão" }));
  fireEvent.change(screen.getByLabelText("Versão"), { target: { value: "v4" } });
  fireEvent.change(screen.getByLabelText("Título"), { target: { value: "Termo v4" } });
  fireEvent.change(screen.getByLabelText("Texto"), { target: { value: "x".repeat(60) } });
  fireEvent.change(screen.getByLabelText("Vigente a partir de"), {
    target: { value: "2030-03-01T09:00" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  GET.mockResolvedValue(ok(termos));
});

describe("SecaoTermos", () => {
  it("lista as versões com a situação e os aceites", async () => {
    montar();
    const linhas = await screen.findAllByRole("row");
    expect(linhas).toHaveLength(4);
    expect(within(linhas[1]!).getByText(/^Agendada para \d{2}\/\d{2}\/2030$/)).toBeTruthy();
    expect(within(linhas[2]!).getByText("Vigente")).toBeTruthy();
    expect(within(linhas[2]!).getByText("12")).toBeTruthy();
    expect(within(linhas[3]!).getByText("Anterior")).toBeTruthy();
  });

  it("publica passando pela confirmação, com vigência em ISO com offset", async () => {
    POST.mockResolvedValue({ data: {}, response: { status: 201 } });
    const inv = montar();
    await preencher();
    fireEvent.click(screen.getByRole("button", { name: "Revisar e publicar" }));
    expect(screen.getByText(/TERMO_EXIGE_REACEITE/)).toBeTruthy();
    expect(POST).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Confirmar e publicar" }));
    await waitFor(() => expect(POST).toHaveBeenCalledTimes(1));
    const [caminho, { body }] = POST.mock.calls[0]!;
    expect(caminho).toBe("/termos");
    expect(body).toMatchObject({ versao: "v4", titulo: "Termo v4", texto: "x".repeat(60) });
    expect(body.vigenteDesde).toMatch(/^2030-03-01T09:00:00[+-]\d{2}:\d{2}$/);
    await waitFor(() => expect(toastFn.success).toHaveBeenCalled());
    const chaves = inv.mock.calls.map((c) => JSON.stringify(c[0]?.queryKey));
    expect(chaves).toEqual(
      expect.arrayContaining(['["termos"]', '["termo"]', '["atletas","pendentes"]']),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("exige texto com 50 caracteres antes de revisar", async () => {
    montar();
    await preencher();
    fireEvent.change(screen.getByLabelText("Texto"), { target: { value: "curto" } });
    expect(screen.getByRole("button", { name: "Revisar e publicar" })).toBeDisabled();
  });

  it("mostra o erro 400 da API no diálogo", async () => {
    POST.mockResolvedValue({
      error: { erro: "requisicao_invalida", mensagem: "Versão já publicada." },
      response: { status: 400 },
    });
    montar();
    await preencher();
    fireEvent.click(screen.getByRole("button", { name: "Revisar e publicar" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar e publicar" }));
    const dialogo = await screen.findByRole("dialog");
    expect(await within(dialogo).findByText("Versão já publicada.")).toBeTruthy();
    expect(toastFn.success).not.toHaveBeenCalled();
  });
});

describe("TelaParametros e o termo", () => {
  const params = {
    pilares: [],
    faixas: [],
    classes: [],
    rubricas: [],
    regras: [],
    componentesCusto: [],
  };
  const roteado = async (caminho: string) => ok(caminho === "/termos" ? termos : params);

  it("treinador não vê a seção", async () => {
    GET.mockImplementation(roteado);
    montar(<TelaParametros papel="treinador" />);
    await screen.findByRole("heading", { name: "Parâmetros" });
    await screen.findByText("Pesos dos pilares");
    expect(screen.queryByText("Termo de consentimento")).toBeNull();
    expect(GET).not.toHaveBeenCalledWith("/termos");
  });

  it("gestor vê a seção", async () => {
    GET.mockImplementation(roteado);
    montar(<TelaParametros papel="gestor" />);
    expect(await screen.findByRole("heading", { name: "Termo de consentimento" })).toBeTruthy();
  });
});
