// server.js - 基本WebSocket服务器
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

// 初始化Express应用
const app = express();
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3003', 'http://localhost:5173'], 
  credentials: true, 
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Admin-Key']
}));
app.use(express.json());

// 创建HTTP服务器
const server = http.createServer(app);

// 初始化Socket.IO
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// 初始化Supabase客户端
const supabaseUrl = process.env.SUPABASE_URL || 'https://zmjyodxdvctygjphghxy.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InptanlvZHhkdmN0eWdqcGhnaHh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE0NzY1NTQsImV4cCI6MjA1NzA1MjU1NH0.P5cG0-S4pS1ul7U8FlEBrMIe81r8chWyplkhnSVtJGE';
const supabase = createClient(supabaseUrl, supabaseKey);

// 存储用户连接
const connectedUsers = new Map();
const connectedAgents = new Map();

// Socket.IO连接处理
io.on('connection', (socket) => {
  console.log('新连接建立:', socket.id);
  
  // 认证处理
  socket.on('auth', async (data) => {
    try {
      if (data.userType === 'agent') {
        // 验证客服身份
        const { data: agentKey, error } = await supabase
          .from('agent_keys')
          .select('*')
          .eq('key', data.token)
          .eq('is_active', true)
          .single();
          
        if (error || !agentKey) {
          socket.emit('error', { message: '无效的客服密钥' });
          return;
        }
        
        // 保存客服连接
        connectedAgents.set(data.id, {
          socketId: socket.id,
          agentId: data.id
        });
        
        // 发送客户列表
        const { data: customers } = await supabase
          .from('customers')
          .select('*')
          .eq('agent_id', data.id)
          .eq('is_blacklisted', false);
          
        if (customers) {
          const formattedCustomers = customers.map(c => ({
            id: c.id,
            nickname: c.nickname || `访客${c.id.slice(0, 4)}`,
            avatar: c.avatar || '',
            isOnline: connectedUsers.has(c.id),
            lastSeen: c.last_seen,
            ip: c.ip || '',
            device: c.device || '',
            firstVisit: c.first_visit
          }));
          
          socket.emit('customers', { customers: formattedCustomers });
        }
        
        // 更新客服状态
        await supabase
          .from('agents')
          .update({ status: 'online' })
          .eq('id', data.id);
        
      } else if (data.userType === 'user') {
        // 验证用户身份
        const userId = data.id;
        const agentId = data.agentId;
        
        // 检查用户是否被拉黑
        const { data: blacklisted } = await supabase
          .from('blacklist')
          .select('*')
          .eq('customer_id', userId)
          .eq('agent_id', agentId)
          .maybeSingle();
          
        if (blacklisted) {
          socket.emit('error', { message: '您已被加入黑名单' });
          return;
        }
        
        // 保存用户连接
        connectedUsers.set(userId, {
          socketId: socket.id,
          agentId
        });
        
        // 更新用户状态
        await supabase
          .from('customers')
          .update({ last_seen: new Date().toISOString() })
          .eq('id', userId)
          .eq('agent_id', agentId);
        
        // 通知客服用户在线
        const agentConnection = connectedAgents.get(agentId);
        if (agentConnection) {
          io.to(agentConnection.socketId).emit('customer_online', {
            customerId: userId,
            timestamp: new Date().toISOString()
          });
        }
      }
      
      socket.emit('auth_success');
      
    } catch (error) {
      console.error('认证错误:', error);
      socket.emit('error', { message: '认证失败' });
    }
  });
  
  // 消息处理
  socket.on('message', async (data) => {
    try {
      const { senderId, recipientId, message } = data;
      
      // 保存消息到数据库
      await supabase
        .from('messages')
        .insert({
          id: message.id,
          content: message.content,
          type: message.type,
          file_name: message.fileName,
          file_size: message.fileSize,
          sender_id: senderId,
          receiver_id: recipientId,
          agent_id: data.agentId,
          timestamp: message.timestamp
        });
      
      // 转发消息给对应接收者
      if (data.userType === 'agent') {
        const userConnection = connectedUsers.get(recipientId);
        if (userConnection) {
          io.to(userConnection.socketId).emit('message', { message });
        }
      } else {
        const agentConnection = connectedAgents.get(recipientId);
        if (agentConnection) {
          io.to(agentConnection.socketId).emit('message', { message });
        }
      }
    } catch (error) {
      console.error('消息发送错误:', error);
      socket.emit('error', { message: '消息发送失败' });
    }
  });
  
  // 心跳检测
  socket.on('ping', () => {
    socket.emit('pong');
  });
  
  // 断开连接处理
  socket.on('disconnect', async () => {
    console.log('连接断开:', socket.id);
    
    // 查找并处理断开的用户
    for (const [userId, conn] of connectedUsers.entries()) {
      if (conn.socketId === socket.id) {
        // 用户断开
        connectedUsers.delete(userId);
        
        // 更新最后在线时间
        await supabase
          .from('customers')
          .update({ last_seen: new Date().toISOString() })
          .eq('id', userId);
        
        // 通知客服用户离线
        const agentConnection = connectedAgents.get(conn.agentId);
        if (agentConnection) {
          io.to(agentConnection.socketId).emit('customer_offline', {
            customerId: userId,
            lastSeen: new Date().toISOString()
          });
        }
        
        break;
      }
    }
    
    // 查找并处理断开的客服
    for (const [agentId, conn] of connectedAgents.entries()) {
      if (conn.socketId === socket.id) {
        // 客服断开
        connectedAgents.delete(agentId);
        
        // 更新客服状态为离开
        await supabase
          .from('agents')
          .update({ status: 'away' })
          .eq('id', agentId);
        
        break;
      }
    }
  });
});

// API端点 - 验证密钥
app.post('/api/verify-key', async (req, res) => {
  try {
    const { key } = req.body;
    
    // 管理员密钥检查
    if (key === process.env.ADMIN_KEY) {
      return res.json({ valid: true, isAdmin: true });
    }
    
    // 客服密钥检查
    const { data, error } = await supabase
      .from('agent_keys')
      .select('*, agents(*)')
      .eq('key', key)
      .eq('is_active', true)
      .single();
      
    if (error || !data) {
      return res.json({ valid: false, message: '无效的卡密' });
    }
    
    // 检查过期时间
    if (new Date(data.expires_at) < new Date()) {
      return res.json({ valid: false, message: '卡密已过期' });
    }
    
    return res.json({ 
      valid: true, 
      isAdmin: false, 
      agentId: data.agent_id,
      agentData: data.agents
    });
  } catch (error) {
    console.error('验证密钥错误:', error);
    res.status(500).json({ valid: false, message: '服务器错误' });
  }
});

// 启动服务器
// server.js
require('dotenv').config();
const { server: appServer } = require('./src/app');
const config = require('./src/config');

const PORT = config.port || 3001;

appServer.listen(PORT, () => {
  console.log(`服务器已启动，监听端口 ${PORT}`);
  console.log(`环境: ${config.nodeEnv || 'development'}`);
});

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error);
  process.exit(1);
});

// 处理未处理的Promise拒绝
process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的Promise拒绝:', reason);
});