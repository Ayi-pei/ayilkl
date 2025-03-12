// src/services/authService.ts
import { apiClient } from './apiClient';
import { supabase } from './supabase';
import { KeyVerificationResult } from '../types/index';

interface LoginResponse {
  token: string;
  user: {
    id: string;
    nickname: string;
    avatar?: string;
  };
  agent?: {
    id: string;
    nickname: string;
    avatar?: string;
  };
}

interface TempUserData {
  nickname?: string;
  avatar?: string;
}

export class AuthService {
  /**
   * 客服登录
   * @param username 用户名
   * @param password 密码
   * @returns 登录响应
   */
  static async login(username: string, password: string): Promise<LoginResponse> {
    const response = await apiClient.post('/auth/login', { username, password });
    return response.data.data;
  }

  /**
   * 客服登出
   */
  static async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.error('登出失败:', error);
    } finally {
      // 无论API调用是否成功，都清除本地存储
      localStorage.removeItem('auth_token');
    }
  }

  /**
   * 验证token
   * @returns 验证结果
   */
  static async verifyToken(): Promise<LoginResponse> {
    const response = await apiClient.get('/auth/verify');
    return response.data.data;
  }

  /**
   * 从分享链接创建临时用户
   * @param linkId 链接ID
   * @param userData 用户数据
   * @returns 临时用户信息
   */
  static async createTempUserFromLink(linkId: string, userData: TempUserData): Promise<LoginResponse> {
    const response = await apiClient.post(`/auth/temp-user/${linkId}`, userData);
    return response.data.data;
  }

  /**
   * 更新客服信息
   * @param agentId 客服ID
   * @param data 更新数据
   */
  static async updateAgentProfile(agentId: string, data: {
    nickname?: string;
    avatar?: string;
    status?: 'online' | 'away' | 'offline';
  }): Promise<void> {
    await apiClient.put(`/agents/${agentId}`, data);
  }

  /**
   * 更改密码
   * @param oldPassword 旧密码
   * @param newPassword 新密码
   */
  static async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    await apiClient.post('/auth/change-password', {
      oldPassword,
      newPassword
    });
  }

  /**
   * 使用密钥验证客服身份
   * @param key 客服密钥
   * @returns 验证结果
   */
  static async verifyKey(key: string): Promise<KeyVerificationResult> {
    try {
      const { data, error } = await supabase
        .from('agent_keys')
        .select(`
          *,
          agents (
            id,
            nickname,
            avatar,
            status
          )
        `)
        .eq('key', key)
        .eq('is_active', true)
        .single();
        
      if (error) {
        return {
          valid: false,
          message: '无效的密钥'
        };
      }
      
      // 检查密钥是否过期
      const expiresAt = new Date(data.expires_at);
      const now = new Date();
      
      if (expiresAt < now) {
        return {
          valid: false,
          message: '密钥已过期'
        };
      }
      
      // 检查是否是管理员密钥
      const isAdmin = data.is_admin === true;
      
      return {
        valid: true,
        isAdmin,
        agentId: data.agent_id,
        agentData: {
          id: data.agents.id,
          nickname: data.agents.nickname,
          avatar: data.agents.avatar,
          status: data.agents.status
        },
        expiresAt: data.expires_at
      };
    } catch (error) {
      console.error('验证密钥失败:', error);
      return {
        valid: false,
        message: '验证过程中发生错误'
      };
    }
  }

  /**
   * 直接使用Supabase验证用户身份
   * @param userId 用户ID
   * @param agentId 客服ID
   * @returns 是否验证成功
   */
  static async verifyUserWithSupabase(userId: string, agentId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id')
        .eq('id', userId)
        .eq('agent_id', agentId)
        .single();
        
      return !error && !!data;
    } catch (error) {
      console.error('验证用户失败:', error);
      return false;
    }
  }
}
