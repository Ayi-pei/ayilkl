// src/services/socketService.js
const socketIO = require('socket.io');
const supabaseService = require('./supabaseService');
const { generateId } = require('../utils/helpers');

// 存储在线用户
const onlineUsers = new Map();
// 存储在线客服
const onlineAgents = new Map();
// 存储用户-客服的映射关系
const userAgentMap = new Map();

async function authenticateAgent(socket, token, next) {
  if (!token) {
    return next(new Error('未提供客服密钥'));
  }
  try {
    const { data, error } = await supabaseService.getAgentByKey(token);
    if (error || !data) {
      return next(new Error('无效的客服密钥'));
    }
    socket.agentData = {
      id: data.agents.id,
      key: token,
      nickname: data.agents.nickname,
      avatar: data.agents.avatar,
  io.use(async (socket, next) => {
    const { token, type } = socket.handshake.auth;
    if (type === 'agent') {
      await authenticateAgent(socket, token, next);
    } else if (type === 'user') {
      await authenticateUser(socket, token, next);
    } else {
      next(new Error('未知的连接类型'));
    }
  });
        }
      } else if (type === 'user') {
        // 用户认证
        if (!token) {
          return next(new Error('未提供访问令牌'));
        }
        
        try {
          // token为linkId
          const { data: linkData, error: linkError } = await supabaseService.getChatLinkById(token);
          
          if (linkError || !linkData) {
            return next(new Error('无效的访问链接'));
          }
          
          // 检查链接是否过期
          if (new Date(linkData.expires_at) < new Date()) {
            return next(new Error('访问链接已过期'));
          }
          
          // 获取客服信息
          const { data: agentData, error: agentError } = await supabaseService.getAgent(linkData.agent_id);
          
          if (agentError || !agentData) {
            return next(new Error('客服不存在'));
          }
          
          // 用户ID从客户端提供，如果没有则生成新的
          const userId = socket.handshake.auth.userId || generateId();
          
          // 记录用户-客服映射关系
          userAgentMap.set(userId, linkData.agent_id);
          
          socket.userData = {
            id: userId,
            agentId: linkData.agent_id,
            nickname: socket.handshake.auth.nickname,
            avatar: socket.handshake.auth.avatar
          };
          
          next();
        } catch (error) {
          console.error('用户认证错误:', error);
          return next(new Error('认证失败'));
        }
      } else {
        return next(new Error('未知的连接类型'));
      }
    } catch (error) {
      console.error('连接错误:', error);
      return next(new Error('连接错误'));
    }
  });
  
  // 监听连接事件
  io.on('connection', (socket) => {
    console.log('新连接:', socket.id);
    
    // 处理客服连接
    if (socket.agentData) {
      handleAgentConnection(socket, io);
    } 
    // 处理用户连接
    else if (socket.userData) {
      handleUserConnection(socket, io);
    }
    
    // 处理断开连接
    socket.on('disconnect', () => {
      handleDisconnection(socket, io);
    });
  });
  
  return io;
};

/**
 * 处理客服连接
 * @param {object} socket - Socket实例
 * @param {object} io - Socket.IO实例
 */
const handleAgentConnection = (socket, io) => {
  const agentId = socket.agentData.id;
  
  // 存储客服连接
  onlineAgents.set(agentId, {
    socketId: socket.id,
    ...socket.agentData
  });
  
  console.log(`客服已连接: ${agentId}`);
  
  // 通知客服在线状态
  socket.emit('agent:connected', {
    success: true,
    agentId
  });
  
  // 加载用户列表
  loadUserList(socket);
  
  // 客服发送消息
  socket.on('message:send', async (data) => {
    try {
      const { content, type, recipientId, fileName, fileSize } = data;
      
      if (!content || !recipientId) {
        return socket.emit('error', { message: '消息内容和接收者ID不能为空' });
      }
      
      // 保存消息到数据库
      const messageData = {
        id: generateId(),
        sender_id: agentId,
        sender_type: 'agent',
        recipient_id: recipientId,
        recipient_type: 'user',
        content,
        type: type || 'text',
        file_name: fileName,
        file_size: fileSize,
        created_at: new Date().toISOString()
      };
      
      const { data: savedMessage } = await supabaseService.createMessage(messageData);
      
      // 格式化消息以发送给客户端
      const formattedMessage = {
        id: savedMessage.id,
        content: savedMessage.content,
        type: savedMessage.type,
        sender: 'agent',
        senderId: agentId,
        recipientId,
        fileName: savedMessage.file_name,
        fileSize: savedMessage.file_size,
        timestamp: savedMessage.created_at
      };
      
      // 发送消息给客服（确认发送成功）
      socket.emit('message:sent', formattedMessage);
      
      // 如果用户在线，发送消息给用户
      const userInfo = onlineUsers.get(recipientId);
      if (userInfo) {
        io.to(userInfo.socketId).emit('message:received', formattedMessage);
      }
    } catch (error) {
      console.error('发送消息错误:', error);
      socket.emit('error', { message: '发送消息失败' });
    }
  });
  
  // 在handleAgentConnection函数中添加
  socket.on('share_link:create', async () => {
    try {
      const { data: linkData } = await supabaseService.createShareLink(agentId);
      
      socket.emit('share_link:created', {
        success: true,
        link: linkData
      });
    } catch (error) {
      console.error('创建分享链接失败:', error);
      socket.emit('error', { message: '创建分享链接失败' });
    }
  });
};

/**
 * 处理用户连接
 * @param {object} socket - Socket实例
 * @param {object} io - Socket.IO实例
 */
const handleUserConnection = async (socket, io) => {
  const userId = socket.userData.id;
  const agentId = socket.userData.agentId;
  
  // 存储用户连接
  onlineUsers.set(userId, {
    socketId: socket.id,
    ...socket.userData
  });
  
  console.log(`用户已连接: ${userId} -> 客服: ${agentId}`);
  
  // 检查用户是否存在，如不存在则创建
  let userData;
  try {
    const { data: existingUser } = await supabaseService.getUser(userId);
    
    if (!existingUser) {
      // 创建新用户
      const userDevice = socket.handshake.auth.device || 'unknown';
      const userIp = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;
      
      const newUser = {
        id: userId,
        nickname: socket.userData.nickname || `访客${userId.substring(0, 5)}`,
        avatar: socket.userData.avatar || null,
        ip: userIp,
        device: userDevice,
        first_visit: new Date().toISOString(),
        last_seen: new Date().toISOString(),
        online: true
      };
      
      const { data: createdUser } = await supabaseService.createUser(newUser);
      userData = createdUser;
    } else {
      // 更新现有用户
      const { data: updatedUser } = await supabaseService.updateUser(userId, {
        last_seen: new Date().toISOString(),
        online: true
      });
      userData = updatedUser || existingUser;
    }
  } catch (error) {
    console.error('用户数据处理错误:', error);
  }
  
  // 通知用户连接成功
  socket.emit('user:connected', {
    success: true,
    userId,
    userData: {
      nickname: userData?.nickname || socket.userData.nickname,
      avatar: userData?.avatar || socket.userData.avatar
    }
  });
  
  // 获取欢迎消息
  try {
    const { data: welcomeMessages } = await supabaseService.getWelcomeMessages(agentId);
    
    // 通知客服有新用户连接
    const agentInfo = onlineAgents.get(agentId);
    if (agentInfo) {
      io.to(agentInfo.socketId).emit('user:connected', {
        userId,
        nickname: userData?.nickname,
        avatar: userData?.avatar,
        ip: userData?.ip,
        device: userData?.device,
        firstVisit: userData?.first_visit,
        lastSeen: new Date().toISOString(),
        online: true
      });
      
      // 发送欢迎消息
      if (welcomeMessages && welcomeMessages.length > 0) {
        // 按顺序发送欢迎消息
        const sortedMessages = welcomeMessages.sort((a, b) => a.order - b.order);
        
        // 延迟发送，模拟自然对话
        for (let i = 0; i < sortedMessages.length; i++) {
          const message = sortedMessages[i];
          if (message.content.trim()) {
            setTimeout(async () => {
              // 保存消息到数据库
              const messageData = {
                id: generateId(),
                sender_id: agentId,
                sender_type: 'agent',
                recipient_id: userId,
                recipient_type: 'user',
                content: message.content,
                type: 'text',
                created_at: new Date().toISOString()
              };
              
              const { data: savedMessage } = await supabaseService.createMessage(messageData);
              
              // 发送消息给用户
              socket.emit('message:received', {
                id: savedMessage.id,
                content: savedMessage.content,
                type: savedMessage.type,
                sender: 'agent',
                senderId: agentId,
                recipientId: userId,
                timestamp: savedMessage.created_at
              });
            }, i * 1000); // 每条消息间隔1秒
          }
        }
      }
    }
  } catch (error) {
    console.error('欢迎消息处理错误:', error);
  }
  
  // 用户发送消息
  socket.on('message:send', async (data) => {
    try {
      const { content, type, fileName, fileSize } = data;
      
      if (!content) {
        return socket.emit('error', { message: '消息内容不能为空' });
      }
      
      // 保存消息到数据库
      const messageData = {
        id: generateId(),
        sender_id: userId,
        sender_type: 'user',
        recipient_id: agentId,
        recipient_type: 'agent',
        content,
        type: type || 'text',
        file_name: fileName,
        file_size: fileSize,
        created_at: new Date().toISOString()
      };
      
      const { data: savedMessage } = await supabaseService.createMessage(messageData);
      
      // 格式化消息以发送给客户端
      const formattedMessage = {
        id: savedMessage.id,
        content: savedMessage.content,
        type: savedMessage.type,
        sender: 'user',
        senderId: userId,
        recipientId: agentId,
        fileName: savedMessage.file_name,
        fileSize: savedMessage.file_size,
        timestamp: savedMessage.created_at
      };
      
      // 发送消息给用户（确认发送成功）
      socket.emit('message:sent', formattedMessage);
      
      // 如果客服在线，发送消息给客服
      const agentInfo = onlineAgents.get(agentId);
      if (agentInfo) {
        io.to(agentInfo.socketId).emit('message:received', formattedMessage);
      }
    } catch (error) {
      console.error('发送消息错误:', error);
      socket.emit('error', { message: '发送消息失败' });
    }
  });
};

/**
 * 处理断开连接
 * @param {object} socket - Socket实例
 * @param {object} io - Socket.IO实例
 */
const handleDisconnection = async (socket, io) => {
  console.log('连接断开:', socket.id);
  
  // 处理客服断开连接
  if (socket.agentData) {
    const agentId = socket.agentData.id;
    
    // 从在线客服列表中移除
    onlineAgents.delete(agentId);
    
    // 通知所有与该客服关联的在线用户
    const agentUsers = Array.from(userAgentMap.entries())
      .filter(([_, agent]) => agent === agentId)
      .map(([userId]) => userId);
    
    agentUsers.forEach(userId => {
      const userInfo = onlineUsers.get(userId);
      if (userInfo) {
        io.to(userInfo.socketId).emit('agent:offline', { agentId });
      }
    });
    
    console.log(`客服已断开连接: ${agentId}`);
  } 
  // 处理用户断开连接
  else if (socket.userData) {
    const userId = socket.userData.id;
    const agentId = socket.userData.agentId;
    
    // 从在线用户列表中移除
    onlineUsers.delete(userId);
    
    // 更新用户状态为离线
    try {
      await supabaseService.updateUser(userId, { 
        online: false,
        last_seen: new Date().toISOString()
      });
    } catch (error) {
      console.error('更新用户状态错误:', error);
    }
    
    // 通知客服用户已离线
    const agentInfo = onlineAgents.get(agentId);
    if (agentInfo) {
      io.to(agentInfo.socketId).emit('user:offline', { 
        userId,
        lastSeen: new Date().toISOString()
      });
    }
    
    console.log(`用户已断开连接: ${userId}`);
  }
};

/**
 * 加载用户列表
 * @param {object} socket - 客服Socket
 */
// 获取用户列表
const loadUserList = async (socket) => {
  try {
    const agentId = socket.agentData.id;
    
    // 获取与该客服关联的所有用户
    const userIds = Array.from(userAgentMap.entries())
      .filter(([_, agent]) => agent === agentId)
      .map(([userId]) => userId);
    
    const users = [];
    
    // 获取每个用户的信息
    for (const userId of userIds) {
      const { data: userData } = await supabaseService.getUser(userId);
      
      if (userData) {
        // 检查用户是否在线
        const isOnline = onlineUsers.has(userId);
        
        users.push({
          id: userData.id,
          nickname: userData.nickname,
          avatar: userData.avatar,
          ip: userData.ip,
          device: userData.device,
          firstVisit: userData.first_visit,
          lastSeen: userData.last_seen,
          online: isOnline
        });
      }
    }
    
    // 获取黑名单
    const { data: blacklist } = await supabaseService.getBlacklist(agentId);
    
    // 发送用户列表给客服
    socket.emit('user:list', {
      users,
      blacklist: blacklist || []
    });
  } catch (error) {
    console.error('加载用户列表错误:', error);
    socket.emit('error', { message: '加载用户列表失败' });
  }
};