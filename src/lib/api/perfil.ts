import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, paraErroApi } from "./cliente";
import type { paths } from "./schema";

type Json<T> = T extends { content: { "application/json": infer C } } ? C : never;

export type Perfil = Json<paths["/me/perfil"]["get"]["responses"][200]>;
export type CorpoPerfil = paths["/me/perfil"]["put"]["requestBody"]["content"]["application/json"];
export type CorpoFoto = paths["/me/foto"]["post"]["requestBody"]["content"]["application/json"];

/** `GET /me/perfil` (chave `['perfil']`). IBVAR recebe 403, então só liga quando `enabled`. */
export function usePerfil(opcoes: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ["perfil"],
    enabled: opcoes.enabled ?? true,
    retry: false,
    queryFn: async () => {
      const { data, error, response } = await api.GET("/me/perfil");
      if (error || !data) throw paraErroApi(response.status, error);
      return data;
    },
  });
}

function useInvalidarPerfil() {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ["me"] }),
      qc.invalidateQueries({ queryKey: ["perfil"] }),
      qc.invalidateQueries({ queryKey: ["atleta"] }),
    ]);
}

/** `PUT /me/perfil`: nome (treinador e gestor) ou e-mail de contato (atleta). */
export function useSalvarPerfil() {
  const invalidar = useInvalidarPerfil();
  return useMutation({
    mutationFn: async (corpo: CorpoPerfil) => {
      const { error, response } = await api.PUT("/me/perfil", { body: corpo });
      if (error) throw paraErroApi(response.status, error);
    },
    onSuccess: invalidar,
  });
}

/** `POST /me/foto`: envia ou troca a foto. */
export function useEnviarFoto() {
  const invalidar = useInvalidarPerfil();
  return useMutation({
    mutationFn: async (corpo: CorpoFoto) => {
      const { data, error, response } = await api.POST("/me/foto", { body: corpo });
      if (error || !data) throw paraErroApi(response.status, error);
      return data;
    },
    onSuccess: invalidar,
  });
}

/** `DELETE /me/foto`: remove a foto (idempotente). */
export function useRemoverFoto() {
  const invalidar = useInvalidarPerfil();
  return useMutation({
    mutationFn: async () => {
      const { error, response } = await api.DELETE("/me/foto");
      if (error) throw paraErroApi(response.status, error);
    },
    onSuccess: invalidar,
  });
}
