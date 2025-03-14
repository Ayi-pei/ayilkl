// src/api/index.ts
// API接口定义

import axios from 'axios';
import { ApiResponse, Message, ShareLink, User, Agent } from './types';

// 创建axios实例
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 请求拦截器 - 添加认证token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 响应拦截器 - 处理错误
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // 未授权，清除token并重定向到登录页
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API函数

// 认证相关
export const authApi = {
  // 登录
  login: async (username: string, password: string): Promise<ApiResponse<{ token: string; user: User }>> => {
    const response = await api.post('/auth/login', { username, password });
    return response.data;
  },
  
  // 注册
  register: async (userData: { username: string; password: string; nickname: string }): Promise<ApiResponse<User>> => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },
  
  // 验证token
  verifyToken: async (): Promise<ApiResponse<User>> => {
    const response = await api.get('/auth/verify');
    return response.data;
  }
};

// 用户相关
export const userApi = {
  // 获取用户信息
  getProfile: async (): Promise<ApiResponse<User>> => {
    const response = await api.get('/users/profile');
    return response.data;
  },
  
  // 更新用户信息
  updateProfile: async (userData: Partial<User>): Promise<ApiResponse<User>> => {
    const response = await api.put('/users/profile', userData);
    return response.data;
  },
  
  // 上传头像
  uploadAvatar: async (file: File): Promise<ApiResponse<{ avatarUrl: string }>> => {
    const formData = new FormData();
    formData.append('avatar', file);
    
    const response = await api.post('/users/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  }
};

// 分享链接相关
export const messageApi = {
    // 获取消息历史
    getHistory: async (recipientId: string): Promise<ApiResponse<Message[]>> => {
      const response = await api.get(`/messages/history/${recipientId}`);
      return response.data;
    },
    
    // 发送消息 (WebSocket处理，这里仅作为备用)
    sendMessage: async (message: Omit<Message, 'id' | 'timestamp'>): Promise<ApiResponse<Message>> => {
      const response = await api.post('/messages/send', message);
      return response.data;
    }
  };
  
  // 分享链接相关
  export const linkApi = {
    // 创建分享链接
    createLink: async (): Promise<ApiResponse<ShareLink>> => {
      const response = await api.post('/links/create');
      return response.data;
    },
    
    // 获取分享链接列表
    getLinks: async (): Promise<ApiResponse<ShareLink[]>> => {
      const response = await api.get('/links');
      return response.data;
    },
    
    // 禁用分享链接
    deactivateLink: async (linkId: string): Promise<ApiResponse<ShareLink>> => {
      const response = await api.put(`/links/${linkId}/deactivate`);
      return response.data;
    },
    
    // 验证分享链接
    verifyLink: async (code: string): Promise<ApiResponse<{ linkInfo: ShareLink; agentInfo: Agent }>> => {
      const response = await api.get(`/links/verify/${code}`);
      return response.data;
    }
  };
  
  // 客服相关
  export const agentApi = {
    // 获取客服信息
    getProfile: async (): Promise<ApiResponse<Agent>> => {
      const response = await api.get('/agents/profile');
      return response.data;
    },
    
    // 更新客服信息
    updateProfile: async (agentData: Partial<Agent>): Promise<ApiResponse<Agent>> => {
      const response = await api.put('/agents/profile', agentData);
      return response.data;
    },
    
    // 获取客服的用户列表
    getUsers: async (): Promise<ApiResponse<User[]>> => {
      const response = await api.get('/agents/users');
      return response.data;
    },
    
    // 设置欢迎消息
    setWelcomeMessage: async (message: string): Promise<ApiResponse<{ message: string }>> => {
      const response = await api.post('/agents/welcome-message', { message });
      return response.data;
    },
    
    // 获取欢迎消息
    getWelcomeMessage: async (): Promise<ApiResponse<{ message: string }>> => {
      const response = await api.get('/agents/welcome-message');
      return response.data;
    }
  };
  
  // 快速回复相关
  export const quickReplyApi = {
    // 获取快速回复列表
    getQuickReplies: async (): Promise<ApiResponse<{ id: string; title: string; content: string }[]>> => {
      const response = await api.get('/quick-replies');
      return response.data;
    },
    
    // 添加快速回复
    addQuickReply: async (data: { title: string; content: string }): Promise<ApiResponse<{ id: string; title: string; content: string }>> => {
      const response = await api.post('/quick-replies', data);
      return response.data;
    },
    
    // 更新快速回复
    updateQuickReply: async (id: string, data: { title?: string; content?: string }): Promise<ApiResponse<{ id: string; title: string; content: string }>> => {
      const response = await api.put(`/quick-replies/${id}`, data);
      return response.data;
    },
    
    // 删除快速回复
    deleteQuickReply: async (id: string): Promise<ApiResponse<{ success: boolean }>> => {
      const response = await api.delete(`/quick-replies/${id}`);
      return response.data;
    }
  };
  
  // 统计相关
  export const statsApi = {
    // 获取聊天统计
    getChatStats: async (period: 'day' | 'week' | 'month' = 'day'): Promise<ApiResponse<{
      messageCount: number;
      userCount: number;
      activeUserCount: number;
      avgResponseTime: number;
    }>> => {
      const response = await api.get(`/stats/chat?period=${period}`);
      return response.data;
    }
  };
  
  export default {
    auth: authApi,
    user: userApi,
    message: messageApi,
    link: linkApi,
    agent: agentApi,
    quickReply: quickReplyApi,
    stats: statsApi
  };