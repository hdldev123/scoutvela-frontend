/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  /** Opcional: URL de um vídeo de fundo para o login. */
  readonly VITE_LOGIN_VIDEO_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
