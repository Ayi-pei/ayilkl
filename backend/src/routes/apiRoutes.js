// src/routes/apiRoutes.js
const express = require('express');
const router = express.Router();
const supabase = require('../utils/supabaseClient');
const { authenticateApiKey, requireAdmin } = require('../middlewares/auth');
const { AppError } = require('../middlewares/error');
const { nanoid } = require('nanoid');

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
    const linkCode = nanoid(8);
    
    // 设置过期时间
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(now.getDate() + expiryDays);
    
    // 保存到数据库
    const { data, error } = await supabase
      .from('share_links')
      .insert({
        id: linkCode,
        agent_id: agentId,
        created_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        is_active: true,
        access_count: 0
      })
      .select()
      .single();
      
    if (error) {
      throw new AppError('生成分享链接失败', 500, 'CREATE_SHARELINK_ERROR');
    }
    
    return res.json({
      success: true,
      data: {
        id: data.id,
        code: data.id,
        url: `${req.protocol}://${req.get('host')}/chat/${data.id}`,
        expiresAt: data.expires_at
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;