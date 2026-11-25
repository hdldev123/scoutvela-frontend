import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
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
    termoProxima: null,
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
    instancia: 1,
    primeiraResposta: {
      texto: "Revisamos e mantivemos a nota.",
      papel: "treinador",
      respondidoEm: "2026-11-04T12:00:00.000Z",
    },
    recurso: null,
    respostaFinal: null,
    podeRecurso: false,
    ...extra,
  };
}

const TERMO = {
  versao: "Piloto 18+ · v2",
  titulo: "Termo do piloto 18+",
  texto: "Linha 1 do termo.\nLinha 2 do termo.",
  vigenteDesde: "2026-11-01",
};

let proximaDoTermo: unknown = null;

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
    if (caminho === "/termo/proxima") {
      return Promise.resolve(
        proximaDoTermo
          ? { data: proximaDoTermo, response: { status: 200 } }
          : { error: { erro: "nao_encontrado", mensagem: "Não há." }, response: { status: 404 } },
      );
    }
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
    proximaDoTermo = null;
  });

  it("mostra o primeiro nome, score e ciclo, sem o botão da ficha", async () => {
    montar(painel());
    expect(
      await screen.findByRole("heading", { level: 1, name: "Olá, Helena" }),
    ).toBeInTheDocument();
    expect(screen.getByText("71,5")).toBeInTheDocument();
    expect(screen.getByText("Em desenvolvimento")).toBeInTheDocument();
    expect(screen.getByText(/Ciclo Novembro de 2026 · prazo 30\/11\/2026/)).toBeInTheDocument();
    expect(screen.getByText(/Avaliação parcial/)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Minha ficha" })).not.toBeInTheDocument();
  });

  it("marca o painel como visto uma vez, depois de carregar", async () => {
    PUT.mockResolvedValue({ response: { status: 204 } });
    montar(painel());
    await screen.findByRole("heading", { level: 1, name: "Olá, Helena" });
    await waitFor(() =>
      expect(PUT).toHaveBeenCalledWith("/me/notificacoes/vistas", { body: { chave: "painel" } }),
    );
    expect(PUT).toHaveBeenCalledTimes(1);
  });

  it("segue normal se marcar como visto falhar", async () => {
    PUT.mockRejectedValue(new Error("rede"));
    montar(painel());
    expect(
      await screen.findByRole("heading", { level: 1, name: "Olá, Helena" }),
    ).toBeInTheDocument();
  });

  it("lista pendências e módulos com situação", async () => {
    montar(painel());
    expect(await screen.findByText(/faltam suas respostas em Ambiente/)).toBeInTheDocument();
    expect(screen.getByText("Sua vez").className).toContain("st-cond");
    expect(screen.getByText("Completo").className).toContain("st-apto");
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
    expect(chave).toHaveAttribute("aria-checked", "false");
    expect(chave.className).toContain("interruptor-botao");
    expect(screen.getByText("Desativado")).toBeInTheDocument();
    expect(screen.getByText(/aceito em 14\/10\/2026/)).toBeInTheDocument();
    expect(screen.getByText(/Última decisão em 15\/10\/2026/)).toBeInTheDocument();
    fireEvent.click(chave);
    await waitFor(() =>
      expect(PUT).toHaveBeenCalledWith("/consentimento", { body: { compartilharIbvar: true } }),
    );
    expect(
      screen.getByRole("button", { name: /Abrir questionário de Ambiente/ }).className,
    ).toContain("sm");
    await waitFor(() =>
      expect(toastFn).toHaveBeenCalledWith("IBVAR passa a ver seu score e seus gates"),
    );
  });

  it("lista os pedidos de revisão com status e resposta", async () => {
    montar(painel(), [
      revisao(),
      revisao({ id: "r2", status: "aberto", resposta: null, primeiraResposta: null }),
    ]);
    expect(await screen.findByText("Respondido")).toBeInTheDocument();
    expect(screen.getByText("Aberto")).toBeInTheDocument();
    expect(screen.getByText(/Revisamos e mantivemos a nota/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pedir revisão de nota" })).toBeInTheDocument();
  });

  it("mostra o andamento de cada pedido e o botão só quando cabe recurso", async () => {
    montar(painel(), [
      revisao({ podeRecurso: true }),
      revisao({
        id: "r2",
        status: "aberto",
        instancia: 2,
        resposta: null,
        respondidoEm: null,
        recurso: { texto: "Discordo da nota.", em: "2026-11-06T12:00:00.000Z" },
      }),
      revisao({
        id: "r3",
        instancia: 2,
        resposta: "Mantida pela gestão.",
        recurso: { texto: "Discordo.", em: "2026-11-06T12:00:00.000Z" },
        respostaFinal: {
          texto: "Mantida pela gestão.",
          papel: "gestor",
          respondidoEm: "2026-11-07T12:00:00.000Z",
        },
      }),
    ]);
    expect(await screen.findByText(/Respondido pelo treinador/)).toBeInTheDocument();
    expect(screen.getByText(/Em análise pela gestão \(2ª instância\)/)).toBeInTheDocument();
    expect(screen.getAllByText(/Seu recurso:/)).toHaveLength(2);
    expect(screen.getAllByText(/Resposta final da gestão/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Mantida pela gestão./)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Discordar da resposta" })).toHaveLength(1);
  });

  it("recurso: envia o texto e fecha o diálogo", async () => {
    POST.mockResolvedValue({ data: revisao(), response: { status: 200 } });
    montar(painel(), [revisao({ podeRecurso: true })]);
    fireEvent.click(await screen.findByRole("button", { name: "Discordar da resposta" }));
    const dialogo = await screen.findByRole("dialog", { name: "Discordar da resposta" });
    expect(within(dialogo).getByText(/gestão da CBVela/)).toBeInTheDocument();
    expect(within(dialogo).getByText("0 de 1000 caracteres")).toBeInTheDocument();
    const enviar = within(dialogo).getByRole("button", { name: "Enviar recurso" });
    expect(enviar).toBeDisabled();
    fireEvent.change(within(dialogo).getByLabelText(/Por que você discorda/), {
      target: { value: "A nota não reflete a regata." },
    });
    expect(within(dialogo).getByText("28 de 1000 caracteres")).toBeInTheDocument();
    fireEvent.click(enviar);
    await waitFor(() =>
      expect(POST).toHaveBeenCalledWith("/revisoes/{id}/recurso", {
        params: { path: { id: "r1" } },
        body: { texto: "A nota não reflete a regata." },
      }),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("recurso: 409 mostra a mensagem da API e mantém o diálogo", async () => {
    POST.mockResolvedValue({
      error: { erro: "conflito", mensagem: "O recurso já foi feito." },
      response: { status: 409 },
    });
    montar(painel(), [revisao({ podeRecurso: true })]);
    fireEvent.click(await screen.findByRole("button", { name: "Discordar da resposta" }));
    const dialogo = await screen.findByRole("dialog");
    fireEvent.change(within(dialogo).getByLabelText(/Por que você discorda/), {
      target: { value: "Discordo." },
    });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Enviar recurso" }));
    expect(await within(dialogo).findByRole("alert")).toHaveTextContent("O recurso já foi feito.");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
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
    // O aviso sai do hook, não do callback do mutate: o bloco some ao recarregar o painel.
    await waitFor(() => expect(toastFn).toHaveBeenCalledWith("Termo aceito"));
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
    expect(screen.queryByText("Versão 2.0")).not.toBeInTheDocument();
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

  it("mostra a nova versão do termo e aceita antes da vigência", async () => {
    // 23h30 em Brasília de 30/11: em UTC já é 1º/12, e a tela mostra o dia de Brasília.
    const proxima = {
      versao: "Piloto 18+ · v3",
      titulo: "Termo v3",
      vigenteDesde: "2026-12-01T02:30:00.000Z",
    };
    proximaDoTermo = { ...proxima, texto: "Texto novo do termo." };
    POST.mockResolvedValue({ data: { ok: true }, response: { status: 200 } });
    const inv = vi.spyOn(QueryClient.prototype, "invalidateQueries");
    montar(painel({ termoProxima: proxima }));
    expect(
      await screen.findByRole("heading", {
        name: "Nova versão do termo (Piloto 18+ · v3) passa a valer em 30/11/2026",
      }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Ler a nova versão" }));
    const dialogo = await screen.findByRole("dialog", { name: "Termo, versão Piloto 18+ · v3" });
    expect(await within(dialogo).findByText("Texto novo do termo.")).toBeInTheDocument();
    fireEvent.click(within(dialogo).getByRole("button", { name: "Aceitar agora" }));
    await waitFor(() =>
      expect(POST).toHaveBeenCalledWith("/termo/aceite", { body: { versao: "Piloto 18+ · v3" } }),
    );
    await waitFor(() => expect(toastFn).toHaveBeenCalledWith("Nova versão do termo aceita"));
    await waitFor(() => {
      const chaves = inv.mock.calls.map((c) => JSON.stringify(c[0]?.queryKey));
      expect(chaves).toEqual(
        expect.arrayContaining(['["painel"]', '["notificacoes"]', '["termo"]']),
      );
    });
    inv.mockRestore();
  });

  it("sem próxima versão não mostra o aviso de nova versão", async () => {
    montar(painel());
    await screen.findByRole("heading", { level: 1, name: "Olá, Helena" });
    expect(screen.queryByRole("button", { name: "Aceitar agora" })).toBeNull();
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
