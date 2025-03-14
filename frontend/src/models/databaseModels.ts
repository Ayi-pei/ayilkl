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
  created_at: string;
  updated_at: string;
  share_link_id?: string;
}

/**
 * 客服密钥表模型
 */
export interface AgentKey {
  id: string;
  agent_id: string;
  key: string;
  created_at: string;
  expires_at: string;
  is_active: boolean;
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
  created_at: string;
  last_seen: string;
  agent_id?: string; // 关联到的客服ID
}

/**
 * 消息表模型
 */
export interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  message_type: 'text' | 'image' | 'file';
  file_url?: string;
  timestamp: string;
  is_read: boolean;
}

/**
 * 聊天链接表模型
 */
export interface ChatLink {
  id: string;
  link_id: string;
  agent_id: string;
  token: string;
  created_at: string;
  expires_at: string;
  is_active: boolean;
}

/**
 * 统计数据模型
 */
export interface Stats {
  totalCustomers: number;
  totalAgents: number;    // 总客服数
  totalMessages: number;  // 总消息数
  todayMessages: number;  // 今日消息数
}
