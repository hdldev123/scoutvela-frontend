import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const GET = vi.fn();
const POST = vi.fn();
const PUT = vi.fn();
const DELETE = vi.fn();
const updateUser = vi.hoisted(() => vi.fn());
const preparar = vi.hoisted(() => vi.fn());
const toastFn = vi.hoisted(() => Object.assign(vi.fn(), { error: vi.fn() }));

vi.mock("@/lib/api/cliente", async (importar) => ({
  ...(await importar<typeof import("@/lib/api/cliente")>()),
  api: {
    GET: (...a: unknown[]) => GET(...a),
    POST: (...a: unknown[]) => POST(...a),
    PUT: (...a: unknown[]) => PUT(...a),
    DELETE: (...a: unknown[]) => DELETE(...a),
  },
}));
vi.mock("@/lib/auth/supabase", () => ({
  getSupabase: () => ({ auth: { updateUser } }),
}));
vi.mock("@/lib/foto", async (importar) => ({
  ...(await importar<typeof import("@/lib/foto")>()),
  prepararFoto: (...a: unknown[]) => preparar(...a),
}));
vi.mock("sonner", () => ({ toast: toastFn }));
vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    ...resto
  }: { children: ReactNode; to: string } & Record<string, unknown>) => (
    <a href={to} {...resto}>
      {children}
    </a>
  ),
  useRouterState: () => "/ranking",
  useNavigate: () => vi.fn(),
}));

import { Shell } from "@/components/scout/Shell";
import { recorteQuadrado, validarFoto } from "@/lib/foto";

type Papel = "atleta" | "treinador" | "gestor" | "ibvar";

function perfil(papel: Papel, extra: Record<string, unknown> = {}) {
  return {
    nome: "Ana Souza",
    email: "ana@cbvela.org",
    papel,
    fotoUrl: null,
    mfaAtivo: true,
    atleta:
      papel === "atleta"
        ? {
            velaid: "SC-T07",
            classe: { id: "c1", nome: "ILCA 6" },
            numeroVela: "BRA 123",
            dataNascimento: "2000-01-01",
            clube: "Clube Náutico",
            cidade: "Florianópolis",
            uf: "SC",
            treinador: { id: "t1", nome: "Rui Lima" },
            emailContato: "ana@contato.com",
            termoAceitoEm: "2026-10-01T10:00:00Z",
            compartilharIbvar: false,
          }
        : null,
    treinador: papel === "treinador" ? { quantidadeAtletas: 7 } : null,
    ...extra,
  };
}

function montar(papel: Papel, dados = perfil(papel)) {
  GET.mockResolvedValue({ data: dados, response: { status: 200 } });
  PUT.mockResolvedValue({ data: {}, response: { status: 200 } });
  const me = {
    usuario: { nome: "Ana Souza", papel },
    atleta: null,
    telas: [],
  };
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <Shell me={me} onSair={() => {}}>
        <p>conteúdo</p>
      </Shell>
    </QueryClientProvider>,
  );
}

async function abrir() {
  fireEvent.click(screen.getByRole("button", { name: /Ana Souza/ }));
  return screen.findByRole("dialog", { name: "Meu perfil" });
}

beforeEach(() => {
  for (const f of [GET, POST, PUT, DELETE, updateUser, preparar, toastFn, toastFn.error])
    f.mockReset();
});

describe("Modal Meu perfil", () => {
  it.each(["atleta", "treinador", "gestor"] as const)("abre para %s", async (papel) => {
    montar(papel);
    await abrir();
    expect(await screen.findByText("ana@cbvela.org")).toBeInTheDocument();
    expect(screen.getByText("Ativa nesta sessão")).toBeInTheDocument();
  });

  it("não abre para o IBVAR", () => {
    montar("ibvar");
    expect(screen.queryByRole("button", { name: /Ana Souza/ })).toBeNull();
    expect(GET).not.toHaveBeenCalled();
  });

  it("treinador vê a quantidade de atletas", async () => {
    montar("treinador");
    await abrir();
    expect(await screen.findByText("7")).toBeInTheDocument();
  });

  it("atleta vê o VelaID só leitura e o link do consentimento", async () => {
    montar("atleta");
    await abrir();
    expect(await screen.findByText("SC-T07")).toBeInTheDocument();
    expect(screen.getByText("Florianópolis/SC")).toBeInTheDocument();
    expect(screen.getByText("Rui Lima")).toBeInTheDocument();
    expect(screen.getByText("Desativado")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Gerenciar no painel/ })).toHaveAttribute(
      "href",
      "/painel",
    );
  });

  it("treinador edita o nome com o corpo certo", async () => {
    montar("treinador");
    await abrir();
    const campo = await screen.findByLabelText("Nome");
    fireEvent.change(campo, { target: { value: "Ana Maria" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() =>
      expect(PUT).toHaveBeenCalledWith("/me/perfil", { body: { nome: "Ana Maria" } }),
    );
  });

  it("atleta edita só o e-mail de contato", async () => {
    montar("atleta");
    await abrir();
    const campo = await screen.findByLabelText("E-mail de contato");
    fireEvent.change(campo, { target: { value: "novo@contato.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() =>
      expect(PUT).toHaveBeenCalledWith("/me/perfil", {
        body: { emailContato: "novo@contato.com" },
      }),
    );
  });

  it("mostra o erro da API ao salvar", async () => {
    montar("gestor");
    await abrir();
    PUT.mockResolvedValue({
      error: { erro: "requisicao_invalida", mensagem: "Nome inválido." },
      response: { status: 400 },
    });
    await screen.findByLabelText("Nome");
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Nome inválido.");
  });

  it("pedir correção envia tipo correcao com a descrição", async () => {
    montar("atleta");
    await abrir();
    POST.mockResolvedValue({ data: { id: "p1" }, response: { status: 201 } });
    fireEvent.click(await screen.findByRole("button", { name: /Pedir correção/ }));
    fireEvent.change(screen.getByLabelText("O que precisa ser corrigido?"), {
      target: { value: "Corrigir o clube para Iate Clube" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enviar pedido" }));
    await waitFor(() =>
      expect(POST).toHaveBeenCalledWith("/pedidos-titular", {
        body: { tipo: "correcao", descricao: "Corrigir o clube para Iate Clube" },
      }),
    );
  });

  it("recusa foto de tipo errado ou grande demais", async () => {
    montar("gestor");
    await abrir();
    const entrada = await screen.findByLabelText("Escolher foto");
    fireEvent.change(entrada, {
      target: { files: [new File(["x"], "a.gif", { type: "image/gif" })] },
    });
    expect(await screen.findByText("Use uma imagem JPG ou PNG.")).toBeInTheDocument();
    const grande = new File(["x"], "a.jpg", { type: "image/jpeg" });
    Object.defineProperty(grande, "size", { value: 3 * 1024 * 1024 });
    fireEvent.change(entrada, { target: { files: [grande] } });
    expect(await screen.findByText("A foto precisa ter até 2 MB.")).toBeInTheDocument();
    expect(preparar).not.toHaveBeenCalled();
  });

  it("envia a foto recortada", async () => {
    montar("gestor");
    await abrir();
    preparar.mockResolvedValue({
      tipoMime: "image/png",
      conteudoBase64: "QUJD",
      previa: "data:image/png;base64,QUJD",
    });
    POST.mockResolvedValue({
      data: { fotoUrl: "https://x.test/f.png" },
      response: { status: 200 },
    });
    fireEvent.change(await screen.findByLabelText("Escolher foto"), {
      target: { files: [new File(["x"], "a.png", { type: "image/png" })] },
    });
    fireEvent.click(await screen.findByRole("button", { name: "Salvar foto" }));
    await waitFor(() =>
      expect(POST).toHaveBeenCalledWith("/me/foto", {
        body: { tipoMime: "image/png", conteudoBase64: "QUJD" },
      }),
    );
  });

  it("remove a foto", async () => {
    montar("gestor", perfil("gestor", { fotoUrl: "https://x.test/f.png" }));
    await abrir();
    DELETE.mockResolvedValue({ response: { status: 204 } });
    fireEvent.click(await screen.findByRole("button", { name: "Remover foto" }));
    await waitFor(() => expect(DELETE).toHaveBeenCalledWith("/me/foto"));
  });

  it("troca a senha pelo Supabase e valida o mínimo e a confirmação", async () => {
    montar("gestor");
    await abrir();
    updateUser.mockResolvedValue({ error: null });
    fireEvent.click(await screen.findByRole("button", { name: "Trocar senha" }));
    fireEvent.change(screen.getByLabelText("Nova senha"), { target: { value: "curta" } });
    fireEvent.change(screen.getByLabelText("Confirmar nova senha"), { target: { value: "curta" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar senha" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("pelo menos 10");

    fireEvent.change(screen.getByLabelText("Nova senha"), { target: { value: "senha-longa-1" } });
    fireEvent.change(screen.getByLabelText("Confirmar nova senha"), {
      target: { value: "senha-longa-2" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar senha" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("não coincidem");
    expect(updateUser).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Confirmar nova senha"), {
      target: { value: "senha-longa-1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar senha" }));
    await waitFor(() => expect(updateUser).toHaveBeenCalledWith({ password: "senha-longa-1" }));
  });

  it("Esc fecha e devolve o foco a quem abriu", async () => {
    montar("gestor");
    const botao = screen.getByRole("button", { name: /Ana Souza/ });
    botao.focus();
    await abrir();
    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(botao).toHaveFocus();
  });

  it("o foco fica preso: Tab no último volta ao primeiro e Shift+Tab no primeiro vai ao último", async () => {
    montar("gestor");
    const dialogo = await abrir();
    await screen.findByLabelText("Nome");
    const itens = Array.from(
      dialogo.querySelectorAll<HTMLElement>("button:not([disabled]), input:not([disabled])"),
    );
    const primeiro = itens[0]!;
    const ultimo = itens[itens.length - 1]!;
    ultimo.focus();
    fireEvent.keyDown(window, { key: "Tab" });
    expect(primeiro).toHaveFocus();
    fireEvent.keyDown(window, { key: "Tab", shiftKey: true });
    expect(ultimo).toHaveFocus();
  });
});

describe("lib/foto", () => {
  it("valida tipo e tamanho", () => {
    expect(validarFoto({ type: "image/webp", size: 10 })).toMatch(/JPG ou PNG/);
    expect(validarFoto({ type: "image/png", size: 2 * 1024 * 1024 + 1 })).toMatch(/2 MB/);
    expect(validarFoto({ type: "image/jpeg", size: 100 })).toBeNull();
  });

  it("recorte quadrado centralizado", () => {
    expect(recorteQuadrado(400, 200)).toEqual({ x: 100, y: 0, lado: 200 });
    expect(recorteQuadrado(200, 300)).toEqual({ x: 0, y: 50, lado: 200 });
  });
});
