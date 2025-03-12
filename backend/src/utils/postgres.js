const { Pool } = require('pg');
const config = require('../config');

// 创建连接池
const pool = config.postgresConnection 
  ? new Pool({ connectionString: config.postgresConnection })
  : null;

if (!pool) {
  console.error('错误: 无法创建 PostgreSQL 连接池，请检查连接字符串');
}

module.exports = {
  query: (text, params) => {
    if (!pool) {
      return Promise.reject(new Error('PostgreSQL 连接未配置'));
    }
    return pool.query(text, params);
  },
  pool
};