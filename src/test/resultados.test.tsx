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

import { MeusResultados } from "@/components/scout/MeusResultados";

const ANO = new Date().getFullYear();

const resultado = (extra: Record<string, unknown> = {}) => ({
  id: "r1",
  data: "2025-12-31",
  nivel: "mundial",
  evento: "Mundial ILCA 6",
  edicao: 2025,
  posicao: 5,
  tamanhoFrota: null,
  internacional: true,
  pontosCbvela: null,
  fonte: "atleta",
  linkOficial: null,
  status: "pendente",
  motivo: null,
  anexo: null,
  validadoPor: null,
  validadoEm: null,
  ...extra,
});

let enviados: unknown[] = [];
let autoavaliacao: unknown = {
  ciclo: null,
  indicadores: [],
  orientacoesResultados: [],
  rubricas: [],
  resumoPorPilar: null,
};

function montar() {
  GET.mockImplementation((caminho: string) => {
    if (caminho === "/atletas/{id}/autoavaliacao") {
      return Promise.resolve({ data: autoavaliacao, response: { status: 200 } });
    }
    return Promise.resolve({ data: { itens: enviados }, response: { status: 200 } });
  });
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MeusResultados atletaId="a07" />
    </QueryClientProvider>,
  );
}

const erro400 = (campos: { campo: string; mensagem: string }[]) => ({
  error: { erro: "requisicao_invalida", mensagem: "Dados inválidos.", campos },
  response: { status: 400 },
});

const corposResultado = () =>
  POST.mock.calls
    .filter((c) => c[0] === "/me/resultados")
    .map((c) => (c[1] as { body: unknown }).body);
const chamadasPost = () => POST.mock.calls.map((c) => c[0] as string);

const sumula = (nome = "sumula.pdf") => new File(["x"], nome, { type: "application/pdf" });
const linha = (n: number) => within(screen.getByRole("group", { name: `Edição ${n}` }));

function preencher(
  n: number,
  v: { ano?: string; posicao?: string; link?: string; frota?: string },
) {
  const l = linha(n);
  if (v.ano !== undefined) fireEvent.change(l.getByLabelText("Ano"), { target: { value: v.ano } });
  if (v.posicao !== undefined) {
    fireEvent.change(l.getByLabelText("Colocação"), { target: { value: v.posicao } });
  }
  if (v.frota !== undefined) {
    fireEvent.change(l.getByLabelText("Tamanho da frota (opcional)"), {
      target: { value: v.frota },
    });
  }
  if (v.link !== undefined) {
    fireEvent.change(l.getByLabelText("Ou link oficial do resultado"), {
      target: { value: v.link },
    });
  }
}
const cabecalho = (evento: string, nivel: string) => {
  fireEvent.change(screen.getByLabelText("Evento"), { target: { value: evento } });
  fireEvent.change(screen.getByLabelText("Nível"), { target: { value: nivel } });
};
const anexar = (n: number, arquivo: File) =>
  fireEvent.change(linha(n).getByLabelText(`Súmula da edição ${n}`), {
    target: { files: [arquivo] },
  });
const enviar = (nome: RegExp | string = /^Enviar/) =>
  fireEvent.click(screen.getByRole("button", { name: nome }));

beforeEach(() => {
  vi.clearAllMocks();
  enviados = [];
  autoavaliacao = {
    ciclo: null,
    indicadores: [],
    orientacoesResultados: [],
    rubricas: [],
    resumoPorPilar: null,
  };
  POST.mockImplementation((caminho: string) =>
    Promise.resolve(
      caminho === "/atletas/{id}/evidencias"
        ? {
            data: { id: "anx1", nomeArquivo: "sumula.pdf", indicadorId: null },
            response: { status: 201 },
          }
        : { data: resultado(), response: { status: 201 } },
    ),
  );
  DELETE.mockResolvedValue({ response: { status: 204 } });
});

describe("Meus resultados (atleta)", () => {
  it("pede evento e nível uma vez e mostra o botão para adicionar edições", async () => {
    montar();
    expect(await screen.findByRole("heading", { name: "Meus resultados" })).toBeTruthy();
    expect(screen.getAllByLabelText("Evento")).toHaveLength(1);
    expect(screen.getAllByLabelText("Nível")).toHaveLength(1);
    const nivel = screen.getByLabelText("Nível") as HTMLSelectElement;
    expect(
      within(nivel).getByRole("option", { name: "Mundial (inclui Youth World)" }),
    ).toBeTruthy();
    expect(
      within(nivel).getByRole("option", { name: "Continental (Sul-Americano e Pan-Americano)" }),
    ).toBeTruthy();
    expect(within(nivel).getByRole("option", { name: "Nacional (Brasileiro)" })).toBeTruthy();
    expect(screen.getAllByRole("group", { name: /^Edição/ })).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Adicionar edição" }));
    expect(screen.getAllByRole("group", { name: /^Edição/ })).toHaveLength(2);
    expect(screen.getAllByLabelText("Evento")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Remover edição 2" })).toBeTruthy();
  });

  it("envia cada edição num POST: a súmula sobe antes e o link vai no corpo", async () => {
    montar();
    await screen.findByRole("heading", { name: "Meus resultados" });
    cabecalho("  Mundial ILCA 6  ", "mundial");
    preencher(1, { ano: "2025", posicao: "5", frota: "120" });
    anexar(1, sumula());
    fireEvent.click(screen.getByRole("button", { name: "Adicionar edição" }));
    preencher(2, { ano: "2024", posicao: "12", link: "https://oficial.exemplo.com/2024" });
    enviar("Enviar 2 edições");
    await waitFor(() => expect(corposResultado()).toHaveLength(2));
    expect(corposResultado()).toEqual([
      {
        evento: "Mundial ILCA 6",
        nivel: "mundial",
        ano: 2025,
        posicao: 5,
        tamanhoFrota: 120,
        anexoId: "anx1",
      },
      {
        evento: "Mundial ILCA 6",
        nivel: "mundial",
        ano: 2024,
        posicao: 12,
        linkOficial: "https://oficial.exemplo.com/2024",
      },
    ]);
    // Só a primeira linha tem arquivo, e a súmula sobe antes do POST do resultado.
    expect(chamadasPost()).toEqual([
      "/atletas/{id}/evidencias",
      "/me/resultados",
      "/me/resultados",
    ]);
    const anexo = POST.mock.calls[0]?.[1] as { body: { categoria: string; tipoMime: string } };
    expect(anexo.body.categoria).toBe("sumula");
    expect(anexo.body.tipoMime).toBe("application/pdf");
    await waitFor(() => expect(toastFn.success).toHaveBeenCalled());
    // Tudo enviado: sobra um formulário em branco, com o evento e o nível mantidos.
    await waitFor(() => expect(screen.getAllByRole("group", { name: /^Edição/ })).toHaveLength(1));
    expect((linha(1).getByLabelText("Ano") as HTMLInputElement).value).toBe("");
  });

  it("valida no cliente: sem súmula nem link, ano fora da faixa e edição repetida", async () => {
    montar();
    await screen.findByRole("heading", { name: "Meus resultados" });
    enviar();
    expect(await screen.findByText("Informe o nome do evento.")).toBeTruthy();
    expect(screen.getByText("Escolha o nível.")).toBeTruthy();
    cabecalho("Brasileiro ILCA 6", "nacional");
    preencher(1, { ano: "1999", posicao: "0" });
    enviar();
    expect(await screen.findByText(new RegExp(`de 2000 a ${ANO}`))).toBeTruthy();
    expect(screen.getByText(/Informe a colocação/)).toBeTruthy();
    expect(screen.getByText("Anexe a súmula ou informe o link oficial do resultado.")).toBeTruthy();
    preencher(1, { ano: "2025", posicao: "2", link: "http://sem-https.com" });
    fireEvent.click(screen.getByRole("button", { name: "Adicionar edição" }));
    preencher(2, { ano: "2025", posicao: "3", link: "https://oficial.exemplo.com/x" });
    enviar("Enviar 2 edições");
    expect(await screen.findByText("Use um link que comece com https://.")).toBeTruthy();
    expect(screen.getByText("Esta edição já está em outra linha.")).toBeTruthy();
    expect(POST).not.toHaveBeenCalled();
  });

  it("recusa a súmula de formato errado antes de enviar", async () => {
    montar();
    await screen.findByRole("heading", { name: "Meus resultados" });
    anexar(1, new File(["x"], "sumula.exe", { type: "application/x-msdownload" }));
    expect(await screen.findByText(/Formato não aceito/)).toBeTruthy();
    expect(POST).not.toHaveBeenCalled();
  });

  it("400 por campo cai na linha certa, a outra linha segue e o anexo é apagado", async () => {
    POST.mockImplementation((caminho: string, opcoes: { body: { ano?: number } }) => {
      if (caminho === "/atletas/{id}/evidencias") {
        return Promise.resolve({
          data: { id: "anx1", nomeArquivo: "sumula.pdf", indicadorId: null },
          response: { status: 201 },
        });
      }
      return Promise.resolve(
        opcoes.body.ano === 2024
          ? erro400([{ campo: "posicao", mensagem: "A colocação passa do tamanho da frota." }])
          : { data: resultado(), response: { status: 201 } },
      );
    });
    montar();
    await screen.findByRole("heading", { name: "Meus resultados" });
    cabecalho("Mundial ILCA 6", "mundial");
    preencher(1, { ano: "2025", posicao: "5", link: "https://oficial.exemplo.com/2025" });
    fireEvent.click(screen.getByRole("button", { name: "Adicionar edição" }));
    preencher(2, { ano: "2024", posicao: "12", frota: "12" });
    anexar(2, sumula());
    enviar("Enviar 2 edições");
    expect(await screen.findByText("A colocação passa do tamanho da frota.")).toBeTruthy();
    // A edição 2025 foi enviada e saiu do formulário; a de 2024 ficou com o erro no campo.
    expect(screen.getAllByRole("group", { name: /^Edição/ })).toHaveLength(1);
    expect((linha(1).getByLabelText("Ano") as HTMLInputElement).value).toBe("2024");
    expect(linha(1).getByLabelText("Colocação").getAttribute("aria-invalid")).toBe("true");
    await waitFor(() =>
      expect(DELETE).toHaveBeenCalledWith("/evidencias/{id}", { params: { path: { id: "anx1" } } }),
    );
  });

  it("409 de edição repetida ou acima do limite aparece na linha", async () => {
    POST.mockResolvedValue({
      error: { erro: "conflito", mensagem: "Este evento já tem 4 edições informadas." },
      response: { status: 409 },
    });
    montar();
    await screen.findByRole("heading", { name: "Meus resultados" });
    cabecalho("Mundial ILCA 6", "mundial");
    preencher(1, { ano: "2025", posicao: "5", link: "https://oficial.exemplo.com/2025" });
    enviar();
    const alerta = await within(screen.getByRole("group", { name: "Edição 1" })).findByRole(
      "alert",
    );
    expect(alerta.textContent).toContain("Este evento já tem 4 edições informadas.");
    expect(toastFn.success).not.toHaveBeenCalled();
  });

  it("lista os resultados enviados com a situação e o motivo da recusa", async () => {
    enviados = [
      resultado({ id: "r1" }),
      resultado({
        id: "r2",
        edicao: 2024,
        status: "validado",
        validadoPor: { id: "u1", nome: "Ana Ribeiro" },
        validadoEm: "2026-11-21T12:00:00.000Z",
        anexo: { id: "anx7", nomeArquivo: "sumula-2024.pdf" },
      }),
      resultado({ id: "r3", edicao: 2023, status: "recusado", motivo: "Súmula ilegível" }),
    ];
    montar();
    const lista = (await screen.findByRole("heading", { name: "Resultados enviados" }))
      .nextElementSibling as HTMLElement;
    expect(within(lista).getAllByRole("listitem")).toHaveLength(3);
    expect(within(lista).getByText("Aguardando validação")).toBeTruthy();
    expect(within(lista).getByText("Validado")).toBeTruthy();
    expect(within(lista).getByText(/por Ana Ribeiro em/)).toBeTruthy();
    expect(within(lista).getByText("Recusado")).toBeTruthy();
    expect(within(lista).getByText("Motivo da recusa: Súmula ilegível")).toBeTruthy();
  });

  it("mostra a orientação do indicador do nível, vinda de orientacoesResultados", async () => {
    autoavaliacao = {
      ciclo: null,
      rubricas: [],
      resumoPorPilar: null,
      // Os indicadores de resultado têm nota calculada: não vêm em `indicadores`.
      indicadores: [],
      orientacoesResultados: [
        {
          nivel: "mundial",
          indicadorId: "perf_mundial",
          nome: "Resultados em Mundial e Youth World",
          orientacao: "Informe cada edição do Mundial com a súmula oficial.",
        },
        {
          nivel: "nacional",
          indicadorId: "perf_nacional",
          nome: "Resultados nacionais",
          orientacao: null,
        },
      ],
    };
    montar();
    await screen.findByRole("heading", { name: "Meus resultados" });
    expect(screen.queryByText(/súmula oficial/)).toBeNull();
    fireEvent.change(screen.getByLabelText("Nível"), { target: { value: "mundial" } });
    expect(
      await screen.findByText("Informe cada edição do Mundial com a súmula oficial."),
    ).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Nível"), { target: { value: "nacional" } });
    expect(screen.queryByText(/súmula oficial/)).toBeNull();
  });
});
