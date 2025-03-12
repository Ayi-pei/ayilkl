// src/services/apiClient.ts
import axios from 'axios';
import { toast } from '../components/common/Toast';

// 创建axios实例
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 30000, // 30秒超时
  headers: {
    'Content-Type': 'application/json',
  }
});

// 请求拦截器
apiClient.interceptors.request.use(
  (config) => {
    // 从localStorage获取token
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // 处理错误响应
    const { response } = error;
    
    if (response) {
      // 服务器返回了错误状态码
      switch (response.status) {
        case 401:
          // 未授权，可能是token过期
          toast.error('登录已过期，请重新登录');
          // 清除token并重定向到登录页
          localStorage.removeItem('auth_token');
          window.location.href = '/login';
          break;
        case 403:
          toast.error('没有权限执行此操作');
          break;
        case 404:
          toast.error('请求的资源不存在');
          break;
        case 500:
          toast.error('服务器错误，请稍后再试');
          break;
        default:
          toast.error(response.data?.message || '请求失败');
      }
    } else {
      // 网络错误或请求被取消
      toast.error('网络错误，请检查您的网络连接');
    }
    
    return Promise.reject(error);
  }
);

export { apiClient };