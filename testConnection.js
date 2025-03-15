// 测试连接脚本
const testConnection = require('./src/utils/testConnectionCJS.cjs');

testConnection()
  .then(result => {
    console.log('测试结果:', result);
  })
  .catch(err => {
    console.error('测试出错:', err);
  });