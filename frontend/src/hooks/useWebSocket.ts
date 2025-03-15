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
  Customer,
  WebSocketStatus
} from '../types/index';

// 使用统一的WebSocketStatus枚举
type ConnectionStatus = WebSocketStatus;

// 定义函数类型，解决循环引用问题
type HandleReconnectFn = () => void;
type HandleWebSocketMessageFn = (message: WebSocketMessage) => void;
type SendAuthMessageFn = () => void;
type ConnectWebSocketFn = () => void;

export const useWebSocket = () => {
  const wsUrl = import.meta.env.VITE_WS_URL;
  const socket = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttempts = useRef<number>(0);
  const maxReconnectAttempts = 5;
  const baseReconnectDelay = 1000; // 开始1秒，然后指数增长
  
  const [connectStatus, setConnectStatus] = useState<ConnectionStatus>(WebSocketStatus.CLOSED);
  const { isAuthenticated, userType, getCurrentAgentId, getUserId } = useAuthStore();
  const { 
    addMessage, 
    handleCustomerStatusChange, 
    setCustomers
  } = useChatStore();
  
  // 声明函数引用，解决循环依赖问题
  const sendAuthMessageRef = useRef<SendAuthMessageFn | null>(null);
  const handleWebSocketMessageRef = useRef<HandleWebSocketMessageFn | null>(null);
  const handleReconnectRef = useRef<HandleReconnectFn | null>(null);
  const connectWebSocketRef = useRef<ConnectWebSocketFn | null>(null);
  
  // 连接WebSocket
  const connectWebSocket: ConnectWebSocketFn = useCallback(() => {
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
      setConnectStatus(WebSocketStatus.CONNECTING);
      
      // 创建WebSocket连接
      socket.current = new WebSocket(wsUrl);
      
      // 连接打开时
      socket.current.onopen = () => {
        console.log('WebSocket连接已建立');
        setConnectStatus(WebSocketStatus.OPEN);
        reconnectAttempts.current = 0;
        
        // 发送身份验证消息
        if (sendAuthMessageRef.current) {
          sendAuthMessageRef.current();
        }
      };
      
      // 接收消息
      socket.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage;
          if (handleWebSocketMessageRef.current) {
            handleWebSocketMessageRef.current(message);
          }
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
        
        setConnectStatus(WebSocketStatus.CLOSED);
        
        // 尝试重新连接
        if (handleReconnectRef.current) {
          handleReconnectRef.current();
        }
      };
      
      // 连接错误
      socket.current.onerror = (error) => {
        console.error('WebSocket错误:', error);
        setConnectStatus(WebSocketStatus.ERROR);
      };
      
    } catch (error) {
      console.error('创建WebSocket连接失败:', error);
      setConnectStatus(WebSocketStatus.ERROR);
      toast.error('无法连接到通信服务');
    }
  }, [wsUrl, isAuthenticated]);
  
  // 发送身份验证消息
  const sendAuthMessage: SendAuthMessageFn = useCallback(() => {
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
  
  // 保存引用
  sendAuthMessageRef.current = sendAuthMessage;
  
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
  const handleReconnect: HandleReconnectFn = useCallback(() => {
    if (reconnectAttempts.current >= maxReconnectAttempts) {
      setConnectStatus(WebSocketStatus.ERROR);
      toast.error('无法连接到服务器，请刷新页面重试');
      return;
    }
    
    // 清除之前的定时器
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    // 设置重连状态
    setConnectStatus(WebSocketStatus.RECONNECTING);
    
    // 指数退避策略
    const delay = baseReconnectDelay * Math.pow(2, reconnectAttempts.current);
    
    // 显示重连信息
    toast.info(`正在尝试重新连接 (${reconnectAttempts.current + 1}/${maxReconnectAttempts})...`);
    
    // 设置新的定时器
    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectAttempts.current += 1;
      if (connectWebSocketRef.current) {
        connectWebSocketRef.current();
      }
    }, delay);
  }, []);
  
  // 保存引用
  handleReconnectRef.current = handleReconnect;
  
  // 处理接收到的WebSocket消息
  const handleWebSocketMessage: HandleWebSocketMessageFn = useCallback((message: WebSocketMessage) => {
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
          // 先转为unknown，再转为CustomerStatusData，避免类型错误
          const data = message.data as unknown as CustomerStatusData;
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
  
  // 保存引用
  handleWebSocketMessageRef.current = handleWebSocketMessage;
  
  // 保存connectWebSocket引用
  connectWebSocketRef.current = connectWebSocket;
  
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
    isConnected: connectStatus === WebSocketStatus.OPEN,
    isConnecting: connectStatus === WebSocketStatus.CONNECTING || connectStatus === WebSocketStatus.RECONNECTING,
    isFailed: connectStatus === WebSocketStatus.ERROR
  };
};

export default useWebSocket;
