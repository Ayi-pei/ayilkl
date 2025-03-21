// src/models/databaseModels.ts
// 这个文件用于定义与数据库表结构相匹配的模型类型

/**
 * 客服表模型
 */
export interface Agent {
  id: string;
  nickname: string;
  avatar?: string;
  status: 'online' | 'away' | 'busy';
  email?: string;
  createdAt: string;
  updatedAt: string;
  shareLinkId?: string;
}

/**
 * 客服密钥表模型
 */
export interface AgentKey {
  id: string;
  agent_id: string;
  key: string;
  createdAt: string;
  expiresAt: string;
  isActive: boolean;
  agents?: Agent; // 关联关系
}

/**
 * 客户表模型
 */
export interface Customer {
  id: string;
  nickname: string;
  avatar?: string;
  ip?: string;
  device_info?: string;
  createdAt: string;
  lastSeen: string;
  agentId?: string; // 关联到的客服ID
}

/**
 * 消息表模型
 */
export interface Message {
  id: string;
  senderId: string;
  recipientId: string;
  content: string;
  messageType: 'text' | 'image' | 'file';
  fileUrl?: string;
  createdAt: string;
  isRead: boolean;
}

/**
 * 聊天链接表模型
 */
export interface ChatLink {
  id: string;
  linkId: string;
  agentId: string;
  token: string;
  createdAt: string;
  expiresAt: string;
  isActive: boolean;
}

/**
 * 统计数据模型
 */
export interface Stats {
  agentsCount: number;      // 总客服数
  activeKeysCount: number;  // 活跃密钥数
  customersCount: number;   // 总客户数
  messagesCount: number;    // 总消息数
  lastUpdated: string;      // 最后更新时间
}
