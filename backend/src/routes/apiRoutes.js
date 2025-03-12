// 后端示例 (Node.js + Express)
// routes/keys.js
const express = require('express');
const crypto = require('crypto');
const router = express.Router();

// 验证卡密
router.post('/verify', async (req, res) => {
  const { key } = req.body;
  
  try {
    // 从数据库查询卡密
    const { data, error } = await supabase
      .from('agent_keys')
      .select('*')
      .eq('key', key)
      .single();
      
    if (error || !data || !data.is_active) {
      return res.json({ valid: false, message: '无效的卡密' });
    }
    
    // 检查是否是管理员卡密
    if (data.is_admin) {
      return res.json({ valid: true, isAdmin: true });
    }
    
    // 获取客服信息
    const { data: agentData, error: agentError } = await supabase
      .from('agents')
      .select('*')
      .eq('id', data.agent_id)
      .single();
      
    if (agentError || !agentData) {
      return res.json({ valid: false, message: '找不到客服信息' });
    }
    
    return res.json({
      valid: true,
      isAdmin: false,
      agentId: data.agent_id,
      agentData: {
        id: agentData.id,
        nickname: agentData.nickname,
        avatar: agentData.avatar,
        status: agentData.status
      }
    });
  } catch (error) {
    console.error('验证卡密失败:', error);
    return res.status(500).json({ valid: false, message: '服务器错误' });
  }
});

// src/routes/apiRoutes.js
const express = require('express');
const router = express.Router();
const supabase = require('../utils/supabaseClient');
const { authenticateApiKey, requireAdmin } = require('../middlewares/auth');
const { AppError } = require('../middlewares/error');

// 所有API路由都需要API密钥认证
router.use(authenticateApiKey);

// 获取用户列表
router.get('/users', async (req, res, next) => {
  try {
    let query = supabase
      .from('customers')
      .select('*')
      .order('last_seen', { ascending: false });
      
    // 非管理员只能查看自己的用户
    if (req.user.role !== 'admin') {
      query = query.eq('agent_id', req.user.id);
    }
    
    const { data, error } = await query;
      
    if (error) {
      throw new AppError('获取用户列表失败', 500, 'FETCH_USERS_ERROR');
    }
    
    return res.json({ 
      success: true, 
      data: data.map(user => ({
        id: user.id,
        nickname: user.nickname,
        avatar: user.avatar,
        isOnline: user.is_online,
        lastSeen: user.last_seen,
        ip: user.ip,
        device: user.device,
        firstVisit: user.created_at
      }))
    });
  } catch (error) {
    next(error);
  }
});

// 获取消息历史
router.get('/messages/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;
    const agentId = req.user.role === 'admin' ? null : req.user.id;
    
    // 验证用户是否存在
    const { data: userData, error: userError } = await supabase
      .from('customers')
      .select('*')
      .eq('id', userId)
      .single();
      
    if (userError || !userData) {
      throw new AppError('用户不存在', 404, 'USER_NOT_FOUND');
    }
    
    // 非管理员只能查看自己的用户消息
    if (req.user.role !== 'admin' && userData.agent_id !== agentId) {
      throw new AppError('无权访问此用户的消息', 403, 'ACCESS_DENIED');
    }
    
    // 查询消息
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
      .order('created_at', { ascending: true });
    
    if (error) {
      throw new AppError('获取消息历史失败', 500, 'FETCH_MESSAGES_ERROR');
    }
    
    // 格式化消息
    const formattedMessages = data.map(msg => ({
      id: msg.id,
      content: msg.content,
      type: msg.type || 'text',
      sender: msg.sender_id === userId ? 'user' : 'agent',
      timestamp: msg.created_at,
      fileName: msg.file_name,
      fileSize: msg.file_size
    }));
    
    return res.json({ success: true, data: formattedMessages });
  } catch (error) {
    next(error);
  }
});

// 获取统计数据 - 仅管理员
router.get('/stats', requireAdmin, async (req, res, next) => {
  try {
    // 获取用户总数
    const { count: userCount, error: userError } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true });
      
    // 获取消息总数
    const { count: messageCount, error: messageError } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true });
      
    // 获取客服总数
    const { count: agentCount, error: agentError } = await supabase
      .from('agents')
      .select('*', { count: 'exact', head: true });
      
    if (userError || messageError || agentError) {
      throw new AppError('获取统计数据失败', 500, 'FETCH_STATS_ERROR');
    }
    
    return res.json({
      success: true,
      data: {
        userCount,
        messageCount,
        agentCount
      }
    });
  } catch (error) {
    next(error);
  }
});

// 生成客服分享链接
router.post('/share-links', async (req, res, next) => {
  try {
    const agentId = req.user.id;
    const { expiryDays = 7 } = req.body;
    
    // 生成唯一的短链接代码
    const { nanoid } = require('nanoid');
    const linkCode = nanoid(8);
    
    // 设置过期时间
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(now.getDate() + expiryDays);
    
    // 保存到数据库
    const { data, error } = await supabase
      .from('share_links')
      .insert({
        id: nanoid(),
        code: linkCode,
        agent_id: agentId,
        created_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        access_count: 0,
        is_active: true
      })
      .select()
      .single();
      
    if (error) {
      throw new AppError('创建分享链接失败', 500, 'CREATE_LINK_ERROR');
    }
    
    // 更新客服的当前分享链接
    await supabase
      .from('agents')
      .update({ share_link_id: data.id })
      .eq('id', agentId);
    
    return res.json({
      success: true,
      data: {
        id: data.id,
        code: data.code,
        expiresAt: data.expires_at,
        url: `${req.protocol}://${req.get('host')}/chat/${data.code}`
      }
    });
  } catch (error) {
    next(error);
  }
});

// 获取客服的分享链接
router.get('/share-links', async (req, res, next) => {
  try {
    const agentId = req.user.id;
    
    // 查询客服的所有分享链接
    const { data, error } = await supabase
      .from('share_links')
      .select('*')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false });
      
    if (error) {
      throw new AppError('获取分享链接失败', 500, 'FETCH_LINKS_ERROR');
    }
    
    // 格式化数据
    const formattedLinks = data.map(link => ({
      id: link.id,
      code: link.code,
      url: `${req.protocol}://${req.get('host')}/chat/${link.code}`,
      createdAt: link.created_at,
      expiresAt: link.expires_at,
      accessCount: link.access_count || 0,
      isActive: link.is_active
    }));
    
    return res.json({
      success: true,
      data: formattedLinks
    });
  } catch (error) {
    next(error);
  }
});

// 禁用分享链接
router.put('/share-links/:id/deactivate', async (req, res, next) => {
  try {
    const { id } = req.params;
    const agentId = req.user.id;
    
    // 验证链接是否属于当前客服
    const { data: linkData, error: linkError } = await supabase
      .from('share_links')
      .select('*')
      .eq('id', id)
      .eq('agent_id', agentId)
      .single();
      
    if (linkError || !linkData) {
      throw new AppError('分享链接不存在或无权操作', 404, 'LINK_NOT_FOUND');
    }
    
    // 禁用链接
    const { error } = await supabase
      .from('share_links')
      .update({ is_active: false })
      .eq('id', id);
      
    if (error) {
      throw new AppError('禁用分享链接失败', 500, 'DEACTIVATE_LINK_ERROR');
    }
    
    return res.json({
      success: true,
      message: '分享链接已禁用'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;