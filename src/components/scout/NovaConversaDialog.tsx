import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { atributosDoCampo } from "./campo-util";
import { Dialogo } from "./Dialogo";
import { MensagemCampo } from "./MensagemCampo";
import { errosPorCampo, mensagemDeErro } from "@/lib/api/cliente";
import { useRanking } from "@/lib/api/consultas";
import { useAbrirConversa, type Conversa, type CorpoConversa } from "@/lib/api/conversas";
import { useAtletasGestao, useUsuarios } from "@/lib/api/usuarios";

type Opcao = {
  valor: string;
  rotulo: string;
  tipo: CorpoConversa["tipo"];
  /** Quem a pessoa precisa escolher na lista abaixo. */
  alvo?: "atleta" | "treinador";
};

/** O que cada papel pode abrir (a API confere de novo e decide). */
const OPCOES: Record<string, Opcao[]> = {
  atleta: [
    { valor: "treinador", rotulo: "Meu treinador", tipo: "treinador_atleta" },
    { valor: "gestao", rotulo: "Gestão CBVela", tipo: "gestao_atleta" },
  ],
  treinador: [
    { valor: "atleta", rotulo: "Um dos meus atletas", tipo: "treinador_atleta", alvo: "atleta" },
    { valor: "gestao", rotulo: "Gestão CBVela", tipo: "gestao_treinador" },
  ],
  gestor: [
    { valor: "atleta", rotulo: "Um atleta", tipo: "gestao_atleta", alvo: "atleta" },
    { valor: "treinador", rotulo: "Um treinador", tipo: "gestao_treinador", alvo: "treinador" },
  ],
};

type Alvo = { id: string; nome: string };

type PropsSeletor = {
  valor: string;
  aoMudar: (v: string) => void;
  erro: string | undefined;
};

/** Treinador: os próprios atletas (mesma fonte da tela de ranking). */
function SeletorAtletaDoTreinador(props: PropsSeletor) {
  const consulta = useRanking();
  const atletas: Alvo[] = (consulta.data?.itens ?? []).map((i) => ({
    id: i.atleta.id,
    nome: i.atleta.nome,
  }));
  return (
    <SelectDeAlvo
      id="nova-conv-atleta"
      rotulo="Atleta"
      alvos={atletas}
      carregando={consulta.isPending}
      falhou={consulta.isError}
      {...props}
    />
  );
}

function SeletorDeAtleta({ papel, ...props }: PropsSeletor & { papel: string }) {
  return papel === "treinador" ? (
    <SeletorAtletaDoTreinador {...props} />
  ) : (
    <SeletorAtletaDoGestor {...props} />
  );
}

/** Gestor: todos os atletas ativos com cadastro completo. */
function SeletorAtletaDoGestor(props: PropsSeletor) {
  const consulta = useAtletasGestao();
  const atletas: Alvo[] = (consulta.data ?? [])
    .filter((a) => a.ativo && a.cadastroCompleto && a.nome)
    .map((a) => ({ id: a.id, nome: a.nome as string }));
  return (
    <SelectDeAlvo
      id="nova-conv-atleta"
      rotulo="Atleta"
      alvos={atletas}
      carregando={consulta.isPending}
      falhou={consulta.isError}
      {...props}
    />
  );
}

function SeletorTreinador({ valor, aoMudar, erro }: PropsSeletor) {
  const consulta = useUsuarios();
  const treinadores: Alvo[] = (consulta.data ?? [])
    .filter((u) => u.papel === "treinador" && u.ativo)
    .map((u) => ({ id: u.id, nome: u.nome }));
  return (
    <SelectDeAlvo
      id="nova-conv-treinador"
      rotulo="Treinador"
      alvos={treinadores}
      carregando={consulta.isPending}
      falhou={consulta.isError}
      valor={valor}
      aoMudar={aoMudar}
      erro={erro}
    />
  );
}

function SelectDeAlvo({
  id,
  rotulo,
  alvos,
  carregando,
  falhou,
  valor,
  aoMudar,
  erro,
}: {
  id: string;
  rotulo: string;
  alvos: Alvo[];
  carregando: boolean;
  falhou: boolean;
  valor: string;
  aoMudar: (v: string) => void;
  erro: string | undefined;
}) {
  const idErro = `${id}-erro`;
  return (
    <div>
      <label className="field" htmlFor={id}>
        {rotulo}
        <select
          id={id}
          value={valor}
          disabled={carregando}
          onChange={(e) => aoMudar(e.target.value)}
          {...atributosDoCampo(idErro, erro)}
        >
          <option value="">{carregando ? "Carregando…" : "Selecione"}</option>
          {alvos.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nome}
            </option>
          ))}
        </select>
      </label>
      {falhou && (
        <p className="note" role="alert">
          Não foi possível carregar a lista. Tente de novo mais tarde.
        </p>
      )}
      <MensagemCampo id={idErro} texto={erro} />
    </div>
  );
}

/** "Nova conversa": as opções vêm do papel; a API decide se o par pode conversar. */
export function NovaConversaDialog({
  papel,
  aoFechar,
  aoAbrir,
}: {
  papel: string;
  aoFechar: () => void;
  aoAbrir: (conversa: Conversa) => void;
}) {
  const opcoes = OPCOES[papel] ?? [];
  const abrir = useAbrirConversa();
  const [valor, setValor] = useState(opcoes[0]?.valor ?? "");
  const [alvoId, setAlvoId] = useState("");
  const [local, setLocal] = useState<string | undefined>();
  const opcao = opcoes.find((o) => o.valor === valor);
  const doServidor = errosPorCampo(abrir.error);
  const erroAlvo =
    local ?? (opcao?.alvo === "atleta" ? doServidor["atletaId"] : doServidor["treinadorId"]);
  const erroGeral =
    abrir.error && Object.keys(doServidor).length === 0
      ? mensagemDeErro(abrir.error, "Não foi possível abrir a conversa.")
      : null;

  function submeter(e: FormEvent) {
    e.preventDefault();
    if (!opcao) return;
    if (opcao.alvo && !alvoId) {
      return setLocal(opcao.alvo === "atleta" ? "Selecione o atleta." : "Selecione o treinador.");
    }
    setLocal(undefined);
    const corpo: CorpoConversa = { tipo: opcao.tipo };
    if (opcao.alvo === "atleta") corpo.atletaId = alvoId;
    if (opcao.alvo === "treinador") corpo.treinadorId = alvoId;
    abrir.mutate(corpo, {
      onSuccess: ({ conversa, criada }) => {
        toast.success(criada ? "Conversa aberta." : "Você já tinha essa conversa: abrimos ela.");
        aoAbrir(conversa);
      },
    });
  }

  return (
    <Dialogo titulo="Nova conversa" aoFechar={aoFechar} bloqueado={abrir.isPending}>
      <form className="stack" onSubmit={submeter} noValidate>
        <div>
          <label className="field" htmlFor="nova-conv-com">
            Conversar com
            <select
              id="nova-conv-com"
              value={valor}
              onChange={(e) => {
                setValor(e.target.value);
                setAlvoId("");
                setLocal(undefined);
                abrir.reset();
              }}
            >
              {opcoes.map((o) => (
                <option key={o.valor} value={o.valor}>
                  {o.rotulo}
                </option>
              ))}
            </select>
          </label>
        </div>
        {opcao?.alvo === "atleta" && (
          <SeletorDeAtleta
            papel={papel}
            valor={alvoId}
            aoMudar={(v) => {
              setAlvoId(v);
              setLocal(undefined);
            }}
            erro={erroAlvo}
          />
        )}
        {opcao?.alvo === "treinador" && (
          <SeletorTreinador
            valor={alvoId}
            aoMudar={(v) => {
              setAlvoId(v);
              setLocal(undefined);
            }}
            erro={erroAlvo}
          />
        )}
        {erroGeral && (
          <p className="note" role="alert">
            {erroGeral}
          </p>
        )}
        <div className="btn-row">
          <button type="submit" className="btn primary" disabled={abrir.isPending}>
            {abrir.isPending ? "Abrindo…" : "Abrir conversa"}
          </button>
          <button type="button" className="btn" onClick={aoFechar} disabled={abrir.isPending}>
            Cancelar
          </button>
        </div>
      </form>
    </Dialogo>
  );
}
