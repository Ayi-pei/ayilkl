const { Pool } = require('pg');
const config = require('../config');

// 创建连接池
const pool = config.postgresConnection 
  ? new Pool({ connectionString: config.postgresConnection })
  : null;

if (!pool) {
  console.error('错误: 无法创建 PostgreSQL 连接池，请检查连接字符串');
}

// 测试连接函数
const testConnection = async () => {
  try {
    if (!pool) {
      console.error('错误: PostgreSQL 连接池未初始化');
      return false;
    }
    
    const result = await pool.query('SELECT NOW()');
    console.log('PostgreSQL 数据库连接成功:', result.rows[0]);
    return true;
  } catch (error) {
    console.error('PostgreSQL 数据库连接失败:', error.message);
    return false;
  }
};

module.exports = {
  query: (text, params) => {
    if (!pool) {
      return Promise.reject(new Error('PostgreSQL 连接未配置'));
    }
    return pool.query(text, params);
  },
  pool,
  testConnection
};