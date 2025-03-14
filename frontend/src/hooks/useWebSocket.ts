// src/hooks/useWebSocket.ts
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from '../components/common/Toast';
import { useAuthStore } from '../stores/authStore';
import { useChatStore } from '../stores/chatStore';

// 导入所需的类型
import { 
  WebSocketMessage, 
  Message, 
  CustomerStatusData, 
  Customer 
} from '../types/index';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'failed';

export const useWebSocket = () => {
  const wsUrl = import.meta.env.VITE_WS_URL;
  const socket = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttempts = useRef<number>(0);
  const maxReconnectAttempts = 5;
  const baseReconnectDelay = 1000; // 开始1秒，然后指数增长
  
  const [connectStatus, setConnectStatus] = useState<ConnectionStatus>('disconnected');
  const { isAuthenticated, userType, getCurrentAgentId, getUserId } = useAuthStore();
  const { 
    addMessage, 
    handleCustomerStatusChange, 
    setCustomers
  } = useChatStore();
  
  // 连接WebSocket
  const connectWebSocket = useCallback(() => {
    if (!wsUrl) {
      console.error('WebSocket URL未配置');
      toast.error('通信服务配置错误，请联系管理员');
      return;
    }
    
    if (!isAuthenticated) {
      console.error('未登录,无法连接WebSocket');
      return;
    }
    
    // 如果已经连接，先关闭
    if (socket.current && socket.current.readyState === WebSocket.OPEN) {
      socket.current.close();
    }
    
    try {
      setConnectStatus('connecting');
      
      // 创建WebSocket连接
      socket.current = new WebSocket(wsUrl);
      
      // 连接打开时
      socket.current.onopen = () => {
        console.log('WebSocket连接已建立');
        setConnectStatus('connected');
        reconnectAttempts.current = 0;
        
        // 发送身份验证消息
        sendAuthMessage();
      };
      
      // 接收消息
      socket.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage;
          handleWebSocketMessage(message);
        } catch (error) {
          console.error('解析WebSocket消息失败:', error);
        }
      };
      
      // 连接关闭
      socket.current.onclose = (event) => {
        if (event.wasClean) {
          console.log(`WebSocket连接已关闭: 代码=${event.code}, 原因=${event.reason}`);
        } else {
          console.error('WebSocket连接异常关闭');
        }
        
        setConnectStatus('disconnected');
        
        // 尝试重新连接
        handleReconnect();
      };
      
      // 连接错误
      socket.current.onerror = (error) => {
        console.error('WebSocket错误:', error);
        setConnectStatus('failed');
      };
      
    } catch (error) {
      console.error('创建WebSocket连接失败:', error);
      setConnectStatus('failed');
      toast.error('无法连接到通信服务');
    }
  }, [wsUrl, isAuthenticated]);
  
  // 发送身份验证消息
  const sendAuthMessage = useCallback(() => {
    if (!socket.current || socket.current.readyState !== WebSocket.OPEN) {
      return;
    }
    
    try {
      const authMessage = {
        type: 'auth',
        data: {
          userType,
          id: userType === 'agent' ? getCurrentAgentId() : getUserId(),
          token: localStorage.getItem('auth_token')
        }
      };
      
      socket.current.send(JSON.stringify(authMessage));
    } catch (error) {
      console.error('发送身份验证消息失败:', error);
    }
  }, [userType, getCurrentAgentId, getUserId]);
  
  // 发送消息
  // 使用统一的接口
  const sendMessage = useCallback((message: Record<string, unknown>) => {
    if (!socket.current || socket.current.readyState !== WebSocket.OPEN) {
      toast.error('通信服务未连接，请刷新页面重试');
      return false;
    }
    
    try {
      socket.current.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('发送WebSocket消息失败:', error);
      toast.error('发送消息失败，请重试');
      return false;
    }
  }, []);
  
  // 处理重新连接
  const handleReconnect = useCallback(() => {
    if (reconnectAttempts.current >= maxReconnectAttempts) {
      setConnectStatus('failed');
      toast.error('无法连接到服务器，请刷新页面重试');
      return;
    }
    
    // 清除之前的定时器
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    // 设置重连状态
    setConnectStatus('reconnecting');
    
    // 指数退避策略
    const delay = baseReconnectDelay * Math.pow(2, reconnectAttempts.current);
    
    // 显示重连信息
    toast.info(`正在尝试重新连接 (${reconnectAttempts.current + 1}/${maxReconnectAttempts})...`);
    
    // 设置新的定时器
    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectAttempts.current += 1;
      connectWebSocket();
    }, delay);
  }, [connectWebSocket]);
  
  // 处理接收到的WebSocket消息
  const handleWebSocketMessage = useCallback((message: WebSocketMessage) => {
    switch (message.type) {
      case 'chat_message':
        // 处理聊天消息
        if (message.data && 'id' in message.data) {
          addMessage(message.data as unknown as Message);
        }
        break;
        
      case 'customer_status':
        // 处理客户状态变更
        if (message.data && 'customerId' in message.data && 'isOnline' in message.data) {
          const data = message.data as CustomerStatusData;
          handleCustomerStatusChange(
            data.customerId,
            data.isOnline,
            data.lastSeen
          );
        }
        break;
        
      case 'customers_list':
        // 更新客户列表
        if (message.data && 'customers' in message.data) {
          setCustomers(message.data.customers as Customer[]);
        } else if (message.customersList) {
          setCustomers(message.customersList);
        }
        break;
        
      case 'error':
        // 处理错误消息
        if (message.data && 'message' in message.data) {
          console.error('服务器错误:', message.data.message);
          toast.error(message.data.message as string || '发生错误，请重试');
        } else if (message.error) {
          toast.error(message.error || '发生错误，请重试');
        }
        break;
        
      default:
        console.log('收到未处理的消息类型:', message.type, message.data);
    }
  }, [addMessage, handleCustomerStatusChange, setCustomers]);
  
  // 在组件卸载时关闭连接
  useEffect(() => {
    return () => {
      if (socket.current) {
        socket.current.close();
      }
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);
  
  // 导出方法和状态
  return {
    connectWebSocket,
    sendMessage,
    connectStatus,
    isConnected: connectStatus === 'connected',
    isConnecting: connectStatus === 'connecting' || connectStatus === 'reconnecting',
    isFailed: connectStatus === 'failed'
  };
};

// 使用 useEffect 处理依赖关系
  useEffect(() => {
    // 更新 connectWebSocket 中使用的函数引用
    const currentConnectWebSocket = connectWebSocket;
    
    return () => {
      // 清理
    };
  }, [connectWebSocket, sendAuthMessage, handleReconnect, handleWebSocketMessage]);
