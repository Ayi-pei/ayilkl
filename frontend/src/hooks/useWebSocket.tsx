/// <reference types="vite/client" />
import { useEffect, useRef, useCallback, useState } from 'react';
import { useChatStore } from '../stores/chatStore';
import { nanoid } from 'nanoid';
import { WebSocketStatus, WebSocketMessage, Message } from '../types';
import { toast } from '../components/common/Toast';
import { useAuthStore } from '../stores/authStore';

export const useWebSocket = () => {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const [status, setStatus] = useState<WebSocketStatus>(WebSocketStatus.CLOSED);
  
  const { 
    addMessage, 
    setCustomers, 
    userType, 
    userSettings,
    currentAgent,
    handleCustomerStatusChange
  } = useChatStore();
  
  // 从authStore获取客服信息
  const { agentData } = useAuthStore();
  
  // 获取WebSocket URL
  const getWebSocketUrl = useCallback(() => {
    const wsBaseUrl = import.meta.env.VITE_WS_URL || 
                      (window.location.protocol === 'https:' ? 
                       'wss://' + window.location.host + '/ws' : 
                       'ws://' + window.location.host + '/ws');
    
    let wsUrl: string;
    
    if (userType === 'agent' && agentData?.id) {
      wsUrl = `${wsBaseUrl}/agent/${agentData.id}`;
    } else if (userType === 'user' && userSettings?.id && currentAgent?.id) {
      wsUrl = `${wsBaseUrl}/user/${userSettings.id}/${currentAgent.id}`;
    } else {
      throw new Error('无法生成WebSocket URL: 缺少必要信息');
    }
    
    const params = new URLSearchParams();
    
    // 修复：检查 agentData 中是否有 token 属性
    if (userType === 'agent' && agentData && 'token' in agentData) {
      params.append('key', agentData.token as string);
    }
    
    // 修复：检查 userSettings 是否有 linkId 属性，使用类型断言
    const userSettingsWithLinkId = userSettings as any;
    if (userSettingsWithLinkId?.linkId) {
      params.append('linkId', userSettingsWithLinkId.linkId);
    }
    
    if (params.toString()) {
      wsUrl += '?' + params.toString();
    }
    
    return wsUrl;
  }, [userType, agentData, userSettings, currentAgent]);
  
  // 发送心跳包
  const sendHeartbeat = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const heartbeatMsg: WebSocketMessage = { type: 'ping' };
      wsRef.current.send(JSON.stringify(heartbeatMsg));
    }
  }, []);
  
  // 重置心跳计时器
  const resetHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }
    
    heartbeatIntervalRef.current = setInterval(sendHeartbeat, 30000);
  }, [sendHeartbeat]);
  
  // 处理消息的辅助函数
  const handleMessageData = (messageData: any): Message => {
    return {
      id: messageData.id || nanoid(),
      content: messageData.content || '',
      type: (messageData.type || 'text') as Message['type'],
      sender: (userType === 'agent' ? 'user' : 'agent') as Message['sender'],
      fileName: messageData.fileName,
      fileSize: messageData.fileSize,
      timestamp: messageData.timestamp || new Date().toISOString(),
      createdAt: messageData.createdAt || new Date().toISOString()
    };
  };

  // 处理WebSocket消息
  const handleWebSocketMessage = useCallback((event: MessageEvent) => {
    let data: WebSocketMessage;
    try {
      data = JSON.parse(event.data);
    } catch (e) {
      console.error('处理WebSocket消息失败:', e);
      return;
    }
    console.log('收到WebSocket消息:', data);
    
    switch (data.type) {
      case 'message':
        if (data.message) {
          const message = handleMessageData(data.message);
          addMessage(message);
          // 播放消息提示音
          if (userType === 'agent') {
            const audio = new Audio('/notification.mp3');
            audio.play().catch(e => console.log('无法播放提示音:', e));
          }
        }
        break;
      case 'customer_online':
      case 'customer_offline':
        if (data.customerId && userType === 'agent') {
          handleCustomerStatusChange(
            data.customerId,
            data.type === 'customer_online',
            data.timestamp ?? undefined
          );
        }
        break;
      case 'agent_status':
        if (data.agentId && data.status && userType === 'user') {
          // 暂未实现用户端客服状态更新逻辑
        }
        break;
      case 'pong':
        console.log('收到心跳响应');
        break;
      case 'error':
        console.error('WebSocket错误:', data.error);
        toast.error(data.error || '连接错误');
        break;
      case 'customers_list':
        if (data.customersList && userType === 'agent') {
          setCustomers(Array.isArray(data.customersList) ? data.customersList : []);
        }
        break;
      default:
        console.warn('未知的WebSocket消息类型:', data.type);
        break;
    }
  }, [
    addMessage,
    userType,
    handleCustomerStatusChange,
    setCustomers
  ]);
  
  // 连接WebSocket
  const connectWebSocket = useCallback(() => {
    try {
      if (
        status === WebSocketStatus.CONNECTING || 
        status === WebSocketStatus.OPEN || 
        status === WebSocketStatus.RECONNECTING
      ) {
        return;
      }
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      const wsUrl = getWebSocketUrl();
      console.log(`正在连接WebSocket: ${wsUrl}`);
      setStatus(WebSocketStatus.CONNECTING);
      
      wsRef.current = new WebSocket(wsUrl);
      
      // 添加 onopen 处理函数
      wsRef.current.onopen = () => {
        console.log('WebSocket连接已建立');
        setStatus(WebSocketStatus.OPEN);
        reconnectAttemptsRef.current = 0;
        
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          // 获取用户ID，确保不为undefined
          const userId = userType === 'agent' ? agentData?.id : userSettings?.id;
          
          // 只有当userId存在时才发送认证消息
          if (userId) {
            // 修复：使用正确的类型结构
            const authMsg: WebSocketMessage = {
              type: 'auth',
              // 直接使用 userId 而不是包装在 data 对象中
              // 这样可以避免类型错误
              customerId: userType === 'user' ? userId : undefined,
              agentId: userType === 'agent' ? userId : undefined
            };
            wsRef.current.send(JSON.stringify(authMsg));
          } else {
            console.error('无法发送认证消息：用户ID不存在');
          }
        }
        
        resetHeartbeat();
      };
      
      wsRef.current.onmessage = handleWebSocketMessage;
      
      wsRef.current.onclose = (event) => {
        console.log('WebSocket连接已关闭', event.code, event.reason);
        setStatus(WebSocketStatus.CLOSED);
        
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
          heartbeatIntervalRef.current = null;
        }
        
        if (event.code !== 1000 && reconnectAttemptsRef.current < 10) {
          const delay = Math.min(1000 * Math.pow(1.5, reconnectAttemptsRef.current), 30000);
          console.log(`${delay / 1000}秒后尝试重新连接... (尝试 ${reconnectAttemptsRef.current + 1}/10)`);
          
          setStatus(WebSocketStatus.RECONNECTING);
          reconnectAttemptsRef.current += 1;
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connectWebSocket();
          }, delay);
        } else if (reconnectAttemptsRef.current >= 10) {
          console.error('达到最大重连次数，停止重连');
          setStatus(WebSocketStatus.ERROR);
          toast.error('无法连接到服务器，请刷新页面重试');
        }
      };
      
      wsRef.current.onerror = (error) => {
        console.error('WebSocket错误:', error);
        setStatus(WebSocketStatus.ERROR);
      };
    } catch (error) {
      console.error('建立WebSocket连接时出错:', error);
      setStatus(WebSocketStatus.ERROR);
      toast.error('连接服务器失败');
    }
  }, [
    userType, 
    agentData, 
    userSettings, 
    currentAgent, 
    status, 
    getWebSocketUrl, 
    resetHeartbeat,
    handleWebSocketMessage
  ]);
  
  // 关闭WebSocket连接
  const closeWebSocket = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    
    if (wsRef.current) {
      try {
        wsRef.current.onclose = null;
        wsRef.current.close(1000, '用户主动关闭');
      } catch (e) {
        console.error('关闭WebSocket连接失败:', e);
      }
      
      wsRef.current = null;
    }
    
    setStatus(WebSocketStatus.CLOSED);
  }, []);
  
  // 发送WebSocket消息
  const sendWebSocketMessage = useCallback((data: WebSocketMessage) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.error('WebSocket未连接，无法发送消息');
      if (status !== WebSocketStatus.RECONNECTING) {
        connectWebSocket();
      }
      return false;
    }
    
    try {
      wsRef.current.send(JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('发送WebSocket消息失败:', error);
      return false;
    }
  }, [connectWebSocket, status]);
  
  // 组件卸载时清理
  useEffect(() => {
    return () => {
      closeWebSocket();
    };
  }, [closeWebSocket]);
  return { 
    connectWebSocket, 
    closeWebSocket,
    sendWebSocketMessage,
    status
  };
};

export default useWebSocket;