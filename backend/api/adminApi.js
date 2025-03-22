// adminApi.js - 管理员相关API
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken'); // 添加jwt模块
const router = express.Router();
require('dotenv').config();

// 使用服务端角色密钥创建Supabase客户端
// 注意：这个密钥必须保密，只在服务端使用
const config = require('../src/config');
const supabase = createClient(config.supabaseUrl, config.supabaseKey); // 使用统一配置

// 验证管理员身份中间件
const verifyAdmin = (req, res, next) => {
  // 从请求头中获取Authorization令牌
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN格式
  
  // 如果没有令牌，检查是否使用旧的x-admin-key头
  if (!token) {
    const adminKey = req.headers['x-admin-key'];
    const envAdminKey = process.env.ADMIN_KEY;
    if (!adminKey || !envAdminKey || adminKey !== envAdminKey) {
      return res.status(401).json({ error: '未授权访问，缺少令牌' });
    }
    // 如果使用旧的方式验证成功
    return next();
  }
  
  // 验证JWT令牌
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'admin_jwt_secret_key');
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: '没有足够权限' });
    }
    req.user = decoded; // 保存解码后的用户信息
    next();
  } catch (error) {
    console.error('JWT验证失败:', error);
    return res.status(403).json({ error: '令牌无效或已过期' });
  }
};

// 创建客服API
router.post('/agents', verifyAdmin, async (req, res) => {
  try {
    const { nickname } = req.body;
    
    if (!nickname) {
      return res.status(400).json({ error: '缺少必要参数' });
    }
    
    const newAgentId = uuidv4();
    
    // 使用服务角色密钥插入数据，绕过RLS限制
    const { data, error } = await supabase
      .from('agents')
      .insert({
        id: newAgentId,
        nickname,
        status: 'online',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select();
      
    if (error) {
      console.error('创建客服失败:', error);
      return res.status(500).json({ error: error.message });
    }
    
    return res.status(201).json({ 
      success: true,
      agent: data[0]
    });
  } catch (error) {
    console.error('创建客服异常:', error);
    return res.status(500).json({ error: '服务器内部错误' });
  }
});

// 为客服生成密钥
router.post('/agents/:agentId/keys', verifyAdmin, async (req, res) => {
  try {
    const { agentId } = req.params;
    const { expiryDays = 30 } = req.body;
    
    // 生成密钥
    const keyChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let key = '';
    for (let i = 0; i < 16; i++) {
      key += keyChars.charAt(Math.floor(Math.random() * keyChars.length));
    }
    
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
    
    // 创建新密钥
    const { error } = await supabase
      .from('agent_keys')
      .insert({
        id: uuidv4(),
        agent_id: agentId,
        key,
        created_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        is_active: true
      })
      .select();
      
    if (error) {
      console.error('生成密钥失败:', error);
      return res.status(500).json({ error: error.message });
    }
    
    return res.status(201).json({ 
      success: true,
      key,
      expiresAt: expiresAt.toISOString()
    });
  } catch (error) {
    console.error('生成密钥异常:', error);
    return res.status(500).json({ error: '服务器内部错误' });
  }
});

// 获取所有客服
router.get('/agents', verifyAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('获取客服列表失败:', error);
      return res.status(500).json({ error: error.message });
    }
    
    return res.json({ agents: data });
  } catch (error) {
    console.error('获取客服列表异常:', error);
    return res.status(500).json({ error: '服务器内部错误' });
  }
});

// 删除客服
router.delete('/agents/:agentId', verifyAdmin, async (req, res) => {
  try {
    const { agentId } = req.params;
    
    // 首先删除客服的所有密钥
    await supabase
      .from('agent_keys')
      .delete()
      .eq('agent_id', agentId);
    
    // 然后删除客服
    const { error } = await supabase
      .from('agents')
      .delete()
      .eq('id', agentId);
      
    if (error) {
      console.error('删除客服失败:', error);
      return res.status(500).json({ error: error.message });
    }
    
    return res.json({ success: true });
  } catch (error) {
    console.error('删除客服异常:', error);
    return res.status(500).json({ error: '服务器内部错误' });
  }
});

// 管理员登录API
router.post('/login', async (req, res) => {
  try {
    const { adminKey } = req.body;
    
    // 验证管理员密钥是否正确
    if (adminKey !== process.env.ADMIN_KEY) {
      return res.status(401).json({ message: '管理员密钥无效' });
    }
    
    // 生成JWT令牌
    const token = jwt.sign(
      { role: 'admin' },
      process.env.JWT_SECRET || 'admin_jwt_secret_key', // 应该放在环境变量中
      { expiresIn: '24h' }
    );
    
    return res.status(200).json({ token, message: '管理员登录成功' });
  } catch (error) {
    console.error('管理员登录错误:', error);
    return res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

// 验证管理员令牌
router.get('/verify', verifyAdmin, (req, res) => {
  // 如果能到达这里，说明验证已通过
  return res.status(200).json({ message: '管理员令牌有效' });
});

module.exports = router;
