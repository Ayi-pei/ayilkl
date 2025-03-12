// src/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { AppError } = require('../middlewares/error');
const supabase = require('../utils/supabaseClient');
const config = require('../config');
const { authenticate, authenticateShareLink } = require('../middlewares/auth');
const authController = require('../controllers/authController');
const { nanoid } = require('nanoid');

// 验证客服密钥
router.post('/verify-key', authController.verifyAgentKey);

// 验证会话
router.get('/verify-session', authenticate, authController.verifySession);

// 生成客服密钥 (管理员功能)
router.post('/generate-key', authenticate, authController.generateAgentKey);

// 创建临时用户
router.post('/create-temp-user', authController.createTempUser);

// 通过分享链接创建临时用户
router.post('/temp-user-from-link/:linkId', async (req, res, next) => {
  try {
    const { linkId } = req.params;
    const { nickname } = req.body;
    
    // 验证链接
    const { data: linkData, error: linkError } = await supabase
      .from('share_links')
      .select('*, agents(id, nickname)')
      .eq('id', linkId)
      .eq('is_active', true)
      .single();
      
    if (linkError || !linkData) {
      throw new AppError('无效的分享链接', 404);
    }
    
    // 检查链接是否过期
    if (linkData.expires_at && new Date(linkData.expires_at) < new Date()) {
      throw new AppError('分享链接已过期', 410);
    }
    
    // 获取客户端信息
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    
    // 生成临时用户ID
    const userId = nanoid();
    
    // 创建临时用户
    const { data: userData, error: userError } = await supabase
      .from('customers')
      .insert({
        id: userId,
        agent_id: linkData.agent_id,
        nickname: nickname || `访客${userId.slice(0, 4)}`,
        ip: ip,
        device: userAgent,
        first_visit: new Date().toISOString(),
        last_seen: new Date().toISOString(),
        is_temp: true,
        source: 'share_link',
        source_id: linkId
      })
      .select()
      .single();
      
    if (userError) {
      throw new AppError('创建临时用户失败', 500);
    }
    
    // 生成临时用户的JWT令牌
    const token = jwt.sign(
      { 
        id: userId,
        role: 'user',
        agentId: linkData.agent_id,
        isTemp: true
      },
      config.jwtSecret,
      { expiresIn: '24h' }
    );
    
    res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: userId,
          nickname: userData.nickname,
          agentId: linkData.agent_id,
          agentName: linkData.agents.nickname
        },
        linkId
      }
    });
  } catch (error) {
    next(error);
  }
});

// 登出
router.post('/logout', authenticate, authController.logout);

// 登录路由
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      throw new AppError('邮箱和密码不能为空', 400, 'MISSING_CREDENTIALS');
    }
    
    // 使用Supabase进行身份验证
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      throw new AppError('登录失败: ' + error.message, 401, 'LOGIN_FAILED');
    }
    
    // 获取用户角色信息
    const { data: userData, error: userError } = await supabase
      .from('agents')
      .select('*')
      .eq('id', data.user.id)
      .single();
      
    if (userError) {
      throw new AppError('获取用户信息失败', 500, 'FETCH_USER_ERROR');
    }
    
    // 生成JWT令牌
    const token = jwt.sign(
      { 
        id: data.user.id, 
        email: data.user.email,
        role: userData.role || 'agent'
      },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );
    
    // 更新最后登录时间
    await supabase
      .from('agents')
      .update({ 
        last_login: new Date(),
        status: 'online'
      })
      .eq('id', data.user.id);
    
    res.json({
      success: true,
      data: {
        token,
        user: {
          id: data.user.id,
          email: data.user.email,
          nickname: userData.nickname,
          avatar: userData.avatar,
          role: userData.role || 'agent'
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// 注册路由
router.post('/register', async (req, res, next) => {
  try {
    const { email, password, nickname } = req.body;
    
    if (!email || !password) {
      throw new AppError('邮箱和密码不能为空', 400);
    }
    
    // 使用Supabase创建用户
    const { data, error } = await supabase.auth.signUp({
      email,
      password
    });
    
    if (error) {
      throw new AppError('注册失败: ' + error.message, 400);
    }
    
    // 创建客服记录
    const { error: agentError } = await supabase
      .from('agents')
      .insert([
        { 
          id: data.user.id,
          email: email,
          nickname: nickname || email.split('@')[0],
          role: 'agent',
          status: 'offline'
        }
      ]);
      
    if (agentError) {
      throw new AppError('创建客服记录失败', 500);
    }
    
    res.status(201).json({
      success: true,
      message: '注册成功，请登录'
    });
  } catch (error) {
    next(error);
  }
});

// 获取当前用户信息
router.get('/me', authenticate, async (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

// 退出登录
router.post('/logout', authenticate, async (req, res, next) => {
  try {
    // 在Supabase中登出
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      throw new AppError('退出登录失败', 500);
    }
    
    res.json({
      success: true,
      message: '退出登录成功'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;