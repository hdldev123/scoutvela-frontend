import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const GET = vi.fn();
const POST = vi.fn();
const toastFn = vi.hoisted(() => Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }));

vi.mock("@/lib/api/cliente", async (importar) => ({
  ...(await importar<typeof import("@/lib/api/cliente")>()),
  api: {
    GET: (...args: unknown[]) => GET(...args),
    POST: (...args: unknown[]) => POST(...args),
  },
}));
vi.mock("sonner", () => ({ toast: toastFn }));

import { TelaCadastro } from "@/components/scout/TelaCadastro";

const ok = (data: unknown, status = 200) => ({ data, error: undefined, response: { status } });
const falha = (status: number, erro: string, mensagem: string) => ({
  data: undefined,
  error: { erro, mensagem },
  response: { status },
});

const velaid = (extra: Record<string, unknown> = {}) => ({
  codigo: "MG-T15",
  nome: "Bruno Lima",
  genero: "M",
  dataNascimento: "2005-03-02",
  idade: 21,
  clube: "Iate Clube de Minas",
  cidade: "Belo Horizonte",
  uf: "MG",
  wsId: "BRA123",
  jaNoPiloto: false,
  elegivel: true,
  motivo: null,
  ...extra,
});

const TREINADOR_ID = "11111111-1111-4111-8111-111111111111";

let pendentes: unknown[];

beforeEach(() => {
  vi.clearAllMocks();
  pendentes = [
    {
      id: "a9",
      nome: "Carla Souza",
      wsId: "BRACS16",
      velaid: "BA-T16",
      classe: { id: "c1", nome: "ILCA 6" },
      criadoEm: "2026-11-05T12:00:00.000Z",
      termoAceitoVersao: null,
    },
  ];
  GET.mockImplementation(async (caminho: string) => {
    if (caminho === "/parametros") {
      return ok({
        classes: [
          { id: "ilca7", nome: "ILCA 7", ativa: true },
          { id: "velha", nome: "Classe desativada", ativa: false },
        ],
      });
    }
    if (caminho === "/termo") {
      return ok({
        versao: "Piloto 18+ · v2",
        titulo: "Termo",
        texto: "t",
        vigenteDesde: "2026-11-01",
      });
    }
    if (caminho === "/treinadores") return ok([{ id: TREINADOR_ID, nome: "Ana Ribeiro" }]);
    if (caminho === "/atletas/pendentes") return ok(pendentes);
    return falha(404, "nao_encontrado", "?");
  });
});

function montar() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const inv = vi.spyOn(qc, "invalidateQueries");
  render(
    <QueryClientProvider client={qc}>
      <TelaCadastro />
    </QueryClientProvider>,
  );
  return inv;
}

function buscar(codigo: string) {
  fireEvent.change(screen.getByLabelText("Código VelaID"), { target: { value: codigo } });
  fireEvent.click(screen.getByRole("button", { name: "Buscar no VelaID" }));
}

function preencherBasico(wsId = "braj s12") {
  fireEvent.change(screen.getByLabelText("ID World Sailing"), { target: { value: wsId } });
  fireEvent.change(screen.getByLabelText("E-mail do atleta"), {
    target: { value: "bruno@exemplo.com" },
  });
  fireEvent.change(screen.getByLabelText("Classe e função projetadas"), {
    target: { value: "ilca7" },
  });
  fireEvent.change(screen.getByLabelText("Treinador(a) responsável"), {
    target: { value: TREINADOR_ID },
  });
}

async function aguardarOpcoes() {
  await screen.findByRole("option", { name: "ILCA 7" });
  await screen.findByRole("option", { name: "Ana Ribeiro" });
}

const confirmar18 = () =>
  fireEvent.click(
    screen.getByRole("checkbox", { name: "Confirmo que o atleta tem 18 anos ou mais" }),
  );
const enviar = () =>
  fireEvent.click(screen.getByRole("button", { name: "Enviar termo de consentimento" }));

const criado = (extra: Record<string, unknown> = {}) =>
  ok(
    {
      id: "a1",
      wsId: "BRAJS12",
      velaid: null,
      cadastroCompleto: false,
      termo: { status: "aguardando_aceite", versao: "v1" },
      conta: "convite_enviado",
      ...extra,
    },
    201,
  );

describe("TelaCadastro", () => {
  it("cadastra pelo WS ID normalizado, sem VelaID, e mostra o link do atleta criado", async () => {
    POST.mockImplementation(async () => criado());
    montar();
    expect(screen.getByRole("heading", { level: 1, name: "Cadastrar atleta" })).toBeTruthy();
    await aguardarOpcoes();
    expect(screen.queryByRole("option", { name: "Classe desativada" })).toBeNull();
    preencherBasico();
    confirmar18();
    enviar();

    expect(await screen.findByText(/Termo enviado \(v1\)/)).toBeTruthy();
    expect(POST).toHaveBeenCalledWith("/atletas", {
      body: {
        wsId: "BRAJS12",
        email: "bruno@exemplo.com",
        classeId: "ilca7",
        treinadorId: TREINADOR_ID,
        confirmaMaioridade: true,
        criarConta: true,
      },
    });
    expect(screen.getByText(/Conta criada e convite enviado/)).toBeTruthy();
    expect(toastFn.success).toHaveBeenCalled();
    const link = screen.getByRole("link", {
      name: "Perfil de BRAJS12 no World Sailing (abre em nova aba)",
    });
    expect(link.getAttribute("href")).toBe("https://www.sailing.org/sailor/?ref=BRAJS12");
    // O formulário volta ao início para o próximo cadastro.
    expect((screen.getByLabelText("ID World Sailing") as HTMLInputElement).value).toBe("");
  });

  it("valida WS ID, e-mail e a confirmação de 18+ antes de enviar", async () => {
    montar();
    await aguardarOpcoes();
    enviar();
    expect(await screen.findByText("Informe o ID World Sailing do atleta.")).toBeTruthy();
    expect(screen.getByText("Informe o e-mail do atleta.")).toBeTruthy();
    expect(screen.getByText("Escolha a classe e a função.")).toBeTruthy();
    expect(screen.getByText("Escolha o treinador responsável.")).toBeTruthy();
    expect(screen.getByText("Confirme que o atleta tem 18 anos ou mais.")).toBeTruthy();
    expect(POST).not.toHaveBeenCalled();

    preencherBasico("12-ab");
    expect(await screen.findByText(/ID World Sailing inválido/)).toBeTruthy();
    expect(screen.getByLabelText("ID World Sailing").getAttribute("aria-invalid")).toBe("true");
    enviar();
    expect(POST).not.toHaveBeenCalled();

    preencherBasico("BRAJS12");
    enviar();
    expect(screen.queryByText(/ID World Sailing inválido/)).toBeNull();
    expect(screen.getByText("Confirme que o atleta tem 18 anos ou mais.")).toBeTruthy();
    expect(POST).not.toHaveBeenCalled();
  });

  it("busca opcional no VelaID mostra os dados de referência e envia o código", async () => {
    POST.mockImplementation(async (caminho: string) =>
      caminho === "/velaid/busca" ? ok(velaid()) : criado({ velaid: "MG-T15" }),
    );
    montar();
    await aguardarOpcoes();
    buscar(" MG-T15 ");
    expect(await screen.findByText("Bruno Lima")).toBeTruthy();
    expect(screen.getByText("BRA123")).toBeTruthy();
    expect(screen.getByText("Belo Horizonte/MG")).toBeTruthy();
    expect(POST).toHaveBeenCalledWith("/velaid/busca", { body: { codigo: "MG-T15" } });
    preencherBasico("BRAJS12");
    confirmar18();
    enviar();
    await waitFor(() =>
      expect(POST).toHaveBeenCalledWith("/atletas", {
        body: expect.objectContaining({ wsId: "BRAJS12", velaid: "MG-T15" }),
      }),
    );
  });

  it("desmarcar a criação de conta envia criarConta false e explica a resposta", async () => {
    POST.mockImplementation(async () => criado({ conta: "sem_email" }));
    montar();
    await aguardarOpcoes();
    const caixa = screen.getByRole("checkbox", { name: "Criar conta e enviar convite ao atleta" });
    expect((caixa as HTMLInputElement).checked).toBe(true);
    fireEvent.click(caixa);
    preencherBasico("BRAJS12");
    confirmar18();
    enviar();
    expect(await screen.findByText(/Nenhuma conta foi criada/)).toBeTruthy();
    expect(POST).toHaveBeenCalledWith("/atletas", {
      body: expect.objectContaining({ criarConta: false }),
    });
  });

  it("conta indisponível orienta a reenviar o convite", async () => {
    POST.mockImplementation(async () => criado({ conta: "indisponivel" }));
    montar();
    await aguardarOpcoes();
    preencherBasico("BRAJS12");
    confirmar18();
    enviar();
    expect(await screen.findByText(/convite não pôde ser enviado neste ambiente/)).toBeTruthy();
  });

  it("VelaID não elegível mostra o motivo e bloqueia o envio", async () => {
    POST.mockResolvedValue(
      ok(velaid({ codigo: "PE-T17", idade: 17, elegivel: false, motivo: "Menor de 18 anos." })),
    );
    montar();
    await aguardarOpcoes();
    buscar("PE-T17");
    expect(
      await screen.findByText(/Cadastro bloqueado com este código: Menor de 18 anos\./),
    ).toBeTruthy();
    POST.mockClear();
    preencherBasico("BRAJS12");
    confirmar18();
    enviar();
    expect(POST).not.toHaveBeenCalled();
  });

  it("VelaID inexistente avisa, mas não impede o cadastro", async () => {
    POST.mockResolvedValueOnce(falha(404, "nao_encontrado", "Atleta não encontrado."));
    montar();
    buscar("XX-000");
    expect(await screen.findByText(/Nenhum atleta com esse código no VelaID/)).toBeTruthy();
  });

  it("409 de WS ID repetido aparece embaixo do campo, e o de VelaID embaixo do VelaID", async () => {
    POST.mockResolvedValue(
      falha(409, "requisicao_invalida", "Já existe um atleta com este ID World Sailing."),
    );
    montar();
    await aguardarOpcoes();
    preencherBasico("BRAJS12");
    confirmar18();
    enviar();
    const msg = await screen.findByText("Já existe um atleta com este ID World Sailing.");
    const campo = screen.getByLabelText("ID World Sailing");
    expect(campo.getAttribute("aria-invalid")).toBe("true");
    expect(campo.getAttribute("aria-describedby")).toBe(msg.id);

    POST.mockResolvedValue(falha(409, "requisicao_invalida", "O código MG-T15 já está no piloto."));
    fireEvent.change(screen.getByLabelText("Código VelaID"), { target: { value: "MG-T15" } });
    enviar();
    const msgVela = await screen.findByText("O código MG-T15 já está no piloto.");
    expect(screen.getByLabelText("Código VelaID").getAttribute("aria-describedby")).toBe(
      msgVela.id,
    );
    // Editar o campo limpa o erro da API.
    fireEvent.change(screen.getByLabelText("ID World Sailing"), { target: { value: "BRAJS13" } });
    expect(screen.queryByText("Já existe um atleta com este ID World Sailing.")).toBeNull();
  });

  it("400 de WS ID inválido vindo da API aparece embaixo do campo", async () => {
    POST.mockResolvedValue({
      data: undefined,
      error: {
        erro: "requisicao_invalida",
        mensagem: "Requisição inválida.",
        campos: [{ campo: "wsId", mensagem: "WS ID fora do padrão do servidor." }],
      },
      response: { status: 400 },
    });
    montar();
    await aguardarOpcoes();
    preencherBasico("BRAJS12");
    confirmar18();
    enviar();
    expect(await screen.findByText("WS ID fora do padrão do servidor.")).toBeTruthy();
  });

  it("termo pendente de atleta com cadastro incompleto mostra o WS ID e VelaID como traço", async () => {
    pendentes = [
      {
        id: "a11",
        nome: null,
        wsId: "BRAXY99",
        velaid: null,
        classe: { id: "c1", nome: "ILCA 6" },
        criadoEm: "2026-11-06T12:00:00.000Z",
        termoAceitoVersao: null,
      },
    ];
    montar();
    expect(await screen.findByText("BRAXY99", { selector: "td:first-child" })).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Perfil de BRAXY99 no World Sailing (abre em nova aba)" }),
    ).toBeTruthy();
    expect(screen.getByRole("cell", { name: "—" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Registrar aceite recebido" }));
    const dialogo = await screen.findByRole("dialog");
    expect(within(dialogo).getByText(/Confirme que BRAXY99 devolveu/)).toBeTruthy();
  });

  it("diferencia quem nunca aceitou de quem aceitou só a versão anterior", async () => {
    pendentes = [
      ...pendentes,
      {
        id: "a10",
        nome: "Davi Rocha",
        wsId: "BRADR17",
        velaid: "BA-T17",
        classe: { id: "c1", nome: "ILCA 6" },
        criadoEm: "2026-11-06T12:00:00.000Z",
        termoAceitoVersao: "Piloto 18+ · v1",
      },
    ];
    montar();
    expect(await screen.findByText("Nunca aceitou")).toBeTruthy();
    expect(screen.getByText("Aceitou a versão Piloto 18+ · v1; falta a vigente")).toBeTruthy();
  });

  it("registra o aceite com a versão do termo e invalida pendentes e ranking", async () => {
    POST.mockResolvedValue(ok({ ok: true }));
    const inv = montar();
    expect(await screen.findByText("Carla Souza")).toBeTruthy();
    expect(screen.getByText("BA-T16")).toBeTruthy();
    expect(screen.getByText("05/11/2026")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Registrar aceite recebido" }));
    const dialogo = await screen.findByRole("dialog");
    fireEvent.click(within(dialogo).getByRole("button", { name: "Confirmar aceite" }));
    await waitFor(() =>
      expect(POST).toHaveBeenCalledWith("/atletas/{id}/termo", {
        params: { path: { id: "a9" } },
        body: { versao: "Piloto 18+ · v2" },
      }),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    const chaves = inv.mock.calls.map((c) => JSON.stringify(c[0]?.queryKey));
    expect(chaves).toContain(JSON.stringify(["atletas", "pendentes"]));
    expect(chaves).toContain(JSON.stringify(["ranking"]));
  });

  it("com próxima versão publicada, o gestor pode registrar o aceite dela", async () => {
    const base = GET.getMockImplementation()!;
    GET.mockImplementation(async (caminho: string, ...r: unknown[]) =>
      caminho === "/termo/proxima"
        ? ok({
            versao: "Piloto 18+ · v3",
            titulo: "Termo v3",
            texto: "novo",
            vigenteDesde: "2026-12-01T02:30:00.000Z",
          })
        : base(caminho, ...r),
    );
    POST.mockResolvedValue(ok({ ok: true }));
    montar();
    fireEvent.click(await screen.findByRole("button", { name: "Registrar aceite recebido" }));
    const dialogo = await screen.findByRole("dialog");
    const proxima = await within(dialogo).findByRole("radio", {
      name: /Próxima, a valer em 30\/11\/2026/,
    });
    fireEvent.click(proxima);
    fireEvent.click(within(dialogo).getByRole("button", { name: "Confirmar aceite" }));
    await waitFor(() =>
      expect(POST).toHaveBeenCalledWith("/atletas/{id}/termo", {
        params: { path: { id: "a9" } },
        body: { versao: "Piloto 18+ · v3" },
      }),
    );
  });

  it("importa CSV e mostra linhas ok, com erro e a tabela de erros", async () => {
    POST.mockResolvedValue(
      ok(
        {
          id: 1,
          linhasOk: 8,
          linhasErro: 2,
          erros: [
            { linha: 3, mensagem: "Data de nascimento inválida." },
            { linha: 7, mensagem: "UF desconhecida." },
          ],
        },
        201,
      ),
    );
    montar();
    expect(screen.getByText(/codigo;nome;genero;data_nascimento/)).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Ranking CBVela"));
    expect(screen.getByText(/velaid;nivel;evento;data;posicao/)).toBeTruthy();
    expect(screen.getByText(/CPF, RG, documento, endereço ou renda/)).toBeTruthy();

    const arquivo = new File(["velaid;nivel\nSC-T01;brasileiro"], "ranking.csv", {
      type: "text/csv",
    });
    fireEvent.change(screen.getByLabelText("Arquivo CSV"), { target: { files: [arquivo] } });
    fireEvent.click(screen.getByRole("button", { name: "Importar" }));

    expect(await screen.findByText("8 linhas ok")).toBeTruthy();
    expect(screen.getByText("2 linhas com erro")).toBeTruthy();
    expect(screen.getByText("UF desconhecida.")).toBeTruthy();
    expect(POST).toHaveBeenCalledWith("/importacoes", {
      body: {
        tipo: "ranking_cbvela",
        arquivoNome: "ranking.csv",
        conteudo: "velaid;nivel\nSC-T01;brasileiro",
      },
    });
  });

  it("importar invalida ranking, atleta, investimento e pendentes, e não duplica o envio", async () => {
    POST.mockResolvedValue(ok({ id: 1, linhasOk: 1, linhasErro: 0, erros: [] }, 201));
    const inv = montar();
    const arquivo = new File(["codigo;nome\nSC-T01;Ana"], "velaid.csv", { type: "text/csv" });
    fireEvent.change(screen.getByLabelText("Arquivo CSV"), { target: { files: [arquivo] } });
    const botao = screen.getByRole("button", { name: "Importar" });
    // Dois cliques seguidos, antes de a leitura do arquivo terminar.
    fireEvent.click(botao);
    fireEvent.click(botao);
    expect(await screen.findByText("1 linhas ok")).toBeTruthy();
    expect(POST).toHaveBeenCalledTimes(1);
    const chaves = inv.mock.calls.map((c) => JSON.stringify(c[0]?.queryKey));
    expect(chaves).toEqual(
      expect.arrayContaining([
        '["ranking"]',
        '["atleta"]',
        '["atletas"]',
        '["investimento"]',
        '["notificacoes"]',
      ]),
    );
  });

  it("sem termos pendentes mostra o estado vazio", async () => {
    pendentes = [];
    montar();
    expect(await screen.findByText("Nenhum termo pendente")).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("o tipo de importação é um radiogroup e o arquivo mostra a dica de tamanho", () => {
    montar();
    const grupo = screen.getByRole("radiogroup", { name: "Tipo de importação" });
    expect(within(grupo).getAllByRole("radio")).toHaveLength(2);
    expect((within(grupo).getByLabelText("VelaID") as HTMLInputElement).checked).toBe(true);
    expect(screen.getByText("CSV, até 512 KB")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Escolher CSV/ })).toBeTruthy();
  });

  it("recusa no cliente arquivo acima de 512 KB, sem chamar a API", async () => {
    montar();
    const grande = new File([new Uint8Array(524289)], "grande.csv", { type: "text/csv" });
    fireEvent.change(screen.getByLabelText("Arquivo CSV"), { target: { files: [grande] } });
    expect(await screen.findByText(/Arquivo acima de 512 KB/)).toBeTruthy();
    expect((screen.getByRole("button", { name: "Importar" }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    expect(POST).not.toHaveBeenCalled();
  });
});
