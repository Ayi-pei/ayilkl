// src/middlewares/auth.js
const jwt = require('jsonwebtoken');
const config = require('../config');
const { AppError } = require('./error');
const supabase = require('../utils/supabaseClient');

/**
 * JWT认证中间件
 */
const authenticate = async (req, res, next) => {
  try {
    // 从请求头获取token
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('未提供认证token', 401);
    }
    
    const token = authHeader.split(' ')[1];
    
    // 验证token
    const decoded = jwt.verify(token, config.jwtSecret);
    
    // 根据角色获取用户信息
    let userData = null;
    
    if (decoded.role === 'admin') {
      userData = { id: decoded.id, role: 'admin', nickname: '管理员' };
    } else if (decoded.role === 'agent') {
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .eq('id', decoded.id)
        .single();
        
      if (error || !data) {
        throw new AppError('无效的客服账号', 401);
      }
      
      userData = { ...data, role: 'agent' };
    } else {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', decoded.id)
        .single();
        
      if (error || !data) {
        throw new AppError('无效的用户账号', 401);
      }
      
      userData = { ...data, role: 'user' };
    }
    
    // 将用户信息添加到请求对象
    req.user = userData;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      next(new AppError('无效或过期的token', 401));
    } else {
      next(error);
    }
  }
};

/**
 * 管理员权限检查中间件
 */
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return next(new AppError('需要管理员权限', 403));
  }
  next();
};

/**
 * 客服权限检查中间件
 */
const requireAgent = (req, res, next) => {
  if (!req.user || (req.user.role !== 'agent' && req.user.role !== 'admin')) {
    return next(new AppError('需要客服权限', 403));
  }
  next();
};

/**
 * API密钥认证 - 增强版
 */
const authenticateApiKey = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey) {
      throw new AppError('未提供API密钥', 401);
    }
    
    // 检查是否为管理员密钥
    if (apiKey === config.adminKey) {
      req.user = { id: 'admin', role: 'admin', nickname: '管理员' };
      return next();
    }
    
    // 验证客服密钥
    const { data, error } = await supabase
      .from('agent_keys')
      .select('*, agents(*)')
      .eq('key', apiKey)
      .eq('is_active', true)
      .single();
      
    if (error || !data) {
      throw new AppError('无效的API密钥', 401);
    }
    
    // 检查密钥是否过期
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      throw new AppError('API密钥已过期', 401);
    }
    
    req.user = { 
      id: data.agent_id, 
      role: 'agent',
      nickname: data.agents.nickname,
      avatar: data.agents.avatar,
      apiKey
    };
    
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * 短链接验证中间件
 * 用于验证客服分享给用户的短链接
 */
const authenticateShareLink = async (req, res, next) => {
  try {
    // 从请求中获取短链接代码
    const linkCode = req.params.code || req.query.code || req.body.code;
    
    if (!linkCode) {
      throw new AppError('未提供分享链接代码', 400);
    }
    
    // 查询短链接信息
    const { data, error } = await supabase
      .from('share_links')
      .select('*, agents(id, nickname, avatar, status, email)')
      .eq('code', linkCode)
      .eq('is_active', true)
      .single();
      
    if (error || !data) {
      throw new AppError('无效的分享链接', 404);
    }
    
    // 检查链接是否过期
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      throw new AppError('分享链接已过期', 410);
    }
    
    // 更新访问次数
    await supabase
      .from('share_links')
      .update({ 
        access_count: (data.access_count || 0) + 1,
        last_accessed_at: new Date().toISOString()
      })
      .eq('id', data.id);
    
    // 将链接信息和客服信息添加到请求对象
    req.shareLink = {
      id: data.id,
      code: data.code,
      agentId: data.agent_id,
      createdAt: data.created_at,
      expiresAt: data.expires_at,
      accessCount: data.access_count || 0
    };
    
    req.agent = {
      id: data.agent_id,
      nickname: data.agents?.nickname || '客服',
      avatar: data.agents?.avatar,
      status: data.agents?.status || 'online',
      email: data.agents?.email
    };
    
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * 生成临时用户中间件
 * 为通过短链接访问的匿名用户创建临时身份
 */
const createTempUser = async (req, res, next) => {
  try {
    // 如果已经有认证用户，则跳过
    if (req.user) {
      return next();
    }
    
    // 确保有分享链接信息
    if (!req.shareLink || !req.agent) {
      throw new AppError('缺少分享链接信息', 400);
    }
    
    // 从请求中获取用户信息（如果有）
    const nickname = req.body.nickname || `访客_${Math.floor(Math.random() * 10000)}`;
    const avatar = req.body.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${Date.now()}`;
    
    // 创建临时用户记录
    const { data: userData, error: userError } = await supabase
      .from('customers')
      .insert({
        id: `temp_${nanoid()}`,
        nickname,
        avatar,
        agent_id: req.agent.id,
        ip_address: req.ip,
        user_agent: req.headers['user-agent'],
        created_at: new Date().toISOString(),
        last_seen: new Date().toISOString(),
        is_temporary: true
      })
      .select()
      .single();
      
    if (userError) {
      throw new AppError('创建临时用户失败', 500);
    }
    
    // 将临时用户信息添加到请求对象
    req.user = {
      ...userData,
      role: 'user',
      isTemporary: true
    };
    
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  authenticate,
  requireAdmin,
  requireAgent,
  authenticateApiKey,
  authenticateShareLink,
  createTempUser
};