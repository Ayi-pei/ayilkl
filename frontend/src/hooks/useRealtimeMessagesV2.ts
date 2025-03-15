// src/hooks/useRealtimeMessagesV2.ts
import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../services/supabase';
import { Message } from '../types/index';
import { useWebSocket } from './useWebSocket';
import { toast } from '../components/common/Toast';

/**
 * 增强版实时消息钩子，结合WebSocket和Supabase实时订阅
 * 提供更可靠的消息接收和发送功能
 */
export const useRealtimeMessagesV2 = (recipientId: string) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // 移除未使用的lastMessageTime状态变量，改为使用useRef，因为它只在内部逻辑中使用
  const lastMessageTimeRef = useRef<string | null>(null);
  
  // 使用WebSocket钩子
  const { 
    connectWebSocket, 
    sendMessage, 
    isConnected 
  } = useWebSocket();
  
  // 初始加载消息
  const loadMessages = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // 从数据库加载历史消息
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`recipient_id.eq.${recipientId},sender_id.eq.${recipientId}`)
        .order('timestamp', { ascending: true });
      
      if (error) throw error;
      
      // 更新消息列表
      if (data && data.length > 0) {
        setMessages(data);
        
        // 记录最后一条消息的时间，用于增量加载
        const lastMsg = data[data.length - 1];
        if (lastMsg && lastMsg.timestamp) {
          lastMessageTimeRef.current = lastMsg.timestamp;
        }
      }
    } catch (err) {
      console.error('加载消息失败:', err);
      setError(err instanceof Error ? err.message : '加载消息失败');
      toast.error('无法加载历史消息');
    } finally {
      setLoading(false);
    }
  }, [recipientId]);
  
  // 发送消息
  const sendChatMessage = useCallback(async (content: string, type: 'text' | 'image' | 'file' = 'text', fileData?: { fileName?: string, fileSize?: number }) => {
    try {
      // 创建消息对象
      const newMessage: Partial<Message> = {
        content,
        type,
        sender: 'agent', // 或根据上下文确定
        recipient_id: recipientId,
        timestamp: new Date().toISOString(),
        is_read: false,
        ...fileData
      };
      
      // 通过WebSocket发送
      if (isConnected) {
        sendMessage({
          type: 'message',
          data: newMessage
        });
      } else {
        // WebSocket未连接，尝试通过API发送
        const { data, error } = await supabase
          .from('messages')
          .insert([newMessage])
          .select();
          
        if (error) throw error;
        
        // 添加到本地消息列表
        if (data && data[0]) {
          setMessages(prev => [...prev, data[0] as Message]);
        }
      }
      
      return true;
    } catch (err) {
      console.error('发送消息失败:', err);
      toast.error('发送消息失败，请重试');
      return false;
    }
  }, [recipientId, isConnected, sendMessage]);
  
  // 标记消息为已读
  const markAsRead = useCallback(async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('id', messageId);
        
      if (error) throw error;
      
      // 更新本地消息状态
      setMessages(prev => 
        prev.map(msg => 
          msg.id === messageId ? { ...msg, is_read: true } : msg
        )
      );
      
      return true;
    } catch (err) {
      console.error('标记消息已读失败:', err);
      return false;
    }
  }, []);
  
  // 标记所有消息为已读
  const markAllAsRead = useCallback(async () => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('recipient_id', recipientId)
        .eq('is_read', false);
        
      if (error) throw error;
      
      // 更新本地消息状态
      setMessages(prev => 
        prev.map(msg => 
          msg.recipient_id === recipientId ? { ...msg, is_read: true } : msg
        )
      );
      
      return true;
    } catch (err) {
      console.error('标记所有消息已读失败:', err);
      return false;
    }
  }, [recipientId]);
  
  // 添加新消息到列表
  const addNewMessage = useCallback((message: Message) => {
    // 检查消息是否已存在（防止重复）
    setMessages(prev => {
      if (prev.some(msg => msg.id === message.id)) {
        return prev;
      }
      return [...prev, message];
    });
    
    // 更新最后消息时间
    if (message.timestamp) {
      lastMessageTimeRef.current = message.timestamp;
    }
  }, []);
  
  // 初始化和订阅
  useEffect(() => {
    // 初始加载消息
    loadMessages();
    
    // 连接WebSocket
    connectWebSocket();
    
    // 订阅Supabase实时更新
    const subscription = supabase
      .channel('messages_channel')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `recipient_id=eq.${recipientId}`,
      }, (payload) => {
        addNewMessage(payload.new as Message);
      })
      .subscribe();
    
    // 清理订阅
    return () => {
      subscription.unsubscribe();
    };
  }, [recipientId, loadMessages, connectWebSocket, addNewMessage]);
  
  return { 
    messages, 
    loading, 
    error, 
    sendMessage: sendChatMessage,
    markAsRead,
    markAllAsRead,
    refreshMessages: loadMessages
  };
};