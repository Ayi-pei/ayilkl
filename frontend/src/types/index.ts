// src/types/index.ts - 主要类型定义

import type { MessageType, SenderType } from "../utils/messageUtils";

// 预设的30个nanoid密钥，可以根据日期轮换使用
export const PRESET_KEYS = [
  'ayi_key_1_nano',
];

// 统一 UserType 定义
export type UserType = 'admin' | 'agent' | 'user' | null;

// 统一 AgentData 接口
export interface AgentData {
  id: string;
  nickname: string;
  avatar: string;
  status: 'online' | 'away' | 'busy';
  soundEnabled?: boolean | null;
  welcomeMessages?: string[] | null;
}

// 统一 Message 接口
export interface Message {
  id: string;
  content: string;
  type: MessageType; // 修改这里，使用枚举类型而非字面量联合类型
  sender: SenderType;
  recipientId?: string;
  fileName?: string | null;
  fileSize?: number | null;
  timestamp: string;
  streamMessageId?: string; // Stream Chat 消息 ID
  isRead?: boolean; // 已读状态
  createdAt: string;
}


// 客户状态数据
export interface CustomerStatusData {
  customerId: string;
  isOnline: boolean;
  lastSeen?: string | null;
}

// 客户类型
export interface Customer {
  id: string;
  nickname: string;
  avatar: string;
  isOnline: boolean;
  lastSeen: string;
  ip: string;
  device: string;
  firstVisit: string;
  unreadCount?: number | null;
}

// 统一 WebSocket 相关接口
export interface WebSocketMessageBase {
  type: string;
  data?: Record<string, unknown> | null;
  message?: Message | null;
  customerId?: string | null;
  agentId?: string | null;
  status?: string | null;
  timestamp?: string | null;
  error?: string | null;
  customersList?: Customer[] | null;
}

// 具体 WebSocket 消息类型
export interface WebSocketMessage extends WebSocketMessageBase {
  type:
  | 'auth'
  | 'message'
  | 'chat_message'
  | 'stream_chat_message' // Stream Chat 消息
  | 'stream_chat_typing' // Stream Chat 输入中状态
  | 'stream_chat_read' // Stream Chat 已读状态
  | 'customer_online'
  | 'customer_offline'
  | 'customer_status'
  | 'agent_status'
  | 'ping'
  | 'pong'
  | 'error'
  | 'customers_list';
}

// WebSocket 消息数据类型
export type WebSocketMessageData =
  | AuthData
  | MessageData
  | CustomerStatusData
  | AgentStatusData
  | PingPongData
  | ErrorData
  | Record<string, unknown>;  // 兼容其他数据类型

export interface AuthData {
  token: string; // Stream Chat 认证 token
  userId: string; // 用户 ID
  userType: UserType; // 'admin' | 'agent' | 'user' | null
  chatToken?: string; // Stream Chat 专用 token
}


export interface MessageData {
  id: string;
  content: string;
  type?: string | null;
  sender?: string | null;
  customerId?: string | null;
  agentId?: string | null;
  timestamp?: string | null;
  [key: string]: unknown;  // 允许其他字段
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

// 黑名单用户
export interface BlacklistedUser {
  id: string;
  nickname: string;
  avatar?: string | null;
  reason: string;
  createdAt: string;
  ip: string;
  device: string;
  isOnline: boolean;
  lastSeen: string;
  firstVisit: string;
  blacklistedAt?: string | null;
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
  soundEnabled?: boolean | null;
  welcomeMessages?: string[] | null;
}

// 用户设置
export interface UserSettings {
  id: string;
  nickname: string;
  avatar: string;
  soundEnabled?: boolean | null;
  theme?: 'light' | 'dark';
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
  url?: string | null;
  error?: string | null;
}

// 链接相关接口
export interface LinkInfo {
  valid: boolean;
  message?: string | null;
  link?: {
    id: string;
    code: string;
    expiresAt: string;
  } | null;
  agent?: AgentData | null;
  agentId?: string | null;
}

// 短链验证结果
export interface LinkVerificationResult extends LinkInfo {
  linkId?: string | null;
}

// 卡密验证结果
export interface KeyVerificationResult {
  valid: boolean;
  isAdmin?: boolean;
  agentId?: string;
  agentData?: AgentData;
  message?: string;
  expiresAt?: string;
  linkId?: string;
  streamChatToken?: string; // Stream Chat 认证 token
}

export interface TokenData {
  agentId: string;
  linkId: string;
  expiresAt: number;
  createdAt: number;
  [key: string]: unknown;
}

// 定义 AgentLink 接口
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

// 密钥相关
export enum KeyScope {
  CHAT = 'chat',
  ADMIN = 'admin',
  AGENT = 'agent',
  USER = 'user',
  SYSTEM = 'system'
}

export enum KeyPurpose {
  AUTH = 'auth',
  SHARE = 'share',
  ENCRYPTION = 'encryption',
  API = 'api',
  SESSION = 'session'
}

export interface KeyInfo {
  key: string;
  scope: KeyScope;
  purpose: KeyPurpose;
  expires: number;
  metadata?: Record<string, unknown> | null;
}

// 临时用户创建结果
export interface TempUserCreationResult {
  token: string;
  user: {
    id: string;
    nickname: string;
    avatar?: string | null;
  };
  agent?: AgentData | null;
}

// 链接数据
export interface LinkData {
  id: string;
  code: string;
  url: string;
  expiresAt: string;
  createdAt: string;
  accessCount?: number | null;
  isActive?: boolean | null;
}

// 链接用户
export interface LinkUser {
  id: string;
  nickname: string;
  avatar?: string | null;
  firstVisit: string;
  lastSeen: string;
}

export const NANOID_PREFIX = {
  CHAT: 'chat_',
  USER: 'user_',
  AGENT: 'agent_',
  ADMIN: 'admin_',
  MESSAGE: 'msg_',
  QUICK_REPLY: 'qr_',
  LINK: 'link_',
  KEY: 'key_'
};
