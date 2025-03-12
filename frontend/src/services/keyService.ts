// src/services/keyService.ts
import { nanoid } from 'nanoid';
import { toast } from '../components/common/Toast';
import { KeyVerificationResult as BaseKeyVerificationResult, KeyData, KeyScope, KeyPurpose } from '../types';
import { supabase } from './supabase';
import { KeyManager } from './keyManager';

// 扩展原有的KeyVerificationResult接口，添加linkId属性
interface ExtendedKeyVerificationResult extends BaseKeyVerificationResult {
  linkId?: string; // 添加这个属性，用于存储客服可分享给客户的短链接ID
}

/**
 * 密钥服务 - 负责密钥的生成、验证和管理
 */
export class KeyServiceStatic {
  /**
   * 验证密钥
   * @param key 密钥
   * @returns 验证结果
   */
  static async verifyKey(key: string): Promise<ExtendedKeyVerificationResult> {
    try {
      // 检查是否管理员密钥
      if (key === import.meta.env.VITE_ADMIN_KEY) {
        return { valid: true, isAdmin: true };
      }
      
      // 验证客服卡密
      const { data, error } = await supabase
        .from('agent_keys')
        .select('*, agents(id, nickname, avatar, status, email, share_link_id)')
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
  static async generateNewKey(agentId: string, expiryDays: number = 30): Promise<string> {
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
          id: nanoid(),
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
      throw new Error('生成密钥失败');
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
          agents(id, email, nickname)
        `)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      return data.map(key => ({
        id: key.id,
        key: key.key,
        agentId: key.agent_id,
        agentName: key.agents?.nickname || key.agents?.email?.split('@')[0] || '未知客服',
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
        
      if (error || !data) {
        return null;
      }
      
      return data.key;
    } catch (error) {
      console.error('获取客服密钥失败:', error);
      return null;
    }
  }
  
  /**
   * 刷新密钥有效期
   * @param keyId 密钥ID
   * @param expiryDays 新的有效期天数
   */
  static async renewKey(keyId: string, expiryDays: number = 30): Promise<boolean> {
    try {
      // 设置新的过期时间
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiryDays);
      
      // 更新数据库
      const { error } = await supabase
        .from('agent_keys')
        .update({ 
          expires_at: expiresAt.toISOString() 
        })
        .eq('id', keyId);
        
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error('更新密钥失败:', error);
      return false;
    }
  }
  
  /**
   * 获取本月生成的密钥数量
   */
  static async getKeysGeneratedThisMonth(): Promise<number> {
    try {
      // 获取本月第一天
      const firstDayOfMonth = new Date();
      firstDayOfMonth.setDate(1);
      firstDayOfMonth.setHours(0, 0, 0, 0);
      
      // 查询数据库
      const { count, error } = await supabase
        .from('agent_keys')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', firstDayOfMonth.toISOString());
        
      if (error) throw error;
      
      return count || 0;
    } catch (error) {
      console.error('获取本月密钥数量失败:', error);
      return 0;
    }
  }
  
  /**
   * 获取即将过期的密钥（7天内）
   */
  static async getExpiringKeys(): Promise<KeyData[]> {
    try {
      // 现在时间
      const now = new Date();
      
      // 7天后
      const sevenDaysLater = new Date(now);
      sevenDaysLater.setDate(now.getDate() + 7);
      
      // 查询数据库
      const { data, error } = await supabase
        .from('agent_keys')
        .select(`
          *,
          agents(id, email, nickname)
        `)
        .eq('is_active', true)
        .lt('expires_at', sevenDaysLater.toISOString())
        .gt('expires_at', now.toISOString())
        .order('expires_at', { ascending: true });
        
      if (error) throw error;
      
      return data.map(key => ({
        id: key.id,
        key: key.key,
        agentId: key.agent_id,
        agentName: key.agents?.nickname || key.agents?.email?.split('@')[0] || '未知客服',
        isActive: key.is_active,
        createdAt: key.created_at,
        expiresAt: key.expires_at,
        remainingDays: Math.max(0, Math.ceil((new Date(key.expires_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
      }));
    } catch (error) {
      console.error('获取即将过期密钥失败:', error);
      return [];
    }
  }
}

/**
 * 密钥服务实例类 - 负责验证和管理用户密钥
 */
class KeyServiceClass {
  /**
   * 验证密钥是否有效
   * @param key 用户输入的密钥
   */
  async verifyKey(key: string): Promise<ExtendedKeyVerificationResult> {
    try {
      // 使用静态类方法进行验证
      return await KeyServiceStatic.verifyKey(key);
    } catch (error) {
      console.error('验证密钥失败:', error);
      return { valid: false, message: '验证密钥时发生错误' };
    }
  }

  /**
   * 生成新的客服密钥
   * @param agentId 客服ID
   * @param expiresInDays 过期天数
   */
  async generateAgentKey(agentId: string, expiresInDays = 30): Promise<string> {
    // 使用静态类方法生成密钥
    return KeyServiceStatic.generateNewKey(agentId, expiresInDays);
  }
}

// 导出静态类和实例
export const KeyService = new KeyServiceClass();