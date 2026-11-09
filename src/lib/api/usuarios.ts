import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, paraErroApi } from "./cliente";
import type { paths } from "./schema";

/** Contas de acesso (GET/POST /usuarios, PUT /usuarios/{id}, convite) e edição de atletas (PUT /atletas/{id}). */

type Json<T> = T extends { content: { "application/json": infer C } } ? C : never;

export type Usuario = Json<paths["/usuarios"]["get"]["responses"][200]>[number];
export type CorpoUsuario = paths["/usuarios"]["post"]["requestBody"]["content"]["application/json"];
export type UsuarioCriado = Json<paths["/usuarios"]["post"]["responses"][201]>;
export type PapelUsuario = CorpoUsuario["papel"];
export type CorpoAtleta =
  paths["/atletas/{id}"]["put"]["requestBody"]["content"]["application/json"];

export function useUsuarios() {
  return useQuery({
    queryKey: ["usuarios"],
    retry: false,
    queryFn: async () => {
      const { data, error, response } = await api.GET("/usuarios");
      if (error || !data) throw paraErroApi(response.status, error);
      return data;
    },
  });
}

export function useCriarUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (corpo: CorpoUsuario): Promise<UsuarioCriado> => {
      const { data, error, response } = await api.POST("/usuarios", { body: corpo });
      if (error || !data) throw paraErroApi(response.status, error);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["usuarios"] }),
  });
}

export function useReenviarConvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error, response } = await api.POST("/usuarios/{id}/convite", {
        params: { path: { id } },
      });
      if (error) throw paraErroApi(response.status, error);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["usuarios"] }),
  });
}

export function useAlterarAtivo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { data, error, response } = await api.PUT("/usuarios/{id}", {
        params: { path: { id } },
        body: { ativo },
      });
      if (error || !data) throw paraErroApi(response.status, error);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["usuarios"] }),
  });
}

export function useEditarAtleta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, corpo }: { id: string; corpo: CorpoAtleta }) => {
      const { data, error, response } = await api.PUT("/atletas/{id}", {
        params: { path: { id } },
        body: corpo,
      });
      if (error || !data) throw paraErroApi(response.status, error);
      return data;
    },
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["ranking"] }),
        qc.invalidateQueries({ queryKey: ["atleta"] }),
        qc.invalidateQueries({ queryKey: ["usuarios"] }),
      ]);
    },
  });
}
