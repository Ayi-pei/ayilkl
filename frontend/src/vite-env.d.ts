/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_LINK_ENCRYPTION_KEY: string;
  readonly VITE_ADMIN_KEY?: string;
  readonly VITE_API_URL?: string;
  readonly VITE_WS_URL?: string;
  // 添加其他环境变量
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}