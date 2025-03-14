// ... 现有代码 ...

// 数据库配置
// 构建 PostgreSQL 连接字符串
const buildPostgresConnectionString = () => {
  const password = process.env.POSTGRES_PASSWORD;
  if (!password) {
    console.warn('警告: 未设置 POSTGRES_PASSWORD 环境变量');
    return null;
  }
  return `postgresql://postgres:${password}@db.zmjyodxdvctygjphghxy.supabase.co:5432/postgres`;
};

module.exports = {
  // ... 其他配置 ...
  
  // Supabase 配置
  supabaseUrl: process.env.SUPABASE_URL || 'https://zmjyodxdvctygjphghxy.supabase.co',
  supabaseKey: process.env.SUPABASE_KEY || 'your-anon-key',
  
  // PostgreSQL 直接连接配置
  postgresConnection: buildPostgresConnectionString(),
  
  // ... 其他配置 ...
};