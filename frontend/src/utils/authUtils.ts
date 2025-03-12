// src/utils/authUtils.ts
import { toast } from '../components/common/Toast';
import { KeyService } from '../services/keyService';
import { useAuthStore } from '../stores/authStore';

// 常量定义
export const AUTH_TYPES = {
  ADMIN: 'admin',
  AGENT: 'agent',
  USER: 'user'
};

/**
 * 格式化密钥 - 移除空格并标准化格式
 */
export const formatKey = (key: string): string => {
  return key.trim().replace(/\s+/g, '');
};

/**
 * 检查是否有特定权限
 */
export const hasPermission = (
  requiredType: 'admin' | 'agent' | 'user'
): boolean => {
  const { isAuthenticated, userType } = useAuthStore.getState();
  
  if (!isAuthenticated) return false;
  
  if (requiredType === 'admin') {
    return userType === 'admin';
  }
  
  if (requiredType === 'agent') {
    return userType === 'admin' || userType === 'agent';
  }
  
  // 用户权限 - 所有认证用户都有基本用户权限
  return !!userType;
};

/**
 * 生成分享链接URL
 */
export const generateShareUrl = (linkId: string): string => {
  return `${window.location.origin}/chat/${linkId}`;
};

/**
 * 快速登录检查 - 用于组件内检查认证状态
 */
export const checkAuth = async (
  redirectOnFailure = true
): Promise<boolean> => {
  const { isAuthenticated, verifySession } = useAuthStore.getState();
  
  if (isAuthenticated) return true;
  
  // 尝试验证会话
  const isValid = await verifySession();
  
  // 如果验证失败且需要重定向
  if (!isValid && redirectOnFailure) {
    window.location.href = '/login';
    return false;
  }
  
  return isValid;
};

/**
 * 处理认证错误 - 显示适当的错误消息并可选执行回调
 */
export const handleAuthError = (
  error: unknown,
  callback?: () => void
): void => {
  console.error('认证错误:', error);
  
  const { clearError } = useAuthStore.getState();
  
  // 清除存储中的错误
  clearError();
  
  // 显示错误消息
  let message = '认证失败，请重新登录';
  
  if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === 'object' && error !== null && 'message' in error) {
    message = String((error as { message: unknown }).message);
  }
  
  toast.error(message);
  
  // 执行可选回调
  if (callback) {
    callback();
  }
};

/**
 * 验证密钥格式是否有效
 */
export const isKeyFormatValid = (key: string): boolean => {
  // 根据您的密钥格式要求进行验证
  // 这里假设密钥是一个非空字符串，长度至少为8位
  return !!key && key.length >= 8;
};

/**
 * 快速获取当前认证的用户/客服信息
 */
export const getCurrentUser = () => {
  const { userType, agentData } = useAuthStore.getState();
  
  if (userType === 'agent' || userType === 'admin') {
    return {
      type: userType,
      id: agentData?.id || localStorage.getItem('agent_id'),
      name: agentData?.nickname || '未命名客服',
      avatar: agentData?.avatar || '',
      status: agentData?.status || 'online'
    };
  }
  
  return null;
};

/**
 * 辅助函数 - 安全登录
 * 封装登录过程，包括错误处理和提示
 */
export const safeLogin = async (key: string): Promise<boolean> => {
  try {
    const { login } = useAuthStore.getState();
    
    // 格式化密钥
    const formattedKey = formatKey(key);
    
    // 验证密钥格式
    if (!isKeyFormatValid(formattedKey)) {
      toast.error('密钥格式无效');
      return false;
    }
    
    // 执行登录
    const result = await login(formattedKey);
    
    if (result.success) {
      toast.success('登录成功');
      return true;
    } else {
      toast.error(result.message || '登录失败');
      return false;
    }
  } catch (error) {
    handleAuthError(error);
    return false;
  }
};

/**
 * 注销并清理会话
 */
export const safeLogout = () => {
  try {
    const { logout } = useAuthStore.getState();
    logout();
  } catch (error) {
    console.error('注销失败:', error);
    
    // 即使失败也强制清除本地存储并重定向
    localStorage.removeItem('auth_type');
    localStorage.removeItem('agent_key');
    localStorage.removeItem('agent_id');
    window.location.href = '/login';
  }
};

/**
 * 检查密钥是否过期
 */
export const isKeyExpired = async (key: string): Promise<boolean> => {
  try {
    const result = await KeyService.verifyKey(key);
    return !result.valid;
  } catch (error) {
    console.error('检查密钥是否过期失败:', error);
    return true; // 出错时默认认为已过期
  }
};