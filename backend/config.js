require('dotenv').config();

// 环境变量验证
const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_KEY',
  'SUPABASE_ANON_KEY',
  'JWT_SECRET'
];

// 验证环境变量函数
const validateEnv = () => {
  const missing = requiredEnvVars.filter(env => !process.env[env]);
  if (missing.length) {
    throw new Error(`缺少必要的环境变量: ${missing.join(', ')}`);
  }
};

validateEnv();

const config = {
  server: {
    port: parseInt(process.env.PORT || '3000'),
    nodeEnv: process.env.NODE_ENV || 'development',
    cors: {
      origins: ['http://localhost:3000', 'http://localhost:3003', 'http://localhost:5173'],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Admin-Key']
    }
  },

  supabase: {
    url: process.env.SUPABASE_URL,
    serviceKey: process.env.SUPABASE_SERVICE_KEY,
    anonKey: process.env.SUPABASE_ANON_KEY,
    options: {
      autoRefreshToken: false,
      persistSession: false,
      db: { schema: 'public' }
    }
  },

  database: {
    tables: {
      agents: 'agents',
      customers: 'customers',
      messages: 'messages',
      conversations: 'conversations',
      blacklist: 'blacklist',
      agentKeys: 'agent_keys'
    }
  }
};

if (config.server.nodeEnv === 'development') {
  console.log('配置加载完成');
  console.log(`环境: ${config.server.nodeEnv}`);
  console.log(`端口: ${config.server.port}`);
}

module.exports = config;
