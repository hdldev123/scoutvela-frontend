import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const GET = vi.fn();
const POST = vi.fn();
const PUT = vi.fn();
const navegar = vi.fn();
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
  useNavigate: () => navegar,
  useRouter: () => undefined,
  Link: ({
    children,
    to,
    search,
    hash: _hash,
    ...resto
  }: { children: ReactNode; to: string; search?: unknown; hash?: string } & Record<
    string,
    unknown
  >) => (
    <a href={to} data-search={JSON.stringify(search ?? null)} {...resto}>
      {children}
    </a>
  ),
}));

import { TelaParametros } from "@/components/scout/TelaParametros";
import { TelaSugestoes } from "@/components/scout/TelaSugestoes";
import { contagemDaTela } from "@/lib/auth/navegacao";
import type { Parametros } from "@/lib/api/parametros";
import type { Sugestao } from "@/lib/api/sugestoes";

const CLASSES = [
  {
    id: "ilca7",
    nome: "ILCA 7",
    evento: "ILCA 7",
    posicao: "ind",
    pesoMinKg: 82.8,
    pesoMedioKg: 85,
    pesoMaxKg: 87.2,
    alturaMinCm: null,
    alturaMediaCm: null,
    alturaMaxCm: null,
    ativa: true,
  },
  {
    id: "c470",
    nome: "470",
    evento: "470",
    posicao: "helm",
    pesoMinKg: 70,
    pesoMedioKg: 75,
    pesoMaxKg: 80,
    alturaMinCm: null,
    alturaMediaCm: null,
    alturaMaxCm: null,
    ativa: true,
  },
];
const PARAMETROS = {
  pilares: [],
  faixas: [],
  classes: CLASSES,
  rubricas: [],
  regras: [],
  componentesCusto: [],
} as unknown as Parametros;

function sug(extra: Partial<Sugestao> = {}): Sugestao {
  return {
    id: "1",
    tipo: "class_fit",
    status: "aberta",
    texto: "Os atletas da classe estão mais leves.",
    autor: { nome: "Bia Lima" },
    classe: { id: "ilca7", nome: "ILCA 7" },
    proposta: { pesoMinKg: 80, pesoMedioKg: 83, pesoMaxKg: 86 },
    faixaAtual: { pesoMinKg: 82.8, pesoMedioKg: 85, pesoMaxKg: 87.2 },
    resposta: null,
    respondidoPor: null,
    respondidoEm: null,
    criadoEm: "2026-11-20T15:00:00.000Z",
    ...extra,
  };
}

let itens: Sugestao[] = [];

function api() {
  GET.mockImplementation(
    async (caminho: string, opcoes?: { params?: { query?: { status?: string } } }) => {
      if (caminho === "/parametros") return { data: PARAMETROS, response: { status: 200 } };
      const status = opcoes?.params?.query?.status;
      return {
        data: { itens: status ? itens.filter((i) => i.status === status) : itens },
        response: { status: 200 },
      };
    },
  );
}

const novoQc = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

function montar(papel: "gestor" | "treinador") {
  render(
    <QueryClientProvider client={novoQc()}>
      <TelaSugestoes papel={papel} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  GET.mockReset();
  POST.mockReset();
  PUT.mockReset();
  navegar.mockReset();
  toastFn.success.mockReset();
  itens = [];
  api();
});

describe("Sugestões do treinador", () => {
  it("envia class_fit com classe, proposta e texto", async () => {
    POST.mockResolvedValue({ data: sug(), response: { status: 201 } });
    montar("treinador");
    fireEvent.click(await screen.findByRole("button", { name: "Sugerir mudança no Class Fit" }));
    const dialogo = await screen.findByRole("dialog", { name: "Sugerir mudança no Class Fit" });
    fireEvent.change(await within(dialogo).findByLabelText("Classe"), {
      target: { value: "ilca7" },
    });
    // Parte da faixa vigente e mostra a faixa atual.
    expect(within(dialogo).getByText(/Faixa atual: 82,8 \/ 85,0 \/ 87,2 kg/)).toBeInTheDocument();
    expect(within(dialogo).getByLabelText("Mínimo (kg)")).toHaveValue("82,8");
    fireEvent.change(within(dialogo).getByLabelText("Mínimo (kg)"), { target: { value: "80" } });
    fireEvent.change(within(dialogo).getByLabelText("Média (kg)"), { target: { value: "83,04" } });
    fireEvent.change(within(dialogo).getByLabelText("Máximo (kg)"), { target: { value: "86" } });
    fireEvent.change(within(dialogo).getByLabelText("Texto da sugestão"), {
      target: { value: "  Os atletas estão mais leves.  " },
    });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Enviar sugestão" }));
    await waitFor(() =>
      expect(POST).toHaveBeenCalledWith("/sugestoes", {
        body: {
          tipo: "class_fit",
          classeId: "ilca7",
          proposta: { pesoMinKg: 80, pesoMedioKg: 83, pesoMaxKg: 86 },
          texto: "Os atletas estão mais leves.",
        },
      }),
    );
    await waitFor(() =>
      expect(toastFn.success).toHaveBeenCalledWith("Sugestão enviada ao gestor."),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("valida no cliente e mostra o 400 da API por campo", async () => {
    POST.mockResolvedValue({
      error: {
        erro: "requisicao_invalida",
        mensagem: "Dados inválidos.",
        campos: [
          { campo: "proposta.pesoMaxKg", mensagem: "Máximo acima de 400 kg." },
          { campo: "texto", mensagem: "O texto pode ter no máximo 1.000 caracteres." },
        ],
      },
      response: { status: 400 },
    });
    montar("treinador");
    fireEvent.click(await screen.findByRole("button", { name: "Sugerir mudança no Class Fit" }));
    const dialogo = await screen.findByRole("dialog");
    fireEvent.click(await within(dialogo).findByRole("button", { name: "Enviar sugestão" }));
    expect(within(dialogo).getByText("Escolha a classe.")).toBeInTheDocument();
    expect(within(dialogo).getByText("Informe o texto da sugestão.")).toBeInTheDocument();
    expect(POST).not.toHaveBeenCalled();

    fireEvent.change(within(dialogo).getByLabelText("Classe"), { target: { value: "c470" } });
    fireEvent.change(within(dialogo).getByLabelText("Texto da sugestão"), {
      target: { value: "x" },
    });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Enviar sugestão" }));
    await within(dialogo).findByText("Máximo acima de 400 kg.");
    const max = within(dialogo).getByLabelText("Máximo (kg)");
    expect(max).toHaveAttribute("aria-invalid", "true");
    expect(max).toHaveAccessibleDescription("Máximo acima de 400 kg.");
    expect(within(dialogo).getByText(/no máximo 1\.000/)).toBeInTheDocument();
  });

  it("nova sugestão geral manda tipo e texto, sem classe nem proposta", async () => {
    POST.mockResolvedValue({
      data: sug({ tipo: "sistema", classe: null, proposta: null }),
      response: { status: 201 },
    });
    montar("treinador");
    fireEvent.click(await screen.findByRole("button", { name: "Nova sugestão" }));
    const dialogo = await screen.findByRole("dialog", { name: "Nova sugestão" });
    fireEvent.change(within(dialogo).getByLabelText("Sobre o quê"), {
      target: { value: "sistema" },
    });
    fireEvent.change(within(dialogo).getByLabelText("Texto da sugestão"), {
      target: { value: "Ideia" },
    });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Enviar sugestão" }));
    await waitFor(() =>
      expect(POST).toHaveBeenCalledWith("/sugestoes", {
        body: { tipo: "sistema", texto: "Ideia" },
      }),
    );
  });

  it("mostra o 409 do limite de abertas", async () => {
    POST.mockResolvedValue({
      error: {
        erro: "conflito",
        mensagem:
          "Você já tem 10 sugestões abertas. Aguarde a resposta do gestor para enviar outra.",
      },
      response: { status: 409 },
    });
    montar("treinador");
    fireEvent.click(await screen.findByRole("button", { name: "Nova sugestão" }));
    const dialogo = await screen.findByRole("dialog");
    fireEvent.change(within(dialogo).getByLabelText("Texto da sugestão"), {
      target: { value: "Ideia" },
    });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Enviar sugestão" }));
    expect(await within(dialogo).findByRole("alert")).toHaveTextContent(
      /já tem 10 sugestões abertas/,
    );
  });

  it("lista as suas com status e resposta, e não mostra Aprovar nem Recusar", async () => {
    itens = [
      sug({
        id: "2",
        status: "recusada",
        resposta: "Aguardar o documento oficial.",
        respondidoPor: { nome: "Ana Souza" },
        respondidoEm: "2026-11-22T12:00:00.000Z",
      }),
    ];
    montar("treinador");
    fireEvent.change(await screen.findByLabelText("Status"), { target: { value: "recusada" } });
    const lista = await screen.findByRole("list", { name: "Sugestões" });
    expect(within(lista).getByText("Recusada")).toBeInTheDocument();
    expect(within(lista).getByText(/Aguardar o documento oficial\./)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Aprovar/ })).not.toBeInTheDocument();
  });
});

describe("Sugestões do gestor", () => {
  it("compara proposta e faixa atual na fila de abertas", async () => {
    itens = [sug()];
    montar("gestor");
    const lista = await screen.findByRole("list", { name: "Sugestões" });
    expect(within(lista).getByText("82,8 / 85,0 / 87,2 kg")).toBeInTheDocument();
    expect(within(lista).getByText("80,0 / 83,0 / 86,0 kg")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Nova sugestão" })).not.toBeInTheDocument();
  });

  it("aprova: marca como aprovada e abre Parâmetros no Class Fit com a proposta", async () => {
    itens = [sug()];
    PUT.mockResolvedValue({ data: sug({ status: "aprovada" }), response: { status: 200 } });
    montar("gestor");
    fireEvent.click(await screen.findByRole("button", { name: /^Aprovar/ }));
    const dialogo = await screen.findByRole("dialog", { name: "Aprovar sugestão" });
    expect(within(dialogo).getByText(/só muda quando você salvar lá/)).toBeInTheDocument();
    fireEvent.click(within(dialogo).getByRole("button", { name: "Aprovar e abrir Parâmetros" }));
    await waitFor(() =>
      expect(PUT).toHaveBeenCalledWith("/sugestoes/{id}", {
        params: { path: { id: "1" } },
        body: { status: "aprovada" },
      }),
    );
    await waitFor(() =>
      expect(navegar).toHaveBeenCalledWith({
        to: "/parametros",
        search: { classe: "ilca7", min: 80, med: 83, max: 86 },
        hash: "classes",
      }),
    );
  });

  it("aprovar com 409 não navega e mostra o erro", async () => {
    itens = [sug()];
    PUT.mockResolvedValue({
      error: { erro: "conflito", mensagem: "Esta sugestão já foi respondida." },
      response: { status: 409 },
    });
    montar("gestor");
    fireEvent.click(await screen.findByRole("button", { name: /^Aprovar/ }));
    const dialogo = await screen.findByRole("dialog");
    fireEvent.click(within(dialogo).getByRole("button", { name: "Aprovar e abrir Parâmetros" }));
    expect(await within(dialogo).findByRole("alert")).toHaveTextContent("já foi respondida");
    expect(navegar).not.toHaveBeenCalled();
  });

  it("recusar exige a resposta e a envia", async () => {
    itens = [sug()];
    PUT.mockResolvedValue({ data: sug({ status: "recusada" }), response: { status: 200 } });
    montar("gestor");
    fireEvent.click(await screen.findByRole("button", { name: /^Recusar/ }));
    const dialogo = await screen.findByRole("dialog", { name: "Recusar sugestão" });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Recusar" }));
    expect(
      within(dialogo).getByText("Explique o motivo ao recusar a sugestão."),
    ).toBeInTheDocument();
    expect(PUT).not.toHaveBeenCalled();
    fireEvent.change(within(dialogo).getByLabelText("Motivo da recusa"), {
      target: { value: "Aguardar o documento oficial." },
    });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Recusar" }));
    await waitFor(() =>
      expect(PUT).toHaveBeenCalledWith("/sugestoes/{id}", {
        params: { path: { id: "1" } },
        body: { status: "recusada", resposta: "Aguardar o documento oficial." },
      }),
    );
    expect(navegar).not.toHaveBeenCalled();
  });

  it("sugestão aprovada de class_fit oferece voltar a Parâmetros com a proposta", async () => {
    itens = [sug({ status: "aprovada" })];
    montar("gestor");
    fireEvent.change(await screen.findByLabelText("Status"), { target: { value: "aprovada" } });
    const link = await screen.findByRole("link", { name: /Abrir em Parâmetros/ });
    expect(link).toHaveAttribute("href", "/parametros");
    expect(JSON.parse(link.getAttribute("data-search")!)).toEqual({
      classe: "ilca7",
      min: 80,
      med: 83,
      max: 86,
    });
  });
});

describe("Parâmetros com proposta", () => {
  function parametros(
    papel: string,
    proposta?: { classe: string; min: number; med: number; max: number },
  ) {
    GET.mockImplementation(async () => ({ data: PARAMETROS, response: { status: 200 } }));
    window.location.hash = "#classes";
    render(
      <QueryClientProvider client={novoQc()}>
        <TelaParametros papel={papel} {...(proposta ? { proposta } : {})} />
      </QueryClientProvider>,
    );
  }

  it("preenche a classe da proposta, avisa que só muda ao salvar e não salva sozinho", async () => {
    parametros("gestor", { classe: "ilca7", min: 80, med: 83, max: 86 });
    expect(await screen.findByLabelText("Mínimo de ILCA 7, Individual (kg)")).toHaveValue("80,0");
    expect(screen.getByLabelText("Máximo de ILCA 7, Individual (kg)")).toHaveValue("86,0");
    expect(screen.getByLabelText("Mínimo de 470, Timoneiro (kg)")).toHaveValue("70,0");
    expect(screen.getByText(/A faixa só muda\s+quando você salvar/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Salvar faixas da classe" })).toBeEnabled();
    expect(PUT).not.toHaveBeenCalled();
  });

  it("treinador vê em leitura e sugere por classe, sem botão de salvar", async () => {
    parametros("treinador");
    const campo = await screen.findByLabelText("Mínimo de ILCA 7, Individual (kg)");
    await waitFor(() =>
      expect(screen.getByRole("tab", { name: "Class Fit" })).toHaveAttribute(
        "aria-selected",
        "true",
      ),
    );
    expect(campo).toHaveAttribute("readonly");
    expect(screen.queryByRole("button", { name: /Salvar faixas/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Sugerir mudança em 470/ }));
    const dialogo = await screen.findByRole("dialog", { name: "Sugerir mudança no Class Fit" });
    expect(await within(dialogo).findByLabelText("Classe")).toHaveValue("c470");
    expect(within(dialogo).getByText(/Faixa atual: 70,0 \/ 75,0 \/ 80,0 kg/)).toBeInTheDocument();
  });
});

describe("Balão de sugestões", () => {
  it("usa a chave sugestoes de /me/notificacoes", () => {
    expect(contagemDaTela("sugestoes", { sugestoes: 3 })).toBe(3);
    expect(contagemDaTela("sugestoes", {})).toBe(0);
  });
});
