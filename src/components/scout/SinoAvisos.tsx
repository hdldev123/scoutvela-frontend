import { Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  destinoDoAviso,
  detalheDoAviso,
  fraseDoAviso,
  nomeDoSino,
  textoNaoLidos,
} from "./avisos-util";
import { Dialogo } from "./Dialogo";
import { EstadoVazio } from "./EstadoVazio";
import { fmtInstante } from "./formato";
import { mensagemDeErro } from "@/lib/api/cliente";
import { textoDoBalao } from "@/lib/auth/navegacao";
import { useAvisos, useMarcarAvisoLido, useMarcarTodosLidos, type Aviso } from "@/lib/api/avisos";
import "@/styles/avisos.css";

/** Sino do topo (gestor, treinador e atleta): contagem de não lidos e painel com a lista. */
export function SinoAvisos({ naoLidos }: { naoLidos: number }) {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <button
        type="button"
        className="btn sino"
        aria-haspopup="dialog"
        aria-label={nomeDoSino(naoLidos)}
        onClick={() => setAberto(true)}
      >
        <i className="ph ph-bell" aria-hidden="true" />
        {naoLidos > 0 && (
          <span className="balao sino-balao" aria-hidden="true">
            {textoDoBalao(naoLidos)}
          </span>
        )}
      </button>
      {aberto && <PainelAvisos naoLidos={naoLidos} aoFechar={() => setAberto(false)} />}
    </>
  );
}

function ConteudoDoAviso({ a }: { a: Aviso }) {
  const detalhe = detalheDoAviso(a);
  return (
    <>
      {a.lidoEm === null && <span className="sr-only">Não lido. </span>}
      <span className="aviso-frase">{fraseDoAviso(a)}</span>
      {/* Texto puro: nunca interpretado como HTML. */}
      {detalhe && <span className="aviso-msg">{detalhe}</span>}
      <time className="aviso-data muted" dateTime={a.criadoEm}>
        {fmtInstante(a.criadoEm)}
      </time>
    </>
  );
}

function ItemAviso({ a, aoAbrir }: { a: Aviso; aoAbrir: (a: Aviso) => void }) {
  const destino = destinoDoAviso(a);
  const classe = `aviso-item${a.lidoEm === null ? " nao-lido" : ""}`;
  let acao: ReactNode;
  if (destino?.to === "/atletas/$id") {
    acao = (
      <Link to="/atletas/$id" params={destino.params} className={classe} onClick={() => aoAbrir(a)}>
        <ConteudoDoAviso a={a} />
      </Link>
    );
  } else if (destino) {
    acao = (
      <Link to={destino.to} className={classe} onClick={() => aoAbrir(a)}>
        <ConteudoDoAviso a={a} />
      </Link>
    );
  } else {
    acao = (
      <button type="button" className={classe} onClick={() => aoAbrir(a)}>
        <ConteudoDoAviso a={a} />
      </button>
    );
  }
  return <li>{acao}</li>;
}

function PainelAvisos({ naoLidos, aoFechar }: { naoLidos: number; aoFechar: () => void }) {
  const consulta = useAvisos(true);
  const marcar = useMarcarAvisoLido();
  const marcarTodos = useMarcarTodosLidos();
  const itens = consulta.data?.pages.flatMap((p) => p.itens) ?? [];
  // Mesmo número do sino quando a lista ainda não chegou; depois, o da própria API de avisos.
  const total = consulta.data?.pages[0]?.naoLidos ?? naoLidos;

  const abrir = (a: Aviso) => {
    if (a.lidoEm === null) marcar.mutate(a.id);
    aoFechar();
  };

  return (
    <Dialogo titulo="Avisos" aoFechar={aoFechar}>
      <div className="avisos-topo">
        <p role="status" className="avisos-contagem">
          {textoNaoLidos(total)}
        </p>
        <button
          type="button"
          className="btn sm"
          disabled={total === 0 || marcarTodos.isPending}
          onClick={() => marcarTodos.mutate()}
        >
          Marcar todos como lidos
        </button>
      </div>
      {marcarTodos.isError && (
        <p className="note" role="alert">
          {mensagemDeErro(marcarTodos.error)}
        </p>
      )}
      {consulta.isPending ? (
        <p className="muted" role="status">
          Carregando avisos…
        </p>
      ) : consulta.isError ? (
        <p className="note" role="alert">
          {mensagemDeErro(consulta.error)}
        </p>
      ) : itens.length === 0 ? (
        <EstadoVazio
          icone="bell"
          titulo="Nenhum aviso por enquanto."
          texto="Respostas, anexos e pedidos de ajuste aparecem aqui."
        />
      ) : (
        <section aria-label="Lista de avisos" className="avisos-regiao">
          <ul className="avisos-lista">
            {itens.map((a) => (
              <ItemAviso key={a.id} a={a} aoAbrir={abrir} />
            ))}
          </ul>
        </section>
      )}
      {consulta.hasNextPage && (
        <div className="btn-row">
          <button
            type="button"
            className="btn"
            disabled={consulta.isFetchingNextPage}
            onClick={() => void consulta.fetchNextPage()}
          >
            {consulta.isFetchingNextPage ? "Carregando…" : "Carregar mais"}
          </button>
        </div>
      )}
    </Dialogo>
  );
}
