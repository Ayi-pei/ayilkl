const supabase = require('../utils/supabaseClient');
const { AppError } = require('../middlewares/error');
const { nanoid } = require('nanoid');

// 获取聊天历史
exports.getChatHistory = async (req, res, next) => {
  try {
    const { customerId } = req.params;
    const agentId = req.user.id;
    
    // 验证客户是否存在
    const { data: customerData, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single();
      
    if (customerError || !customerData) {
      throw new AppError('客户不存在', 404);
    }
    
    // 获取聊天记录
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${agentId},recipient_id.eq.${agentId}`)
      .or(`sender_id.eq.${customerId},recipient_id.eq.${customerId}`)
      .order('created_at', { ascending: true });
      
    if (error) {
      throw new AppError('获取聊天记录失败', 500);
    }
    
    // 格式化消息
    const formattedMessages = data.map(message => ({
      id: message.id,
      content: message.content,
      type: message.type,
      sender: message.sender_id === agentId ? 'agent' : 'user',
      timestamp: message.created_at,
      fileName: message.file_name,
      fileSize: message.file_size
    }));
    
    res.json({
      success: true,
      data: formattedMessages
    });
  } catch (error) {
    next(error);
  }
};

// 发送消息
exports.sendMessage = async (req, res, next) => {
  try {
    const { recipientId, content, type = 'text', fileName, fileSize } = req.body;
    const senderId = req.user.id;
    
    if (!content) {
      throw new AppError('消息内容不能为空', 400);
    }
    
    if (!recipientId) {
      throw new AppError('接收者ID不能为空', 400);
    }
    
    // 检查接收者是否存在
    const { data: recipientData, error: recipientError } = await supabase
      .from(req.user.role === 'agent' ? 'customers' : 'agents')
      .select('*')
      .eq('id', recipientId)
      .single();
      
    if (recipientError || !recipientData) {
      throw new AppError('接收者不存在', 404);
    }
    
    // 创建消息
    const messageId = nanoid();
    const { error } = await supabase
      .from('messages')
      .insert([
        {
          id: messageId,
          content,
          type,
          sender_id: senderId,
          recipient_id: recipientId,
          file_name: fileName,
          file_size: fileSize
        }
      ]);
      
    if (error) {
      throw new AppError('发送消息失败', 500);
    }
    
    // 更新最后活动时间
    await supabase
      .from(req.user.role === 'agent' ? 'customers' : 'agents')
      .update({ last_active: new Date() })
      .eq('id', recipientId);
    
    res.json({
      success: true,
      data: {
        id: messageId,
        content,
        type,
        sender: req.user.role,
        timestamp: new Date().toISOString(),
        fileName,
        fileSize
      }
    });
  } catch (error) {
    next(error);
  }
};

// 获取快捷回复
exports.getQuickReplies = async (req, res, next) => {
  try {
    const agentId = req.user.id;
    
    const { data, error } = await supabase
      .from('quick_replies')
      .select('*')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: true });
      
    if (error) {
      throw new AppError('获取快捷回复失败', 500);
    }
    
    res.json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

// 创建快捷回复
exports.createQuickReply = async (req, res, next) => {
  try {
    const { title, content } = req.body;
    const agentId = req.user.id;
    
    if (!title || !content) {
      throw new AppError('标题和内容不能为空', 400);
    }
    
    const { data, error } = await supabase
      .from('quick_replies')
      .insert([
        {
          title,
          content,
          agent_id: agentId
        }
      ])
      .select();
      
    if (error) {
      throw new AppError('创建快捷回复失败', 500);
    }
    
    res.json({
      success: true,
      data: data[0]
    });
  } catch (error) {
    next(error);
  }
};

// 删除快捷回复
exports.deleteQuickReply = async (req, res, next) => {
  try {
    const { replyId } = req.params;
    const agentId = req.user.id;
    
    // 检查快捷回复是否存在
    const { data: replyData, error: replyError } = await supabase
      .from('quick_replies')
      .select('*')
      .eq('id', replyId)
      .eq('agent_id', agentId)
      .single();
      
    if (replyError || !replyData) {
      throw new AppError('快捷回复不存在或无权限删除', 404);
    }
    
    // 删除快捷回复
    const { error } = await supabase
      .from('quick_replies')
      .delete()
      .eq('id', replyId)
      .eq('agent_id', agentId);
      
    if (error) {
      throw new AppError('删除快捷回复失败', 500);
    }
    
    res.json({
      success: true,
      message: '快捷回复已删除'
    });
  } catch (error) {
    next(error);
  }
};

// 获取欢迎语
exports.getWelcomeMessages = async (req, res, next) => {
  try {
    const agentId = req.user.id;
    
    const { data, error } = await supabase
      .from('welcome_messages')
      .select('*')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: true });
      
    if (error) {
      throw new AppError('获取欢迎语失败', 500);
    }
    
    res.json({
      success: true,
      data: data.map(item => item.content)
    });
  } catch (error) {
    next(error);
  }
};

// 更新欢迎语
exports.updateWelcomeMessages = async (req, res, next) => {
  try {
    const { messages } = req.body;
    const agentId = req.user.id;
    
    if (!Array.isArray(messages)) {
      throw new AppError('欢迎语必须是数组', 400);
    }
    
    // 删除现有欢迎语
    await supabase
      .from('welcome_messages')
      .delete()
      .eq('agent_id', agentId);
    
    // 添加新欢迎语
    if (messages.length > 0) {
      const welcomeMessages = messages.map(content => ({
        content,
        agent_id: agentId
      }));
      
      const { error } = await supabase
        .from('welcome_messages')
        .insert(welcomeMessages);
        
      if (error) {
        throw new AppError('更新欢迎语失败', 500);
      }
    }
    
    res.json({
      success: true,
      message: '欢迎语已更新'
    });
  } catch (error) {
    next(error);
  }
};


// 获取通过分享链接的聊天历史
exports.getShareLinkChatHistory = async (req, res, next) => {
  try {
    const { linkId } = req.params;
    const userId = req.user.id;
    
    // 验证链接
    const { data: linkData, error: linkError } = await supabase
      .from('share_links')
      .select('*, agents(id, nickname, avatar)')
      .eq('id', linkId)
      .eq('is_active', true)
      .single();
      
    if (linkError || !linkData) {
      throw new AppError('无效的分享链接', 404);
    }
    
    // 获取聊天记录
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
      .or(`sender_id.eq.${linkData.agent_id},recipient_id.eq.${linkData.agent_id}`)
      .order('created_at', { ascending: true });
      
    if (error) {
      throw new AppError('获取聊天记录失败', 500);
    }
    
    // 格式化消息
    const formattedMessages = data.map(message => ({
      id: message.id,
      content: message.content,
      type: message.type,
      sender: message.sender_id === userId ? 'user' : 'agent',
      timestamp: message.created_at,
      fileName: message.file_name,
      fileSize: message.file_size
    }));
    
    res.json({
      success: true,
      data: {
        messages: formattedMessages,
        agent: {
          id: linkData.agent_id,
          nickname: linkData.agents?.nickname || '客服',
          avatar: linkData.agents?.avatar
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// 通过分享链接发送消息
exports.sendShareLinkMessage = async (req, res, next) => {
  try {
    const { content, type = 'text', fileName, fileSize } = req.body;
    const userId = req.user.id;
    const agentId = req.agent.id; // 从authenticateShareLink中间件获取
    
    if (!content) {
      throw new AppError('消息内容不能为空', 400);
    }
    
    // 创建消息
    const messageId = nanoid();
    const { error } = await supabase
      .from('messages')
      .insert([
        {
          id: messageId,
          content,
          type,
          sender_id: userId,
          recipient_id: agentId,
          file_name: fileName,
          file_size: fileSize,
          source: 'share_link',
          source_id: req.shareLink.id
        }
      ]);
      
    if (error) {
      throw new AppError('发送消息失败', 500);
    }
    
    // 更新用户最后活动时间
    await supabase
      .from('customers')
      .update({ last_seen: new Date().toISOString() })
      .eq('id', userId);
    
    res.json({
      success: true,
      data: {
        id: messageId,
        content,
        type,
        sender: 'user',
        timestamp: new Date().toISOString(),
        fileName,
        fileSize
      }
    });
  } catch (error) {
    next(error);
  }
};