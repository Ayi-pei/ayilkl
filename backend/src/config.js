require('dotenv').config();

// 验证环境变量函数
const validateEnv = (envVars) => {
  const missing = envVars.filter(env => !process.env[env]);
  if (missing.length) {
    throw new Error(`缺少必要的环境变量: ${missing.join(', ')}`);
  }
};

// 验证必要的环境变量
validateEnv([
  'SUPABASE_URL',
  'SUPABASE_SERVICE_KEY',
  'JWT_SECRET'
]);

const config = {
  // 基础配置
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Supabase配置
  supabase: {
    url: process.env.SUPABASE_URL,
    serviceKey: process.env.SUPABASE_SERVICE_KEY,
    anonKey: process.env.SUPABASE_ANON_KEY,
    options: {
      autoRefreshToken: false,
      persistSession: false,
      db: {
        schema: 'public'
      }
    }
  },

  // 数据库配置
  database: {
    tables: {
      agents: 'agents',
      conversations: 'conversations'
    },
    postgres: {
      connectionString: `postgresql://postgres:${process.env.POSTGRES_PASSWORD}@db.zmjyodxdvctygjphghxy.supabase.co:5432/postgres`
    }
  },

  // 代理配置
  agent: {
    maxNicknameLength: 50,
    validStatuses: ['online', 'offline', 'away'],
    defaultStatus: 'online',
    defaultAvatar: 'default.png'
  },

  // 安全配置
  security: {
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
    adminKey: process.env.ADMIN_KEY || 'adminayi888'
  }
};

// 开发环境配置检查
if (config.nodeEnv === 'development') {
  console.log('当前配置:', JSON.stringify(config, null, 2));
}

module.exports = config;