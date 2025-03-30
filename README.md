# 客服聊天系统

本项目为一个前后端分离的客户服务聊天系统，前端使用 React、TypeScript、Ant Design 等技术构建，后端使用 Node.js 等技术实现业务逻辑和数据存储，同时通过 Supabase 提供实时通信和数据库支持。

## 前端介绍

前端部分主要负责用户交互，包括：

- 实时聊天界面（文字、语音、表情、文件上传等）
- 客服操作面板，展示用户列表、在线状态及快捷回复
- 环境变量配置（如 Supabase 链接、API 地址）通过 .env 文件进行管理

## 后端介绍

后端服务负责：
- 用户和客服认证（使用 JWT）
- 消息存储与转发
- 密钥管理和验证（包含预设类型定义）
- Supabase 数据库的连接与操作

## 项目功能与用途

- 支持前后端实时通信，确保聊天的高响应性
- 提供完善的权限和密钥管理，限制每日客服数量
- 使用预设的类型定义（见 src/types/index.ts），保证数据结构一致性和类型安全
- Supabase 配置详见 .env 文件，包含 SUPABASE_URL、SUPABASE_ANON_KEY 等，确保数据库的快速接入

## 重点类型定义

项目中在 src/types/index.ts 文件中定义了主要数据接口和辅助函数：
- 预设的 30 个 nanoid 密钥及每日密钥轮换逻辑
- 核心类型定义，如 AgentData、Message、Customer 及 WebSocket 消息接口
- 用于生成带前缀的 nanoid 的辅助函数  
这些类型保证了系统在数据交互时的严谨性和安全性。

## Supabase 链接设置

Supabase 用于提供实时数据和数据库支持，在 .env 文件中配置：

# 示例配置
SUPABASE_URL=https://your_supabase_instance.supabase.co
SUPABASE_SERVICE_KEY=your_service_key
SUPABASE_ANON_KEY=your_anon_key

前端通过 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY 使用 Supabase 服务；后端可利用 SUPABASE_SERVICE_KEY 访问受保护资源。

## 安装步骤

### 前端

1. 克隆仓库：
   git clone https://github.com/yourusername/customer-service-chat.git
   cd customer-service-chat/frontend

2. 安装依赖：
   npm install

3. 启动开发服务器：
   npm run dev

### 后端

1. 进入后端目录：
   cd ../backend

2. 安装依赖：
   npm install

3. 启动服务器：
   npm start

## 注意事项

- 请确保在项目根目录配置好 .env 文件中的所有环境变量（尤其是 Supabase 和 JWT 配置）。
- 保持各模块接口和类型定义的一致性，方便前后端协作。
- 定期更新密钥和权限配置，确保系统安全稳定运行。

## 其它说明

本项目仅包含前端部分。如需后端服务，请参考对应仓库。
