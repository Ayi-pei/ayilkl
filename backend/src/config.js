// src/config.js
require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  
  // Supabase配置
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_SERVICE_KEY,
  
  // PostgreSQL连接
  postgresConnection: process.env.POSTGRES_CONNECTION_STRING,
  
  // JWT配置
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
  jwtExpiresIn: '7d',
  
  // 其他配置...
};