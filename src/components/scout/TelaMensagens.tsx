import { useState } from "react";
import { Abas, PainelAba } from "./Abas";
import { ConversaAberta } from "./ConversaAberta";
import { subtituloDaConversa, supervisaoVigente, tituloDaConversa } from "./conversas-util";
import { EstadoVazio } from "./EstadoVazio";
import { fmtDataHora, fmtHora, fmtInstante } from "./formato";
import { NovaConversaDialog } from "./NovaConversaDialog";
import { SupervisaoDialog } from "./SupervisaoDialog";
import { mensagemDeErro } from "@/lib/api/cliente";
import { useConversas, type Conversa } from "@/lib/api/conversas";
import "@/styles/mensagens.css";

type Aba = "caixas" | "supervisao";

function Selo({ c }: { c: Conversa }) {
  return (
    <>
      {c.somenteLeitura && <span className="pill st-cond">Somente leitura</span>}
      {c.naoLidas > 0 && (
        <>
          <span className="balao" aria-hidden="true">
            {c.naoLidas > 9 ? "9+" : c.naoLidas}
          </span>
          <span className="sr-only">
            {c.naoLidas} {c.naoLidas === 1 ? "mensagem não lida" : "mensagens não lidas"}
          </span>
        </>
      )}
    </>
  );
}

function ItemConversa({
  c,
  papel,
  selecionada,
  aoSelecionar,
}: {
  c: Conversa;
  papel: string;
  selecionada: boolean;
  aoSelecionar: (id: string) => void;
}) {
  const sub = subtituloDaConversa(c, papel);
  return (
    <li>
      <button
        type="button"
        className={`conv-item${selecionada ? " ativa" : ""}${c.naoLidas > 0 ? " nao-lida" : ""}`}
        aria-current={selecionada ? "true" : undefined}
        onClick={() => aoSelecionar(c.id)}
      >
        <span className="conv-linha">
          <strong className="conv-nome">{tituloDaConversa(c, papel)}</strong>
          <Selo c={c} />
        </span>
        {sub && <span className="conv-sub muted">{sub}</span>}
        <span className="conv-sub muted">
          {c.ultimaMensagemEm ? (
            <>
              Última atividade:{" "}
              <time dateTime={c.ultimaMensagemEm}>{fmtDataHora(c.ultimaMensagemEm)}</time>
            </>
          ) : (
            "Sem mensagens"
          )}
        </span>
      </button>
    </li>
  );
}

function ListaDeConversas({
  consulta,
  papel,
  selecionadaId,
  aoSelecionar,
  vazio,
}: {
  consulta: ReturnType<typeof useConversas>;
  papel: string;
  selecionadaId: string | null;
  aoSelecionar: (id: string) => void;
  vazio: string;
}) {
  if (consulta.isPending) {
    return (
      <p className="muted" role="status">
        Carregando conversas…
      </p>
    );
  }
  if (consulta.isError) {
    return (
      <p className="note" role="alert">
        {mensagemDeErro(consulta.error, "Não foi possível carregar as conversas.")}
      </p>
    );
  }
  if (consulta.data.length === 0) {
    return <EstadoVazio icone="chats-circle" titulo="Nenhuma conversa por aqui." texto={vazio} />;
  }
  return (
    <ul className="conv-lista">
      {consulta.data.map((c) => (
        <ItemConversa
          key={c.id}
          c={c}
          papel={papel}
          selecionada={c.id === selecionadaId}
          aoSelecionar={aoSelecionar}
        />
      ))}
    </ul>
  );
}

/** Supervisão (só gestor): conversas entre treinador e atleta, só com metadados. */
function ListaSupervisao({
  consulta,
  papel,
  acessos,
  aoLer,
  aoPedir,
}: {
  consulta: ReturnType<typeof useConversas>;
  papel: string;
  acessos: Record<string, string>;
  aoLer: (id: string) => void;
  aoPedir: (c: Conversa) => void;
}) {
  if (consulta.isPending) {
    return (
      <p className="muted" role="status">
        Carregando conversas…
      </p>
    );
  }
  if (consulta.isError) {
    return (
      <p className="note" role="alert">
        {mensagemDeErro(consulta.error, "Não foi possível carregar as conversas.")}
      </p>
    );
  }
  if (consulta.data.length === 0) {
    return (
      <EstadoVazio
        icone="eye"
        titulo="Nenhuma conversa de treinador e atleta."
        texto="Elas aparecem aqui, só com os nomes e as datas, para a supervisão em caso de denúncia."
      />
    );
  }
  return (
    <>
      <p className="muted conv-aviso-sup">
        Estas conversas são privadas. Para ler uma, informe o motivo: o acesso fica registrado e
        vale 24 horas, só para leitura.
      </p>
      <ul className="conv-lista">
        {consulta.data.map((c) => {
          const ate = acessos[c.id] ?? c.supervisaoAte;
          const vigente = supervisaoVigente({ ...c, supervisaoAte: ate ?? null });
          return (
            <li key={c.id} className="conv-sup">
              <span className="conv-linha">
                <strong className="conv-nome">{tituloDaConversa(c, papel)}</strong>
              </span>
              <span className="conv-sub muted">
                {c.ultimaMensagemEm
                  ? `Última atividade: ${fmtDataHora(c.ultimaMensagemEm)}`
                  : "Sem mensagens"}
                {" · criada em "}
                {fmtInstante(c.criadaEm)}
              </span>
              {vigente && ate && (
                <span className="conv-sub">Leitura liberada até {fmtHora(ate)}</span>
              )}
              <span className="conv-acoes">
                {vigente && (
                  <button type="button" className="btn sm" onClick={() => aoLer(c.id)}>
                    Ler conversa
                  </button>
                )}
                <button type="button" className="btn sm" onClick={() => aoPedir(c)}>
                  {vigente ? "Renovar acesso" : "Abrir para supervisão"}
                </button>
              </span>
            </li>
          );
        })}
      </ul>
    </>
  );
}

/**
 * Mensagens (D16): lista de conversas à esquerda e conversa aberta à direita. No celular, uma
 * coisa de cada vez. A conversa aberta vem da URL (`?c=`). Quem pode conversar com quem a API decide.
 */
export function TelaMensagens({
  papel,
  conversaId,
  aoSelecionar,
}: {
  papel: string;
  conversaId: string | null;
  aoSelecionar: (id: string | null) => void;
}) {
  const gestor = papel === "gestor";
  const principal = useConversas(false);
  const supervisao = useConversas(true, gestor);
  const [aba, setAba] = useState<Aba>("caixas");
  const [nova, setNova] = useState(false);
  const [pedindo, setPedindo] = useState<Conversa | null>(null);
  // Acessos de supervisão recém-liberados (a lista ainda pode estar desatualizada).
  const [acessos, setAcessos] = useState<Record<string, string>>({});
  // Conversa recém-aberta, enquanto a lista não a traz.
  const [recem, setRecem] = useState<Conversa | null>(null);

  let aberta: Conversa | null =
    principal.data?.find((c) => c.id === conversaId) ??
    supervisao.data?.find((c) => c.id === conversaId) ??
    (recem && recem.id === conversaId ? recem : null);
  if (aberta && acessos[aberta.id]) {
    aberta = { ...aberta, supervisaoAte: acessos[aberta.id]!, somenteLeitura: true };
  }
  const carregandoAberta =
    !!conversaId && !aberta && (principal.isPending || (gestor && supervisao.isPending));
  const privada = aberta?.tipo === "treinador_atleta" && gestor;
  const semAcesso = privada && aberta && !supervisaoVigente(aberta);

  const abrirConversa = (c: Conversa) => {
    setRecem(c);
    setNova(false);
    aoSelecionar(c.id);
  };

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Comunicação</div>
          <h1>Mensagens</h1>
          <p>
            Converse dentro do sistema, sem WhatsApp. Só texto, até 2.000 caracteres por mensagem.
          </p>
        </div>
      </div>

      <div className="msg-layout" data-vista={conversaId ? "conversa" : "lista"}>
        <section className="panel msg-coluna-lista" aria-labelledby="msg-lista-t">
          <div className="panel-head">
            <h2 id="msg-lista-t">Conversas</h2>
            <button type="button" className="btn sm primary" onClick={() => setNova(true)}>
              <i className="ph ph-plus" aria-hidden="true" /> Nova conversa
            </button>
          </div>
          {gestor ? (
            <>
              <Abas
                rotulo="Tipo de conversa"
                itens={[
                  { id: "caixas", rotulo: "Caixas da gestão" },
                  { id: "supervisao", rotulo: "Supervisão" },
                ]}
                ativa={aba}
                aoMudar={(id) => setAba(id === "supervisao" ? "supervisao" : "caixas")}
              />
              <PainelAba id="caixas" ativa={aba === "caixas"}>
                <ListaDeConversas
                  consulta={principal}
                  papel={papel}
                  selecionadaId={conversaId}
                  aoSelecionar={aoSelecionar}
                  vazio="Use “Nova conversa” para falar com um atleta ou um treinador."
                />
              </PainelAba>
              <PainelAba id="supervisao" ativa={aba === "supervisao"}>
                <ListaSupervisao
                  consulta={supervisao}
                  papel={papel}
                  acessos={acessos}
                  aoLer={aoSelecionar}
                  aoPedir={setPedindo}
                />
              </PainelAba>
            </>
          ) : (
            <ListaDeConversas
              consulta={principal}
              papel={papel}
              selecionadaId={conversaId}
              aoSelecionar={aoSelecionar}
              vazio="Use “Nova conversa” para começar."
            />
          )}
        </section>

        <section className="panel msg-coluna-conversa" aria-label="Conversa aberta">
          {!conversaId ? (
            <EstadoVazio
              icone="chat-circle-text"
              titulo="Selecione uma conversa."
              texto="Escolha uma conversa da lista ou abra uma nova."
            />
          ) : carregandoAberta ? (
            <p className="muted" role="status">
              Carregando conversa…
            </p>
          ) : !aberta ? (
            <div className="stack">
              <p className="note" role="alert">
                Conversa não encontrada ou sem acesso para você.
              </p>
              <div className="btn-row">
                <button type="button" className="btn" onClick={() => aoSelecionar(null)}>
                  Voltar às conversas
                </button>
              </div>
            </div>
          ) : semAcesso ? (
            <div className="stack">
              <button
                type="button"
                className="btn sm msg-voltar"
                onClick={() => aoSelecionar(null)}
              >
                <i className="ph ph-arrow-left" aria-hidden="true" /> Conversas
              </button>
              <h2>{tituloDaConversa(aberta, papel)}</h2>
              <p className="note">
                Esta conversa é privada. Para lê-la, abra para supervisão e informe o motivo.
              </p>
              <div className="btn-row">
                <button type="button" className="btn primary" onClick={() => setPedindo(aberta)}>
                  Abrir para supervisão
                </button>
              </div>
            </div>
          ) : (
            <ConversaAberta
              key={aberta.id}
              conversa={aberta}
              papel={papel}
              aoVoltar={() => aoSelecionar(null)}
            />
          )}
        </section>
      </div>

      {nova && (
        <NovaConversaDialog papel={papel} aoFechar={() => setNova(false)} aoAbrir={abrirConversa} />
      )}
      {pedindo && (
        <SupervisaoDialog
          conversaId={pedindo.id}
          titulo={tituloDaConversa(pedindo, papel)}
          aoFechar={() => setPedindo(null)}
          aoLiberar={(expiraEm) => {
            const alvo = pedindo;
            setAcessos((a) => ({ ...a, [alvo.id]: expiraEm }));
            setPedindo(null);
            aoSelecionar(alvo.id);
          }}
        />
      )}
    </>
  );
}
