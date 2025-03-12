// src/middlewares/user.js
const { nanoid } = require('nanoid');
const supabase = require('../utils/supabaseClient');
const { AppError } = require('./error');

/**
 * 为通过短链接访问的用户创建临时账号
 */
const createTempUser = async (req, res, next) => {
  try {
    // 获取客户端IP和设备信息
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    
    // 如果没有客服信息，则无法创建临时用户
    if (!req.agent || !req.agent.id) {
      throw new AppError('缺少客服信息，无法创建临时用户', 400);
    }
    
    // 生成临时用户ID
    const tempUserId = nanoid();
    
    // 从请求中获取用户昵称（如果有）
    const nickname = req.body.nickname || `访客${tempUserId.slice(0, 4)}`;
    
    // 创建临时用户记录
    const { data, error } = await supabase
      .from('customers')
      .insert({
        id: tempUserId,
        agent_id: req.agent.id,
        nickname: nickname,
        ip: ip,
        device: userAgent,
        first_visit: new Date().toISOString(),
        last_seen: new Date().toISOString(),
        is_temp: true,
        source: req.shareLink ? 'share_link' : 'direct',
        source_id: req.shareLink ? req.shareLink.id : null
      })
      .select()
      .single();
      
    if (error) {
      console.error('创建临时用户失败:', error);
      throw new AppError('创建临时用户失败', 500);
    }
    
    // 将临时用户信息添加到请求对象
    req.tempUser = data;
    
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * 更新用户最后访问时间
 */
const updateUserLastSeen = async (req, res, next) => {
  try {
    if (req.user && req.user.id) {
      await supabase
        .from('customers')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', req.user.id);
    }
    next();
  } catch (error) {
    // 不中断请求，只记录错误
    console.error('更新用户最后访问时间失败:', error);
    next();
  }
};

module.exports = {
  createTempUser,
  updateUserLastSeen
};