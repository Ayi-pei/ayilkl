// src/services/supabase.ts
import { createClient } from '@supabase/supabase-js';
import CryptoJS from 'crypto-js';

// 使用统一的Supabase配置
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 创建 Supabase 客户端
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 检查配置是否有效
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase 配置缺失，请检查环境变量');
}

// 验证分享链接的函数 (可以在API路由或中间件中使用)
export const validateChatLink = async (linkId: string) => {
  try {
    // 从数据库获取链接记录
    const { data, error } = await supabase
      .from('chat_links')
      .select('*')
      .eq('link_id', linkId)
      .single();
    
    if (error || !data) {
      return { valid: false, message: '链接无效或已过期' };
    }
    
    // 检查是否过期
    const expiresAt = new Date(data.expires_at);
    if (expiresAt < new Date()) {
      return { valid: false, message: '链接已过期' };
    }
    
    // 解密token
    // 修改环境变量名称
    const encryptionKey = import.meta.env.VITE_LINK_ENCRYPTION_KEY || 'default-secret-key';
    
    // 从URL安全的Base64转回普通格式
    const normalizedToken = data.token
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    
    const decryptedBytes = CryptoJS.AES.decrypt(normalizedToken, encryptionKey);
    const tokenData = JSON.parse(decryptedBytes.toString(CryptoJS.enc.Utf8));
    
    // 检查token中的信息是否与记录匹配
    if (tokenData.linkId !== linkId || tokenData.agentId !== data.agent_id) {
      return { valid: false, message: '链接信息不匹配' };
    }
    
    return { 
      valid: true, 
      agentId: data.agent_id,
      expiresAt: data.expires_at
    };
  } catch (error) {
    console.error('验证链接时出错:', error);
    return { valid: false, message: '链接验证过程中出错' };
  }
};