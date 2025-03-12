// 修改导入，添加我们定义的类型和常量
import { LinkService, LinkUser, LinkData } from '../services/linkService';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import Picker from 'emoji-picker-react';
// 使用我们定义的生成ID函数替代nanoid
import { 
  COMPONENT_CLASS_PREFIX, 
  NANOID_PREFIX, 
  generatePrefixedId,
  Message, 
  Customer,
  getTodayPresetKey,
  isValidTodayKey,
  UploadResult,
  KeyVerificationResult,
  LinkVerificationResult
} from '../types/index';
import Upload, { RcFile } from 'antd/lib/upload';
import { QRCode } from 'react-qrcode-logo';
import { toast } from '../components/common/Toast';
import { uploadAvatar } from '../services/api/uploadAvatar';
import { useAuthStore } from '../stores/authStore';
import { useChatStore } from '../stores/chatStore';
import '../styles/AgentFunction.css';
import { type UserOutlined, type FileOutlined, type AudioOutlined, CloseOutlined, WarningOutlined, type PlusOutlined, DeleteOutlined, SettingOutlined, QrcodeOutlined, LinkOutlined, LogoutOutlined, InfoCircleOutlined, MessageOutlined, SmileOutlined, PictureOutlined, SendOutlined, BarChartOutlined, TeamOutlined, StopOutlined, LoadingOutlined, type CopyOutlined } from '@ant-design/icons';
import { type Tabs, type Select, type Input, type Modal, type List, type Avatar, type Empty, type Badge, type Button, type Divider, type Space, type Card, type Tag, type Tooltip, type Drawer, Switch, Spin } from 'antd';
import { nanoid } from 'nanoid';
import type { useState, useRef, useEffect } from 'react';
import type { Form } from 'react-router-dom';

// 定义 EmojiData 接口
interface EmojiData {
  emoji: string;
}

const { TabPane } = Tabs;
const { Option } = Select;
const { TextArea } = Input;

const AgentFunction: React.FC = () => {
  // 从store获取状态和方法
  const {
    customers,
    selectedCustomer,
    setSelectedCustomer,
    messages,
    sendMessage,
    blacklistCustomer,
    removeFromBlacklist,
    quickReplies,
    addQuickReply,
    deleteQuickReply,
    welcomeMessages,
    updateWelcomeMessages,
    blacklist,
    fetchBlacklistedUsers,
    fetchQuickReplies,
    fetchWelcomeMessages
  } = useChatStore();
  
  // 修改 shareLinks 的类型定义
  const [shareLinks, setShareLinks] = useState<LinkData[]>([]);
  const [isLoadingLinks, setIsLoadingLinks] = useState(false);
  const [showShareLinksDrawer, setShowShareLinksDrawer] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const { agentData, logout } = useAuthStore();
  
  // 本地状态
  const [inputMessage, setInputMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showSettingsDrawer, setShowSettingsDrawer] = useState(false);
  const [showAgentProfileModal, setShowAgentProfileModal] = useState(false);
  const [showRightPanel, setShowRightPanel] = useState<'user_info' | 'quick_reply' | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [tempNickname, setTempNickname] = useState(agentData?.nickname || '');
  const [tempStatus, setTempStatus] = useState(agentData?.status || 'online');
  const [shareLink, setShareLink] = useState('');
  const [currentLinkId, setCurrentLinkId] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [newQuickReply, setNewQuickReply] = useState({ title: '', content: '' });
  const [newWelcomeMessages, setNewWelcomeMessages] = useState<string[]>(
    Array.isArray(welcomeMessages) ? welcomeMessages : []
  );
  const [activeSettingsTab, setActiveSettingsTab] = useState('1');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [licenseKey, setLicenseKey] = useState<string>('XXXX-XXXX-XXXX-XXXX');
  const [licenseExpiry, setLicenseExpiry] = useState<Date | null>(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
  const [remainingDays, setRemainingDays] = useState<number>(30);
  const [newLicenseKey, setNewLicenseKey] = useState('');
  
  // 引用
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);
  const exeInputRef = useRef<HTMLInputElement>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);
  const chatWindowRef = useRef<HTMLDivElement>(null);
  
  // 扩展 Customer 类型，添加 unreadCount、ipAddress 和 device 属性
  interface ExtendedCustomer extends Omit<Customer, 'ipAddress' | 'device'> {
    unreadCount?: number;
    ipAddress?: string;
    device?: string;
  }
  
  // 扩展 Message 类型，添加 customerId 和修改 sender 类型
  interface ExtendedMessage extends Omit<Message, 'timestamp'> {
    customerId?: string;
    timestamp?: string | Date;
    read?: boolean;
  }
  
  // 副作用
  useEffect(() => {
    fetchBlacklistedUsers();
    fetchQuickReplies();
    fetchWelcomeMessages();
  }, [fetchBlacklistedUsers, fetchQuickReplies, fetchWelcomeMessages]);
  
  useEffect(() => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  // 在 useEffect 中添加获取分享链接的逻辑
  useEffect(() => {
    // 获取客服的分享链接
    const fetchShareLinks = async () => {
      try {
        setIsLoadingLinks(true);
        const links = await LinkService.getLinks();
        setShareLinks(links);
      } catch (error) {
        console.error('获取分享链接失败', error);
      } finally {
        setIsLoadingLinks(false);
      }
    };

    if (agentData?.id) {
      fetchShareLinks();
    }
  }, [agentData?.id]);
  
  // 添加获取卡密信息的副作用
  useEffect(() => {
    // 获取卡密信息
    const fetchLicenseInfo = async () => {
      try {
        // 这里应该调用实际的API获取卡密信息
        // 模拟数据
        setLicenseKey('XXXX-XXXX-XXXX-XXXX');
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + 30); // 30天后过期
        setLicenseExpiry(expiry);
        
        // 计算剩余天数
        if (expiry) {
          const today = new Date();
          const diffTime = expiry.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          setRemainingDays(diffDays);
        }
      } catch (error) {
        console.error('获取卡密信息失败', error);
      }
    };

    fetchLicenseInfo();
  }, []);
  const handleUpdateLicense = async () => {
    if (!newLicenseKey.trim()) {
      toast.error('请输入有效的卡密');
      return;
    }
    
    try {
      setIsLoading(true);
      // 这里应该调用更新卡密的API
      // const response = await KeyService.updateKey(newLicenseKey);
      
      // 模拟成功响应
      setTimeout(() => {
        setLicenseKey(newLicenseKey);
        const newExpiry = new Date();
        newExpiry.setDate(newExpiry.getDate() + 365); // 假设新卡密有效期为1年
        setLicenseExpiry(newExpiry);
        
        // 计算新的剩余天数
        const today = new Date();
        const diffTime = newExpiry.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        setRemainingDays(diffDays);
        
        setNewLicenseKey('');
        toast.success('卡密更新成功');
        setShowSettingsDrawer(false);
      }, 1000);
    } catch (error) {
      console.error('更新卡密失败', error);
      toast.error('更新卡密失败');
    } finally {
      setIsLoading(false);
    }
  };

  
  // 处理发送消息 - 修复 timestamp 问题
  const handleSendMessage = () => {
    if (inputMessage.trim() && selectedCustomer) {
      sendMessage({
        id: nanoid(),
        content: inputMessage,
        type: 'text', // 添加必要的类型
        sender: 'agent',
        recipientId: selectedCustomer.id,
        // timestamp 会在 sendMessage 内部添加
      });
      setInputMessage('');
      setShowEmojiPicker(false);
    }
  };
  
  // 处理按键按下
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  // 处理添加表情
  const handleEmojiClick = (emojiData: EmojiData) => {
    setInputMessage(prev => prev + emojiData.emoji);
  };
  
  // 处理快速回复点击
  const handleQuickReplyClick = (content: string) => {
    setInputMessage(content);
    setShowRightPanel(null);
  };
  
  // 处理添加新快速回复
  const handleAddQuickReply = () => {
    if (newQuickReply.title && newQuickReply.content) {
      addQuickReply(newQuickReply.title, newQuickReply.content);
      setNewQuickReply({ title: '', content: '' });
      toast.success('快速回复已添加');
    } else {
      toast.error('请填写标题和内容');
    }
  };
  
  // 处理删除快速回复
  const handleDeleteQuickReply = (id: string) => {
    deleteQuickReply(id);
    toast.success('快速回复已删除');
  };
  
  // 处理欢迎语更新 - 修复参数类型问题
  const handleWelcomeMessageUpdate = () => {
    // 直接使用 newWelcomeMessages，它已经是字符串数组类型
    updateWelcomeMessages(newWelcomeMessages);
    toast.success('欢迎语已更新');
    setShowSettingsDrawer(false);
  };
  
  // 处理拉黑用户
  const handleBlacklistUser = () => {
    if (selectedCustomer) {
      blacklistCustomer(selectedCustomer.id);
      toast.success(`用户 ${selectedCustomer.nickname} 已被拉黑`);
    }
  };
  
  // 处理解除拉黑
  const handleRemoveFromBlacklist = (id: string) => {
    removeFromBlacklist(id);
    toast.success('用户已从黑名单移除');
  };
  
  // 处理上传头像 - 修复 response.success 问题
  const handleAvatarUpload = async (file: RcFile) => {
    setIsLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setAvatarPreview(e.target.result as string);
        }
      };
      reader.readAsDataURL(file);
      
      const response = await uploadAvatar(file);
      if (response && typeof response === 'object' && 'success' in response) {
        toast.success('头像上传成功');
      } else {
        toast.error('头像上传失败');
      }
    } catch (error) {
      toast.error('头像上传出错');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
    return false;
  };
  
  // 修改 handleGenerateShareLink 方法
  const handleGenerateShareLink = async () => {
    try {
      setIsLoading(true);
      // 使用客服ID创建链接
      const link = await LinkService.createLink(agentData?.id || '', 7); // 7天有效期
      setShareLink(window.location.origin + '/chat/' + link.code);
      setCurrentLinkId(link.id);
      
      // 生成二维码
      try {
        const qrCode = await LinkService.generateQRCode(link.id);
        setQrCodeUrl(qrCode);
      } catch (err) {
        console.error('生成二维码失败', err);
        // 如果二维码生成失败，不影响链接生成
      }
      
      // 刷新链接列表
      const links = await LinkService.getLinks();
      setShareLinks(links);
      
      setShowShareModal(true);
      toast.share('分享链接已生成');
    } catch (error) {
      console.error('生成链接失败', error);
      toast.error('生成链接失败');
    } finally {
      setIsLoading(false);
    }
  };
  
  // 处理复制链接
  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink);
    toast.success('链接已复制到剪贴板');
  };
  
  // 添加禁用链接的方法
  const handleDeactivateLink = async (linkId: string) => {
    try {
      setIsLoading(true);
      await LinkService.deactivateLink(linkId);
      
      // 更新链接列表
      const links = await LinkService.getLinks();
      setShareLinks(links);
      
      toast.success('链接已禁用');
    } catch (error) {
      console.error('禁用链接失败', error);
      toast.error('禁用链接失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 添加查看链接访问统计的方法
  const handleViewLinkStats = async (linkId: string) => {
    try {
      setIsLoading(true);
      const stats = await LinkService.getLinkStats(linkId);
      
      Modal.info({
        title: '链接访问统计',
        content: (
          <div>
            <p>总访问次数: {stats.totalVisits}</p>
            <p>独立访客数: {stats.uniqueUsers}</p>
            <p>最后访问时间: {new Date(stats.lastAccessed).toLocaleString()}</p>
          </div>
        ),
      });
    } catch (error) {
      console.error('获取链接统计失败', error);
      toast.error('获取链接统计失败');
    } finally {
      setIsLoading(false);
    }
  };

   // 添加查看链接访问用户的方法
   const handleViewLinkUsers = async (linkId: string) => {
    try {
      setIsLoading(true);
      const users = await LinkService.getLinkUsers(linkId);
      
      Modal.info({
        title: '链接访问用户',
        width: 600,
        content: (
          <List
            dataSource={users}
            renderItem={(user: LinkUser) => (
              <List.Item>
                <List.Item.Meta
                  avatar={<Avatar src={user.avatar} icon={<UserOutlined />} />}
                  title={user.nickname}
                  description={`首次访问: ${new Date(user.firstVisit).toLocaleString()}`}
                />
                <div>最后访问: {new Date(user.lastSeen).toLocaleString()}</div>
              </List.Item>
            )}
            locale={{
              emptyText: <Empty description="暂无访问用户" />
            }}
          />
        ),
      });
    } catch (error) {
      console.error('获取链接用户失败', error);
      toast.error('获取链接用户失败');
    } finally {
      setIsLoading(false);
    }
  };
  
  // 渲染聊天列表项 - 修复 online 改为 isOnline
  const renderCustomerItem = (customer: ExtendedCustomer) => {
    // 使用 ExtendedMessage 类型
    const lastMessage = (messages as ExtendedMessage[])
      .filter(msg => msg.customerId === customer.id)
      .sort((a, b) => {
        // 使用可选链操作符来安全访问timestamp属性
        const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return timeB - timeA;
      })[0];
    
    // 计算未读消息数量
    const unreadCount = (messages as ExtendedMessage[])
      .filter(msg => 
        msg.customerId === customer.id && 
        msg.sender === 'customer' && 
        !msg.read
      ).length;
      
    return (
      <List.Item
        className={`customer-item ${selectedCustomer?.id === customer.id ? 'selected' : ''}`}
        onClick={() => setSelectedCustomer(customer as Customer)}
      >
        <Badge count={unreadCount} size="small">
          <Avatar 
            src={customer.avatar} 
            icon={<UserOutlined />}
            className={customer.isOnline ? 'online' : ''}
          />
        </Badge>
        <div className="customer-info">
          <div className="customer-name">
            {customer.nickname}
            {customer.isOnline && <Badge status="success" className="online-badge" />}
          </div>
          {lastMessage && (
            <div className="last-message">
              {lastMessage.type === 'text' ? lastMessage.content : '[媒体消息]'}
            </div>
          )}
        </div>
        {lastMessage && lastMessage.timestamp && (
          <div className="message-time">
            {formatDistanceToNow(new Date(lastMessage.timestamp), { 
              addSuffix: true,
              locale: zhCN
            })}
          </div>
        )}
      </List.Item>
    );
  };
  
  // 渲染消息
  const renderMessage = (message: ExtendedMessage) => {
    const isAgent = message.sender === 'agent';
    
    return (
      <div 
        key={message.id} 
        className={`message-item ${isAgent ? 'agent-message' : 'customer-message'}`}
      >
        {!isAgent && (
          <Avatar 
            src={selectedCustomer?.avatar} 
            icon={<UserOutlined />}
            className="message-avatar"
          />
        )}
        
        <div className="message-content">
          {message.type === 'text' && (
            <div className="text-message">{message.content}</div>
          )}
          
          {message.type === 'image' && (
            <div className="image-message">
              <img src={message.content} alt="图片消息" />
            </div>
          )}
          
          {message.type === 'file' && (
            <div className="file-message">
              <FileOutlined /> {message.content}
            </div>
          )}
          
          {message.type === 'audio' && (
            <div className="audio-message">
              <AudioOutlined /> [语音消息]
            </div>
          )}
          
          {message.timestamp && (
            <div className="message-time">
              {new Date(message.timestamp).toLocaleTimeString()}
            </div>
          )}
        </div>
        
        {isAgent && (
          <Avatar 
            src={agentData?.avatar} 
            icon={<UserOutlined />}
            className="message-avatar"
          />
        )}
      </div>
    );
  };
  
  // 渲染右侧面板

const renderRightPanel = () => {
  if (!showRightPanel) return null;
  
    return (
      <div className="right-panel">
        <div className="panel-header">
          <h3>
            {showRightPanel === 'user_info' ? '用户信息' : '快速回复'}
          </h3>
          <Button 
            type="text" 
            icon={<CloseOutlined />} 
            onClick={() => setShowRightPanel(null)}
            aria-label="关闭面板"
          />
        </div>
        
        {showRightPanel === 'user_info' && selectedCustomer && (
          <div className="user-info-content">
            <div className="user-profile">
              <Avatar 
                size={64} 
                src={selectedCustomer.avatar} 
                icon={<UserOutlined />}
              />
              <div className="user-details">
                <h4>{selectedCustomer.nickname}</h4>
                <p>ID: {selectedCustomer.id}</p>
                <p>状态: {selectedCustomer.isOnline ? '在线' : '离线'}</p>
                <p>IP地址: {(selectedCustomer as ExtendedCustomer).ipAddress || '未知'}</p>
                <p>设备: {(selectedCustomer as ExtendedCustomer).device || '未知'}</p>
                <p>首次访问: {new Date(selectedCustomer.firstVisit).toLocaleString()}</p>
                <p>最后访问: {new Date(selectedCustomer.lastSeen).toLocaleString()}</p>
              </div>
            </div>
            
            <Divider />
            
            <div className="user-actions">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Button 
                  type="primary" 
                  danger 
                  icon={<WarningOutlined />} 
                  onClick={handleBlacklistUser}
                >
                  拉黑用户
                </Button>
              </Space>
            </div>
          </div>
        )}
        
        {/* 快速回复面板部分保持不变 */}
        {showRightPanel === 'quick_reply' && (
          <div className="quick-reply-content">
            <div className="add-quick-reply">
              <Form layout="vertical">
                <Form.Item label="标题">
                  <Input 
                    value={newQuickReply.title} 
                    onChange={e => setNewQuickReply({...newQuickReply, title: e.target.value})}
                    placeholder="输入快速回复标题"
                  />
                </Form.Item>
                <Form.Item label="内容">
                  <TextArea 
                    rows={4} 
                    value={newQuickReply.content} 
                    onChange={e => setNewQuickReply({...newQuickReply, content: e.target.value})}
                    placeholder="输入快速回复内容"
                  />
                </Form.Item>
                <Form.Item>
                  <Button 
                    type="primary" 
                    icon={<PlusOutlined />} 
                    onClick={handleAddQuickReply}
                  >
                    添加
                  </Button>
                </Form.Item>
              </Form>
            </div>
            
            <Divider />
            
            <List
              className="quick-reply-list"
              dataSource={quickReplies}
              renderItem={item => (
                <List.Item className="quick-reply-item">
                  <Card 
                    title={item.title}
                    extra={
                      <Button 
                        type="text" 
                        danger 
                        icon={<DeleteOutlined />} 
                        onClick={() => handleDeleteQuickReply(item.id)}
                        aria-label="删除快速回复"
                      />
                    }
                    hoverable
                    onClick={() => handleQuickReplyClick(item.content)}
                  >
                    <div className="quick-reply-preview">
                      {item.content.length > 50 
                        ? item.content.substring(0, 50) + '...' 
                        : item.content}
                    </div>
                  </Card>
                </List.Item>
              )}
              locale={{
                emptyText: <Empty description="暂无快速回复" />
              }}
            />
          </div>
        )}
      </div>
    );
  };
  
  return (
    <div className="agent-function-container">
      <div className="sidebar">
        <div className="agent-profile">
          <Badge status={tempStatus === 'online' ? 'success' : 'default'}>
            <Avatar 
              size={40} 
              src={agentData?.avatar} 
              icon={<UserOutlined />}
              className="agent-avatar"
              onClick={() => setShowAgentProfileModal(true)}
            />
          </Badge>
          <div className="agent-info">
            <span className="agent-name">{agentData?.nickname || '客服'}</span>
            <Tag color={tempStatus === 'online' ? 'green' : 'default'}>
              {tempStatus === 'online' ? '在线' : '离线'}
            </Tag>
          </div>
        </div>
        {/* 添加卡密信息显示 */}
        <div className="license-info">
          <div className="license-key">卡密: {licenseKey}</div>
          <div className="license-expiry">
            剩余时间: {remainingDays}天
            {remainingDays <= 7 && <Tag color="red" style={{ marginLeft: 8 }}>即将到期</Tag>}
          </div>
        </div>
        
        <div className="action-buttons">
          <Tooltip title="设置">
            <Button 
              type="text" 
              icon={<SettingOutlined />} 
              onClick={() => setShowSettingsDrawer(true)}
              aria-label="设置"
            />
          </Tooltip>
          <Tooltip title="生成链接">
            <Button 
              type="text" 
              icon={<QrcodeOutlined />} 
              onClick={handleGenerateShareLink}
              aria-label="生成链接"
            />
          </Tooltip>
          <Tooltip title="查看分享链接">
            <Button 
              type="text" 
              icon={<LinkOutlined />} 
              onClick={() => setShowShareLinksDrawer(true)}
              aria-label="查看分享链接"
            />
          </Tooltip>
          <Tooltip title="退出登录">
            <Button 
              type="text" 
              icon={<LogoutOutlined />} 
              onClick={logout}
              aria-label="退出登录"
            />
          </Tooltip>
        </div>
        
        <Divider className="sidebar-divider" />
        
        <div className="customer-search">
          <Input
            placeholder="搜索用户" 
            prefix={<UserOutlined />}
            allowClear
          />
        </div>
        
        <List
          className="customer-list"
          dataSource={customers as ExtendedCustomer[]}
          renderItem={renderCustomerItem}
          locale={{
            emptyText: <Empty description="暂无客户" />
          }}
        />
      </div>
      
      <div className="chat-container">
        {selectedCustomer ? (
          <>
            <div className="chat-header">
              <div className="user-info">
                {/* 修复：online 改为 isOnline */}
                <Badge status={selectedCustomer.isOnline ? 'success' : 'default'}>
                  <Avatar src={selectedCustomer.avatar} icon={<UserOutlined />} />
                </Badge>
                <span className="username">{selectedCustomer.nickname}</span>
              </div>
              
              <div className="header-actions">
                <Tooltip title="用户信息">
                  <Button 
                    type="text" 
                    icon={<InfoCircleOutlined />} 
                    onClick={() => setShowRightPanel(showRightPanel === 'user_info' ? null : 'user_info')}
                    aria-label="查看用户信息"
                  />
                </Tooltip>
                <Tooltip title="快速回复">
                  <Button 
                    type="text" 
                    icon={<MessageOutlined />} 
                    onClick={() => setShowRightPanel(showRightPanel === 'quick_reply' ? null : 'quick_reply')}
                    aria-label="快速回复"
                  />
                </Tooltip>
              </div>
            </div>
            
            <div className="chat-messages" ref={chatWindowRef}>
              {(messages as ExtendedMessage[])
                .filter(msg => msg.customerId === selectedCustomer.id)
                .map(renderMessage)}
              <div ref={messageEndRef} />
            </div>
            
            <div className="chat-input">
              <div className="input-actions">
                <Tooltip title="表情">
                  <Button 
                    type="text" 
                    icon={<SmileOutlined />} 
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    aria-label="插入表情"
                  />
                </Tooltip>
                <Tooltip title="图片">
                  <Button 
                    type="text" 
                    icon={<PictureOutlined />} 
                    onClick={() => fileInputRef.current?.click()}
                    aria-label="上传图片"
                  />
                </Tooltip>
                <Tooltip title="文件">
                  <Button 
                    type="text" 
                    icon={<FileOutlined />} 
                    onClick={() => zipInputRef.current?.click()}
                    aria-label="上传文件"
                  />
                </Tooltip>
                <Tooltip title="录音">
                  <Button 
                    type="text" 
                    icon={<AudioOutlined />} 
                    onClick={() => audioInputRef.current?.click()}
                    aria-label="上传音频"
                  />
                </Tooltip>
                
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden-input"
                  accept="image/*"
                  aria-label="上传图片"
                />
                <input
                  type="file"
                  ref={audioInputRef}
                  className="hidden-input"
                  accept="audio/*"
                  aria-label="上传音频"
                />
                <input
                  type="file"
                  ref={zipInputRef}
                  className="hidden-input"
                  accept=".zip,.rar,.7z,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                  aria-label="上传文件"
                />
                <input
                  type="file"
                  ref={exeInputRef}
                  className="hidden-input"
                  accept=".exe,.dmg,.apk"
                  aria-label="上传可执行文件"
                />
              </div>
              
              {showEmojiPicker && (
                <div className="emoji-picker-container">
                  <Picker onEmojiClick={handleEmojiClick} />
                </div>
              )}
              
              <TextArea
                value={inputMessage}
                onChange={e => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="输入消息..."
                autoSize={{ minRows: 1, maxRows: 4 }}
                aria-label="消息输入框"
              />
              
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={handleSendMessage}
                disabled={!inputMessage.trim()}
                className="send-button"
                aria-label="发送消息"
              >
                发送
              </Button>
            </div>
          </>
        ) : (
          <div className="empty-chat">
            <Empty description="请选择一个客户开始聊天" />
          </div>
        )}
        
        {renderRightPanel()}
      </div>
      
      {/* 设置抽屉 */}
      <Drawer
        title="设置"
        placement="right"
        width={400}
        onClose={() => setShowSettingsDrawer(false)}
        open={showSettingsDrawer}
      >
        <Tabs activeKey={activeSettingsTab} onChange={setActiveSettingsTab}>
          <TabPane tab="个人设置" key="1">
            <Form layout="vertical">
              <Form.Item label="客服昵称">
                <Input 
                  value={tempNickname} 
                  onChange={e => setTempNickname(e.target.value)}
                  placeholder="输入昵称"
                />
              </Form.Item>
              <Form.Item label="状态">
                <Select value={tempStatus} onChange={setTempStatus}>
                  <Option value="online">在线</Option>
                  <Option value="busy">忙碌</Option>
                  <Option value="offline">离线</Option>
                </Select>
              </Form.Item>
              <Form.Item label="声音提醒">
                <Switch checked={soundEnabled} onChange={setSoundEnabled} />
              </Form.Item>
              <Form.Item>
                <Button type="primary">保存设置</Button>
              </Form.Item>
            </Form>
          </TabPane>

          <TabPane tab="欢迎语设置" key="2">
            <Form layout="vertical">
              <Form.Item label="欢迎语">
                <TextArea
                  rows={4}
                  // 修复：使用数组的第一个元素作为文本框的值
                  value={newWelcomeMessages[0] || ''}
                  // 修复：更新数组的第一个元素
                  onChange={e => setNewWelcomeMessages([e.target.value])}
                  placeholder="输入欢迎语"
                />
              </Form.Item>
              <Form.Item>
                <Button 
                  type="primary" 
                  onClick={handleWelcomeMessageUpdate}
                >
                  保存欢迎语
                </Button>
              </Form.Item>
            </Form>
          </TabPane>
          
          <TabPane tab="黑名单" key="3">
            <List
              dataSource={blacklist}
              renderItem={item => (
                <List.Item
                  actions={[
                    <Button 
                      type="link" 
                      onClick={() => handleRemoveFromBlacklist(item.id)}
                    >
                      解除拉黑
                    </Button>
                  ]}
                >
                  <List.Item.Meta
                    avatar={<Avatar src={item.avatar} icon={<UserOutlined />} />}
                    title={item.nickname}
                    description={`ID: ${item.id}`}
                  />
                </List.Item>
              )}
              locale={{
                emptyText: <Empty description="黑名单为空" />
              }}
            />
          </TabPane>
          <TabPane tab="卡密管理" key="4">
            <Form layout="vertical">
              <Form.Item label="当前卡密">
                <Input value={licenseKey} disabled />
              </Form.Item>
              <Form.Item label="有效期至">
                <Input 
                  value={licenseExpiry ? licenseExpiry.toLocaleDateString() : '未知'} 
                  disabled 
                />
              </Form.Item>
              <Form.Item label="新卡密">
                <Input.Password 
                  placeholder="输入新卡密" 
                  value={newLicenseKey}
                  onChange={e => setNewLicenseKey(e.target.value)}
                />
              </Form.Item>
              <Form.Item>
                <Button 
                  type="primary" 
                  onClick={handleUpdateLicense}
                  loading={isLoading}
                >
                  更新卡密
                </Button>
              </Form.Item>
            </Form>
          </TabPane>
        </Tabs>
      </Drawer>
      
      <Drawer
        title="我的分享链接"
        placement="right"
        width={600}
        onClose={() => setShowShareLinksDrawer(false)}
        open={showShareLinksDrawer}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleGenerateShareLink}>
            新建链接
          </Button>
        }
      >
        {isLoadingLinks ? (
          <div className="loading-container">
            <Spin />
          </div>
        ) : (
          <List
            dataSource={shareLinks}
            renderItem={link => (
              <List.Item
                actions={[
                  <Tooltip title="查看统计" key="stats">
                    <Button 
                      type="text" 
                      icon={<BarChartOutlined />} 
                      onClick={() => handleViewLinkStats(link.id)}
                    />
                  </Tooltip>,
                  <Tooltip title="查看用户" key="users">
                    <Button 
                      type="text" 
                      icon={<TeamOutlined />} 
                      onClick={() => handleViewLinkUsers(link.id)}
                    />
                  </Tooltip>,
                  <Tooltip title={link.isActive ? "禁用链接" : "链接已禁用"} key="deactivate">
                    <Button 
                      type="text" 
                      icon={<StopOutlined />} 
                      onClick={() => handleDeactivateLink(link.id)}
                      disabled={!link.isActive}
                      danger={link.isActive}
                    />
                  </Tooltip>,
                ]}
              >
                <List.Item.Meta
                  title={
                    <div className="link-title">
                      <span>{window.location.origin}/chat/{link.code}</span>
                      {!link.isActive && <Tag color="red">已禁用</Tag>}
                    </div>
                  }
                  description={
                    <div className="link-description">
                      <div>创建时间: {new Date(link.createdAt).toLocaleString()}</div>
                      <div>过期时间: {new Date(link.expiresAt).toLocaleString()}</div>
                      <div>访问次数: {link.accessCount || 0}</div>
                    </div>
                  }
                />
              </List.Item>
            )}
            locale={{
              emptyText: (
                <Empty 
                  description="暂无分享链接" 
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              )
            }}
          />
        )}
      </Drawer>
      
      {/* 个人资料模态框 */}
      <Modal
       title="个人资料"
       open={showAgentProfileModal}
       onCancel={() => setShowAgentProfileModal(false)}
       footer={[
        <Button key="cancel" onClick={() => setShowAgentProfileModal(false)}>
         取消
        </Button>,
        <Button key="save" type="primary">
         保存
        </Button>
       ]}
      >
        <Form layout="vertical">
          <Form.Item label="头像" className="upload-avatar-container">
            <Upload
              name="avatar"
              listType="picture-circle"
              className="avatar-uploader"
              showUploadList={false}
              beforeUpload={handleAvatarUpload}
            >
              {avatarPreview ? (
                <img src={avatarPreview} alt="头像" className="avatar-preview" />
              ) : (
                <div>
                  {isLoading ? <LoadingOutlined /> : <PlusOutlined />}
                  <div className="ant-upload-text">上传</div>
                </div>
              )}
            </Upload>
          </Form.Item>
          
          <Form.Item label="昵称">
            <Input
              value={tempNickname}
              onChange={e => setTempNickname(e.target.value)}
              placeholder="输入昵称"
            />
          </Form.Item>
          
          <Form.Item label="状态">
            <Select value={tempStatus} onChange={setTempStatus}>
              <Option value="online">在线</Option>
              <Option value="offline">离线</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
      
      <Modal
        title="分享链接"
        open={showShareModal}
        onCancel={() => setShowShareModal(false)}
        footer={null}
      >
        <div className="share-modal-content">
          <div className="share-link">
            <Input 
              value={shareLink} 
              readOnly 
              addonAfter={<CopyOutlined onClick={handleCopyLink} />}
            />
            <Button 
              type="primary" 
              icon={<CopyOutlined />} 
              onClick={handleCopyLink}
              className="copy-button"
            >
              复制链接
            </Button>
          </div>
          
          {qrCodeUrl && (
            <div className="qr-code">
              <QRCode value={shareLink} size={200} />
            </div>
          )}
          
          <div className="share-tips">
            <p>将此链接分享给用户，他们可以通过此链接与您联系。</p>
            <p>链接ID: {currentLinkId}</p>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AgentFunction;