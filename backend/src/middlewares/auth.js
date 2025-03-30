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
      return next(new AppError('无效或过期的token', 401));
    }
    next(error);
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
    // 从多个可能的位置获取API密钥
    const apiKey = req.headers['x-api-key'] || req.query.apiKey || req.body.apiKey;
    if (!apiKey) {
      throw new AppError('未提供API密钥', 401);
    }
    // 检查是否为管理员密钥
    if (apiKey === config.adminKey) {
      req.user = { id: 'admin', role: 'admin', nickname: '管理员' };
      return next();
    }
    // 检查是否为客服密钥
    const { data, error } = await supabase
      .from('agent_keys')
      .select('*, agents(*)')
      .eq('key', apiKey)
      .eq('is_active', true)
      .single();
    if (error || !data) {
      throw new AppError('无效的API密钥', 401);
    }
    // 检查API密钥是否已过期
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

module.exports = {
  authenticate,
  requireAdmin,
  requireAgent,
  authenticateApiKey
};