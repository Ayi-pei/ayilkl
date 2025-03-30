// src/models/websocketModels.ts
// 这个文件用于定义与WebSocket通信相关的模型类型
// 注意：此文件中的类型定义与types/index.ts中的定义保持兼容

import {
  WebSocketStatus,
  WebSocketMessage
} from '../types';

export enum WebSocketConnectionState {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  RECONNECTING = 'reconnecting',
  FAILED = 'failed'
}

// 类型转换函数
export const convertConnectionStateToStatus = (state: WebSocketConnectionState): WebSocketStatus => {
  const stateMap: Record<WebSocketConnectionState, WebSocketStatus> = {
    [WebSocketConnectionState.CONNECTING]: WebSocketStatus.CONNECTING,
    [WebSocketConnectionState.CONNECTED]: WebSocketStatus.OPEN,
    [WebSocketConnectionState.DISCONNECTED]: WebSocketStatus.CLOSED,
    [WebSocketConnectionState.RECONNECTING]: WebSocketStatus.RECONNECTING,
    [WebSocketConnectionState.FAILED]: WebSocketStatus.ERROR
  };
  
  return stateMap[state] ?? WebSocketStatus.CLOSED;
};

export const convertStatusToConnectionState = (status: WebSocketStatus): WebSocketConnectionState => {
  const statusMap: Record<WebSocketStatus, WebSocketConnectionState> = {
    [WebSocketStatus.CONNECTING]: WebSocketConnectionState.CONNECTING,
    [WebSocketStatus.OPEN]: WebSocketConnectionState.CONNECTED,
    [WebSocketStatus.CLOSED]: WebSocketConnectionState.DISCONNECTED,
    [WebSocketStatus.RECONNECTING]: WebSocketConnectionState.RECONNECTING,
    [WebSocketStatus.ERROR]: WebSocketConnectionState.FAILED,
    [WebSocketStatus.CLOSING]: WebSocketConnectionState.DISCONNECTED
  };
  
  return statusMap[status] ?? WebSocketConnectionState.DISCONNECTED;
};

// 事件处理器接口
export interface WebSocketEventHandlers {
  onOpen?: () => void;
  onMessage?: (message: WebSocketMessage) => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (event: Event) => void;
  onReconnect?: (attempt: number) => void;
  onReconnectFailed?: () => void;
}

// 重新导出需要的类型
export type {
  WebSocketStatus,
  WebSocketMessage
} from '../types';