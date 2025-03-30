import { StreamChat } from 'stream-chat';
import { STREAM_API_KEY } from '../config';

// 创建 StreamChat 实例
const chatClient = StreamChat.getInstance(STREAM_API_KEY);

export const streamChatService = {
  // 连接用户
  connectUser: async (userId: string, username: string, token: string, avatar?: string) => {
    try {
      await chatClient.connectUser(
        {
          id: userId,
          name: username,
          image: avatar,
        },
        token
      );
      return chatClient;
    } catch (error) {
      console.error('Failed to connect user to Stream:', error);
      throw error;
    }
  },

  // 创建或获取频道
  getOrCreateChannel: async (channelId: string, members: string[]) => {
    try {
      const channel = chatClient.channel('messaging', channelId, {
        members,
        name: '客服对话',
      });
      await channel.watch();
      return channel;
    } catch (error) {
      console.error('Failed to create/get channel:', error);
      throw error;
    }
  },

  // 断开连接
  disconnectUser: async () => {
    try {
      await chatClient.disconnectUser();
    } catch (error) {
      console.error('Failed to disconnect user:', error);
    }
  },
};

export { chatClient };
