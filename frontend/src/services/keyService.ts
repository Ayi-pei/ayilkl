// src/services/keyService.ts
import { nanoid } from 'nanoid';
import { toast } from '../components/common/Toast';
import { KeyVerificationResult as BaseKeyVerificationResult, KeyData, KeyScope, KeyPurpose } from '../types';
import { supabase } from './supabase';
import { KeyManager } from './keyManager';
import { v4 as uuidv4 } from 'uuid';

// 环境变量类型声明，解决TypeScript错误
declare global {
  interface ImportMeta {
    env: {
      VITE_ADMIN_KEY: string;
      VITE_SUPABASE_URL: string;
      VITE_SUPABASE_ANON_KEY: string;
      VITE_LINK_ENCRYPTION_KEY: string;
      [key: string]: string;
    }
  }
}

// 扩展原有的KeyVerificationResult接口，添加linkId属性
interface ExtendedKeyVerificationResult extends BaseKeyVerificationResult {
  linkId?: string; // 添加这个属性，用于存储客服可分享给客户的短链接ID
}

/**
 * 密钥服务 - 负责密钥的生成、验证和管理
 */
export class KeyService {
  /**
   * 验证密钥
   * @param key 密钥
   * @returns 验证结果
   */
  static async verifyKey(key: string): Promise<ExtendedKeyVerificationResult> {
    try {
      // 检查是否管理员密钥
      const adminKey = import.meta.env.VITE_ADMIN_KEY;
      if (key === adminKey) {
        return { valid: true, isAdmin: true };
      }
      
      // 验证客服卡密
      const { data, error } = await supabase
        .from('agent_keys')
        .select('*, agents(id, nickname, avatar, status, share_link_id)')
        .eq('key', key)
        .eq('is_active', true)
        .single();
        
      if (error || !data) {
        return { valid: false, message: '卡密无效或已过期' };
      }
      
      // 检查是否过期
      const expiresAt = new Date(data.expires_at);
      if (expiresAt < new Date()) {
        return { valid: false, message: '卡密已过期' };
      }
      
      // 处理status字段
      let validStatus: 'online' | 'away' | 'busy' = 'online';
      if (data.agents && data.agents.status) {
        if (data.agents.status === 'online' || 
            data.agents.status === 'away' || 
            data.agents.status === 'busy') {
          validStatus = data.agents.status as 'online' | 'away' | 'busy';
        }
      }
      
      // 验证成功后，将密钥注册到KeyManager
      if (data.agent_id) {
        KeyManager.registerExternalKey(
          key,
          KeyScope.AGENT,
          KeyPurpose.AUTH,
          data.agent_id
        );
      }
      
      // 在返回结果中包含 linkId
      return { 
        valid: true, 
        isAdmin: false,
        agentId: data.agent_id,
        agentData: data.agents ? {
          id: data.agents.id,
          nickname: data.agents.nickname,
          avatar: data.agents.avatar,
          status: validStatus
        } : undefined,
        linkId: data.agents?.share_link_id // 从客服数据中获取分享链接ID
      };
    } catch (error) {
      console.error('验证卡密失败:', error);
      return { valid: false, message: '验证失败，请稍后重试' };
    }
  }
  
  /**
   * 生成新密钥
   * @param agentId 客服ID
   * @param expiryDays 有效期天数
   * @returns 新密钥
   */
  static async generateAgentKey(agentId: string, expiryDays: number = 30): Promise<string | null> {
    try {
      // 使用KeyManager生成密钥
      const newKey = KeyManager.generateKey(
        KeyScope.AGENT,
        KeyPurpose.AUTH,
        expiryDays * 24
      );
      
      // 设置过期时间
      const now = new Date();
      const expiresAt = new Date(now);
      expiresAt.setDate(now.getDate() + expiryDays);
      
      // 停用所有现有密钥
      await supabase
        .from('agent_keys')
        .update({ is_active: false })
        .eq('agent_id', agentId)
        .eq('is_active', true);
      
      // 保存到数据库
      const { error } = await supabase
        .from('agent_keys')
        .insert({
          id: uuidv4(), // 使用UUID格式的ID
          agent_id: agentId,
          key: newKey,
          created_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
          is_active: true
        });
        
      if (error) throw error;
      
      return newKey;
    } catch (error) {
      console.error('生成密钥失败:', error);
      toast.error('生成密钥失败');
      return null;
    }
  }
  
  /**
   * 停用密钥
   * @param keyId 密钥ID
   */
  static async deactivateKey(keyId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('agent_keys')
        .update({ is_active: false })
        .eq('id', keyId);
        
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error('停用密钥失败:', error);
      return false;
    }
  }
  
  /**
   * 获取所有密钥
   * @returns 密钥列表
   */
  static async getAllKeys(): Promise<KeyData[]> {
    try {
      const { data, error } = await supabase
        .from('agent_keys')
        .select(`
          *,
          agents(id, nickname)
        `)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      return data.map(key => ({
        id: key.id,
        key: key.key,
        agentId: key.agent_id,
        agentName: key.agents?.nickname || '未知客服',
        isActive: key.is_active,
        createdAt: key.created_at,
        expiresAt: key.expires_at,
        remainingDays: Math.max(0, Math.ceil((new Date(key.expires_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
      }));
    } catch (error) {
      console.error('获取密钥列表失败:', error);
      toast.error('获取密钥列表失败');
      return [];
    }
  }
  
  /**
   * 获取客服的有效密钥
   * @param agentId 客服ID
   * @returns 密钥
   */
  static async getAgentActiveKey(agentId: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('agent_keys')
        .select('*')
        .eq('agent_id', agentId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
        
      if (error || !data) return null;
      
      return data.key;
    } catch (error) {
      console.error('获取客服密钥失败:', error);
      return null;
    }
  }
}