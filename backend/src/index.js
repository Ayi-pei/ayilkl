// 在现有代码中添加
const db = require('./utils/postgres');
const supabase = require('./utils/supabaseClient');

// 应用启动前测试数据库连接
async function testDatabaseConnections() {
  console.log('正在测试数据库连接...');
  
  // 测试 PostgreSQL 连接
  const pgConnected = await db.testConnection();
  
  // 测试 Supabase 连接
  let supabaseConnected = false;
  try {
    const { data, error } = await supabase.from('users').select('count(*)').limit(1);
    if (error) {
      console.error('Supabase 连接测试失败:', error.message);
    } else {
      console.log('Supabase 连接测试成功');
      supabaseConnected = true;
    }
  } catch (err) {
    console.error('Supabase 连接测试异常:', err.message);
  }
  
  return { pgConnected, supabaseConnected };
}

// 在应用启动前调用
testDatabaseConnections().then(({ pgConnected, supabaseConnected }) => {
  if (pgConnected && supabaseConnected) {
    console.log('✅ 所有数据库连接测试通过');
    // 继续启动应用...
  } else {
    console.warn('⚠️ 部分数据库连接测试失败，应用可能无法正常工作');
    // 可以选择继续启动或退出
  }
});

// 其他现有代码...