
const supabaseClient = require('./supabaseClient.js');
async function testConnection() {
  try {
    // 尝试执行一个简单的查询
    const { Data, error } = await supabase
      .from('agentsData')  // 修改为您实际存在的表名
      .select('count(*)')
      .limit(1)
    
    if (error) {
      console.error('连接测试失败:', error)
      return false
    }
    
    console.log('连接测试成功:', data)
    return true
  } catch (err) {
    console.error('连接测试异常:', err)
    return false
  }
}

export default testConnection;