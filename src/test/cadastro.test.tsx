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
      velaid: "BA-T16",
      classe: { id: "c1", nome: "ILCA 6" },
      criadoEm: "2026-11-05T12:00:00.000Z",
    },
  ];
  GET.mockImplementation(async (caminho: string) => {
    if (caminho === "/parametros") {
      return ok({ classes: [{ id: "ilca7", nome: "ILCA 7" }] });
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

describe("TelaCadastro", () => {
  it("busca elegível mostra os dados e cadastra com classe e treinador", async () => {
    POST.mockImplementation(async (caminho: string) => {
      if (caminho === "/velaid/busca") return ok(velaid());
      if (caminho === "/atletas") {
        return ok(
          {
            id: "a1",
            nome: "Bruno Lima",
            termo: { status: "aguardando_aceite", versao: "v1" },
            conta: "convite_enviado",
          },
          201,
        );
      }
      return falha(500, "erro_interno", "?");
    });
    montar();
    expect(screen.getByRole("heading", { level: 1, name: "Cadastrar atleta" })).toBeTruthy();
    buscar(" MG-T15 ");
    expect(await screen.findByText("Bruno Lima")).toBeTruthy();
    expect(screen.getByText("BRA123")).toBeTruthy();
    expect(screen.getByText("Belo Horizonte/MG")).toBeTruthy();
    expect(POST).toHaveBeenCalledWith("/velaid/busca", { body: { codigo: "MG-T15" } });

    const enviar = screen.getByRole("button", { name: "Enviar termo de consentimento" });
    expect((enviar as HTMLButtonElement).disabled).toBe(true);
    await screen.findByRole("option", { name: "ILCA 7" });
    await screen.findByRole("option", { name: "Ana Ribeiro" });
    fireEvent.change(screen.getByLabelText("Classe e função projetadas"), {
      target: { value: "ilca7" },
    });
    fireEvent.change(screen.getByLabelText("Treinador(a) responsável"), {
      target: { value: TREINADOR_ID },
    });
    fireEvent.click(enviar);

    expect(await screen.findByText(/O atleta entra no ranking depois do aceite/)).toBeTruthy();
    expect(POST).toHaveBeenCalledWith("/atletas", {
      body: {
        velaidCodigo: "MG-T15",
        classeId: "ilca7",
        treinadorId: TREINADOR_ID,
        criarConta: true,
      },
    });
    expect(screen.getByText(/Conta criada e convite enviado/)).toBeTruthy();
    expect(toastFn.success).toHaveBeenCalled();
  });

  it("desmarcar a criação de conta envia criarConta false e explica a resposta", async () => {
    POST.mockImplementation(async (caminho: string) => {
      if (caminho === "/velaid/busca") return ok(velaid());
      return ok(
        {
          id: "a1",
          nome: "Bruno Lima",
          termo: { status: "aguardando_aceite", versao: "v2" },
          conta: "sem_email",
        },
        201,
      );
    });
    montar();
    buscar("MG-T15");
    await screen.findByRole("option", { name: "ILCA 7" });
    await screen.findByRole("option", { name: "Ana Ribeiro" });
    const caixa = screen.getByRole("checkbox", { name: "Criar conta e enviar convite ao atleta" });
    expect((caixa as HTMLInputElement).checked).toBe(true);
    fireEvent.click(caixa);
    fireEvent.change(screen.getByLabelText("Classe e função projetadas"), {
      target: { value: "ilca7" },
    });
    fireEvent.change(screen.getByLabelText("Treinador(a) responsável"), {
      target: { value: TREINADOR_ID },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enviar termo de consentimento" }));
    expect(await screen.findByText(/Nenhuma conta foi criada/)).toBeTruthy();
    expect(POST).toHaveBeenCalledWith("/atletas", {
      body: {
        velaidCodigo: "MG-T15",
        classeId: "ilca7",
        treinadorId: TREINADOR_ID,
        criarConta: false,
      },
    });
  });

  it("conta indisponível orienta a reenviar o convite", async () => {
    POST.mockImplementation(async (caminho: string) => {
      if (caminho === "/velaid/busca") return ok(velaid());
      return ok(
        {
          id: "a1",
          nome: "Bruno Lima",
          termo: { status: "aguardando_aceite", versao: "v2" },
          conta: "indisponivel",
        },
        201,
      );
    });
    montar();
    buscar("MG-T15");
    await screen.findByRole("option", { name: "ILCA 7" });
    await screen.findByRole("option", { name: "Ana Ribeiro" });
    fireEvent.change(screen.getByLabelText("Classe e função projetadas"), {
      target: { value: "ilca7" },
    });
    fireEvent.change(screen.getByLabelText("Treinador(a) responsável"), {
      target: { value: TREINADOR_ID },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enviar termo de consentimento" }));
    expect(await screen.findByText(/convite não pôde ser enviado neste ambiente/)).toBeTruthy();
  });

  it("não elegível mostra o motivo e bloqueia o cadastro", async () => {
    POST.mockResolvedValue(
      ok(velaid({ codigo: "PE-T17", idade: 17, elegivel: false, motivo: "Menor de 18 anos." })),
    );
    montar();
    buscar("PE-T17");
    expect(await screen.findByText(/Cadastro bloqueado: Menor de 18 anos\./)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Enviar termo de consentimento" })).toBeNull();
  });

  it("404 no VelaID e erro 409 do cadastro mostram a mensagem", async () => {
    POST.mockResolvedValueOnce(falha(404, "nao_encontrado", "Atleta não encontrado."));
    montar();
    buscar("XX-000");
    expect(await screen.findByText(/Nenhum atleta com esse código no VelaID/)).toBeTruthy();

    POST.mockImplementation(async (caminho: string) =>
      caminho === "/velaid/busca"
        ? ok(velaid())
        : falha(409, "requisicao_invalida", "Atleta já cadastrado."),
    );
    buscar("MG-T15");
    await screen.findByRole("option", { name: "ILCA 7" });
    await screen.findByRole("option", { name: "Ana Ribeiro" });
    fireEvent.change(screen.getByLabelText("Classe e função projetadas"), {
      target: { value: "ilca7" },
    });
    fireEvent.change(screen.getByLabelText("Treinador(a) responsável"), {
      target: { value: TREINADOR_ID },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enviar termo de consentimento" }));
    expect(await screen.findByText("Atleta já cadastrado.")).toBeTruthy();
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
