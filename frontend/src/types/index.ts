// src/types/index.ts - 主要类型定义

// 消息类型
export interface Message {
  id: string;
  content: string;
  type: 'text' | 'image' | 'audio' | 'file' | 'zip' | 'exe';
  sender: 'user' | 'agent' | 'customer'; // 添加 'customer' 类型
  recipientId?: string;
  fileName?: string;
  fileSize?: number;
  timestamp: string;
}

// 客户类型
export interface Customer {
  id: string;
  nickname: string;
  avatar: string;
  isOnline: boolean;
  lastSeen: string; // 保持为string类型
  ip: string;
  device: string;
  firstVisit: string; // 保持为string类型
}

// 方案2: 如果将来会添加特定属性，可以先添加注释 Customer
export interface BlacklistedUser {
  id: string;
  nickname: string;
  avatar?: string;
  reason: string; // 必须包含
  createdAt: string; // 必须包含
  ip: string;
  device: string;
  isOnline: boolean;
  lastSeen: string; // 修改为string类型，与Customer保持一致
  firstVisit: string; // 修改为string类型，与Customer保持一致
  blacklistedAt?: string;

}
// 快捷回复
export interface QuickReply {
  id: string;
  title: string;
  content: string;
}

// 客服设置
export interface AgentSettings {
  id: string;
  key: string;
  expiryTime: string;
  nickname: string;
  avatar: string;
  status: 'online' | 'away' | 'busy';
}

// 用户设置
export interface UserSettings {
  id: string;
  nickname: string;
  avatar: string;
}

// WebSocket消息结构
// 更好的方案：为不同消息类型定义特定的数据结构
export interface WebSocketMessage {
 type: 
   | 'auth' 
   | 'message' 
   | 'customer_online' 
   | 'customer_offline' 
   | 'agent_status'
   | 'ping'
   | 'pong'
   | 'error'
   | 'customers_list';  // 添加customers_list类型
 data?: WebSocketMessageData;
 message?: Message;
 customerId?: string;
 agentId?: string;
 status?: string;
 timestamp?: string;
 error?: string;
 customersList?: Customer[];  // 添加customersList字段
}

// 为每种消息类型定义特定的数据类型
export type WebSocketMessageData = 
 | AuthData
 | MessageData
 | CustomerStatusData
 | AgentStatusData
 | PingPongData
 | ErrorData;

export interface AuthData {
 token: string;
 userId?: string;
 userType?: 'agent' | 'user' | 'admin';  // 添加userType字段
 id?: string;  // 添加id字段
}

export interface MessageData {
 id: string;
 content: string;
 // 其他消息特定字段
}

export interface CustomerStatusData {
 customerId: string;
 status: 'online' | 'offline';
 lastSeen?: string;
}

export interface AgentStatusData {
 agentId: string;
 status: 'online' | 'away' | 'busy';
}

export interface PingPongData {
 timestamp: number;
}

export interface ErrorData {
 code: string;
 message: string;
}
// WebSocket连接状态
export enum WebSocketStatus {
  CONNECTING = 0,
  OPEN = 1,
  CLOSING = 2,
  CLOSED = 3,
  RECONNECTING = 4,
  ERROR = 5
}

// 聊天区域可见部分
export enum ChatPanelType {
  NONE = 'none',
  USER_INFO = 'user_info',
  QUICK_REPLY = 'quick_reply'
}

// 统计数据
export interface Stats {
  totalCustomers: number;
  activeCustomers: number;
  totalMessages: number;
  messagesLast24h: number;
  onlineAgents: number;
  totalKeys: number;
}

// 文件上传结果
export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

// 短链验证结果
export interface LinkVerificationResult {
  valid: boolean;
  agentId?: string;
  linkId?: string;
  expiresAt?: string;
  message?: string;
}

// 卡密验证结果
export interface KeyVerificationResult {
 valid: boolean;
 isAdmin?: boolean;
 agentId?: string;
 agentData?: {
   id: string;
   nickname?: string;
   avatar?: string;
   status?: string; // 注意这里是string，而不是限制为'online'|'away'|'busy'
 };
 message?: string;
 expiresAt?: string; //  verifyLink 函数返回的 expiresAt 仍然是 string 类型 (来自数据库)
}

export interface tokenData {
 agentId: string;
 linkId: string;
 expiresAt: number; // 注意这里是number类型
 createdAt: number; // 注意这里是number类型
 [key: string]: unknown;
}

// 定义 AgentLink 接口来明确 getAgentLinks 函数的返回类型
export interface AgentLink {
 id: string;
 linkId: string;
 createdAt: string;
 expiresAt: string;
 isActive: boolean;
 shareUrl: string;
}

export interface KeyData {
  id: string;
  key: string;
  agentId: string;
  agentName: string;
  isActive: boolean;
  createdAt: string;
  expiresAt: string;
  remainingDays: number;
}

export interface AgentData {
  id: string;
  nickname?: string;
  avatar?: string;
  status?: string;
  // 移除 email 字段
}


export type UserType = 'user' | 'admin';

// 在现有的 types/index.ts 文件中添加以下类型定义

/**
 * 密钥作用域枚举
 */
export enum KeyScope {
  CHAT = 'chat',
  ADMIN = 'admin',
  AGENT = 'agent',
  USER = 'user',
  SYSTEM = 'system'
}

/**
 * 密钥用途枚举
 */
export enum KeyPurpose {
  AUTH = 'auth',
  SHARE = 'share',
  ENCRYPTION = 'encryption',
  API = 'api',
  SESSION = 'session'
}

/**
 * 密钥信息接口
 */
export interface KeyInfo {
  key: string;
  scope: KeyScope;
  purpose: KeyPurpose;
  expires: number;
  metadata?: any;
}
