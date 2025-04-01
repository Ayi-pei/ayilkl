import { supabase } from '../utils/supabaseClient';
import { Message, MessageType } from '../types';

export class MessageService {
  static async saveMessage(message: Message): Promise<void> {
    try {
      const { error } = await supabase.from('messages').insert({
        id: message.id,
        content: message.content,
        type: message.type,
        sender_id: message.senderId,
        recipient_id: message.recipientId,
        file_name: message.fileName,
        file_size: message.fileSize,
        created_at: message.createdAt || new Date().toISOString()
      });

      if (error) throw error;
    } catch (error) {
      console.error('保存消息失败:', error);
      throw error;
    }
  }

  static async getMessageHistory(chatId: string): Promise<Message[]> {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('获取消息历史失败:', error);
      throw error;
    }
  }
}
