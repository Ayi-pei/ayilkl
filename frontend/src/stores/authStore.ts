// src/stores/authStore.ts
import { create } from 'zustand';
import { KeyService } from '../services/keyService';
import { KeyManager } from '../services/keyManager';
import { KeyScope, KeyPurpose } from '../types/index';

// 定义认证状态接口
// 更新 AuthState 接口
interface AuthState {
  isAuthenticated: boolean;
  userType: UserType;  // 使用统一的 UserType
  agentData: AgentData | null;  // 使用 AgentData 接口
  error: string | null;
  isLoading: boolean;
  
  // 方法
  login: (key: string) => Promise<{
    success: boolean;
    message?: string;
    isAdmin?: boolean;
    linkId?: string;
  }>;
  logout: () => void;
  verifySession: () => Promise<boolean>;
  clearError: () => void;
  getCurrentAgentId: () => string | null;
  getUserId: () => string | null;
  updateAgentData: (data: Partial<AgentData>) => void;  // 使用 AgentData 接口
}

// 创建认证状态存储
export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  userType: null,
  agentData: null,
  error: null,
  isLoading: false,
  
  // 登录方法
  login: async (key: string) => {
    set({ isLoading: true, error: null });
    
    try {
      // 验证密钥
      const result = await KeyService.verifyKey(key);
      
      if (!result.valid) {
        set({ 
          isLoading: false, 
          error: result.message || '无效的密钥' 
        });
        return { 
          success: false, 
          message: result.message || '无效的密钥' 
        };
      }
      
      // 确定用户类型
      const userType = result.isAdmin ? 'admin' : 'agent';
      
      // 保存认证信息
      localStorage.setItem('auth_type', userType);
      
      if (userType === 'agent' && result.agentId) {
        localStorage.setItem('agent_key', key);
        localStorage.setItem('agent_id', result.agentId);
      }
      
      // 更新状态
      set({
        isAuthenticated: true,
        userType,
        agentData: result.agentData || null,
        isLoading: false
      });
      
      return { 
        success: true,
        isAdmin: result.isAdmin,
        linkId: result.linkId // 如果有的话
      };
    } catch (error) {
      console.error('登录失败:', error);
      
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : '登录失败'
      });
      
      return { 
        success: false, 
        message: error instanceof Error ? error.message : '登录失败' 
      };
    }
  },
  
  // 注销方法
  logout: () => {
    // 清除本地存储
    localStorage.removeItem('auth_type');
    localStorage.removeItem('agent_key');
    localStorage.removeItem('agent_id');
    
    // 重置状态
    set({
      isAuthenticated: false,
      userType: null,
      agentData: null
    });
    
    // 清除KeyManager中的会话密钥
    KeyManager.clearSessionKeys();
  },
  
  // 验证会话方法
  verifySession: async () => {
    const authType = localStorage.getItem('auth_type');
    
    if (!authType) return false;
    
    if (authType === 'admin') {
      set({
        isAuthenticated: true,
        userType: 'admin'
      });
      return true;
    }
    
    if (authType === 'agent') {
      const agentKey = localStorage.getItem('agent_key');
      const agentId = localStorage.getItem('agent_id');
      
      if (!agentKey || !agentId) return false;
      
      try {
        // 验证存储的密钥
        const result = await KeyService.verifyKey(agentKey);
        
        if (result.valid && result.agentId === agentId) {
          set({
            isAuthenticated: true,
            userType: 'agent',
            agentData: result.agentData || null
          });
          return true;
        }
        
        // 密钥无效，清除会话
        get().logout();
        return false;
      } catch (error) {
        console.error('验证会话失败:', error);
        return false;
      }
    }
    
    return false;
  },
  
  // 清除错误方法
  clearError: () => set({ error: null }),
  
  // 获取当前客服ID
  getCurrentAgentId: () => {
    const { userType, agentData } = get();
    
    if (userType === 'agent' || userType === 'admin') {
      return agentData?.id || localStorage.getItem('agent_id');
    }
    
    return null;
  },
  
  // 获取当前用户ID
  getUserId: () => {
    const { userType, agentData } = get();
    
    if (userType === 'user') {
      return localStorage.getItem('user_id') || agentData?.id;
    }
    
    return null;
  },
  
  // 更新客服数据
  updateAgentData: (data: Partial<AgentData>) => {
    set(state => ({
      agentData: state.agentData ? { ...state.agentData, ...data } : data
    }));
  }
}));