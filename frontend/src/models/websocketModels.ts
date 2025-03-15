// src/models/websocketModels.ts
// 这个文件用于定义与WebSocket通信相关的模型类型
// 注意：此文件中的类型定义与types/index.ts中的定义保持兼容

import { Message, Customer } from './databaseModels';
import { WebSocketStatus } from '../types';

/**
 * WebSocket连接状态枚举
 * 注意：此枚举与types/index.ts中的WebSocketStatus保持兼容
 */
export enum WebSocketConnectionState {
  CONNECTING = 'connecting', // 对应WebSocketStatus.CONNECTING
  CONNECTED = 'connected',   // 对应WebSocketStatus.OPEN
  DISCONNECTED = 'disconnected', // 对应WebSocketStatus.CLOSED
  RECONNECTING = 'reconnecting', // 对应WebSocketStatus.RECONNECTING
  FAILED = 'failed'  // 对应WebSocketStatus.ERROR
}

/**
 * WebSocket消息基础接口
 * 注意：此接口与types/index.ts中的WebSocketMessageBase保持兼容
 */
export interface WebSocketMessageBase {
  type: string;
  data?: Record<string, unknown>;
  message?: Message;
  customerId?: string;
  agentId?: string;
  status?: string;
  timestamp?: string;
  error?: string;
  customersList?: Customer[];
  [key: string]: unknown;
}

/**
 * 认证消息
 */
export interface AuthMessage extends WebSocketMessageBase {
  type: 'auth';
  agentId?: string;
  customerId?: string;
  data?: {
    token: string;
    [key: string]: unknown;
  };
}

/**
 * 聊天消息
 */
export interface ChatMessage extends WebSocketMessageBase {
  type: 'message' | 'chat_message';
  message?: Message;
  data?: Record<string, unknown>; // 修改为与基础接口兼容的类型
}

/**
 * 客户状态消息
 */
export interface CustomerStatusMessage extends WebSocketMessageBase {
  type: 'customer_online' | 'customer_offline' | 'customer_status';
  customerId?: string;
  status?: 'online' | 'offline';
  data?: {
    customerId: string;
    isOnline: boolean;
    lastSeen?: string;
    [key: string]: unknown;
  };
}

/**
 * 客户列表消息
 */
export interface CustomersListMessage extends WebSocketMessageBase {
  type: 'customers_list';
  customersList?: Customer[];
  data?: {
    customers: Customer[];
    [key: string]: unknown;
  };
}

/**
 * 心跳消息
 */
export interface HeartbeatMessage extends WebSocketMessageBase {
  type: 'ping' | 'pong';
}

/**
 * 错误消息
 */
export interface ErrorMessage extends WebSocketMessageBase {
  type: 'error';
  error?: string;
  data?: {
    code?: string;
    message: string;
    [key: string]: unknown;
  };
}

/**
 * WebSocket消息联合类型
 * 注意：此类型与types/index.ts中的WebSocketMessage保持兼容
 */
export type WebSocketMessage =
  | AuthMessage
  | ChatMessage
  | CustomerStatusMessage
  | CustomersListMessage
  | HeartbeatMessage
  | ErrorMessage;

/**
 * 导出兼容性类型
 * 这些类型允许在不同文件中使用相同的类型名称
 */
export type { WebSocketStatus } from '../types';

// 提供类型转换辅助函数
/**
 * 将WebSocketConnectionState转换为WebSocketStatus
 */
export const convertConnectionStateToStatus = (state: WebSocketConnectionState): WebSocketStatus => {
  switch (state) {
    case WebSocketConnectionState.CONNECTING:
      return WebSocketStatus.CONNECTING;
    case WebSocketConnectionState.CONNECTED:
      return WebSocketStatus.OPEN;
    case WebSocketConnectionState.DISCONNECTED:
      return WebSocketStatus.CLOSED;
    case WebSocketConnectionState.RECONNECTING:
      return WebSocketStatus.RECONNECTING;
    case WebSocketConnectionState.FAILED:
      return WebSocketStatus.ERROR;
    default:
      return WebSocketStatus.CLOSED;
  }
};

/**
 * 将WebSocketStatus转换为WebSocketConnectionState
 */
export const convertStatusToConnectionState = (status: WebSocketStatus): WebSocketConnectionState => {
  switch (status) {
    case WebSocketStatus.CONNECTING:
      return WebSocketConnectionState.CONNECTING;
    case WebSocketStatus.OPEN:
      return WebSocketConnectionState.CONNECTED;
    case WebSocketStatus.CLOSED:
      return WebSocketConnectionState.DISCONNECTED;
    case WebSocketStatus.RECONNECTING:
      return WebSocketConnectionState.RECONNECTING;
    case WebSocketStatus.ERROR:
      return WebSocketConnectionState.FAILED;
    default:
      return WebSocketConnectionState.DISCONNECTED;
  }
};

/**
 * WebSocket客户端配置
 */
export interface WebSocketClientConfig {
  url: string;
  reconnectAttempts?: number;
  reconnectDelay?: number;
  heartbeatInterval?: number;
  heartbeatTimeout?: number;
}

/**
 * WebSocket事件处理器
 */
export interface WebSocketEventHandlers {
  onOpen?: () => void;
  onMessage?: (message: WebSocketMessage) => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (event: Event) => void;
  onReconnect?: (attempt: number) => void;
  onReconnectFailed?: () => void;
}