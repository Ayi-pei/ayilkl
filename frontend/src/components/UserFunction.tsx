import {
  AudioOutlined,
  CloseOutlined,
  InfoCircleOutlined,
  PictureOutlined,
  PlusOutlined,
  SendOutlined,
  SettingOutlined,
  SmileOutlined,
  UserOutlined
} from '@ant-design/icons';
import {
  Alert,
  Avatar,
  Button,
  Drawer,
  Empty,
  Input,
  Space,
  Spin,
  Tag,
  Tooltip,
  Typography,
  Upload
} from 'antd';
import Picker from 'emoji-picker-react';
import { nanoid } from 'nanoid';
import React, { useEffect, useRef, useState } from 'react';
import { useChatStore } from '../stores/chatStore';
import { uploadAvatar } from '../services/api/uploadAvatar';
import { toast } from './common/Toast';
import { LinkService } from '../services/linkService';
import { Message } from '../types/index';

// 在文件顶部导入样式文件
import '../styles/UserFunction.css';

const { TextArea } = Input;
// 移除未使用的 Text 导入
const { Title, Paragraph } = Typography;

// 定义 EmojiData 接口
interface EmojiData {
  emoji: string;
}

// 定义 LinkInfo 接口
interface LinkInfo {
  valid: boolean;
  message?: string;
  link?: {
    id: string;
    code: string;
    expiresAt: string;
  };
  agent?: {
    id: string;
    nickname: string;
    avatar?: string;
  };
}

// 扩展 Message 接口以支持系统消息
interface ExtendedMessage extends Omit<Message, 'type' | 'sender'> {
  type: 'text' | 'image' | 'audio' | 'file' | 'zip' | 'exe' | 'system' | 'video' | 'location';
  sender: 'user' | 'agent' | 'customer' | 'system' | 'bot';
}

interface UserFunctionProps {
  className?: string;
}

const UserFunction: React.FC<UserFunctionProps> = () => {
  const { 
    userSettings, 
    updateUserSettings,
    messages,
    sendMessage,
    currentAgent,
    addMessage
  } = useChatStore();
  
 // 本地状态
 const [inputMessage, setInputMessage] = useState('');
 const [showEmojiPicker, setShowEmojiPicker] = useState(false);
 const [showSettingsDrawer, setShowSettingsDrawer] = useState(false);
 const [showAgentInfoDrawer, setShowAgentInfoDrawer] = useState(false);
 const [tempNickname, setTempNickname] = useState(userSettings?.nickname ?? '');
 const [isLoading, setIsLoading] = useState(false);
 const [linkInfo, setLinkInfo] = useState<LinkInfo | null>(null);
 const [hasShownLinkInfo, setHasShownLinkInfo] = useState(false);
 
 const fileInputRef = useRef<HTMLInputElement>(null);
 const audioInputRef = useRef<HTMLInputElement>(null);
 const messageEndRef = useRef<HTMLDivElement>(null);
 const chatWindowRef = useRef<HTMLDivElement>(null);
  // 自动滚动到底部
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // 获取链接信息的逻辑
  useEffect(() => {
    // 获取链接信息
    const fetchLinkInfo = async () => {
      try {
        // 从URL中获取链接代码
        const urlParams = new URLSearchParams(window.location.search);
        const linkCode = urlParams.get('code');
        
        if (linkCode) {
          const info = await LinkService.verifyLink(linkCode);
          setLinkInfo(info);
          
          // 如果是通过分享链接访问，显示欢迎消息
          if (info && info.agent && messages.length === 0) {
            // 添加一条系统消息，表明这是通过分享链接访问的
            const systemMessage: ExtendedMessage = {
              id: nanoid(),
              content: `您正在通过分享链接与客服 ${info.agent.nickname} 聊天`,
              type: 'system',
              sender: 'system',
              timestamp: new Date().toISOString()
            };
            
            // 将消息添加到聊天记录中
            addMessage(systemMessage as Message);
          }
        }
      } catch (error) {
        console.error('获取链接信息失败', error);
        toast.error('无效的分享链接');
      }
    };
    
    fetchLinkInfo();
  }, [messages.length, addMessage]);
    
  // 处理消息发送
  const handleSendMessage = () => {
    if (inputMessage.trim()) {
      sendMessage({
        id: nanoid(),
        content: inputMessage,
        type: 'text',
        sender: 'user',
        recipientId: currentAgent?.id
      });
      setInputMessage('');
    }
  };
  
  // 按回车键发送
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  // 点击表情
  const handleEmojiClick = (emojiData: EmojiData) => {
    setInputMessage(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };
  
  // 上传图片
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      
      // 文件类型验证
      if (!file.type.startsWith('image/')) {
        toast.error('请选择图片文件');
        return;
      }
      
      // 文件大小限制 (5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('图片大小不能超过5MB');
        return;
      }
      
      const reader = new FileReader();
      
      reader.onload = () => {
        sendMessage({
          id: nanoid(),
          content: reader.result as string,
          type: 'image',
          fileName: file.name,
          fileSize: file.size,
          sender: 'user',
          recipientId: currentAgent?.id
        });
      };
      
      reader.readAsDataURL(file);
    }
    
    // 重置input value，允许重复选择相同文件
    e.target.value = '';
  };
  
  // 上传语音
  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      
      // 文件类型验证
      if (!file.type.startsWith('audio/')) {
        toast.error('请选择音频文件');
        return;
      }
      
      // 文件大小限制 (10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('音频大小不能超过10MB');
        return;
      }
      
      const reader = new FileReader();
      
      reader.onload = () => {
        sendMessage({
          id: nanoid(),
          content: reader.result as string,
          type: 'audio',
          fileName: file.name,
          fileSize: file.size,
          sender: 'user',
          recipientId: currentAgent?.id
        });
      };
      
      reader.readAsDataURL(file);
    }
    
    // 重置input value，允许重复选择相同文件
    e.target.value = '';
  };
  
  // 更新头像
  const handleAvatarUpload = async (file: File) => {
    try {
      setIsLoading(true);
      const avatarUrl = await uploadAvatar(file);
      updateUserSettings({ avatar: avatarUrl });
      toast.success("头像更新成功！");
      return false; // 阻止默认上传行为
    } catch (error) {
      toast.error("头像上传失败");
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  
  // 保存用户设置
  const saveUserSettings = async () => {
    setIsLoading(true);
    try {
      await updateUserSettings({ nickname: tempNickname });
      setShowSettingsDrawer(false);
      toast.success("设置已更新！");
    } catch (error) {
      toast.error("更新设置失败");
    } finally {
      setIsLoading(false);
    }
  };
  
  // 格式化消息时间
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };
  
  // 渲染消息气泡
  const renderMessageContent = (message: Message) => {
    switch (message.type) {
      case 'text':
        return <div className="message-text">{message.content}</div>;
        
      case 'image':
        return (
          <div className="message-image">
            <img src={message.content} alt="图片消息" />
            <div className="file-name">{message.fileName}</div>
          </div>
        );
        
      case 'audio':
        return (
          <div className="message-audio">
            <audio controls src={message.content}>
              <track kind="captions" src="" label="中文字幕" />
            </audio>
            <div className="file-name">{message.fileName}</div>
          </div>
        );
        
      default:
        return <div className="message-text">{message.content}</div>;
    }
  };
  
  if (isLoading) {
    return (
      <div className="loading-container">
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }
  
  return (
    <div className="user-chat-container">
      {/* 添加分享链接提示 */}
      {linkInfo && linkInfo.agent && !hasShownLinkInfo && (
        <Alert
          message="通过分享链接访问"
          description={`您正在与客服 ${linkInfo.agent.nickname} 通过专属链接聊天`}
          type="info"
          showIcon
          closable
          className="share-link-alert"
          afterClose={() => setHasShownLinkInfo(true)}
          action={
            <Button size="small" type="link" onClick={() => setShowAgentInfoDrawer(true)}>
              查看详情
            </Button>
          }
        />
      )}
      {/* 头部区域 */}
      <div className="user-chat-header">
        <div className="user-profile">
          <Avatar 
            src={currentAgent?.avatar ?? undefined}
            icon={!currentAgent?.avatar ? <UserOutlined /> : undefined}
            size={40}
            className="user-profile-avatar"
            onClick={() => setShowAgentInfoDrawer(true)}
          />
          <div>
            <div className="agent-name">{currentAgent?.nickname ?? '客服'}</div>
            <div className="agent-hint">点击头像查看客服信息</div>
          </div>
        </div>
        
        <div className="header-actions">
          <Tooltip title="个人设置">
            <Button 
              icon={<SettingOutlined />} 
              shape="circle"
              onClick={() => setShowSettingsDrawer(true)}
              aria-label="打开个人设置"
            />
          </Tooltip>
          <Tooltip title="关闭聊天">
            <Button 
              icon={<CloseOutlined />} 
              shape="circle"
              onClick={() => window.close()}
              aria-label="关闭聊天窗口"
            />
          </Tooltip>
        </div>
      </div>
      
      {/* 聊天窗口 */}
      <div className="chat-window" ref={chatWindowRef}>
        {messages.length > 0 ? (
          <>
            {messages.map(msg => (
              <div 
                key={msg.id} 
                className={`message-item ${msg.sender === 'user' ? 'message-item-user' : 'message-item-agent'}`}
              >
                <Avatar
                  src={msg.sender === 'user' 
                    ? userSettings?.avatar 
                    : currentAgent?.avatar
                  }
                  icon={msg.sender === 'user' 
                    ? (!userSettings?.avatar ? <UserOutlined /> : undefined)
                    : (!currentAgent?.avatar ? <UserOutlined /> : undefined)
                  }
                  size={40}
                  className={`message-avatar ${msg.sender === 'user' ? 'message-avatar-user' : 'message-avatar-agent'}`}
                />
                <div className="message-content">
                  <div className={`message-sender ${msg.sender === 'user' ? 'message-sender-user' : 'message-sender-agent'}`}>
                    {msg.sender === 'user' 
                      ? userSettings?.nickname ?? '我' 
                      : currentAgent?.nickname ?? '客服'
                    }
                  </div>
                  <div className={`message-bubble ${msg.sender === 'user' ? 'message-bubble-user' : 'message-bubble-agent'}`}>
                    {renderMessageContent(msg)}
                  </div>
                  <div className={`message-time ${msg.sender === 'user' ? 'message-time-user' : 'message-time-agent'}`}>
                    {formatTime(msg.timestamp)}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messageEndRef} />
          </>
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="暂无消息，开始聊天吧！"
            className="empty-message"
          />
        )}
      </div>
      
      {/* 输入区域 */}
      <div className="input-area">
        <div className="input-toolbar">
          <Space>
            <Button 
              icon={<SmileOutlined />} 
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              aria-label="选择表情"
              title="选择表情"
            />
            <Button 
              icon={<PictureOutlined />} 
              onClick={() => fileInputRef.current?.click()}
              aria-label="上传图片"
              title="上传图片"
            />
            <Button 
              icon={<AudioOutlined />} 
              onClick={() => audioInputRef.current?.click()}
              aria-label="上传音频"
              title="上传音频"
            />
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden-file-input"
              onChange={handleImageUpload} 
              accept="image/*"
              aria-label="上传图片"
              title="选择要上传的图片"
            />
            <input 
              type="file" 
              ref={audioInputRef} 
              className="hidden-file-input"
              onChange={handleAudioUpload} 
              accept="audio/*"
              aria-label="上传音频"
              title="选择要上传的音频"
            />
          </Space>
        </div>
        
        {showEmojiPicker && (
          <div className="emoji-picker-wrapper">
            <Picker onEmojiClick={handleEmojiClick} />
          </div>
        )}
        
        <div className="input-container">
          <TextArea
            value={inputMessage}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="请输入消息..."
            rows={3}
            className="input-textarea"
            aria-label="消息输入框"
          />
          <Button 
            type="primary" 
            icon={<SendOutlined />} 
            onClick={handleSendMessage}
            className="send-button"
            aria-label="发送消息"
          >
            发送
          </Button>
        </div>
      </div>
      
      {/* 设置抽屉 */}
      <Drawer
        title="个人设置"
        placement="right"
        onClose={() => setShowSettingsDrawer(false)}
        open={showSettingsDrawer}
        width={300}
        extra={
          <Button type="primary" onClick={saveUserSettings}>
            保存
          </Button>
        }
      >
        <div className="settings-avatar-container">
          <Upload
            beforeUpload={handleAvatarUpload}
            showUploadList={false}
          >
            <div className="avatar-wrapper">
              <Avatar
                src={userSettings?.avatar ?? undefined}
                icon={!userSettings?.avatar ? <UserOutlined /> : undefined}
                size={100}
              />
              <div className="avatar-upload-icon">
                <PlusOutlined />
              </div>
            </div>
          </Upload>
          <div className="avatar-hint">点击更换头像</div>
        </div>
        
        <div className="settings-section">
          <div className="settings-label">昵称</div>
          <Input
            value={tempNickname}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTempNickname(e.target.value)}
            placeholder="请输入昵称"
            suffix={<InfoCircleOutlined className="input-icon" />}
            aria-label="昵称输入框"
          />
          <div className="settings-hint">
            昵称将显示在聊天消息中
          </div>
        </div>
        
        <div className="settings-section">
          <div className="settings-label">ID信息</div>
          <Input
            value={userSettings?.id?.slice(0, 10) + '...'}
            readOnly
            disabled
            aria-label="用户ID"
          />
          <div className="settings-hint">
            这是您的唯一ID,用于识别您的会话
          </div>
        </div>
      </Drawer>
      {/* 客服信息抽屉 */}
      <Drawer
        title="客服信息"
        placement="right"
        onClose={() => setShowAgentInfoDrawer(false)}
        open={showAgentInfoDrawer}
        width={300}
      >
        <div className="agent-info-container">
          <Avatar
            src={currentAgent?.avatar ?? undefined}
            icon={!currentAgent?.avatar ? <UserOutlined /> : undefined}
            size={100}
          />
          <div className="agent-info-name">
            {currentAgent?.nickname ?? '客服'}
          </div>
          {linkInfo && linkInfo.link && (
            <div className="link-info">
              <Tag color="blue">通过分享链接访问</Tag>
              <div className="link-expiry">
                链接有效期至: {new Date(linkInfo.link.expiresAt).toLocaleString()}
              </div>
            </div>
          )}
        </div>
        
        <Paragraph>
          欢迎使用在线客服系统。您可以通过这个页面随时与客服沟通，询问问题或获取帮助。
        </Paragraph>
        
        <Paragraph>
          <ul>
            <li>您可以发送文字、表情、图片和语音</li>
            <li>您的聊天记录会被保存，下次访问可继续查看</li>
            <li>您可以在设置中修改您的昵称和头像</li>
          </ul>
        </Paragraph>
        
        <div className="tips-section">
          <Title level={5}>温馨提示</Title>
          <Paragraph>
            为了更好地为您提供服务，请尽可能详细地描述您的问题，以便客服能够更快地为您解答。
          </Paragraph>
        </div>
      </Drawer>
    </div>
  );
};

export default UserFunction;