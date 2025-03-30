import type { 
  Message, 
  Customer, 
  AgentData,
  QuickReply, 
  BlacklistedUser,
  AgentSettings,
  UserSettings,
  LinkVerificationResult,
  LinkData,
  WebSocketStatus,
  WebSocketMessage
} from './index';
import type { Stats } from 'fs';

// 默认用户设置
const defaultSettings: UserSettings = {
  id: '',
  nickname: '',
  avatar: '',
  soundEnabled: true,
  theme: 'light'
};

// Auth Store State
export interface AuthState {
  isAuthenticated: boolean;
  userType: 'admin' | 'agent' | 'user' | null;
  agentData?: AgentData;
  error?: string;
  loading: boolean;
  key?: string;
  token?: string;
  login: (key: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  verifySession: () => Promise<boolean>;
  clearError: () => void;
}

// Chat Store State
export interface ChatState {
  currentChat: {
    id: string;
    messages: Message[];
    customerId?: string;
    agentId?: string;
  };
  customers: Customer[];
  activeCustomerId?: string;
  visiblePanel: 'none' | 'userInfo' | 'quickReply';
  loading: boolean;
  error?: string;
  sendMessage: (content: string, type?: string) => Promise<void>;
  loadMessages: (chatId: string) => Promise<void>;
  setActiveCustomer: (customerId: string) => void;
  togglePanel: (panel: 'userInfo' | 'quickReply') => void;
}

// Agent Settings Store State
export interface AgentSettingsState {
  settings: AgentSettings;
  quickReplies: QuickReply[];
  blockedUsers: BlacklistedUser[];
  welcomeMessages: string[];
  loading: boolean;
  error?: string;
  updateSettings: (settings: Partial<AgentSettings>) => Promise<void>;
  addQuickReply: (reply: Omit<QuickReply, 'id'>) => Promise<void>;
  removeQuickReply: (id: string) => Promise<void>;
  blockUser: (userId: string, reason: string) => Promise<void>;
  unblockUser: (userId: string) => Promise<void>;
  setWelcomeMessages: (messages: string[]) => Promise<void>;
}

// User Settings Store State
export interface UserSettingsState {
  settings: UserSettings;
  loading: boolean;
  error?: string;
  updateNickname: (nickname: string) => Promise<void>;
  updateAvatar: (avatar: string) => Promise<void>;
  toggleSound: () => Promise<void>;
  toggleTheme: () => Promise<void>;
}

// Link Store State
export interface LinkState {
  currentLink?: LinkData;
  userLinks: LinkData[];
  loading: boolean;
  error?: string;
  generateLink: () => Promise<string>;
  verifyLink: (code: string) => Promise<LinkVerificationResult>;
  loadUserLinks: () => Promise<void>;
  deactivateLink: (linkId: string) => Promise<void>;
}

// Statistics Store State
export interface StatsState {
  data: Stats;
  loading: boolean;
  error?: string;
  loadStats: () => Promise<void>;
  refreshStats: () => Promise<void>;
}

// WebSocket Store State
export interface WebSocketState {
  status: WebSocketStatus;
  lastMessage?: WebSocketMessage;
  error?: string;
  connect: () => Promise<void>;
  disconnect: () => void;
  sendMessage: (message: WebSocketMessage) => void;
  reconnect: () => Promise<void>;
}

// Toast Store State
export interface ToastState {
  messages: Array<{
    id: string;
    type: 'info' | 'success' | 'warning' | 'error';
    content: string;
    duration?: number;
  }>;
  show: (content: string, type?: 'info' | 'success' | 'warning' | 'error', duration?: number) => void;
  hide: (id: string) => void;
  clearAll: () => void;
}

// UI Store State 
export interface UIState {
  theme: 'light' | 'dark';
  sidebar: {
    visible: boolean;
    width: number;
  };
  modal: {
    visible: boolean;
    title?: string;
    content?: React.ReactNode;
  };
  loading: {
    [key: string]: boolean;
  };
  toggleTheme: () => void;
  toggleSidebar: () => void;
  setSidebarWidth: (width: number) => void;
  showModal: (title: string, content: React.ReactNode) => void;
  hideModal: () => void;
  setLoading: (key: string, loading: boolean) => void;
}

// Root Store Type
export interface RootStore {
  auth: AuthState;
  chat: ChatState;
  agentSettings: AgentSettingsState;
  userSettings: UserSettingsState;
  link: LinkState;
  stats: StatsState;
  websocket: WebSocketState;
  toast: ToastState;
  ui: UIState;
}

// 在相关使用处修复语法错误并定义初始用户设置
export const initialUserSettings: UserSettings = {
  ...defaultSettings
};
// ...existing code...