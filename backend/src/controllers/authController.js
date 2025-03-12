const supabase = require('../utils/supabaseClient');
const jwt = require('jsonwebtoken');
const { AppError } = require('../middlewares/error');
const crypto = require('crypto');

// 生成JWT令牌
const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user.id, 
      role: user.role || 'user',
      email: user.email
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// 验证客服密钥
exports.verifyAgentKey = async (req, res, next) => {
  try {
    const { key } = req.body;
    
    if (!key) {
      throw new AppError('密钥不能为空', 400);
    }
    
    // 检查是否是管理员密钥
    if (key === process.env.ADMIN_KEY) {
      return res.json({
        success: true,
        data: {
          token: generateToken({ id: 'admin', role: 'admin' }),
          user: {
            id: 'admin',
            role: 'admin',
            nickname: '管理员'
          }
        }
      });
    }
    
    // 验证客服密钥
    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .eq('api_key', key)
      .single();
      
    if (error || !data) {
      throw new AppError('无效的密钥', 401);
    }
    
    // 检查密钥是否过期
    if (data.key_expires_at && new Date(data.key_expires_at) < new Date()) {
      throw new AppError('密钥已过期', 401);
    }
    
    // 生成并返回令牌
    const token = generateToken({
      id: data.id,
      role: 'agent',
      email: data.email
    });
    
    res.json({
      success: true,
      data: {
        token,
        user: {
          id: data.id,
          role: 'agent',
          nickname: data.nickname,
          avatar: data.avatar,
          status: data.status
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// 用户会话验证
exports.verifySession = async (req, res, next) => {
  try {
    // 令牌已在auth中间件验证，这里直接返回用户信息
    const user = req.user;
    
    if (!user) {
      throw new AppError('无效的会话', 401);
    }
    
    // 根据用户角色获取详细信息
    let userData = null;
    
    if (user.role === 'admin') {
      userData = {
        id: user.id,
        role: 'admin',
        nickname: '管理员'
      };
    } else if (user.role === 'agent') {
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .eq('id', user.id)
        .single();
        
      if (error || !data) {
        throw new AppError('客服不存在', 404);
      }
      
      userData = {
        id: data.id,
        role: 'agent',
        nickname: data.nickname,
        avatar: data.avatar,
        status: data.status
      };
    } else {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', user.id)
        .single();
        
      if (error || !data) {
        throw new AppError('用户不存在', 404);
      }
      
      userData = {
        id: data.id,
        role: 'user',
        nickname: data.nickname,
        avatar: data.avatar
      };
    }
    
    res.json({
      success: true,
      data: {
        user: userData
      }
    });
  } catch (error) {
    next(error);
  }
};

// 生成客服密钥
exports.generateAgentKey = async (req, res, next) => {
  try {
    // 只有管理员可以生成密钥
    if (req.user.role !== 'admin') {
      throw new AppError('无权限执行此操作', 403);
    }
    
    const { agentId, expiryDays } = req.body;
    
    if (!agentId) {
      throw new AppError('客服ID不能为空', 400);
    }
    
    // 检查客服是否存在
    const { data: agentData, error: agentError } = await supabase
      .from('agents')
      .select('*')
      .eq('id', agentId)
      .single();
      
    if (agentError || !agentData) {
      throw new AppError('客服不存在', 404);
    }
    
    // 生成新密钥
    const newKey = crypto.randomBytes(16).toString('hex');
    
    // 计算过期时间
    let expiryDate = null;
    if (expiryDays) {
      expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + parseInt(expiryDays));
    }
    
    // 更新客服密钥
    const { error } = await supabase
      .from('agents')
      .update({ 
        api_key: newKey,
        key_expires_at: expiryDate
      })
      .eq('id', agentId);
      
    if (error) {
      throw new AppError('生成密钥失败', 500);
    }
    
    res.json({
      success: true,
      data: {
        key: newKey,
        expiresAt: expiryDate
      }
    });
  } catch (error) {
    next(error);
  }
};

// 创建临时用户
exports.createTempUser = async (req, res, next) => {
  try {
    const { nickname, avatar, agentId } = req.body;
    
    if (!agentId) {
      throw new AppError('客服ID不能为空', 400);
    }
    
    // 检查客服是否存在
    const { data: agentData, error: agentError } = await supabase
      .from('agents')
      .select('*')
      .eq('id', agentId)
      .single();
      
    if (agentError || !agentData) {
      throw new AppError('客服不存在', 404);
    }
    
    // 创建临时用户
    const userId = crypto.randomBytes(16).toString('hex');
    const { error } = await supabase
      .from('customers')
      .insert([
        {
          id: userId,
          nickname: nickname || `访客${userId.slice(0, 4)}`,
          avatar: avatar || '',
          agent_id: agentId,
          is_temp: true,
          last_seen: new Date()
        }
      ]);
      
    if (error) {
      throw new AppError('创建临时用户失败', 500);
    }
    
    // 生成令牌
    const token = generateToken({
      id: userId,
      role: 'user'
    });
    
    res.json({
      success: true,
      data: {
        token,
        user: {
          id: userId,
          role: 'user',
          nickname: nickname || `访客${userId.slice(0, 4)}`,
          avatar: avatar || ''
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// 用户登出
exports.logout = async (req, res) => {
  res.json({
    success: true,
    message: '登出成功'
  });
};


// 通过分享链接创建临时用户
exports.createTempUserFromLink = async (req, res, next) => {
  try {
    const { linkId } = req.params;
    const { nickname, avatar } = req.body;
    
    // 验证链接
    const { data: linkData, error: linkError } = await supabase
      .from('share_links')
      .select('*, agents(id, nickname, avatar, status)')
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
        avatar: avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${Date.now()}`,
        ip_address: ip,
        user_agent: userAgent,
        first_visit: new Date().toISOString(),
        last_seen: new Date().toISOString(),
        is_temporary: true,
        source: 'share_link',
        source_id: linkId
      })
      .select()
      .single();
      
    if (userError) {
      throw new AppError('创建临时用户失败', 500);
    }
    
    // 更新链接访问次数
    await supabase
      .from('share_links')
      .update({ 
        access_count: (linkData.access_count || 0) + 1,
        last_accessed_at: new Date().toISOString()
      })
      .eq('id', linkId);
    
    // 生成令牌
    const token = generateToken({
      id: userId,
      role: 'user'
    });
    
    res.json({
      success: true,
      data: {
        token,
        user: {
          id: userId,
          role: 'user',
          nickname: userData.nickname,
          avatar: userData.avatar,
          isTemporary: true
        },
        agent: {
          id: linkData.agent_id,
          nickname: linkData.agents?.nickname || '客服',
          avatar: linkData.agents?.avatar,
          status: linkData.agents?.status || 'online'
        },
        link: {
          id: linkId,
          code: linkData.code
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// 验证分享链接
exports.verifyShareLink = async (req, res, next) => {
  try {
    const { code } = req.params;
    
    // 验证链接
    const { data, error } = await supabase
      .from('share_links')
      .select('*, agents(id, nickname, avatar, status)')
      .eq('code', code)
      .eq('is_active', true)
      .single();
      
    if (error || !data) {
      throw new AppError('无效的分享链接', 404);
    }
    
    // 检查链接是否过期
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      throw new AppError('分享链接已过期', 410);
    }
    
    res.json({
      success: true,
      data: {
        link: {
          id: data.id,
          code: data.code,
          expiresAt: data.expires_at
        },
        agent: {
          id: data.agent_id,
          nickname: data.agents?.nickname || '客服',
          avatar: data.agents?.avatar,
          status: data.agents?.status || 'online'
        }
      }
    });
  } catch (error) {
    next(error);
  }
};