// CommonJS版本的testConnection.js
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// 从环境变量获取配置
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

// 创建 Supabase 客户端
const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    // 尝试执行一个简单的查询
    const { data, error } = await supabase
      .from('profiles')  // 修改为您实际存在的表名
      .select('count(*)')
      .limit(1);
    
    if (error) {
      console.error('连接测试失败:', error);
      return false;
    }
    
    console.log('连接测试成功:', data);
    return true;
  } catch (err) {
    console.error('连接测试异常:', err);
    return false;
  }
}

module.exports = testConnection;