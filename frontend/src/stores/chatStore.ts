// src/stores/chatStore.ts
import { nanoid } from 'nanoid';
import create from 'zustand';
import { toast } from '../components/common/Toast';
import { LinkService } from '../services/linkService';
import { supabase } from '../services/supabase';
import { BlacklistedUser, Customer, Message, QuickReply, Stats } from '../types';
import { useAuthStore } from './authStore';
import { AgentData } from '../types';

interface ChatState {
  // 基础状态
  isInitializing: boolean;
  userType: 'agent' | 'user' | null;
  
  // 聊天数据
  messages: Message[];
  customers: Customer[];
  selectedCustomer: Customer | null;
  
  // 用户数据 (用户模式)
  userSettings: {
    id: string;
    nickname: string;
    avatar: string;
  } | null;
  currentAgent: {
    id: string;
    nickname: string;
    avatar: string;
  } | null;
  
  // 功能数据
  quickReplies: QuickReply[];
  welcomeMessages: string[];
  blacklist: BlacklistedUser[];
  
  // 统计数据
  stats: Stats;
  
  // 初始化方法
  initializeChat: (linkId: string) => Promise<void>;
  
  // 客户管理方法
  setSelectedCustomer: (customer: Customer | null) => void;
  
  // 消息方法
  addMessage: (message: Message) => void;
  sendMessage: (message: Omit<Message, 'timestamp'>) => Promise<void>;
  setCustomers: (customers: Customer[]) => void;
  handleCustomerStatusChange: (customerId: string, isOnline: boolean, lastSeen?: string) => void;
  
  // 黑名单管理
  blacklistCustomer: (customerId: string) => Promise<void>;
  removeFromBlacklist: (userId: string) => Promise<void>;
  fetchBlacklistedUsers: () => Promise<BlacklistedUser[]>;
  
  // 用户设置
  updateUserSettings: (settings: Partial<{nickname: string, avatar: string}>) => Promise<void>;
  
  // 快捷回复管理
  addQuickReply: (title: string, content: string) => Promise<QuickReply>;
  deleteQuickReply: (id: string) => Promise<boolean>;
  fetchQuickReplies: () => Promise<QuickReply[]>;
  
  // 欢迎消息管理
  updateWelcomeMessages: (messages: string[]) => Promise<string[]>;
  fetchWelcomeMessages: () => Promise<string[]>;
  
  // 统计相关
  fetchStats: () => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  // 初始状态
  isInitializing: false,
  userType: null,
  messages: [],
  customers: [],
  selectedCustomer: null,
  userSettings: null,
  currentAgent: null,
  quickReplies: [],
  welcomeMessages: ['欢迎来到客服系统，有什么可以帮助您的？'],
  blacklist: [],
  stats: {
    totalCustomers: 0,
    activeCustomers: 0,
    totalMessages: 0,
    messagesLast24h: 0,
    onlineAgents: 0,
    totalKeys: 0
  },
  
  // 初始化聊天
  initializeChat: async (linkId: string) => {
    set({ isInitializing: true });
    
    try {
      // 验证链接
      const linkResult = await LinkService.verifyLink(linkId);
      
      if (!linkResult.valid) {
        throw new Error(linkResult.message || '无效的聊天链接');
      }
      
      // 使用 linkResult.agentId 或 linkResult.agent.id
      const agentId = linkResult.agentId || linkResult.agent.id;
      
      if (!agentId) {
        throw new Error('链接中未包含客服ID');
      }
      
      // 获取客服信息
      const { data: agentData, error: agentError } = await supabase
        .from('agents')
        .select('*')
        .eq('id', agentId)
        .single();
      
      if (agentError || !agentData) {
        throw new Error('客服不存在');
      }
      
      // 检查是否客服自己
      const { getCurrentAgentId } = useAuthStore.getState();
      const currentAgentId = getCurrentAgentId();
      
      if (currentAgentId && currentAgentId === agentId) {
        // 是客服，加载客户列表和消息
        set({ userType: 'agent' });
        await initializeAgentChat(agentId);
      } else {
        // 是普通用户，初始化用户聊天
        set({ userType: 'user' });
        await initializeUserChat(linkId, agentId, agentData);
      }
    } catch (error) {
      console.error('初始化聊天失败:', error);
      toast.error(error instanceof Error ? error.message : '初始化聊天失败');
      throw error;
    } finally {
      set({ isInitializing: false });
    }
  },
  
  // 设置选中的客户
  setSelectedCustomer: (customer) => {
    set({ selectedCustomer: customer });
    
    if (customer) {
      // 加载与该客户的聊天记录
      loadCustomerMessages(customer.id);
    } else {
      // 清空消息
      set({ messages: [] });
    }
  },
  
  // 添加消息
  addMessage: (message) => {
    set(state => ({
      messages: [...state.messages, message]
    }));
  },
  
  // 发送消息
  sendMessage: async (message) => {
    const { userSettings, currentAgent, selectedCustomer } = get();
    const { getCurrentAgentId } = useAuthStore.getState();
    const currentAgentId = getCurrentAgentId();
    
    // 确定发送者和接收者
    let senderId, receiverId, agentId;
    
    if (currentAgentId && selectedCustomer) {
      // 客服发送给用户
      senderId = currentAgentId;
      receiverId = selectedCustomer.id;
      agentId = currentAgentId;
    } else if (userSettings && currentAgent) {
      // 用户发送给客服
      senderId = userSettings.id;
      receiverId = currentAgent.id;
      agentId = currentAgent.id;
    } else {
      throw new Error('无法确定发送者和接收者');
    }
    
    // 创建完整的消息对象
    const fullMessage: Message = {
      ...message,
      timestamp: new Date().toISOString()
    };
    
    // 先添加到本地状态
    set(state => ({
      messages: [...state.messages, fullMessage]
    }));
    
    try {
      // 保存到数据库
      const { error } = await supabase
        .from('messages')
        .insert({
          id: fullMessage.id,
          content: fullMessage.content,
          type: fullMessage.type,
          file_name: fullMessage.fileName,
          file_size: fullMessage.fileSize,
          sender_id: senderId,
          receiver_id: receiverId,
          agent_id: agentId,
          timestamp: fullMessage.timestamp
        });
        
      if (error) throw error;
      
      // 如果是用户发送的消息，更新最后活动时间
      if (!currentAgentId && userSettings && currentAgent) {
        await supabase
          .from('customers')
          .update({ last_seen: new Date().toISOString() })
          .eq('id', userSettings.id)
          .eq('agent_id', currentAgent.id);
      }
    } catch (error) {
      console.error('发送消息失败:', error);
      toast.error('发送消息失败');
      
      // 从本地移除消息
      set(state => ({
        messages: state.messages.filter(msg => msg.id !== fullMessage.id)
      }));
      
      throw error;
    }
  },
  
  // 设置客户列表
  setCustomers: (customers) => {
    set({ customers });
  },
  
  // 处理客户在线状态变化
  handleCustomerStatusChange: (customerId, isOnline, lastSeen) => {
    set(state => {
      // 更新客户列表中的状态
      const updatedCustomers = state.customers.map(customer => {
        if (customer.id === customerId) {
          return {
            ...customer,
            isOnline,
            lastSeen: lastSeen || customer.lastSeen
          };
        }
        return customer;
      });
      
      // 如果是当前选中的客户，也更新选中状态
      let updatedSelectedCustomer = state.selectedCustomer;
      if (state.selectedCustomer?.id === customerId) {
        updatedSelectedCustomer = {
          ...state.selectedCustomer,
          isOnline,
          lastSeen: lastSeen || state.selectedCustomer.lastSeen
        };
      }
      
      return {
        customers: updatedCustomers,
        selectedCustomer: updatedSelectedCustomer
      };
    });
  },
  
  // 将用户加入黑名单
  blacklistCustomer: async (customerId) => {
    const { customers } = get();
    const { getCurrentAgentId } = useAuthStore.getState();
    const agentId = getCurrentAgentId();
    
    if (!agentId) {
      throw new Error('未登录或无效的客服ID');
    }
    
    const customer = customers.find(c => c.id === customerId);
    if (!customer) {
      throw new Error('找不到指定的用户');
    }
    
    try {
      const now = new Date().toISOString();
  
      // 添加到黑名单表
      const { error: blacklistError } = await supabase
        .from('blacklist')
        .insert({
          id: nanoid(),
          agent_id: agentId,
          customer_id: customer.id,
          customer_data: JSON.stringify({
            nickname: customer.nickname,
            avatar: customer.avatar,
            ip: customer.ip,
            device: customer.device,
            lastSeen: customer.lastSeen,
            firstVisit: customer.firstVisit
          }),
          created_at: new Date().toISOString()
        });
        
      if (blacklistError) throw blacklistError;
      
      // 更新客户状态为已拉黑
      const { error: updateError } = await supabase
        .from('customers')
        .update({ is_blacklisted: true })
        .eq('id', customer.id)
        .eq('agent_id', agentId);
        
      if (updateError) throw updateError;
      
      // 更新本地状态 - 修复类型问题
      set(state => {
        // 创建一个符合BlacklistedUser类型的对象
        const blacklistedUser: BlacklistedUser = {
          id: customer.id,
          nickname: customer.nickname,
          avatar: customer.avatar,
          ip: customer.ip,
          device: customer.device,
          isOnline: false,
          lastSeen: customer.lastSeen,
          firstVisit: customer.firstVisit,
          blacklistedAt: now,
          createdAt: now,
          reason: ''
        };
        
        return {
          customers: state.customers.filter(c => c.id !== customerId),
          blacklist: [...state.blacklist, blacklistedUser],
          selectedCustomer: state.selectedCustomer?.id === customerId ? null : state.selectedCustomer,
          messages: state.selectedCustomer?.id === customerId ? [] : state.messages
        };
      });
  
      toast.success('用户已加入黑名单');
    } catch (error) {
      console.error('拉黑用户失败:', error);
      toast.error('操作失败');
      throw error;
    }
  },
  
  // 从黑名单移除
  removeFromBlacklist: async (userId) => {
    const { blacklist } = get();
    const { getCurrentAgentId } = useAuthStore.getState();
    const agentId = getCurrentAgentId();
    
    if (!agentId) {
      throw new Error('未登录或无效的客服ID');
    }
    
    const blacklistedUser = blacklist.find(u => u.id === userId);
    if (!blacklistedUser) {
      throw new Error('在黑名单中找不到该用户');
    }
    
    try {
      // 从黑名单表删除
      const { error: deleteError } = await supabase
        .from('blacklist')
        .delete()
        .match({
          customer_id: userId,
          agent_id: agentId
        });
        
      if (deleteError) throw deleteError;
      
      // 更新用户状态
      const { error: updateError } = await supabase
        .from('customers')
        .update({ is_blacklisted: false })
        .eq('id', userId)
        .eq('agent_id', agentId);
        
      if (updateError) throw updateError;
      
      // 更新本地状态 - 修复类型问题
      set(state => {
        // 创建一个符合Customer类型的对象
        const customer: Customer = {
          id: blacklistedUser.id,
          nickname: blacklistedUser.nickname,
          avatar: blacklistedUser.avatar || '',
          isOnline: false,
          lastSeen: blacklistedUser.lastSeen,
          ip: blacklistedUser.ip,
          device: blacklistedUser.device,
          firstVisit: blacklistedUser.firstVisit
        };
        
        return {
          blacklist: state.blacklist.filter(u => u.id !== userId),
          customers: [...state.customers, customer]
        };
      });
      
      toast.success('已从黑名单中移除');
    } catch (error) {
      console.error('解除拉黑失败:', error);
      toast.error('操作失败');
      throw error;
    }
  },
  
  // 获取黑名单用户
  fetchBlacklistedUsers: async () => {
    const { getCurrentAgentId } = useAuthStore.getState();
    const agentId = getCurrentAgentId();
    
    if (!agentId) {
      console.warn('未登录或无效的客服ID');
      return [];
    }
    
    try {
      const { data, error } = await supabase
        .from('blacklist')
        .select('*')
        .eq('agent_id', agentId);
        
      if (error) throw error;
      
      const blacklistedUsers: BlacklistedUser[] = data.map(item => {
        const userData = JSON.parse(item.customer_data || '{}');
        const createdAt = item.created_at || new Date().toISOString();
        
        return {
          id: item.customer_id,
          nickname: userData.nickname || '未知用户',
          avatar: userData.avatar || '',
          ip: userData.ip || '',
          device: userData.device || '',
          isOnline: false,
          lastSeen: userData.lastSeen || createdAt,
          firstVisit: userData.firstVisit || createdAt,
          blacklistedAt: createdAt,
          createdAt: createdAt,
          reason: item.reason || ''
        };
      });
      
      set({ blacklist: blacklistedUsers });
      return blacklistedUsers;
    } catch (error) {
      console.error('获取黑名单失败:', error);
      return [];
    }
  },  // 添加逗号
  
  // 更新用户设置
  updateUserSettings: async (settings) => {
    const { userSettings, currentAgent } = get();
    
    if (!userSettings || !currentAgent) {
      throw new Error('用户或客服信息未初始化');
    }
    
    // 先更新本地状态
    set(state => ({
      userSettings: {
        ...state.userSettings!,
        ...settings
      }
    }));
    
    try {
      // 更新数据库
      const { error } = await supabase
        .from('customers')
        .update({
          nickname: settings.nickname || userSettings.nickname,
          avatar: settings.avatar || userSettings.avatar,
          last_seen: new Date().toISOString()
        })
        .eq('id', userSettings.id)
        .eq('agent_id', currentAgent.id);
        
      if (error) throw error;
    } catch (error) {
      console.error('更新用户设置失败:', error);
      
      // 回滚本地状态
      set({ userSettings });
      
      toast.error('更新设置失败');
      throw error;
    }
  },
  
  // 添加快捷回复
  addQuickReply: async (title, content) => {
    const { getCurrentAgentId } = useAuthStore.getState();
    const agentId = getCurrentAgentId();
    
    if (!agentId) {
      throw new Error('未登录或无效的客服ID');
    }
    
    const newReply = {
      id: nanoid(),
      title,
      content
    };
    
    try {
      const { error } = await supabase
        .from('quick_replies')
        .insert({
          id: newReply.id,
          agent_id: agentId,
          title: newReply.title,
          content: newReply.content,
          created_at: new Date().toISOString()
        });
        
      if (error) throw error;
      
      set(state => ({
        quickReplies: [...state.quickReplies, newReply]
      }));
      
      toast.success('快捷回复已添加');
      return newReply;
    } catch (error) {
      console.error('添加快捷回复失败:', error);
      toast.error('添加失败');
      throw error;
    }
  },
  
  // 删除快捷回复
  deleteQuickReply: async (id) => {
    const { getCurrentAgentId } = useAuthStore.getState();
    const agentId = getCurrentAgentId();
    
    if (!agentId) {
      throw new Error('未登录或无效的客服ID');
    }
    
    try {
      const { error } = await supabase
        .from('quick_replies')
        .delete()
        .match({
          id,
          agent_id: agentId
        });
        
      if (error) throw error;
      
      set(state => ({
        quickReplies: state.quickReplies.filter(item => item.id !== id)
      }));
      
      toast.success('快捷回复已删除');
      return true;
    } catch (error) {
      console.error('删除快捷回复失败:', error);
      toast.error('删除失败');
      throw error;
    }
  },
  
  // 获取快捷回复
  fetchQuickReplies: async () => {
    const { getCurrentAgentId } = useAuthStore.getState();
    const agentId = getCurrentAgentId();
    
    if (!agentId) {
      console.warn('未登录或无效的客服ID');
      return [];
    }
    
    try {
      const { data, error } = await supabase
        .from('quick_replies')
        .select('*')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      const quickReplies = data.map(item => ({
        id: item.id,
        title: item.title,
        content: item.content
      }));
      
      set({ quickReplies });
      return quickReplies;
    } catch (error) {
      console.error('获取快捷回复失败:', error);
      return [];
    }
  },
  
  // 更新欢迎消息
  updateWelcomeMessages: async (messages) => {
    const { getCurrentAgentId } = useAuthStore.getState();
    const agentId = getCurrentAgentId();
    
    if (!agentId) {
      throw new Error('未登录或无效的客服ID');
    }
    
    // 过滤并限制数量
    const validMessages = messages
      .filter(msg => msg.trim() !== '')
      .slice(0, 3);
    
    try {
      // 删除现有消息
      await supabase
        .from('welcome_messages')
        .delete()
        .eq('agent_id', agentId);
      
      if (validMessages.length > 0) {
        // 添加新消息
        const { error } = await supabase
          .from('welcome_messages')
          .insert(
            validMessages.map((message, index) => ({
              agent_id: agentId,
              message,
              display_order: index,
              created_at: new Date().toISOString()
            }))
          );
          
        if (error) throw error;
      }
      
      set({ welcomeMessages: validMessages });
      toast.success('欢迎消息已更新');
      return validMessages;
    } catch (error) {
      console.error('更新欢迎消息失败:', error);
      toast.error('更新失败');
      throw error;
    }
  },
  
  // 获取欢迎消息
  fetchWelcomeMessages: async () => {
    const { getCurrentAgentId } = useAuthStore.getState();
    const agentId = getCurrentAgentId();
    
    if (!agentId) {
      console.warn('未登录或无效的客服ID');
      return get().welcomeMessages;
    }
    
    try {
      const { data, error } = await supabase
        .from('welcome_messages')
        .select('*')
        .eq('agent_id', agentId)
        .order('display_order', { ascending: true });
        
      if (error) throw error;
      
      const welcomeMessages = data.map(item => item.message);
      
      if (welcomeMessages.length === 0) {
        return get().welcomeMessages;
      }
      
      set({ welcomeMessages });
      return welcomeMessages;
    } catch (error) {
      console.error('获取欢迎消息失败:', error);
      return get().welcomeMessages;
    }
  },
  
  // 获取统计信息
  fetchStats: async () => {
    try {
      // 获取总客户数
      const { count: totalCustomers } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true });
      
      // 获取24小时内活跃客户
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      
      const { count: activeCustomers } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .gte('last_seen', oneDayAgo.toISOString());
      
      // 获取总消息数
      const { count: totalMessages } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true });
      
      // 获取24小时内消息
      const { count: messagesLast24h } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .gte('timestamp', oneDayAgo.toISOString());
      
      // 获取在线客服数
      const { count: onlineAgents } = await supabase
        .from('agents')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'online');
      
      // 获取活跃密钥数
      const { count: totalKeys } = await supabase
        .from('agent_keys')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);
      
      set({
        stats: {
          totalCustomers: totalCustomers || 0,
          activeCustomers: activeCustomers || 0,
          totalMessages: totalMessages || 0,
          messagesLast24h: messagesLast24h || 0,
          onlineAgents: onlineAgents || 0,
          totalKeys: totalKeys || 0
        }
      });
    } catch (error) {
      console.error('获取统计数据失败:', error);
      toast.error('获取统计数据失败');
    }
  }
}));

// 辅助函数 - 初始化客服聊天
async function initializeAgentChat(agentId: string) {
  try {
    // 获取客户列表
    const { data: customersData, error: customersError } = await supabase
      .from('customers')
      .select('*')
      .eq('agent_id', agentId)
      .eq('is_blacklisted', false)
      .order('last_seen', { ascending: false });
      
    if (customersError) throw customersError;
    
    const customers = customersData.map(c => ({
      id: c.id,
      nickname: c.nickname || `访客${c.id.slice(0, 4)}`,
      avatar: c.avatar || '',
      isOnline: (new Date().getTime() - new Date(c.last_seen).getTime()) < 5 * 60 * 1000, // 5分钟内为在线
      lastSeen: c.last_seen,
      ip: c.ip || '',
      device: c.device || '',
      firstVisit: c.first_visit
    }));
    
    // 设置客户列表
    useChatStore.setState({ customers });
    
    // 加载快捷回复
    await useChatStore.getState().fetchQuickReplies();
    
    // 加载欢迎消息
    await useChatStore.getState().fetchWelcomeMessages();
    
    // 加载黑名单
    await useChatStore.getState().fetchBlacklistedUsers();
    
    // 如果有客户，选择第一个
    if (customers.length > 0) {
      useChatStore.getState().setSelectedCustomer(customers[0]);
    }
  } catch (error) {
    console.error('初始化客服聊天失败:', error);
    throw error;
  }
}

// 辅助函数 - 初始化用户聊天
async function initializeUserChat(linkId: string, agentId: string, agentData: AgentData) {
  try {
    // 生成或获取用户ID
    let userId = localStorage.getItem(`chat_user_${linkId}`);
    if (!userId) {
      userId = nanoid();
      localStorage.setItem(`chat_user_${linkId}`, userId);
    }
    
    // 获取用户IP和设备信息
    let userIp = 'unknown';
    try {
      const ipResponse = await fetch('https://api.ipify.org?format=json');
      const ipData = await ipResponse.json();
      userIp = ipData.ip;
    } catch (e) {
      console.error('获取IP失败:', e);
    }
    
    const userDevice = `${navigator.platform} - ${navigator.userAgent.split(' ').slice(-2).join(' ')}`;
    
    // 检查用户是否被拉黑
    const { data: blacklistData } = await supabase
      .from('blacklist')
      .select('*')
      .eq('customer_id', userId)
      .eq('agent_id', agentId)
      .single();
      
    if (blacklistData) {
      throw new Error('您已被加入黑名单，无法继续聊天');
    }
    
    // 获取用户信息
    const { data: userData } = await supabase
      .from('customers')
      .select('*')
      .eq('id', userId)
      .eq('agent_id', agentId)
      .single();
      
    // 设置或更新用户信息
    const userInfo = {
      id: userId,
      nickname: userData?.nickname || `访客${userId.slice(0, 4)}`,
      avatar: userData?.avatar || ''
    };
    
    // 更新数据库中的用户信息
    await supabase
      .from('customers')
      .upsert({
        id: userId,
        agent_id: agentId,
        nickname: userInfo.nickname,
        avatar: userInfo.avatar,
        ip: userIp,
        device: userDevice,
        is_blacklisted: false,
        last_seen: new Date().toISOString(),
        first_visit: userData?.first_visit || new Date().toISOString()
      });
    
    // 设置用户和客服信息
    useChatStore.setState({
      userSettings: userInfo,
      currentAgent: {
        id: agentId,
        nickname: agentData.nickname || '客服',
        avatar: agentData.avatar || ''
      }
    });
    
    // 加载聊天记录
    await loadUserMessages(userId, agentId);
    
    // 如果是首次访问，发送欢迎消息
    if (!userData) {
      sendWelcomeMessages(agentId, userId);
    }
  } catch (error) {
    console.error('初始化用户聊天失败:', error);
    throw error;
  }
}

// 辅助函数 - 加载用户消息
async function loadUserMessages(userId: string, agentId: string) {
  try {
    const { data: messagesData, error } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .eq('agent_id', agentId)
      .order('timestamp', { ascending: true });
      
    if (error) throw error;
    
    const messages = messagesData.map(msg => ({
      id: msg.id,
      content: msg.content,
      type: msg.type || 'text',
      sender: (msg.sender_id === userId ? 'user' : 'agent') as 'user' | 'agent',
      fileName: msg.file_name,
      fileSize: msg.file_size,
      timestamp: msg.timestamp
    }));
    
    useChatStore.setState({ messages });
  } catch (error) {
    console.error('加载聊天记录失败:', error);
    throw error;
  }
}

// 辅助函数 - 加载客户消息
async function loadCustomerMessages(customerId: string) {
  const { getCurrentAgentId } = useAuthStore.getState();
  const agentId = getCurrentAgentId();
  
  if (!agentId) {
    console.error('未登录或无效的客服ID');
    return;
  }
  
  try {
    const { data: messagesData, error } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${customerId},receiver_id.eq.${customerId}`)
      .eq('agent_id', agentId)
      .order('timestamp', { ascending: true });
      
    if (error) throw error;
    
    const messages = messagesData.map(msg => ({
      id: msg.id,
      content: msg.content,
      type: msg.type || 'text',
      sender: (msg.sender_id === customerId ? 'user' : 'agent') as 'user' | 'agent',
      fileName: msg.file_name,
      fileSize: msg.file_size,
      timestamp: msg.timestamp
    }));
    
    useChatStore.setState({ messages });
  } catch (error) {
    console.error('加载客户消息失败:', error);
  }
}

// 辅助函数 - 发送欢迎消息
async function sendWelcomeMessages(agentId: string, userId: string) {
  try {
    // 获取欢迎消息
    const { data: welcomeData, error } = await supabase
      .from('welcome_messages')
      .select('message')
      .eq('agent_id', agentId)
      .order('display_order', { ascending: true });
      
    if (error) throw error;
    
    // 如果没有欢迎消息，使用默认消息
    const welcomeMessages = welcomeData?.length ? 
      welcomeData.map(item => item.message) : 
      ['欢迎来到客服系统，有什么可以帮助您的？'];
    
    // 设置欢迎消息
    useChatStore.setState({ welcomeMessages });
    
    // 延迟发送欢迎消息
    welcomeMessages.forEach((msg, index) => {
      setTimeout(async () => {
        // 创建消息对象
        const messageId = nanoid();
        
        // 保存消息到数据库
        await supabase
          .from('messages')
          .insert({
            id: messageId,
            content: msg,
            type: 'text',
            sender_id: agentId,
            receiver_id: userId,
            agent_id: agentId,
            timestamp: new Date(Date.now() + index * 1000).toISOString() // 每条消息间隔1秒
          });
        
        // 添加到本地状态
        useChatStore.getState().addMessage({
          id: messageId,
          content: msg,
          type: 'text',
          sender: 'agent',
          timestamp: new Date(Date.now() + index * 1000).toISOString()
        });
      }, index * 1000); // 每条消息间隔1秒
    });
  } catch (error) {
    console.error('发送欢迎消息失败:', error);
  }
}