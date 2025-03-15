// src/utils/supabaseClient.js
const { createClient } = require('@supabase/supabase-js');
const config = require('../config');

// 使用统一的配置初始化Supabase客户端
// 优先使用config中的配置，确保向后兼容性
const supabaseUrl = config.supabaseUrl;
const supabaseKey = config.supabaseKey;

// 检查配置是否有效
if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase配置缺失，请检查环境变量');
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;