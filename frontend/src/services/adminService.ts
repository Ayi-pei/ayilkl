// src/services/adminService.ts
import { toast } from '../components/common/Toast';
import { supabase } from './supabase';
import { Agent, AgentKey, Stats } from '../models/databaseModels';
import { KeyService } from './keyService';
import { v4 as uuidv4 } from 'uuid';

/**
 * 管理员服务类 - 提供管理客服和密钥的功能
 */
export class AdminService {
  /**
   * 管理员登录 - 使用API进行身份验证
   */
  static async adminLogin(): Promise<boolean> {
    try {
      // 使用环境变量中的API URL
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      
      // 调用服务端API进行管理员身份验证
      const adminKey = import.meta.env.VITE_ADMIN_KEY;
      if (!adminKey) {
        console.error('管理员密钥未配置，请检查.env文件');
        toast.error('管理员密钥未配置，请联系系统管理员');
        return false;
      }
      // 不要在日志中输出敏感信息
      console.log('正在进行管理员验证...');

      const response = await fetch(`${apiUrl}/api/admin/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          adminKey
        })
      });

      if (!response.ok) {
        try {
          const errorData = await response.json();
          throw new Error(errorData.message || '管理员验证失败');
        } catch (jsonError) {
          // 如果响应不是JSON格式，直接使用状态文本
          throw new Error(`管理员验证失败: ${response.statusText}`);
        }
      }

      // 克隆响应以便可以多次读取body
      const responseData = await response.json();

      if (!responseData.token) {
        throw new Error('服务器响应中缺少token');
      }
      
      // 保存token到localStorage
      localStorage.setItem('admin_token', responseData.token);
      console.log('管理员登录成功');
      return true;
    } catch (error) {
      console.error('管理员登录失败:', error);
      toast.error('管理员登录失败，请检查凭据');
      return false;
    }
  }

  /**
   * 验证管理员权限 - 检查是否有管理员token
   */
  static async verifyAdminAccess(): Promise<boolean> {
    try {
      const adminToken = localStorage.getItem('admin_token');
      
      if (!adminToken) {
        console.error('验证管理员权限失败: 无token');
        // 尝试登录
        return await this.adminLogin();
      }

      // 验证token有效性
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/admin/verify`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });

      if (!response.ok) {
        // Token无效，尝试重新登录
        localStorage.removeItem('admin_token');
        return await this.adminLogin();
      }

      return true;
    } catch (error) {
      console.error('验证管理员权限失败:', error);
      return false;
    }
  }

  /**
   * 获取所有客服
   */
  static async getAllAgents(): Promise<Agent[]> {
    try {
      const hasAccess = await AdminService.verifyAdminAccess();
      if (!hasAccess) {
        await AdminService.adminLogin();
      }
      
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('获取客服列表失败:', error);
      toast.error('获取客服列表失败');
      return [];
    }
  }
  
  /**
   * 获取客服的密钥
   */
  static async getAgentKeys(agentId: string): Promise<AgentKey[]> {
    try {
      const hasAccess = await AdminService.verifyAdminAccess();
      if (!hasAccess) {
        await AdminService.adminLogin();
      }
      
      const { data, error } = await supabase
        .from('agent_keys')
        .select('*')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('获取密钥失败:', error);
      toast.error('获取密钥失败');
      return [];
    }
  }
  
  /**
   * 创建新客服
   */
  static async createAgent(nickname: string): Promise<string | null> {
    try {
      // 先确保用户已登录
      const hasAccess = await AdminService.verifyAdminAccess();
      if (!hasAccess) {
        // 这里弹出登录对话框或自动登录
        const loginSuccess = await AdminService.adminLogin();
        if (!loginSuccess) {
          toast.error('请先登录管理员账号');
          return null;
        }
      }
      
      // 生成UUID作为客服ID
      const newAgentId = uuidv4();
      
      // 插入数据 - 现在用户已通过身份验证，应该能够绕过RLS
      const { error } = await supabase
        .from('agents')
        .insert({
          id: newAgentId,
          nickname,
          status: 'online',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        
      if (error) {
        console.error('创建客服数据库操作失败:', error);
        toast.error(`创建客服失败: ${error.message}`);
        return null;
      }
      
      console.log('客服创建成功，ID:', newAgentId);
      return newAgentId;
    } catch (error) {
      console.error('创建客服过程出错:', error);
      toast.error('创建客服失败');
      return null;
    }
  }
  
  /**
   * 删除客服
   */
  static async deleteAgent(agentId: string): Promise<boolean> {
    try {
      const hasAccess = await AdminService.verifyAdminAccess();
      if (!hasAccess) {
        await AdminService.adminLogin();
      }
      
      // 首先停用该客服的所有密钥
      const { error: keyError } = await supabase
        .from('agent_keys')
        .update({ is_active: false })
        .eq('agent_id', agentId);
        
      if (keyError) throw keyError;
      
      // 然后删除客服
      const { error } = await supabase
        .from('agents')
        .delete()
        .eq('id', agentId);
        
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error('删除客服失败:', error);
      toast.error('删除客服失败');
      return false;
    }
  }
  
  /**
   * 为客服生成密钥
   */
  static async generateKeyForAgent(agentId: string, expiryDays: number = 30): Promise<string | null> {
    try {
      const hasAccess = await AdminService.verifyAdminAccess();
      if (!hasAccess) {
        await AdminService.adminLogin();
      }
      
      return await KeyService.generateAgentKey(agentId, expiryDays);
    } catch (error) {
      console.error('生成密钥失败:', error);
      toast.error('生成密钥失败');
      return null;
    }
  }
  
  /**
   * 获取系统统计数据
   */
  static async getSystemStats(): Promise<Stats> {
    try {
      const hasAccess = await AdminService.verifyAdminAccess();
      if (!hasAccess) {
        await AdminService.adminLogin();
      }
      
      // 获取客服数量
      const { data: agents, error: agentsError } = await supabase
        .from('agents')
        .select('id');
        
      if (agentsError) throw agentsError;
      
      // 获取活跃密钥数量
      const { data: activeKeys, error: keysError } = await supabase
        .from('agent_keys')
        .select('id')
        .eq('is_active', true);
        
      if (keysError) throw keysError;
      
      // 获取客户数量
      const { data: customers, error: customersError } = await supabase
        .from('customers')
        .select('id');
        
      if (customersError) throw customersError;
      
      // 获取消息数量
      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select('id');
        
      if (messagesError) throw messagesError;
      
      return {
        agentsCount: agents?.length || 0,
        activeKeysCount: activeKeys?.length || 0,
        customersCount: customers?.length || 0,
        messagesCount: messages?.length || 0,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error('获取系统统计数据失败:', error);
      toast.error('获取系统统计数据失败');
      
      // 返回空数据
      return {
        agentsCount: 0,
        activeKeysCount: 0,
        customersCount: 0,
        messagesCount: 0,
        lastUpdated: new Date().toISOString()
      };
    }
  }
}
