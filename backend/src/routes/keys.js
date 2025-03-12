// 后端示例 (Node.js + Express)
// routes/keys.js
const express = require('express');
const router = express.Router();
const supabase = require('../utils/supabaseClient');
const config = require('../config');
const { AppError } = require('../middlewares/error');
const { authenticate, requireAdmin, authenticateApiKey } = require('../middlewares/auth');
const crypto = require('crypto');
const { nanoid } = require('nanoid');

// 验证卡密
router.post('/verify', async (req, res, next) => {
  try {
    const { key } = req.body;
    
    if (!key) {
      return res.json({ valid: false, message: '卡密不能为空' });
    }
    
    // 管理员密钥检查
    if (key === config.adminKey) {
      return res.json({ valid: true, isAdmin: true });
    }
    
    // 从数据库查询卡密
    const { data, error } = await supabase
      .from('agent_keys')
      .select('*, agents(id, nickname, avatar, status, share_link_id)')
      .eq('key', key)
      .eq('is_active', true)
      .single();
      
    if (error || !data) {
      return res.json({ valid: false, message: '无效的卡密' });
    }
    
    // 检查过期时间
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return res.json({ valid: false, message: '卡密已过期' });
    }
    
    return res.json({ 
      valid: true, 
      isAdmin: false, 
      agentId: data.agent_id,
      agentData: {
        id: data.agents.id,
        nickname: data.agents.nickname,
        avatar: data.agents.avatar,
        status: data.agents.status
      },
      linkId: data.agents.share_link_id // 返回客服的分享链接ID
    });
  } catch (error) {
    console.error('验证卡密失败:', error);
    return res.status(500).json({ valid: false, message: '服务器错误' });
  }
});

// 生成卡密
router.post('/generate', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { agentId, expiryDays = 30 } = req.body;
    
    if (!agentId) {
      throw new AppError('客服ID不能为空', 400);
    }
    
    // 生成随机密钥
    const key = crypto.randomBytes(16).toString('hex');
    
    // 设置过期时间
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(now.getDate() + expiryDays);
    
    // 停用所有现有密钥
    await supabase
      .from('agent_keys')
      .update({ is_active: false })
      .eq('agent_id', agentId)
      .eq('is_active', true);
    
    // 保存到数据库
    const { data, error } = await supabase
      .from('agent_keys')
      .insert({
        id: nanoid(),
        agent_id: agentId,
        key: key,
        created_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        is_active: true
      })
      .select()
      .single();
      
    if (error) {
      throw new AppError('生成密钥失败: ' + error.message, 500);
    }
    
    res.json({
      success: true,
      data: {
        key: data.key,
        expiresAt: data.expires_at
      }
    });
  } catch (error) {
    next(error);
  }
});

// 生成分享链接
router.post('/share-link', authenticateApiKey, async (req, res, next) => {
  try {
    const agentId = req.user.id;
    const { expiryDays = 7 } = req.body;
    
    // 生成短链接ID
    const linkId = nanoid(8);
    
    // 设置过期时间
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(now.getDate() + expiryDays);
    
    // 保存到数据库
    const { data, error } = await supabase
      .from('share_links')
      .insert({
        id: linkId,
        agent_id: agentId,
        created_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        is_active: true,
        visit_count: 0
      })
      .select()
      .single();
      
    if (error) {
      throw new AppError('生成分享链接失败: ' + error.message, 500);
    }
    
    // 更新客服的分享链接ID
    await supabase
      .from('agents')
      .update({ share_link_id: linkId })
      .eq('id', agentId);
    
    res.json({
      success: true,
      data: {
        linkId: data.id,
        expiresAt: data.expires_at,
        url: `${config.frontendUrl}/chat/${data.id}`
      }
    });
  } catch (error) {
    next(error);
  }
});

// 验证分享链接
router.get('/share-link/:linkId', async (req, res, next) => {
  try {
    const { linkId } = req.params;
    
    // 从数据库查询链接
    const { data, error } = await supabase
      .from('share_links')
      .select('*, agents(id, nickname, avatar, status)')
      .eq('id', linkId)
      .eq('is_active', true)
      .single();
      
    if (error || !data) {
      return res.status(404).json({ 
        valid: false, 
        message: '无效的分享链接' 
      });
    }
    
    // 检查过期时间
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return res.status(410).json({ 
        valid: false, 
        message: '分享链接已过期' 
      });
    }
    
    // 增加访问次数
    await supabase
      .from('share_links')
      .update({ visit_count: (data.visit_count || 0) + 1 })
      .eq('id', linkId);
    
    res.json({
      valid: true,
      data: {
        linkId: data.id,
        agentId: data.agent_id,
        agentName: data.agents.nickname,
        agentAvatar: data.agents.avatar,
        agentStatus: data.agents.status
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;