// src/config.js
// 导入统一的配置
const config = require('./config/index');

// 构建 PostgreSQL 连接字符串
const buildPostgresConnectionString = () => {
  const password = process.env.POSTGRES_PASSWORD;
  if (!password) {
    console.warn('警告: 未设置 POSTGRES_PASSWORD 环境变量');
    return null;
  }
  return `postgresql://postgres:${password}@db.zmjyodxdvctygjphghxy.supabase.co:5432/postgres`;
};

// 扩展配置，添加PostgreSQL连接信息
config.postgresConnection = buildPostgresConnectionString();

module.exports = config;