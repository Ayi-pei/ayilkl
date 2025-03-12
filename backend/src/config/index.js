// src/config/index.js
require('dotenv').config();

const config = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Supabase配置
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_SERVICE_KEY,
  
  // JWT配置
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  
  // 客服链接配置
  linkEncryptionKey: process.env.LINK_ENCRYPTION_KEY || 'default-secret-key',
  linkExpiryDays: parseInt(process.env.LINK_EXPIRY_DAYS || '7'), // 默认7天过期
  linkBaseUrl: process.env.LINK_BASE_URL || 'http://localhost:3000/chat', // 短链接基础URL
  
  // 其他配置
  maxUploadSize: process.env.MAX_UPLOAD_SIZE || 10 * 1024 * 1024, // 默认10MB
  adminKey: process.env.ADMIN_KEY || 'adminayi888',
};

// 验证必要的配置项
const requiredEnvs = ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY', 'JWT_SECRET'];
const missingEnvs = requiredEnvs.filter(env => !process.env[env]);

if (missingEnvs.length > 0) {
  throw new Error(`Missing required environment variables: ${missingEnvs.join(', ')}`);
}

module.exports = config;