// src/services/socketService.ts
import { WebSocketMessage, WebSocketStatus, type Customer } from '../types';
import { useAuthStore } from '../stores/authStore';
import { useChatStore } from '../stores/chatStore';
import { toast } from '../components/common/Toast';

class SocketService {
  private socket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private status: WebSocketStatus = WebSocketStatus.CLOSED;
  private messageHandlers: Map<string, (data: WebSocketMessage) => void> = new Map();

  /**
   * 获取WebSocket URL
   */
  private getWebSocketUrl(): string {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = import.meta.env.VITE_WS_URL || `${wsProtocol}//${window.location.host}/ws`;
    
    // 获取认证信息
    const { getCurrentAgentId, getUserId } = useAuthStore.getState();
    const agentId = getCurrentAgentId();
    const userId = getUserId();
    
    // 构建URL参数
    const params = new URLSearchParams();
    if (agentId) params.append('agentId', agentId);
    if (userId) params.append('userId', userId);
    
    return `${wsUrl}?${params.toString()}`;
  }

  /**
   * 连接WebSocket
   */
  connect(): void {
    if (
      this.status === WebSocketStatus.CONNECTING ||
      this.status === WebSocketStatus.OPEN ||
      this.status === WebSocketStatus.RECONNECTING
    ) {
      return;
    }

    try {
      const wsUrl = this.getWebSocketUrl();
      console.log(`正在连接WebSocket: ${wsUrl}`);
      this.status = WebSocketStatus.CONNECTING;
      
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = this.handleOpen.bind(this);
      this.socket.onmessage = this.handleMessage.bind(this);
      this.socket.onclose = this.handleClose.bind(this);
      this.socket.onerror = this.handleError.bind(this);
    } catch (error) {
      console.error('建立WebSocket连接时出错:', error);
      this.status = WebSocketStatus.ERROR;
      this.handleReconnect();
    }
  }

  /**
   * 处理WebSocket连接成功
   */
  private handleOpen(): void {
    console.log('WebSocket连接已建立');
    this.status = WebSocketStatus.OPEN;
    this.reconnectAttempts = 0;
    
    // 发送认证消息
    this.sendAuthMessage();
    
    // 设置定时ping以保持连接
    this.startPingInterval();
  }

  /**
   * 发送认证消息
   */
  private sendAuthMessage(): void {
    const { getCurrentAgentId, getUserId } = useAuthStore.getState();
    const { userType } = useChatStore.getState();
    
    const agentId = getCurrentAgentId();
    const userId = getUserId();
    
    if (!agentId && !userId) {
      console.warn('无法发送认证消息: 缺少用户ID');
      return;
    }
    
    const authMsg: WebSocketMessage = {
      type: 'auth',
      data: {
        userType,
        agentId,
        userId
      }
    };
    
    this.send(authMsg);
  }

  /**
   * 开始ping间隔
   */
  private startPingInterval(): void {
    // 清除现有的ping间隔
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }
    
    // 每30秒发送一次ping
    this.pingInterval = setInterval(() => {
      if (this.status === WebSocketStatus.OPEN) {
        this.send({ type: 'ping', data: { timestamp: Date.now() } });
      }
    }, 30000);
  }

  /**
   * 处理接收到的WebSocket消息
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const data: WebSocketMessage = JSON.parse(event.data);
      console.log('收到WebSocket消息:', data);
      
      // 调用注册的消息处理器
      if (this.messageHandlers.has(data.type)) {
        this.messageHandlers.get(data.type)?.(data);
      }
      
      // 默认消息处理
      this.processMessage(data);
    } catch (e) {
      console.error('处理WebSocket消息失败:', e);
    }
  }

  /**
   * 处理WebSocket消息
   */
  private processMessage(data: WebSocketMessage): void {
    const { addMessage, handleCustomerStatusChange, setCustomers } = useChatStore.getState();
    
    switch (data.type) {
      case 'chat_message':
      case 'message':
        if (data.message) {
          addMessage(data.message);
        }
        break;
        
      case 'customer_online':
      case 'customer_offline':
      case 'customer_status':
        if (data.data && 'customerId' in data.data && 'isOnline' in data.data) {
          const statusData = data.data as { customerId: string; isOnline: boolean; lastSeen?: string };
          handleCustomerStatusChange(statusData.customerId, statusData.isOnline, statusData.lastSeen);
        }
        break;
        
      case 'customers_list':
        if (data.data && 'customers' in data.data) {
          setCustomers(data.data.customers as Customer[]);
        } else if (data.customersList) {
          setCustomers(data.customersList);
        }
        break;
        
      case 'error':
        if (data.data && 'message' in data.data) {
          console.error('服务器错误:', data.data.message);
          toast.error(data.data.message as string || '发生错误，请重试');
        } else if (data.error) {
          toast.error(data.error || '发生错误，请重试');
        }
        break;
        
      case 'pong':
        // 处理服务器的pong响应
        console.log('收到服务器pong响应');
        break;
        
      default:
        console.log('收到未处理的消息类型:', data.type, data.data);
    }
  }

  /**
   * 处理WebSocket连接关闭
   */
  private handleClose(event: CloseEvent): void {
    console.log('WebSocket连接已关闭', event.code, event.reason);
    this.status = WebSocketStatus.CLOSED;
    
    // 清除ping间隔
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    
    // 如果不是正常关闭，尝试重连
    if (event.code !== 1000) {
      this.handleReconnect();
    }
  }

  /**
   * 处理WebSocket错误
   */
  private handleError(error: Event): void {
    console.error('WebSocket错误:', error);
    this.status = WebSocketStatus.ERROR;
  }

  /**
   * 处理重连逻辑
   */
  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(`已达到最大重连次数(${this.maxReconnectAttempts})，停止重连`);
      return;
    }
    
    // 清除现有的重连超时
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    
    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000); // 指数退避，最大30秒
    
    console.log(`将在${delay}ms后尝试重连(第${this.reconnectAttempts}次)`);
    this.status = WebSocketStatus.RECONNECTING;
    
    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * 发送WebSocket消息
   */
  send(data: WebSocketMessage): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.error('WebSocket未连接，无法发送消息');
      
      // 如果不是正在重连，尝试重新连接
      if (this.status !== WebSocketStatus.RECONNECTING) {
        this.connect();
      }
      
      return;
    }
    
    try {
      this.socket.send(JSON.stringify(data));
    } catch (error) {
      console.error('发送WebSocket消息失败:', error);
    }
  }

  /**
   * 关闭WebSocket连接
   */
  close(): void {
    if (this.socket) {
      // 发送关闭消息
      if (this.socket.readyState === WebSocket.OPEN) {
        this.send({ type: 'close' });
      }
      
      // 关闭连接
      this.socket.close();
      this.socket = null;
    }
    
    // 清除ping间隔
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    
    // 清除重连超时
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    this.status = WebSocketStatus.CLOSED;
  }

  /**
   * 注册消息处理器
   */
  registerMessageHandler(type: string, handler: (data: WebSocketMessage) => void): void {
    this.messageHandlers.set(type, handler);
  }

  /**
   * 移除消息处理器
   */
  removeMessageHandler(type: string): void {
    this.messageHandlers.delete(type);
  }

  /**
   * 获取当前连接状态
   */
  getStatus(): WebSocketStatus {
    return this.status;
  }
}

// 导出单例实例
export const socketService = new SocketService();