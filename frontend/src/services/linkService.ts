// src/services/linkService.ts
import { apiClient } from './apiClient';

export interface LinkData {
  id: string;
  code: string;
  url: string;
  expiresAt: string;
  createdAt: string;
  accessCount?: number;
  isActive?: boolean;
}

export interface LinkInfo {
  valid: boolean;
  message?: string;
  link: {
    id: string;
    code: string;
    expiresAt: string;
  };
  agent: {
    id: string;
    nickname: string;
    avatar?: string;
    status: string;
  };
  agentId?: string; // 添加 agentId 属性，兼容现有代码
}

// 添加链接统计接口
export interface LinkStats {
  totalVisits: number;
  uniqueUsers: number;
  lastAccessed: string;
}

// 添加链接用户接口
export interface LinkUser {
  id: string;
  nickname: string;
  avatar?: string;
  firstVisit: string;
  lastSeen: string;
}

export class LinkService {
  /**
   * 创建分享链接
   * @param agentId 客服ID
   * @param expiresIn 过期时间(小时)，默认24小时
   * @returns 链接数据
   */
  static async createLink(agentId: string, expiresIn: number = 24): Promise<LinkData> {
    const response = await apiClient.post('/share-links', {
      agentId,
      expiresIn
    });
    return response.data.data;
  }

  /**
   * 获取客服的所有分享链接
   * @returns 链接列表
   */
  static async getLinks(): Promise<LinkData[]> {
    const response = await apiClient.get('/share-links');
    return response.data.data;
  }

  /**
   * 删除分享链接
   * @param linkId 链接ID
   * @returns 是否成功
   */
  static async deleteLink(linkId: string): Promise<boolean> {
    await apiClient.delete(`/share-links/${linkId}`);
    return true;
  }

  /**
   * 验证分享链接
   * @param code 链接代码
   * @returns 链接信息
   */
  static async verifyLink(code: string): Promise<LinkInfo> {
    const response = await apiClient.get(`/share-links/verify/${code}`);
    const data = response.data.data;
    
    // 确保返回的数据符合 LinkInfo 接口
    return {
      valid: true, // 如果请求成功，则认为链接有效
      link: data.link,
      agent: data.agent,
      agentId: data.agent.id // 添加 agentId 字段，方便直接访问
    };
  }

  /**
   * 更新分享链接
   * @param linkId 链接ID
   * @param data 更新数据
   * @returns 更新后的链接数据
   */
  static async updateLink(linkId: string, data: {
    expiresAt?: string;
    isActive?: boolean;
  }): Promise<LinkData> {
    const response = await apiClient.put(`/share-links/${linkId}`, data);
    return response.data.data;
  }

  /**
   * 生成链接二维码
   * @param linkId 链接ID
   * @returns 二维码图片URL
   */
  static async generateQRCode(linkId: string): Promise<string> {
    const response = await apiClient.get(`/share-links/${linkId}/qrcode`);
    return response.data.data.qrCodeUrl;
  }

  /**
   * 禁用分享链接
   * @param linkId 链接ID
   * @returns 是否成功
   */
  static async deactivateLink(linkId: string): Promise<boolean> {
    await apiClient.put(`/share-links/${linkId}/deactivate`);
    return true;
  }

  /**
   * 获取链接访问统计
   * @param linkId 链接ID
   * @returns 链接统计数据
   */
  static async getLinkStats(linkId: string): Promise<LinkStats> {
    const response = await apiClient.get(`/share-links/${linkId}/stats`);
    return response.data.data;
  }

  /**
   * 获取通过链接访问的用户列表
   * @param linkId 链接ID
   * @returns 用户列表
   */
  static async getLinkUsers(linkId: string): Promise<LinkUser[]> {
    const response = await apiClient.get(`/share-links/${linkId}/users`);
    return response.data.data;
  }
}