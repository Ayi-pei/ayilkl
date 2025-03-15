// src/utils/supabaseAdminClient.js
// 服务端专用的Supabase客户端，使用服务角色密钥
import { createClient } from '@supabase/supabase-js';
import supabaseConfig from './supabaseConfig.js';

// 创建使用服务角色密钥的Supabase客户端
// 注意：此客户端只能在服务端使用，不能暴露给前端
const supabaseAdmin = createClient(supabaseConfig.url, supabaseConfig.serviceKey);

// 检查配置是否有效
if (!supabaseConfig.url || !supabaseConfig.serviceKey) {
  console.error('Supabase管理员配置缺失，请检查环境变量');
}

export default supabaseAdmin;