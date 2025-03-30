const db = require('./utils/postgres');
const supabase = require('./utils/supabaseClient');
const app = require('./app');
const config = require('../config');

const PORT = config.port;

// 检查必要的环境变量
function checkEnvironment() {
  const requiredEnvVars = ['DATABASE_URL', 'SUPABASE_URL', 'SUPABASE_KEY'];
  const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);
  
  if (missing.length) {
    console.error('❌ 缺少必要的环境变量:', missing.join(', '));
    process.exit(1);
  }
}

// 测试数据库连接
async function testDatabaseConnections() {
  console.log('🔄 正在测试数据库连接...');
  
  // 测试 PostgreSQL 连接
  try {
    const pgConnected = await db.testConnection();
    console.log(pgConnected ? '✅ PostgreSQL 连接成功' : '❌ PostgreSQL 连接失败');
  } catch (err) {
    console.error('❌ PostgreSQL 连接错误:', err.message);
    return false;
  }
  
  // 测试 Supabase 连接
  try {
    const { error } = await supabase.from('users').select('count(*)').limit(1);
    if (error) {
      console.error('❌ Supabase 连接失败:', error.message);
      return false;
    }
    console.log('✅ Supabase 连接成功');
  } catch (err) {
    console.error('❌ Supabase 连接异常:', err.message);
    return false;
  }
  
  return true;
}

// 健康检查
function setupHealthCheck(server) {
  app.get('/health', (req, res) => {
    res.json({ 
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });
}

// 优雅退出
function handleGracefulShutdown(server) {
  const shutdown = async () => {
    console.log('🔄 正在关闭服务...');
    
    server.close(async () => {
      try {
        await db.end();
        console.log('✅ 数据库连接已关闭');
      } catch (err) {
        console.error('❌ 关闭数据库连接时出错:', err);
      }
      
      console.log('👋 服务已安全关闭');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

// 添加启动超时控制
const STARTUP_TIMEOUT = 30000; // 30秒超时

// 添加重试机制配置
const RETRY_OPTIONS = {
  maxAttempts: 3,
  delay: 5000
};

// 重试函数
async function withRetry(operation, options = RETRY_OPTIONS) {
  for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (err) {
      if (attempt === options.maxAttempts) throw err;
      console.log(`⏳ 第 ${attempt} 次尝试失败，${options.delay / 1000}秒后重试...`);
      await new Promise(resolve => setTimeout(resolve, options.delay));
    }
  }
}

// 检查数据库必要数据
async function checkInitialData() {
  try {
    const { data: adminCount } = await supabase
      .from('users')
      .select('count(*)', { count: 'exact' })
      .eq('role', 'admin');
    
    if (!adminCount) {
      console.warn('⚠️ 警告: 系统中没有管理员用户');
    }
    
    return true;
  } catch (err) {
    console.error('❌ 检查初始数据失败:', err.message);
    return false;
  }
}

// 修改主函数，完善超时控制和错误处理
async function main() {
  console.log(`📦 启动 ${process.env.npm_package_name} v${process.env.npm_package_version}`);
  
  const startupPromise = (async () => {
    try {
      checkEnvironment();
      
      // 使用重试机制测试数据库连接
      const dbConnected = await withRetry(testDatabaseConnections);
      if (!dbConnected) {
        throw new Error('数据库连接测试失败');
      }
      
      // 检查初始数据
      await checkInitialData();
      
      const server = app.listen(PORT, () => {
        console.log(`🚀 服务器已启动，监听端口 ${PORT}`);
      });
      
      setupHealthCheck(server);
      handleGracefulShutdown(server);
      
      return server;
    } catch (err) {
      console.error('❌ 服务启动失败:', err);
      process.exit(1);
    }
  })();

  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('启动超时')), STARTUP_TIMEOUT);
  });

  try {
    const server = await Promise.race([startupPromise, timeoutPromise]);
    console.log('✅ 服务启动成功');
    return server;
  } catch (err) {
    console.error('❌ 启动过程出错:', err);
    process.exit(1);
  }
}

main();
