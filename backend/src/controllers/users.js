const supabase = require('../utils/supabaseClient');
const { AppError } = require('../middlewares/error');

// 获取用户信息
exports.getUserInfo = async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', userId)
      .single();
      
    if (error) {
      throw new AppError('获取用户信息失败', 500);
    }
    
    if (!data) {
      throw new AppError('用户不存在', 404);
    }
    
    res.json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

// 拉黑用户
exports.blockUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const agentId = req.user.id;
    
    // 检查用户是否存在
    const { data: userData, error: userError } = await supabase
      .from('customers')
      .select('*')
      .eq('id', userId)
      .single();
      
    if (userError || !userData) {
      throw new AppError('用户不存在', 404);
    }
    
    // 添加到黑名单
    const { error } = await supabase
      .from('blacklist')
      .insert([
        {
          customer_id: userId,
          agent_id: agentId,
          reason: req.body.reason || '未提供原因'
        }
      ]);
      
    if (error) {
      throw new AppError('拉黑用户失败', 500);
    }
    
    // 更新用户状态
    await supabase
      .from('customers')
      .update({ is_blacklisted: true })
      .eq('id', userId)
      .eq('agent_id', agentId);
    
    res.json({
      success: true,
      message: '用户已被加入黑名单'
    });
  } catch (error) {
    next(error);
  }
};

// 解除拉黑用户
exports.unblockUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const agentId = req.user.id;
    
    // 从黑名单中移除
    const { error } = await supabase
      .from('blacklist')
      .delete()
      .eq('customer_id', userId)
      .eq('agent_id', agentId);
      
    if (error) {
      throw new AppError('解除拉黑失败', 500);
    }
    
    // 更新用户状态
    await supabase
      .from('customers')
      .update({ is_blacklisted: false })
      .eq('id', userId)
      .eq('agent_id', agentId);
    
    res.json({
      success: true,
      message: '用户已从黑名单中移除'
    });
  } catch (error) {
    next(error);
  }
};

// 获取黑名单用户列表
exports.getBlockedUsers = async (req, res, next) => {
  try {
    const agentId = req.user.id;
    
    const { data, error } = await supabase
      .from('blacklist')
      .select('*, customers(*)')
      .eq('agent_id', agentId);
      
    if (error) {
      throw new AppError('获取黑名单失败', 500);
    }
    
    const formattedData = data.map(item => ({
      id: item.customer_id,
      nickname: item.customers.nickname || `访客${item.customer_id.slice(0, 4)}`,
      avatar: item.customers.avatar || '',
      reason: item.reason,
      blockedAt: item.created_at
    }));
    
    res.json({
      success: true,
      data: formattedData
    });
  } catch (error) {
    next(error);
  }
};

// 获取所有用户列表
exports.getAllUsers = async (req, res, next) => {
  try {
    const agentId = req.user.role === 'admin' ? undefined : req.user.id;
    
    let query = supabase
      .from('customers')
      .select('*')
      .order('last_seen', { ascending: false });
      
    if (agentId) {
      query = query.eq('agent_id', agentId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      throw new AppError('获取用户列表失败', 500);
    }
    
    res.json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

// 获取客服的分享链接
exports.getShareLinks = async (req, res, next) => {
  try {
    const agentId = req.user.id;
    
    // 查询客服的所有分享链接
    const { data, error } = await supabase
      .from('share_links')
      .select('*')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false });
      
    if (error) {
      throw new AppError('获取分享链接失败', 500);
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
    
    res.json({
      success: true,
      data: formattedLinks
    });
  } catch (error) {
    next(error);
  }
};

// 创建新的分享链接
exports.createShareLink = async (req, res, next) => {
  try {
    const agentId = req.user.id;
    const { expiryDays = 7 } = req.body;
    
    // 生成唯一的短链接代码
    const { nanoid } = require('nanoid');
    const linkCode = nanoid(8);
    
    // 设置过期时间
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(now.getDate() + parseInt(expiryDays));
    
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
      throw new AppError('创建分享链接失败', 500);
    }
    
    // 更新客服的当前分享链接
    await supabase
      .from('agents')
      .update({ share_link_id: data.id })
      .eq('id', agentId);
    
    res.json({
      success: true,
      data: {
        id: data.id,
        code: data.code,
        url: `${req.protocol}://${req.get('host')}/chat/${data.code}`,
        expiresAt: data.expires_at,
        createdAt: data.created_at
      }
    });
  } catch (error) {
    next(error);
  }
};

// 禁用分享链接
exports.deactivateShareLink = async (req, res, next) => {
  try {
    const { linkId } = req.params;
    const agentId = req.user.id;
    
    // 验证链接是否属于当前客服
    const { data: linkData, error: linkError } = await supabase
      .from('share_links')
      .select('*')
      .eq('id', linkId)
      .eq('agent_id', agentId)
      .single();
      
    if (linkError || !linkData) {
      throw new AppError('分享链接不存在或无权操作', 404);
    }
    
    // 禁用链接
    const { error } = await supabase
      .from('share_links')
      .update({ is_active: false })
      .eq('id', linkId);
      
    if (error) {
      throw new AppError('禁用分享链接失败', 500);
    }
    
    res.json({
      success: true,
      message: '分享链接已禁用'
    });
  } catch (error) {
    next(error);
  }
};

// 获取通过分享链接访问的用户列表
exports.getShareLinkUsers = async (req, res, next) => {
  try {
    const { linkId } = req.params;
    const agentId = req.user.id;
    
    // 验证链接是否属于当前客服
    const { data: linkData, error: linkError } = await supabase
      .from('share_links')
      .select('*')
      .eq('id', linkId)
      .eq('agent_id', agentId)
      .single();
      
    if (linkError || !linkData) {
      throw new AppError('分享链接不存在或无权操作', 404);
    }
    
    // 获取通过该链接访问的用户
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('source', 'share_link')
      .eq('source_id', linkId)
      .order('created_at', { ascending: false });
      
    if (error) {
      throw new AppError('获取用户列表失败', 500);
    }
    
    res.json({
      success: true,
      data: data.map(user => ({
        id: user.id,
        nickname: user.nickname || `访客${user.id.slice(0, 4)}`,
        avatar: user.avatar || '',
        firstVisit: user.first_visit,
        lastSeen: user.last_seen,
        ip: user.ip_address,
        device: user.user_agent
      }))
    });
  } catch (error) {
    next(error);
  }
};