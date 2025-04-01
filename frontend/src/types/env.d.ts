interface ImportMetaEnv {
  VITE_API_URL: string;
  VITE_ADMIN_KEY: string;
  VITE_SUPABASE_URL: string;
  VITE_SUPABASE_ANON_KEY: string;
  VITE_WS_URL: string;
  VITE_LINK_ENCRYPTION_KEY: string;
  readonly MODE: string;
  // ...其他环境变量...
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
