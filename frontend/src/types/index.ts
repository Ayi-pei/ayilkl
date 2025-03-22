// src/types/index.ts - 主要类型定义

// 预设的30个nanoid密钥，可以根据日期轮换使用
export const PRESET_KEYS = [
  'ayi_key_1_nanoId8x7z2c9v',
  'ayi_key_2_nanoId5q8w3e1r',
  'ayi_key_3_nanoId7t4y6u2i',
  'ayi_key_4_nanoId3o9p1a5s',
  'ayi_key_5_nanoId6d4f2g7h',
  'ayi_key_6_nanoId9j5k1l3z',
  'ayi_key_7_nanoId2x4c6v8b',
  'ayi_key_8_nanoId7n9m3q1w',
  'ayi_key_9_nanoId5e2r4t6y',
  'ayi_key_10_nanoId8u1i3o5p',
  'ayi_key_11_nanoId4a7s9d2f',
  'ayi_key_12_nanoId6g3h5j1k',
  'ayi_key_13_nanoId8l4z6x2c',
  'ayi_key_14_nanoId9v7b3n5m',
  'ayi_key_15_nanoId2q4w6e8r',
  'ayi_key_16_nanoId1t3y5u7i',
  'ayi_key_17_nanoId9o2p4a6s',
  'ayi_key_18_nanoId3d5f7g9h',
  'ayi_key_19_nanoId1j3k5l7z',
  'ayi_key_20_nanoId8x2c4v6b',
  'ayi_key_21_nanoId5n7m9q1w',
  'ayi_key_22_nanoId3e5r7t9y',
  'ayi_key_23_nanoId1u3i5o7p',
  'ayi_key_24_nanoId8a2s4d6f',
  'ayi_key_25_nanoId5g7h9j1k',
  'ayi_key_26_nanoId3l5z7x9c',
  'ayi_key_27_nanoId1v3b5n7m',
  'ayi_key_28_nanoId8q2w4e6r',
  'ayi_key_29_nanoId5t7y9u1i',
  'ayi_key_30_nanoId3o5p7a9s',
];

// 获取今日密钥的辅助函数
export const getTodayPresetKey = (index = 0): string => {
  const today = new Date();
  const dayOfMonth = today.getDate();
  const keyIndex = (dayOfMonth + index) % PRESET_KEYS.length;
  return PRESET_KEYS[keyIndex];
};

// 检查密钥是否为今日有效密钥
export const isValidTodayKey = (key: string): boolean => {
  for (let i = 0; i < 30; i++) {
    if (getTodayPresetKey(i) === key) {
      return true;
    }
  }
  return false;
};

// 密钥域名映射常量
export const KEY_DOMAIN_MAPPING = {
  CHAT: 'chat_domain',
  ADMIN: 'admin_domain',
  USER: 'user_domain',
  AGENT: 'agent_domain',
  SYSTEM: 'system_domain',
};

// 为核心组件定义特定的类名前缀
export const COMPONENT_CLASS_PREFIX = {
  CHAT_PAGE: 'ayi-chat-page',
  ADMIN_PAGE: 'ayi-admin-page',
  LOGIN_PAGE: 'ayi-login-page',
  AGENT_FUNCTION: 'ayi-agent-function',
  USER_FUNCTION: 'ayi-user-function',
};

// 为不同域定义nanoid前缀
export const NANOID_PREFIX = {
  CHAT: 'chat_',
  USER: 'user_',
  AGENT: 'agent_',
  ADMIN: 'admin_',
  MESSAGE: 'msg_',
  QUICK_REPLY: 'qr_',
  LINK: 'link_',
  KEY: 'key_',
};

// 生成带前缀的nanoid的辅助函数
// 注意：此函数已移至utils/idUtils.ts，这里保留接口兼容性
import { nanoid } from 'nanoid';
export const generatePrefixedId = (prefix: string, length: number = 10): string => {
  return `${prefix}${nanoid(length)}`;
};

// 统一 UserType 定义
export type UserType = 'admin' | 'agent' | 'user' | null;

// 统一 AgentData 接口
export interface AgentData {
  id: string;
  nickname: string;
  avatar?: string;
  status: 'online' | 'offline' | 'away' | 'busy';
  lastSeen?: string;
  settings?: {
    theme: 'light' | 'dark';
    soundEnabled: boolean;
    notifications: boolean;
  };
  stats?: {
    totalChats: number;
    activeChats: number;
    rating: number;
  };
  [key: string]: unknown; // 允许其他未知字段
}

// 统一 Message 接口
export interface Message {
  id: string;
  content: string;
  type: 'text' | 'image' | 'audio' | 'file' | 'zip' | 'exe' | 'system' | 'video' | 'location';
  sender: 'user' | 'agent' | 'customer' | 'system' | 'bot';
  recipientId?: string;
  fileName?: string;
  fileSize?: number;
  timestamp: string;
  createdAt?: string; // 添加createdAt字段，与API和数据库模型保持一致
  [key: string]: unknown; // 允许其他未知字段
}

// 客户状态数据
export interface CustomerStatusData {
  customerId: string;
  isOnline: boolean;
  lastSeen?: string;
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
  unreadCount?: number;
}

// 统一 WebSocket 相关接口
export interface WebSocketMessageBase {
  type: string;
  data?: Record<string, unknown>;
  message?: Message;
  customerId?: string;
  agentId?: string;
  status?: string;
  timestamp?: string;
  error?: string;
  customersList?: Customer[];
}

// 具体 WebSocket 消息类型
export interface WebSocketMessage extends WebSocketMessageBase {
  // 使用字符串字面量联合类型避免类型覆盖问题
  type: 
    | 'auth' 
    | 'message'
    | 'chat_message'
    | 'customer_online' 
    | 'customer_offline' 
    | 'customer_status'
    | 'agent_status'
    | 'ping'
    | 'pong'
    | 'error'
    | 'customers_list'
  | (string & {});  // 使用交集类型允许其他字符串，但不会覆盖字面量类型
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
  token: string;
  userId?: string;
  userType?: UserType;  // 使用统一的 UserType
  id?: string;
}

export interface MessageData {
  id: string;
  content: string;
  type?: string;
  sender?: string;
  customerId?: string;
  agentId?: string;
  timestamp?: string;
  [key: string]: unknown;  // 允许其他字段
}

export interface AgentStatusData {
  agentId: string;
  status: 'online' | 'away' | 'busy' | (string & {});  // 使用交集类型允许其他字符串，但不会覆盖字面量类型
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
  avatar?: string;
  reason: string;
  createdAt: string;
  ip: string;
  device: string;
  isOnline: boolean;
  lastSeen: string;
  firstVisit: string;
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
  soundEnabled?: boolean;
  welcomeMessages?: string[];
}

// 用户设置
export interface UserSettings {
  id: string;
  nickname: string;
  avatar: string;
  soundEnabled?: boolean;
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
  url?: string;
  error?: string;
}

// 链接相关接口
export interface LinkInfo {
  valid: boolean;
  message?: string;
  link?: {
    id: string;
    code: string;
    expiresAt: string;
  };
  agent?: AgentData;
  agentId?: string;
}

// 短链验证结果
export interface LinkVerificationResult extends LinkInfo {
  linkId?: string;
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
  metadata?: Record<string, unknown>;
}

// 临时用户创建结果
export interface TempUserCreationResult {
  token: string;
  user: {
    id: string;
    nickname: string;
    avatar?: string;
  };
  agent?: AgentData;
}

// 链接数据
export interface LinkData {
  id: string;
  code: string;
  url: string;
  expiresAt: string;
  createdAt: string;
  accessCount?: number;
  isActive?: boolean;
}

// 链接用户
export interface LinkUser {
  id: string;
  nickname: string;
  avatar?: string;
  firstVisit: string;
  lastSeen: string;
}
