import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, paraErroApi } from "./cliente";
import type { paths } from "./schema";

/** Cadastro de atleta, termos pendentes e importação de CSV, tipados pelo contrato. */

type Json<T> = T extends { content: { "application/json": infer C } } ? C : never;

export type DadosVelaId = Json<paths["/velaid/busca"]["post"]["responses"][200]>;
export type Treinador = Json<paths["/treinadores"]["get"]["responses"][200]>[number];
export type AtletaCadastrado = Json<paths["/atletas"]["post"]["responses"][201]>;
export type CorpoCadastro = paths["/atletas"]["post"]["requestBody"]["content"]["application/json"];
export type AtletaPendente = Json<paths["/atletas/pendentes"]["get"]["responses"][200]>[number];
export type VersaoTermo =
  paths["/atletas/{id}/termo"]["post"]["requestBody"]["content"]["application/json"]["versao"];
export type CorpoImportacao =
  paths["/importacoes"]["post"]["requestBody"]["content"]["application/json"];
export type TipoImportacao = CorpoImportacao["tipo"];
export type ResultadoImportacao = Json<paths["/importacoes"]["post"]["responses"][201]>;
export type ClasseCadastro = Json<paths["/parametros"]["get"]["responses"][200]>["classes"][number];

/** Limite do conteúdo do CSV no contrato (512 KB). */
export const LIMITE_CSV_BYTES = 524288;

export async function buscarVelaId(codigo: string): Promise<DadosVelaId> {
  const { data, error, response } = await api.POST("/velaid/busca", { body: { codigo } });
  if (error || !data) throw paraErroApi(response.status, error);
  return data;
}

export async function cadastrarAtleta(corpo: CorpoCadastro): Promise<AtletaCadastrado> {
  const { data, error, response } = await api.POST("/atletas", { body: corpo });
  if (error || !data) throw paraErroApi(response.status, error);
  return data;
}

/** Registra o aceite recebido; a versão é a do termo vigente (`GET /termo`). */
export async function registrarTermo({
  id,
  versao,
}: {
  id: string;
  versao: VersaoTermo;
}): Promise<void> {
  const { error, response } = await api.POST("/atletas/{id}/termo", {
    params: { path: { id } },
    body: { versao },
  });
  if (error) throw paraErroApi(response.status, error);
}

export async function importarCsv(corpo: CorpoImportacao): Promise<ResultadoImportacao> {
  const { data, error, response } = await api.POST("/importacoes", { body: corpo });
  if (error || !data) throw paraErroApi(response.status, error);
  return data;
}

export function useTreinadores() {
  return useQuery({
    queryKey: ["treinadores"],
    queryFn: async () => {
      const { data, error, response } = await api.GET("/treinadores");
      if (error || !data) throw paraErroApi(response.status, error);
      return data;
    },
  });
}

export function useClasses() {
  return useQuery({
    queryKey: ["parametros", "classes"],
    queryFn: async () => {
      const { data, error, response } = await api.GET("/parametros");
      if (error || !data) throw paraErroApi(response.status, error);
      return data.classes;
    },
  });
}

export function usePendentes() {
  return useQuery({
    queryKey: ["atletas", "pendentes"],
    queryFn: async () => {
      const { data, error, response } = await api.GET("/atletas/pendentes");
      if (error || !data) throw paraErroApi(response.status, error);
      return data;
    },
  });
}

export function useBuscarVelaId() {
  return useMutation({ mutationFn: buscarVelaId });
}

export function useCadastrarAtleta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: cadastrarAtleta,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["atletas", "pendentes"] }),
  });
}

export function useRegistrarTermo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: registrarTermo,
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["atletas", "pendentes"] }),
        qc.invalidateQueries({ queryKey: ["ranking"] }),
      ]);
    },
  });
}

export function useImportarCsv() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: importarCsv,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ranking"] }),
  });
}
