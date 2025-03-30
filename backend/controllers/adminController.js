const supabaseAdmin = require('../../src/utils/supabaseAdminClient.js'); // 或使用 ES Module 导入方式

// 示例：创建客服接口
async function createAgent(req, res) {
  try {
    const { nickname } = req.body;
    if (!nickname) {
      return res.status(400).json({ message: '缺少客服昵称' });
    }
    // 生成新的客服ID（可使用uuid库）
    const newAgentId = require('uuid').v4();
    const now = new Date().toISOString();
    // 使用服务角色密钥执行插入操作
    const { error } = await supabaseAdmin
      .from('agents')
      .insert({
        id: newAgentId,
        nickname,
        status: 'online',
        created_at: now,
        updated_at: now
      });
    if (error) throw error;
    res.json({ agentId: newAgentId });
  } catch (err) {
    console.error('创建客服失败:', err);
    res.status(500).json({ message: err.message });
  }
}

// 新增：更新客服接口示例
async function updateAgent(req, res) {
  try {
    const { agentId } = req.params;
    const { nickname, status } = req.body;
    const now = new Date().toISOString();
    const { error } = await supabaseAdmin
      .from('agents')
      .update({ nickname, status, updated_at: now })
      .eq('id', agentId);
    if (error) throw error;
    res.json({ agentId });
  } catch (err) {
    console.error('更新客服失败:', err);
    res.status(500).json({ message: err.message });
  }
}

// 新增：删除客服接口示例
async function deleteAgent(req, res) {
  try {
    const { agentId } = req.params;
    const { error } = await supabaseAdmin
      .from('agents')
      .delete()
      .eq('id', agentId);
    if (error) throw error;
    res.json({ agentId });
  } catch (err) {
    console.error('删除客服失败:', err);
    res.status(500).json({ message: err.message });
  }
}

module.exports = {
  createAgent,
  updateAgent,
  deleteAgent,
  // ...其他管理操作接口...
};
