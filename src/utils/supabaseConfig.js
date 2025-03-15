// src/utils/supabaseConfig.js
// 统一的Supabase配置文件，用于集中管理Supabase相关配置

// 从环境变量获取配置
// 支持多种环境变量命名方式，优先使用VITE_前缀（前端），其次是无前缀（后端）
const getSupabaseUrl = () => {
  return (
    process.env.VITE_SUPABASE_URL ||
    import.meta.env?.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    ''
  );
};

const getSupabaseAnonKey = () => {
  return (
    process.env.VITE_SUPABASE_ANON_KEY ||
    import.meta.env?.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    ''
  );
};

const getSupabaseServiceKey = () => {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    ''
  );
};

// 导出配置
export const supabaseConfig = {
  url: getSupabaseUrl(),
  anonKey: getSupabaseAnonKey(),
  serviceKey: getSupabaseServiceKey(),
};

// 检查配置是否有效
const validateConfig = () => {
  if (!supabaseConfig.url) {
    console.error('Supabase URL 配置缺失，请检查环境变量');
    return false;
  }
  
  if (!supabaseConfig.anonKey) {
    console.error('Supabase 匿名密钥配置缺失，请检查环境变量');
    return false;
  }
  
  if (!supabaseConfig.serviceKey) {
    console.warn('Supabase 服务角色密钥配置缺失，某些管理功能可能无法使用');
  }
  
  return true;
};

// 导出验证函数
export const isSupabaseConfigValid = validateConfig();

// 导出默认配置
export default supabaseConfig;