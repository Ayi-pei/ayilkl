// src/api/types.ts
// 定义API接口类型

// 用户类型
export enum UserType {
  CUSTOMER = 'customer',
  AGENT = 'agent',
  ADMIN = 'admin'
}

export interface User {
  userType: UserType;
  id: string;
  nickname: string;
  avatar?: string;
  email?: string;
  createdAt: string;
  isTemp?: boolean;
}

// 客服类型
export interface Agent {
  id: string;
  nickname: string;
  avatar?: string;
  email?: string;
  status: 'online' | 'away' | 'busy';
  lastSeen?: string;
  createdAt: string;
  updatedAt: string;
}

// 消息类型
export interface Message {
  id: string;
  content: string;
  type: 'text' | 'image' | 'audio';
  sender: 'user' | 'agent';
  senderId: string;
  recipientId: string;
  createdAt: string;
  isRead: boolean;
  fileName?: string;
  fileSize?: number;
}

// 分享链接类型
export interface ShareLink {
  id: string;
  code: string;
  url: string;
  agentId: string;
  createdAt: string;
  expiresAt: string;
  accessCount: number;
  isActive: boolean;
}

// API响应类型
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}