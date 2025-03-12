import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { Message } from '../types/index';

export const useRealtimeMessages = (customerId: string) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // 初始加载消息
    const loadMessages = async () => {
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .or(`recipientId.eq.${customerId},sender.eq.${customerId}`)
          .order('timestamp', { ascending: true });
          
        if (error) throw error;
        
        setMessages(data || []);
      } catch (error) {
        console.error('加载消息失败:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadMessages();
    
    // 订阅新消息
    const subscription = supabase
      .channel('messages_channel')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `recipientId=eq.${customerId}`,
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as Message]);
      })
      .subscribe();
    
    // 清理订阅
    return () => {
      subscription.unsubscribe();
    };
  }, [customerId]);
  
  return { messages, loading };
};