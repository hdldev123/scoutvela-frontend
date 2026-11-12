import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const GET = vi.fn();
const POST = vi.fn();
const PUT = vi.fn();
const toastFn = vi.hoisted(() => Object.assign(vi.fn(), { error: vi.fn() }));

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
    params,
    ...resto
  }: { children: ReactNode; to: string; params?: { id: string } } & Record<string, unknown>) => (
    <a href={params ? to.replace("$id", params.id) : to} {...resto}>
      {children}
    </a>
  ),
}));

import { TelaPainel } from "@/components/scout/TelaPainel";
import type { PainelAtleta } from "@/lib/api/painel";

function painel(extra: Partial<PainelAtleta> = {}): PainelAtleta {
  return {
    atleta: { id: "a07", nome: "Helena Vasques" },
    ciclo: { nome: "Novembro de 2026", prazo: "2026-11-30" },
    score: 71.5,
    faixa: { id: "f3", nome: "Em desenvolvimento", nomeCurto: "Em desenvolvimento" },
    completo: false,
    modulos: [
      {
        pilarId: "amb",
        nome: "Ambiente de desenvolvimento",
        nomeCurto: "Ambiente",
        peso: 10,
        quemPreenche: "ambos",
        preenchidos: 1,
        total: 2,
        respostasFeitas: 1,
        respostasTotal: 2,
        situacao: "sua_vez",
        perguntas: [
          {
            indicadorId: "amb_apoio",
            enunciado: "Como é o apoio do seu clube?",
            registradoNaoPontua: false,
            opcoes: [
              { ordem: 1, texto: "Estrutura completa" },
              { ordem: 2, texto: "Estrutura parcial" },
            ],
            resposta: "Estrutura completa",
          },
          {
            indicadorId: "amb_historico_familiar",
            enunciado: "Há histórico de vela na família?",
            registradoNaoPontua: true,
            opcoes: [
              { ordem: 1, texto: "Sim" },
              { ordem: 2, texto: "Não" },
            ],
            resposta: null,
          },
        ],
      },
      {
        pilarId: "tec",
        nome: "Técnica",
        nomeCurto: "Técnica",
        peso: 15,
        quemPreenche: "treinador",
        preenchidos: 3,
        total: 3,
        respostasFeitas: 0,
        respostasTotal: 0,
        situacao: "completo",
        perguntas: [],
      },
    ],
    pendencias: ["Ambiente"],
    consentimento: {
      termoAceitoEm: "2026-10-14T12:00:00.000Z",
      termoVersao: "1.0",
      termoVigenteVersao: "1.0",
      termoPendente: false,
      compartilharIbvar: false,
      atualizadoEm: "2026-10-15T12:00:00.000Z",
    },
    ...extra,
  };
}

function revisao(extra: Record<string, unknown> = {}) {
  return {
    id: "r1",
    atleta: { id: "a07", nome: "Helena Vasques" },
    pilar: { id: "tec", nomeCurto: "Técnica" },
    indicador: null,
    motivo: "Acho que a nota de técnica está baixa",
    status: "respondido",
    criadoEm: "2026-11-02T12:00:00.000Z",
    resposta: "Revisamos e mantivemos a nota.",
    respondidoEm: "2026-11-04T12:00:00.000Z",
    ...extra,
  };
}

const TERMO = {
  versao: "Piloto 18+ · v2",
  titulo: "Termo do piloto 18+",
  texto: "Linha 1 do termo.\nLinha 2 do termo.",
  vigenteDesde: "2026-11-01",
};

function montar(
  dados: PainelAtleta | { erro: number },
  revisoes: unknown[] = [],
  pedidos: unknown[] = [],
) {
  GET.mockImplementation((caminho: string) => {
    if (caminho === "/painel") {
      return Promise.resolve(
        "erro" in dados
          ? {
              error: { erro: "erro_interno", mensagem: "Falha no servidor." },
              response: { status: dados.erro },
            }
          : { data: dados, response: { status: 200 } },
      );
    }
    if (caminho === "/revisoes")
      return Promise.resolve({ data: revisoes, response: { status: 200 } });
    if (caminho === "/pedidos-titular")
      return Promise.resolve({ data: pedidos, response: { status: 200 } });
    if (caminho === "/termo") return Promise.resolve({ data: TERMO, response: { status: 200 } });
    if (caminho === "/meus-dados")
      return Promise.resolve({ data: { geradoEm: "2026-11-09" }, response: { status: 200 } });
    return Promise.resolve({ data: { pilares: [] }, response: { status: 200 } });
  });
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <TelaPainel />
    </QueryClientProvider>,
  );
}

describe("TelaPainel", () => {
  beforeEach(() => {
    GET.mockReset();
    POST.mockReset();
    PUT.mockReset();
    toastFn.mockReset();
    toastFn.error.mockReset();
  });

  it("mostra o primeiro nome, score, ciclo e link para a ficha", async () => {
    montar(painel());
    expect(
      await screen.findByRole("heading", { level: 1, name: "Olá, Helena" }),
    ).toBeInTheDocument();
    expect(screen.getByText("71,5")).toBeInTheDocument();
    expect(screen.getByText("Em desenvolvimento")).toBeInTheDocument();
    expect(screen.getByText(/Ciclo Novembro de 2026 · prazo 30\/11\/2026/)).toBeInTheDocument();
    expect(screen.getByText(/Avaliação parcial/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Minha ficha" })).toHaveAttribute(
      "href",
      "/atletas/a07",
    );
  });

  it("lista pendências e módulos com situação", async () => {
    montar(painel());
    expect(await screen.findByText(/faltam suas respostas em Ambiente/)).toBeInTheDocument();
    expect(screen.getByText("Sua vez")).toBeInTheDocument();
    expect(screen.getByText("Completo")).toBeInTheDocument();
    expect(screen.getByText("Você responde · treinador pontua · 10 pts")).toBeInTheDocument();
    expect(screen.getByText("Treinador avalia · 15 pts")).toBeInTheDocument();
    expect(screen.getByText(/1 de 2 respostas suas/)).toBeInTheDocument();
  });

  it("responde uma pergunta com o corpo certo", async () => {
    POST.mockResolvedValue({ data: { ok: true, notaSugerida: null }, response: { status: 201 } });
    montar(painel());
    fireEvent.click(await screen.findByRole("button", { name: /Abrir questionário de Ambiente/ }));
    expect(screen.getByText("Fica registrado, não entra na nota")).toBeInTheDocument();
    expect(
      screen.getByText(/só vale no ranking depois que o treinador confirmar/),
    ).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Estrutura completa" })).toBeChecked();
    fireEvent.click(screen.getByRole("radio", { name: "Estrutura parcial" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Atualizar resposta" })[0]!);
    await waitFor(() =>
      expect(POST).toHaveBeenCalledWith("/respostas", {
        body: { indicadorId: "amb_apoio", resposta: "Estrutura parcial" },
      }),
    );
    await waitFor(() => expect(toastFn).toHaveBeenCalledWith("Resposta salva"));
  });

  it("alterna o consentimento do IBVAR", async () => {
    PUT.mockResolvedValue({
      data: { ...painel().consentimento, compartilharIbvar: true },
      response: { status: 200 },
    });
    montar(painel());
    const chave = await screen.findByRole("switch", { name: /Compartilhar meu score com o IBVAR/ });
    expect(chave).not.toBeChecked();
    expect(screen.getByText(/aceito em 14\/10\/2026/)).toBeInTheDocument();
    expect(screen.getByText(/Última decisão em 15\/10\/2026/)).toBeInTheDocument();
    fireEvent.click(chave);
    await waitFor(() =>
      expect(PUT).toHaveBeenCalledWith("/consentimento", { body: { compartilharIbvar: true } }),
    );
    await waitFor(() =>
      expect(toastFn).toHaveBeenCalledWith("IBVAR passa a ver seu score e seus gates"),
    );
  });

  it("lista os pedidos de revisão com status e resposta", async () => {
    montar(painel(), [revisao(), revisao({ id: "r2", status: "aberto", resposta: null })]);
    expect(await screen.findByText("Respondido")).toBeInTheDocument();
    expect(screen.getByText("Aberto")).toBeInTheDocument();
    expect(screen.getByText(/Revisamos e mantivemos a nota/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pedir revisão de nota" })).toBeInTheDocument();
  });

  it("mostra o termo e registra o aceite com a versão vigente", async () => {
    POST.mockResolvedValue({ data: { ok: true }, response: { status: 200 } });
    const base = painel();
    montar(painel({ consentimento: { ...base.consentimento, termoAceitoEm: null } }));
    expect(await screen.findByRole("region", { name: "Texto do termo" })).toHaveTextContent(
      /Linha 1 do termo\.\s*Linha 2 do termo\./,
    );
    fireEvent.click(screen.getByRole("button", { name: "Li e aceito" }));
    await waitFor(() =>
      expect(POST).toHaveBeenCalledWith("/termo/aceite", { body: { versao: "Piloto 18+ · v2" } }),
    );
  });

  it("mostra o termo e a nova versão quando o aceite está pendente", async () => {
    const base = painel();
    montar(
      painel({
        consentimento: { ...base.consentimento, termoVigenteVersao: "2.0", termoPendente: true },
      }),
    );
    expect(
      await screen.findByText(
        "Há uma nova versão do termo (2.0). Leia e aceite para continuar no piloto.",
      ),
    ).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Li e aceito" })).toBeInTheDocument();
    expect(screen.getByText(/aceite da versão 2\.0 pendente/)).toBeInTheDocument();
  });

  it("mostra a nota anterior e a nova na revisão respondida", async () => {
    montar(painel(), [
      revisao({ avaliacaoId: "av1", notaAnterior: 2, notaNova: 4 }),
      revisao({ id: "r3", avaliacaoId: "av2", notaAnterior: null, notaNova: 3 }),
    ]);
    expect(await screen.findByText("2 → 4")).toBeInTheDocument();
    expect(screen.getByText("Nota nova: 3")).toBeInTheDocument();
  });

  it("não mostra o termo quando já foi aceito", async () => {
    montar(painel());
    await screen.findByRole("heading", { level: 1, name: "Olá, Helena" });
    expect(screen.queryByRole("button", { name: "Li e aceito" })).toBeNull();
  });

  it("baixa os dados do titular como arquivo JSON", async () => {
    const url = vi.fn(() => "blob:x");
    const revogar = vi.fn();
    Object.assign(URL, { createObjectURL: url, revokeObjectURL: revogar });
    const clique = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      expect(this.download).toBe("meus-dados-scout-vela.json");
    });
    montar(painel());
    fireEvent.click(await screen.findByRole("button", { name: "Baixar meus dados" }));
    await waitFor(() => expect(clique).toHaveBeenCalled());
    expect(GET).toHaveBeenCalledWith("/meus-dados");
    expect(url).toHaveBeenCalled();
    clique.mockRestore();
  });

  it("lista pedidos do titular e cria um novo", async () => {
    POST.mockResolvedValue({ data: { id: "p2", status: "aberto" }, response: { status: 201 } });
    montar(
      painel(),
      [],
      [
        {
          id: "p1",
          atleta: { id: "a07", nome: "Helena Vasques" },
          tipo: "correcao",
          descricao: "Corrigir meu nome no cadastro",
          status: "respondido",
          criadoEm: "2026-11-02T12:00:00.000Z",
          resposta: "Corrigido.",
          respondidoEm: "2026-11-03T12:00:00.000Z",
        },
      ],
    );
    expect(await screen.findByText("Corrigir meu nome no cadastro")).toBeInTheDocument();
    expect(screen.getByText(/Corrigido\./)).toBeInTheDocument();
    expect(screen.getByText(/exclusão é analisada pela CBVela/)).toBeInTheDocument();
    const enviar = screen.getByRole("button", { name: "Enviar pedido" });
    expect(enviar).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Tipo de pedido"), { target: { value: "exclusao" } });
    fireEvent.change(screen.getByLabelText(/Descrição/), {
      target: { value: "Quero excluir meus dados" },
    });
    fireEvent.click(enviar);
    await waitFor(() =>
      expect(POST).toHaveBeenCalledWith("/pedidos-titular", {
        body: { tipo: "exclusao", descricao: "Quero excluir meus dados" },
      }),
    );
  });

  it("mostra erro quando a API falha", async () => {
    montar({ erro: 500 });
    expect(await screen.findByRole("alert")).toHaveTextContent("Falha no servidor.");
  });
});
