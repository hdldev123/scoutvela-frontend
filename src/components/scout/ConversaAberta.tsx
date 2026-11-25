import { useQueryClient } from "@tanstack/react-query";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { atributosDoCampo } from "./campo-util";
import {
  AVISO_PRIVACIDADE,
  juntarMensagens,
  mensagemDeErroEnvio,
  rotuloDoAutor,
  textoContador,
  tituloDaConversa,
} from "./conversas-util";
import { fmtDataHora, fmtHora, fmtInstante } from "./formato";
import { MensagemCampo } from "./MensagemCampo";
import { ErroApi, errosPorCampo, mensagemDeErro } from "@/lib/api/cliente";
import {
  buscarMensagens,
  enviarMensagem,
  INTERVALO_POLLING_MS,
  LIMITE_MENSAGENS,
  marcarConversaLida,
  MAX_MENSAGEM,
  useInvalidarListaConversas,
  type Conversa,
  type Mensagem,
} from "@/lib/api/conversas";

type Estado = "carregando" | "ok" | "erro";

function horaDaSupervisao(iso: string): string {
  const hoje = fmtInstante(new Date().toISOString());
  const dia = fmtInstante(iso);
  return dia === hoje ? fmtHora(iso) : `${fmtHora(iso)} de ${dia}`;
}

function ItemMensagem({ m }: { m: Mensagem }) {
  return (
    <li className={`msg-item${m.propria ? " propria" : ""}`}>
      <div className="msg-cab">
        <strong>{m.propria ? "Você" : m.autor.nome}</strong>
        <span className="msg-papel">{rotuloDoAutor(m.autor.papel)}</span>
        <time dateTime={m.enviadaEm}>{fmtDataHora(m.enviadaEm)}</time>
      </div>
      {/* Texto puro: renderizado como texto (React escapa), com as quebras de linha preservadas. */}
      <p className="msg-texto">{m.texto}</p>
    </li>
  );
}

/**
 * Conversa aberta (D16). Mostra as mensagens mais recentes, consulta as novas a cada 15 s com a
 * aba visível e marca como lidas. Renderize com `key={conversa.id}` para zerar o estado ao trocar.
 */
export function ConversaAberta({
  conversa,
  papel,
  aoVoltar,
  acaoExtra,
}: {
  conversa: Conversa;
  papel: string;
  aoVoltar: () => void;
  acaoExtra?: ReactNode;
}) {
  const qc = useQueryClient();
  const invalidarLista = useInvalidarListaConversas();
  const id = conversa.id;
  // Gestor lendo uma conversa de treinador e atleta: leitura por supervisão (não grava "lidas").
  const porSupervisao = papel === "gestor" && conversa.tipo === "treinador_atleta";
  const somenteLeitura = conversa.somenteLeitura || porSupervisao;

  const [itens, setItens] = useState<Mensagem[]>([]);
  const [anterior, setAnterior] = useState<string | null>(null);
  const [estado, setEstado] = useState<Estado>("carregando");
  const [erroCarga, setErroCarga] = useState<unknown>(null);
  const [carregandoAntes, setCarregandoAntes] = useState(false);
  const [erroAntes, setErroAntes] = useState<unknown>(null);

  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erroEnvio, setErroEnvio] = useState<unknown>(null);

  const lista = useRef<HTMLDivElement>(null);
  const seguirFim = useRef(true);
  const alturaAntes = useRef<number | null>(null);
  const ultima = useRef<string | null>(null);

  ultima.current = itens.length > 0 ? itens[itens.length - 1]!.enviadaEm : null;

  // Primeira carga: as mensagens mais recentes. Abrir a conversa a marca como lida.
  useEffect(() => {
    let ativo = true;
    buscarMensagens(id, { limite: LIMITE_MENSAGENS })
      .then((r) => {
        if (!ativo) return;
        setItens(r.itens);
        setAnterior(r.proximoAntesDe);
        setEstado("ok");
        if (!porSupervisao) void marcarConversaLida(qc, id);
      })
      .catch((e: unknown) => {
        if (!ativo) return;
        setErroCarga(e);
        setEstado("erro");
      });
    return () => {
      ativo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Polling: só com a aba visível. Aba oculta para o relógio; ao voltar, consulta na hora.
  useEffect(() => {
    if (estado !== "ok") return;
    let ativo = true;
    let emAndamento = false;
    let relogio: ReturnType<typeof setInterval> | null = null;

    const consultar = async () => {
      if (emAndamento) return;
      emAndamento = true;
      try {
        const ref = ultima.current;
        const r = await buscarMensagens(
          id,
          ref ? { depoisDe: ref, limite: 100 } : { limite: LIMITE_MENSAGENS },
        );
        if (!ativo || r.itens.length === 0) return;
        setItens((atuais) => juntarMensagens(atuais, r.itens));
        if (!porSupervisao && r.itens.some((m) => !m.propria)) void marcarConversaLida(qc, id);
      } catch {
        // Falha de rede: tenta de novo no próximo ciclo, sem incomodar a pessoa.
      } finally {
        emAndamento = false;
      }
    };
    const parar = () => {
      if (relogio !== null) clearInterval(relogio);
      relogio = null;
    };
    const iniciar = () => {
      parar();
      relogio = setInterval(() => void consultar(), INTERVALO_POLLING_MS);
    };
    const aoMudarVisibilidade = () => {
      if (document.visibilityState === "visible") {
        void consultar();
        iniciar();
      } else {
        parar();
      }
    };

    if (document.visibilityState === "visible") iniciar();
    document.addEventListener("visibilitychange", aoMudarVisibilidade);
    return () => {
      ativo = false;
      parar();
      document.removeEventListener("visibilitychange", aoMudarVisibilidade);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado, id]);

  // Rolagem: ao final quando a pessoa já estava lá; nas páginas anteriores, mantém a posição.
  useLayoutEffect(() => {
    const el = lista.current;
    if (!el) return;
    if (alturaAntes.current !== null) {
      el.scrollTop = el.scrollHeight - alturaAntes.current;
      alturaAntes.current = null;
    } else if (seguirFim.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [itens, estado]);

  async function carregarAnteriores() {
    if (!anterior || carregandoAntes) return;
    setCarregandoAntes(true);
    setErroAntes(null);
    try {
      const r = await buscarMensagens(id, { antesDe: anterior, limite: LIMITE_MENSAGENS });
      alturaAntes.current = lista.current?.scrollHeight ?? 0;
      seguirFim.current = false;
      setItens((atuais) => juntarMensagens(atuais, r.itens));
      setAnterior(r.proximoAntesDe);
    } catch (e) {
      setErroAntes(e);
    } finally {
      setCarregandoAntes(false);
    }
  }

  async function enviar() {
    if (somenteLeitura || enviando || texto.trim() === "") return;
    setEnviando(true);
    setErroEnvio(null);
    try {
      const nova = await enviarMensagem(id, texto);
      seguirFim.current = true;
      setItens((atuais) => juntarMensagens(atuais, [nova]));
      setTexto("");
      void invalidarLista();
    } catch (e) {
      setErroEnvio(e);
    } finally {
      setEnviando(false);
    }
  }

  function aoSubmeter(e: FormEvent) {
    e.preventDefault();
    void enviar();
  }

  function aoTeclar(e: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter envia; Shift+Enter quebra a linha. Não interfere na composição de texto (IME).
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void enviar();
    }
  }

  function aoRolar() {
    const el = lista.current;
    if (!el) return;
    seguirFim.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }

  const statusErro = erroEnvio instanceof ErroApi ? erroEnvio.status : null;
  const erroTexto = errosPorCampo(erroEnvio)["texto"];
  const mensagemErro =
    erroEnvio && !erroTexto
      ? mensagemDeErroEnvio(
          statusErro,
          mensagemDeErro(erroEnvio, "Não foi possível enviar a mensagem."),
        )
      : null;
  const restante = MAX_MENSAGEM - texto.length;
  const descricao = [`msg-dica-${id}`, `msg-cont-${id}`, erroTexto ? `msg-erro-${id}` : null]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="msg-aberta">
      <div className="panel-head msg-cab-conversa">
        <button type="button" className="btn sm msg-voltar" onClick={aoVoltar}>
          <i className="ph ph-arrow-left" aria-hidden="true" /> Conversas
        </button>
        <h2>{tituloDaConversa(conversa, papel)}</h2>
        {acaoExtra}
      </div>

      {conversa.tipo === "treinador_atleta" && (
        <p className="note msg-privacidade">
          <i className="ph ph-lock-simple" aria-hidden="true" /> {AVISO_PRIVACIDADE}
        </p>
      )}
      {porSupervisao && conversa.supervisaoAte && (
        <p className="note msg-supervisao" role="status">
          Leitura por supervisão até {horaDaSupervisao(conversa.supervisaoAte)}. O acesso fica
          registrado na auditoria, com o motivo.
        </p>
      )}

      {estado === "carregando" && (
        <p className="muted" role="status">
          Carregando mensagens…
        </p>
      )}
      {estado === "erro" && (
        <p className="note" role="alert">
          {erroCarga instanceof ErroApi && erroCarga.status === 404
            ? "Não foi possível abrir esta conversa. Se o acesso de supervisão expirou, abra para supervisão de novo."
            : mensagemDeErro(erroCarga, "Não foi possível carregar as mensagens.")}
        </p>
      )}

      {estado === "ok" && (
        <>
          {anterior && (
            <div className="btn-row msg-anteriores">
              <button
                type="button"
                className="btn sm"
                disabled={carregandoAntes}
                onClick={() => void carregarAnteriores()}
              >
                {carregandoAntes ? "Carregando…" : "Carregar anteriores"}
              </button>
            </div>
          )}
          {erroAntes ? (
            <p className="note" role="alert">
              {mensagemDeErro(erroAntes, "Não foi possível carregar as mensagens anteriores.")}
            </p>
          ) : null}
          <div
            ref={lista}
            className="msg-lista-rolagem"
            role="log"
            aria-live="polite"
            aria-relevant="additions"
            aria-label="Mensagens da conversa"
            tabIndex={0}
            onScroll={aoRolar}
          >
            {itens.length === 0 ? (
              <p className="muted msg-vazia">
                Nenhuma mensagem ainda.{somenteLeitura ? "" : " Escreva a primeira abaixo."}
              </p>
            ) : (
              <ul className="msg-mensagens">
                {itens.map((m) => (
                  <ItemMensagem key={m.id} m={m} />
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      <form className="msg-envio" onSubmit={aoSubmeter} noValidate>
        {somenteLeitura && (
          <p className="note">
            {porSupervisao
              ? "Leitura por supervisão: a gestão só lê esta conversa e não envia mensagens nela."
              : "Esta conversa está somente leitura (par anterior, depois da troca de treinador, ou conta desativada). Não é possível enviar mensagens."}
          </p>
        )}
        <div className="field">
          <label htmlFor={`msg-texto-${id}`}>Mensagem</label>
          <textarea
            id={`msg-texto-${id}`}
            rows={3}
            value={texto}
            maxLength={MAX_MENSAGEM}
            disabled={somenteLeitura}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={aoTeclar}
            aria-describedby={descricao}
            {...atributosDoCampo(`msg-erro-${id}`, erroTexto)}
          />
        </div>
        <p className="muted msg-dica" id={`msg-dica-${id}`}>
          Enter envia a mensagem. Shift+Enter quebra a linha. Só texto.
        </p>
        <div className="msg-contador" id={`msg-cont-${id}`}>
          <span className={restante <= 100 ? "msg-contador-alerta" : undefined}>
            {textoContador(texto.length, MAX_MENSAGEM)}
          </span>
        </div>
        <MensagemCampo id={`msg-erro-${id}`} texto={erroTexto} />
        {mensagemErro && (
          <p className="note" role="alert">
            {mensagemErro}
          </p>
        )}
        <div className="btn-row">
          <button
            type="submit"
            className="btn primary"
            disabled={somenteLeitura || enviando || texto.trim() === ""}
          >
            {enviando ? "Enviando…" : "Enviar"}
          </button>
        </div>
      </form>
    </div>
  );
}
