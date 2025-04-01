// src/pages/ChatPage.tsx
import { Button, Result, Spin } from 'antd';
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AgentFunction from '../components/AgentFunction';
import UserFunction from '../components/UserFunction';
import { useWebSocket } from '../hooks/useWebSocket';
import { useAuthStore } from '../stores/authStore';
import { useChatStore } from '../stores/chatStore';
import '../styles/chatPage.css';
import { toast } from '../components/common/Toast';
import { StreamChat } from 'stream-chat';
import { Chat, Channel, MessageList, MessageInput } from 'stream-chat-react';
import 'stream-chat-react/dist/css/index.css';

// 从环境变量获取配置
const STREAM_API_KEY = import.meta.env.VITE_STREAM_CHAT_API_KEY;

const ChatPage: React.FC = () => {
  const { linkId } = useParams<{ linkId: string }>();
  const navigate = useNavigate();
  const { 
    userType, 
    initializeChat,
    isInitializing,
  } = useChatStore();
  
  const { isAuthenticated, agentData, login } = useAuthStore();
  
  const { connectWebSocket } = useWebSocket();
  const [error, setError] = useState<string | null>(null);
  const [isCreatingTempUser, setIsCreatingTempUser] = useState<boolean>(false);
  const [chatClient, setChatClient] = useState<StreamChat | null>(null);
  const [channel, setChannel] = useState<Channel | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initPage = async () => {
      try {
        // 两种模式:
        // 1. 有linkId参数 - 作为用户访问特定客服的链接，或客服登录后通过链接进入
        // 2. 无linkId但已登录为客服 - 显示客服界面，需要重定向到带有linkId的URL
        
        if (linkId) {
          // 验证链接有效性
          try {
            const { LinkService } = await import('../services/linkService');
            const linkInfo = await LinkService.verifyLink(linkId);
            
            if (isAuthenticated && userType === 'agent') {
              // 已登录客服访问链接 - 显示客服界面
              await initializeChat(linkId);
              connectWebSocket();
            } else if (isAuthenticated && userType === 'user') {
              // 已登录用户访问链接 - 显示用户界面
              await initializeChat(linkId);
              connectWebSocket();
            } else {
              // 未登录用户访问链接 - 创建临时用户
              setIsCreatingTempUser(true);
              
              try {
                const { AuthService } = await import('../services/authService');
                
                // 生成随机昵称
                const nickname = `访客${Math.floor(Math.random() * 10000)}`;
                
                // 创建临时用户
                const userData = await AuthService.createTempUserFromLink(linkId, { nickname });
                
                // 登录临时用户
                login(userData.token);
                
                // 初始化聊天
                await initializeChat(linkId);
                
                // 连接WebSocket
                connectWebSocket();
                
                setIsCreatingTempUser(false);
                
                // 修复：添加对 userData.agent 的空值检查
                toast.success(
                  `欢迎，${userData.user.nickname}！${
                    userData.agent 
                      ? `您已连接到客服 ${userData.agent.nickname}` 
                      : '您已成功连接'
                  }`
                );
              } catch (err) {
                console.error('导入 authService 失败:', err);
                setError('无法加载认证服务');
              }
            }
          } catch (err) {
            console.error('验证链接失败:', err);
            setError('无效的聊天链接或链接已过期');
          }
        } else if (isAuthenticated && userType === 'agent' && agentData) {
          // 已登录客服但无链接ID - 生成客服自己的链接并重定向
          try {
            const { LinkService } = await import('../services/linkService');
            const agentId = agentData.id;
            if (agentId) {
              const linkData = await LinkService.createLink(agentId);
              
              // 重定向到带有linkId的URL
              navigate(`/chat/${linkData.code}`, { replace: true });
            } else {
              setError('客服ID未定义');
            }
          } catch (err) {
            console.error('创建链接失败:', err);
            setError('创建聊天链接失败');
          }
        } else {
          // 既无链接ID，又不是已登录客服 - 返回登录页
          setError('请先登录或使用有效的聊天链接');
        }
      } catch (err) {
        console.error('初始化聊天失败:', err);
        setError(err instanceof Error ? err.message : '初始化聊天失败，请检查链接是否有效');
      }
    };
    
    initPage();
  }, [linkId, isAuthenticated, userType, agentData, initializeChat, connectWebSocket, navigate, login]);

  useEffect(() => {
    const initChat = async () => {
      try {
        setLoading(true);
        // 初始化 client
        const client = StreamChat.getInstance(STREAM_API_KEY);

        // 从后端获取用户 token
        const { token, userId } = await fetchUserToken();

        // 连接用户
        await client.connectUser(
          {
            id: userId,
            name: userData.name,
            image: userData.avatar
          },
          token
        );

        // 获取或创建频道
        const channel = client.channel('messaging', 'customer-service', {
          name: '客服频道',
          members: [userId]
        });

        await channel.watch();

        setChatClient(client);
        setChannel(channel);
        setError(null);
      } catch (err) {
        console.error('Chat initialization failed:', err);
        setError('聊天初始化失败');
      } finally {
        setLoading(false);
      }
    };

    initChat();

    // Cleanup
    return () => {
      if (chatClient) {
        chatClient.disconnectUser();
      }
    };
  }, []);

  // 根据用户类型渲染不同的聊天界面
  const chatPageClass = { CHAT_PAGE: 'chat-page' };

  // 处理错误情况
  if (error) {
    return (
      <Result
        status="error"
        title="访问失败"
        subTitle={error}
        extra={[
          <Button type="primary" key="login" onClick={() => navigate('/login')}>
            返回登录
          </Button>
        ]}
      />
    );
  }

  // 加载中
  if (isInitializing || isCreatingTempUser || loading) {
    return (
      <div className="chat-loading-container">
        <Spin size="large" />
        <div className="loading-text">
          {isCreatingTempUser ? '正在创建临时账号...' : '正在加载聊天...'}
        </div>
      </div>
    );
  }

  if (!chatClient || !channel) {
    return <div>聊天未初始化</div>;
  }

  return (
    <div className="chat-page-container">
      {userType === 'agent' ? (
        <AgentFunction className={`${chatPageClass}-agent-function`} />
      ) : (
        <UserFunction className={`${chatPageClass}-user-function`} />
      )}
      <Chat client={chatClient} theme="messaging light">
        <Channel channel={channel}>
          <MessageList />
          <MessageInput />
        </Channel>
      </Chat>
    </div>
  );
};

export default ChatPage;