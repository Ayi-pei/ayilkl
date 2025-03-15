const { createClient } = require('@supabase/supabase-js'); // CommonJS版本的testConnection.js
const fs = require('fs');
const path = require('path');

// 尝试加载环境变量，支持多种环境变量文件位置
let dotenvLoaded = false;

// 方法1：使用dotenv库（如果已安装）
try {
  require('dotenv').config(); // 加载项目根目录的.env文件
  console.log('已通过dotenv库加载根目录的.env文件');
  dotenvLoaded = true;
} catch (err) {
  console.warn('通过dotenv库加载.env文件失败:', err.message);
  console.log('将尝试手动加载.env文件...');
}

// 方法2：如果dotenv加载失败，手动解析.env文件
if (!dotenvLoaded) {
  try {
    // 尝试查找项目根目录的.env文件
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      // 解析.env文件内容并设置到process.env
      envContent.split('\n').forEach(line => {
        // 忽略注释和空行
        if (!line || line.startsWith('#')) return;
        
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim();
          process.env[key.trim()] = value;
        }
      });
      console.log('已手动加载.env文件');
      dotenvLoaded = true;
    } else {
      console.warn('找不到.env文件:', envPath);
    }
  } catch (err) {
    console.warn('手动加载.env文件失败:', err.message);
  }
}

// 从环境变量获取配置，支持多种前缀格式
const supabaseUrl = process.env.VITE_SUPABASE_URL || 
                   process.env.REACT_APP_SUPABASE_URL || 
                   process.env.SUPABASE_URL;

const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 
                    process.env.REACT_APP_SUPABASE_ANON_KEY || 
                    process.env.SUPABASE_ANON_KEY;

// 检查环境变量是否存在
if (!supabaseUrl || !supabaseKey) {
  console.error('环境变量未设置: 需要设置以下环境变量之一:');
  console.error('- VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY');
  console.error('- REACT_APP_SUPABASE_URL 和 REACT_APP_SUPABASE_ANON_KEY');
  console.error('- SUPABASE_URL 和 SUPABASE_ANON_KEY');
  process.exit(1); // 如果缺少必要的环境变量，则退出程序
}

// 创建 Supabase 客户端
const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    // 多层次连接测试策略
    
    // 1. 首先尝试基本连接 - 获取会话信息
    console.log('测试基本连接...');
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('基本连接测试失败:', sessionError);
      return false;
    }
    
    console.log('基本连接测试成功:', sessionData ? '有会话' : '无会话');
    
    // 2. 尝试查询agents表
    console.log('测试agents表连接...');
    const { data: agentsData, error: agentsError } = await supabase
      .from('agents')
      .select('*')
      .limit(1);
    
    if (!agentsError) {
      console.log('agents表连接测试成功:', agentsData);
      return true;
    } else {
      console.log('agents表连接测试失败:', agentsError);
    }
    
    // 3. 尝试查询customers表
    console.log('测试customers表连接...');
    const { data: customersData, error: customersError } = await supabase
      .from('customers')
      .select('*')
      .limit(1);
    
    if (!customersError) {
      console.log('customers表连接测试成功:', customersData);
      return true;
    } else {
      console.log('customers表连接测试失败:', customersError);
    }
    
    // 4. 尝试查询messages表
    console.log('测试messages表连接...');
    const { data: messagesData, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .limit(1);
    
    if (!messagesError) {
      console.log('messages表连接测试成功:', messagesData);
      return true;
    } else {
      console.log('messages表连接测试失败:', messagesError);
    }
    
    // 如果所有表查询都失败，但基本连接成功，则返回部分成功
    console.log('基本连接成功，但无法访问任何表。请检查数据库权限和表结构。');
    return sessionData ? true : false;
    
  } catch (err) {
    console.error('连接测试异常:', err);
    return false;
  }
}

// 如果直接运行此文件，则执行测试
if (require.main === module) {
  console.log('正在测试Supabase连接...');
  console.log(`使用URL: ${supabaseUrl.substring(0, 15)}...`);
  console.log(`使用Key: ${supabaseKey.substring(0, 10)}...`);
  
  testConnection()
    .then(success => {
      if (success) {
        console.log('✅ Supabase连接测试成功!');
      } else {
        console.error('❌ Supabase连接测试失败!');
        process.exit(1);
      }
    })
    .catch(err => {
      console.error('❌ Supabase连接测试发生异常:', err);
      process.exit(1);
    });
}

module.exports = testConnection;