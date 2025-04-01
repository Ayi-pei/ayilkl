export const config = {
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL,
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  },
  ws: {
    url: import.meta.env.VITE_WS_URL,
    reconnectAttempts: 5,
    reconnectDelay: 1000,
  },
  api: {
    url: import.meta.env.VITE_API_URL,
    timeout: 15000,
  },
  auth: {
    adminKey: import.meta.env.VITE_ADMIN_KEY,
    encryptionKey: import.meta.env.VITE_LINK_ENCRYPTION_KEY,
  }
} as const;

// 类型安全检查
const requiredEnvVars = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'VITE_WS_URL',
  'VITE_API_URL',
  'VITE_ADMIN_KEY',
  'VITE_LINK_ENCRYPTION_KEY'
] as const;

requiredEnvVars.forEach(varName => {
  if (!import.meta.env[varName]) {
    throw new Error(`缺少必需的环境变量: ${varName}`);
  }
});

interface ImportMeta {
  env: {
    VITE_SUPABASE_URL: string;
    VITE_SUPABASE_ANON_KEY: string;
  };
}
