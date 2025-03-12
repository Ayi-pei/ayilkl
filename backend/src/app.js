// src/app.js
const express = require('express');
const http = require('http');
const cors = require('cors');
const config = require('./config');
const { errorHandler, notFoundHandler } = require('./middlewares/error');
const websocketService = require('./utils/websocket');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
// 导入认证中间件
const { authenticateShareLink } = require('./middlewares/auth');
const { createTempUser } = require('./middlewares/user');

// 初始化Express应用
const app = express();

// 中间件配置
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 用户通过短链接访问聊天页面
app.get('/chat/:code', authenticateShareLink, createTempUser, (req, res) => {
  // 处理聊天页面请求
  res.json({
    success: true,
    message: '聊天链接有效',
    data: {
      tempUserId: req.tempUser.id,
      agentId: req.agent.id,
      agentName: req.agent.nickname || '客服',
      shareLink: req.shareLink
    }
  });
});

// 路由导入
const apiRoutes = require('./routes/apiRoutes');
const keysRoutes = require('./routes/keys');

// 应用路由
app.use('/api', apiRoutes);
app.use('/api/keys', keysRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// 健康检查路由
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 错误处理中间件
app.use(notFoundHandler);
app.use(errorHandler);

// 创建HTTP服务器
const server = http.createServer(app);

// 初始化WebSocket服务
websocketService(server);

// 导出app和server以便在server.js中使用
module.exports = { app, server };