// src/pages/AdminPage.tsx
import {
  CopyOutlined,
  DashboardOutlined,
  ExclamationCircleOutlined,
  KeyOutlined,
  LogoutOutlined,
  MessageOutlined,
  PlusOutlined,
  ReloadOutlined,
  TeamOutlined,
  UserOutlined
} from '@ant-design/icons';
import {
  Button,
  Card,
  Col,
  Divider,
  Form,
  Input,
  InputNumber,
  Layout,
  Menu,
  Modal,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Tooltip,
  Typography
} from 'antd';
import { nanoid } from 'nanoid';
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from '../components/common/Toast';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../stores/authStore';
import '../styles/admin.css';

const { Header, Sider, Content } = Layout;
const { Option } = Select;
const { Title, Text } = Typography;

// 定义类型
interface Agent {
  id: string;
  nickname: string;
  avatar?: string;
  status: 'online' | 'away' | 'busy';
  key?: string;
  expiryTime?: string;
}

interface AgentKey {
  id: string;
  key: string;
  agentId: string;
  agentName: string;
  isActive: boolean;
  createdAt: string;
  expiresAt: string;
  remainingDays: number;
}

interface Stats {
  totalCustomers: number;
  activeCustomers: number;
  totalMessages: number;
  messagesLast24h: number;
  onlineAgents: number;
  totalKeys: number;
  keysGeneratedThisMonth: number;
  totalOnlineUsers: number;
}

const AdminPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, userType, logout } = useAuthStore();
  
  // 本地状态
  const [activeMenu, setActiveMenu] = useState<string>('dashboard');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [keys, setKeys] = useState<AgentKey[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalCustomers: 0,
    activeCustomers: 0,
    totalMessages: 0,
    messagesLast24h: 0,
    onlineAgents: 0,
    totalKeys: 0,
    keysGeneratedThisMonth: 0,
    totalOnlineUsers: 0
  });
  
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [keyExpiryDays, setKeyExpiryDays] = useState(30);
  const [newAgentForm] = Form.useForm();
  const [loading, setLoading] = useState({
    stats: false,
    agents: false,
    keys: false
  });
  
  // 认证检查
  useEffect(() => {
    if (!isAuthenticated || userType !== 'admin') {
      navigate('/login');
    }
  }, [isAuthenticated, userType, navigate]);
  
  // 加载客服数据
  const loadAgentsData = useCallback(async (setLoadingState = true) => {
    if (setLoadingState) {
      setLoading(prev => ({ ...prev, agents: true }));
    }
    
    try {
      // 从数据库获取客服列表
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      // 获取每个客服的最新密钥
      const agentsWithKeys = await Promise.all(
        data.map(async (agent) => {
          const { data: keyData, error: keyError } = await supabase
            .from('agent_keys')
            .select('*')
            .eq('agent_id', agent.id)
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(1);
            
          if (keyError) {
            console.warn('获取密钥失败:', keyError);
            return {
              id: agent.id,
              nickname: agent.nickname,
              avatar: agent.avatar,
              status: agent.status,
              key: null,
              expiryTime: null
            };
          }
          
          return {
            id: agent.id,
            nickname: agent.nickname,
            avatar: agent.avatar,
            status: agent.status,
            key: keyData && keyData.length > 0 ? keyData[0].key : null,
            expiryTime: keyData && keyData.length > 0 ? keyData[0].expires_at : null
          };
        })
      );
      
      setAgents(agentsWithKeys);
    } catch (error) {
      console.error('加载客服数据失败:', error);
      toast.error('加载客服数据失败');
    } finally {
      if (setLoadingState) {
        setLoading(prev => ({ ...prev, agents: false }));
      }
    }
  }, []);
  
  // 加载密钥数据
  const loadKeysData = useCallback(async (setLoadingState = true) => {
    if (setLoadingState) {
      setLoading(prev => ({ ...prev, keys: true }));
    }
    
    try {
      // 从数据库获取所有密钥
      const { data, error } = await supabase
        .from('agent_keys')
        .select(`
          *,
          agents (
            nickname
          )
        `)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      // 计算每个密钥的剩余天数
      const processedKeys = data.map(key => {
        const expiresAt = new Date(key.expires_at);
        const now = new Date();
        const diffTime = expiresAt.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return {
          id: key.id,
          key: key.key,
          agentId: key.agent_id,
          agentName: key.agents?.nickname || '未知客服',
          isActive: key.is_active,
          createdAt: key.created_at,
          expiresAt: key.expires_at,
          remainingDays: diffDays > 0 ? diffDays : 0
        };
      });
      
      setKeys(processedKeys);
  } catch (error) {
    console.error('加载密钥数据失败:', error);
    toast.error('加载密钥数据失败');
  } finally {
    if (setLoadingState) {
      setLoading(prev => ({ ...prev, keys: false }));
    }
  }
}, []);
  // 加载统计数据
  const fetchStats = useCallback(async () => {
    setLoading(prev => ({ ...prev, stats: true }));
    
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
      
      // 获取当前在线总人数（客服 + 用户）
      const fiveMinutesAgo = new Date();
      fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);
      
      const { count: onlineUsers } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .gte('last_seen', fiveMinutesAgo.toISOString());
      
      const totalOnlineUsers = (onlineAgents || 0) + (onlineUsers || 0);
      
      // 获取本月生成的密钥数量
      const firstDayOfMonth = new Date();
      firstDayOfMonth.setDate(1);
      firstDayOfMonth.setHours(0, 0, 0, 0);
      
      const { count: keysGeneratedThisMonth } = await supabase
        .from('agent_keys')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', firstDayOfMonth.toISOString());
      
      setStats({
        totalCustomers: totalCustomers || 0,
        activeCustomers: activeCustomers || 0,
        totalMessages: totalMessages || 0,
        messagesLast24h: messagesLast24h || 0,
        onlineAgents: onlineAgents || 0,
        totalKeys: totalKeys || 0,
        totalOnlineUsers: totalOnlineUsers,
        keysGeneratedThisMonth: keysGeneratedThisMonth || 0
      });
    } catch (error) {
      console.error('获取统计数据失败:', error);
      toast.error('获取统计数据失败');
    } finally {
      setLoading(prev => ({ ...prev, stats: false }));
    }
  }, []);
  
  // 加载仪表盘数据
  const loadDashboardData = useCallback(async () => {
    setLoading({ stats: true, agents: true, keys: true });
    
    try {
      await fetchStats();
      await loadAgentsData(false);
      await loadKeysData(false);
    } finally {
      setLoading({ stats: false, agents: false, keys: false });
    }
  }, [fetchStats, loadAgentsData, loadKeysData]);
  
  // 初始加载数据
  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);
  
  // 根据选中菜单加载数据
  useEffect(() => {
    if (activeMenu === 'dashboard') {
      loadDashboardData();
    } else if (activeMenu === 'agents') {
      loadAgentsData();
    } else if (activeMenu === 'keys') {
      loadKeysData();
    }
  }, [activeMenu, loadDashboardData, loadAgentsData, loadKeysData]);
  
  // 创建新客服
  const handleCreateAgent = async (values: { nickname: string }) => {
    setLoading(prev => ({ ...prev, agents: true }));
    try {
      // 创建客服记录
      const newAgentId = nanoid();
      
      // 添加到agents表
      const { error: agentError } = await supabase
      .from('agents')
      .insert({
        id: newAgentId,
        nickname: values.nickname,
        status: 'online',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
    if (agentError) throw agentError;
      
      // 生成初始密钥
      await generateNewKey(newAgentId, 30);
    
    toast.success('客服创建成功');
    newAgentForm.resetFields();
    setShowAgentModal(false);
    await loadAgentsData();
  } catch (error) {
    console.error('创建客服失败:', error);
    toast.error('创建客服失败');
  } finally {
    setLoading(prev => ({ ...prev, agents: false }));
  }
};
  
  // 生成新密钥
  const generateNewKey = async (agentId: string, expiryDays: number) => {
    try {
      // 生成新密钥
      const newKey = nanoid(16);
      
      // 计算过期时间
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiryDays);
      
      // 停用该客服的所有现有密钥
      await supabase
        .from('agent_keys')
        .update({ is_active: false })
        .eq('agent_id', agentId)
        .eq('is_active', true);
      
      // 创建新密钥记录
      const { error } = await supabase
        .from('agent_keys')
        .insert({
          id: nanoid(),
          key: newKey,
          agent_id: agentId,
          is_active: true,
          created_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString()
        });
        
      if (error) throw error;
      
      toast.success('密钥生成成功');
      return newKey;
    } catch (error) {
      console.error('生成密钥失败:', error);
      toast.error('生成密钥失败');
      throw error;
    }
  };
  
  // 生成密钥按钮事件
  const handleGenerateKey = async () => {
    if (!selectedAgent) {
      toast.error('请选择客服');
      return;
    }
    
    try {
      await generateNewKey(selectedAgent, keyExpiryDays);
      setShowKeyModal(false);
      await loadKeysData();
      await loadAgentsData();
    } catch (error) {
      console.error('生成密钥失败:', error);
    }
  };
  
  // 停用密钥
  const handleDeactivateKey = async (keyId: string) => {
    try {
      const { error } = await supabase
        .from('agent_keys')
        .update({ is_active: false })
        .eq('id', keyId);
        
      if (error) throw error;
      
      toast.success('密钥已停用');
      await loadKeysData();
    } catch (error) {
      console.error('停用密钥失败:', error);
      toast.error('操作失败');
    }
  };
  
    // 删除客服
    const handleDeleteAgent = async (agentId: string) => {
      Modal.confirm({
        title: '确认删除',
        icon: <ExclamationCircleOutlined />,
        content: '删除客服将同时删除其所有密钥和聊天数据，无法恢复。确定继续吗？',
        okText: '确认',
        cancelText: '取消',
        onOk: async () => {
          try {
            // 先删除该客服的所有密钥
            await supabase
              .from('agent_keys')
              .delete()
              .eq('agent_id', agentId);
              
            // 然后删除客服记录
            const { error } = await supabase
              .from('agents')
              .delete()
              .eq('id', agentId);
              
            if (error) throw error;
            
            toast.success('客服已删除');
            await loadAgentsData();
            await loadKeysData();
          } catch (error) {
            console.error('删除客服失败:', error);
            toast.error('删除失败');
          }
        }
      });
    };
    
    // 复制到剪贴板
    const copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text);
      toast.success('已复制到剪贴板');
    };
    
    // 客服表格列
    const agentColumns = [
      {
        title: '客服',
        dataIndex: 'nickname',
        key: 'nickname',
        render: (text: string, record: Agent) => (
          <div className="agent-row">
            <img 
              src={record.avatar || '/default-avatar.png'} 
              alt="头像"
              className="agent-avatar"
            />
            <span>{text}</span>
          </div>
        ),
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        render: (status: string) => (
          <Tag color={
            status === 'online' ? 'green' : 
            status === 'away' ? 'orange' : 
            'red'
          }>
            {status === 'online' ? '在线' : 
             status === 'away' ? '离开' : 
             '忙碌'}
          </Tag>
        ),
      },
      {
        title: '当前密钥',
        key: 'key',
        dataIndex: 'key',
        render: (text: string) => (
          <div className="key-container">
            <span className="key-text">{text || '无密钥'}</span>
            {text && (
              <Button 
                type="text" 
                icon={<CopyOutlined />} 
                onClick={() => copyToClipboard(text)}
              />
            )}
          </div>
        ),
      },
      {
        title: '密钥过期时间',
        key: 'expiryTime',
        dataIndex: 'expiryTime',
        render: (text: string) => text 
          ? new Date(text).toLocaleString() 
          : '无密钥',
      },
      {
        title: '操作',
        key: 'action',
        render: (_: unknown, record: Agent) => (
          <Space>
            <Button
              type="primary"
              onClick={() => {
                setSelectedAgent(record.id);
                setShowKeyModal(true);
              }}
            >
              生成新密钥
            </Button>
            <Button
              danger
              onClick={() => handleDeleteAgent(record.id)}
            >
              删除
            </Button>
          </Space>
        ),
      },
    ];
  
    // 密钥表格列
    const keyColumns = [
      {
        title: '密钥',
        dataIndex: 'key',
        key: 'key',
        render: (text: string) => (
          <div className="key-container">
            <span className="key-text">{text}</span>
            <Button 
              type="text" 
              icon={<CopyOutlined />} 
              onClick={() => copyToClipboard(text)}
            />
          </div>
        ),
      },
      {
        title: '客服',
        dataIndex: 'agentName',
        key: 'agentName',
      },
      {
        title: '状态',
        dataIndex: 'isActive',
        key: 'isActive',
        render: (isActive: boolean) => (
          <Tag color={isActive ? 'green' : 'red'}>
            {isActive ? '活跃' : '已失效'}
          </Tag>
        ),
      },
      {
        title: '创建时间',
        dataIndex: 'createdAt',
        key: 'createdAt',
        render: (text: string) => new Date(text).toLocaleString(),
      },
      {
        title: '过期时间',
        dataIndex: 'expiresAt',
        key: 'expiresAt',
        render: (text: string) => new Date(text).toLocaleString(),
      },
      {
        title: '剩余天数',
        dataIndex: 'remainingDays',
        key: 'remainingDays',
        render: (days: number) => (
          <Tag color={
            days > 7 ? 'green' :
            days > 0 ? 'orange' :
            'red'
          }>
            {days > 0 ? `${days}天` : '已过期'}
          </Tag>
        ),
      },
      {
        title: '操作',
        key: 'action',
        render: (_: unknown, record: AgentKey) => (
          record.isActive ? (
            <Button 
              danger 
              onClick={() => handleDeactivateKey(record.id)}
            >
              停用
            </Button>
          ) : (
            <Tag color="red">已停用</Tag>
          )
        ),
      },
    ];
    
    // 仪表盘内容
    const renderDashboard = () => (
      <div className="dashboard-container">
        <Title level={4}>系统状态一览</Title>
        <Row gutter={16} className="stats-row">
          <Col span={8}>
            <Card>
              <Statistic
                title="总用户数"
                value={stats.totalCustomers}
                prefix={<TeamOutlined />}
                loading={loading.stats}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic
                title="24小时活跃用户"
                value={stats.activeCustomers}
                prefix={<UserOutlined />}
                valueStyle={{ color: '#3f8600' }}
                loading={loading.stats}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic
                title="当前在线人数"
                value={stats.totalOnlineUsers}
                prefix={<UserOutlined />}
                valueStyle={{ color: '#1890ff' }}
                loading={loading.stats}
              />
            </Card>
          </Col>
        </Row>
        
        <Row gutter={16} className="stats-row">
          <Col span={6}>
            <Card>
              <Statistic
                title="总消息数"
                value={stats.totalMessages}
                prefix={<MessageOutlined />}
                loading={loading.stats}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="24小时消息数"
                value={stats.messagesLast24h}
                prefix={<MessageOutlined />}
                valueStyle={{ color: '#3f8600' }}
                loading={loading.stats}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="有效密钥数"
                value={stats.totalKeys}
                prefix={<KeyOutlined />}
                valueStyle={{ color: '#1890ff' }}
                loading={loading.stats}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="本月生成密钥"
                value={stats.keysGeneratedThisMonth}
                prefix={<KeyOutlined />}
                valueStyle={{ color: '#722ed1' }}
                loading={loading.stats}
              />
            </Card>
          </Col>
        </Row>
        
        <Divider />
        
        <Title level={4}>近期客服活动</Title>
        <Row gutter={16}>
          <Col span={12}>
            <Card title="最近活跃客服">
              <Table 
                dataSource={agents.slice(0, 5)} 
                loading={loading.agents}
                pagination={false}
                rowKey="id"
                columns={[
                  {
                    title: '客服',
                    dataIndex: 'nickname',
                    render: (text, record) => (
                      <div className="agent-row">
                        <img 
                          src={record.avatar || '/default-avatar.png'} 
                          alt="头像"
                          className="agent-avatar-small"
                        />
                        <span>{text}</span>
                      </div>
                    )
                  },
                  {
                    title: '状态',
                    dataIndex: 'status',
                    render: (status) => (
                      <Tag color={
                        status === 'online' ? 'green' : 
                        status === 'away' ? 'orange' : 
                        'red'
                      }>
                        {status === 'online' ? '在线' : 
                        status === 'away' ? '离开' : 
                        '忙碌'}
                      </Tag>
                    )
                  }
                ]}
              />
            </Card>
          </Col>
          <Col span={12}>
            <Card title="即将过期密钥">
              <Table 
                dataSource={keys.filter(k => k.isActive && k.remainingDays <= 7 && k.remainingDays > 0)} 
                loading={loading.keys}
                pagination={false}
                rowKey="id"
                columns={[
                  {
                    title: '客服',
                    dataIndex: 'agentName',
                  },
                  {
                    title: '密钥',
                    dataIndex: 'key',
                    render: (text) => (
                      <Tooltip title="点击复制">
                        <Button 
                          type="link" 
                          onClick={() => copyToClipboard(text)}
                        >
                          {text.substring(0, 8)}...
                        </Button>
                      </Tooltip>
                    )
                  },
                  {
                    title: '剩余天数',
                    dataIndex: 'remainingDays',
                    render: (days) => (
                      <Tag color="orange">{days}天</Tag>
                    )
                  }
                ]}
              />
            </Card>
          </Col>
        </Row>
        
        <div className="action-row">
          <Button 
            type="primary"
            icon={<ReloadOutlined />}
            onClick={loadDashboardData}
            loading={loading.stats || loading.agents || loading.keys}
          >
            刷新数据
          </Button>
        </div>
      </div>
    );
    
    // 客服管理内容
    const renderAgentsManagement = () => (
      <div className="agents-container">
        <div className="page-header">
          <Title level={4}>客服管理</Title>
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={() => setShowAgentModal(true)}
          >
            添加客服
          </Button>
        </div>
        
        <div className="actions-bar">
          <Space>
            <Text>客服总数: {agents.length}</Text>
            <Button 
              icon={<ReloadOutlined />} 
              onClick={() => loadAgentsData()} 
              loading={loading.agents}
            >
              刷新
            </Button>
          </Space>
        </div>
        
        <Table 
          columns={agentColumns} 
          dataSource={agents} 
          rowKey="id" 
          loading={loading.agents}
          pagination={{ pageSize: 10 }}
        />
        
        {/* 添加客服弹窗 */}
        <Modal
          title="添加客服"
          open={showAgentModal}
          onCancel={() => setShowAgentModal(false)}
          footer={[
            <Button key="cancel" onClick={() => setShowAgentModal(false)}>
              取消
            </Button>,
            <Button 
              key="submit" 
              type="primary" 
              onClick={() => newAgentForm.submit()}
              loading={loading.agents}
            >
              创建
            </Button>
          ]}
        >
          <Form
            form={newAgentForm}
            layout="vertical"
            onFinish={handleCreateAgent}
          >
            <Form.Item
              name="nickname"
              label="昵称"
              rules={[{ required: true, message: '请输入客服昵称' }]}
            >
              <Input placeholder="客服昵称" />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    );
    
    // 密钥管理内容
    const renderKeysManagement = () => (
      <div className="keys-container">
        <div className="page-header">
          <Title level={4}>密钥管理</Title>
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={() => {
              setSelectedAgent('');
              setShowKeyModal(true);
            }}
          >
            生成新密钥
          </Button>
        </div>
        
        <div className="actions-bar">
          <Space>
            <Text>密钥总数: {keys.length}</Text>
            <Text>活跃密钥: {keys.filter(k => k.isActive).length}</Text>
            <Button 
              icon={<ReloadOutlined />} 
              onClick={() => loadKeysData()} 
              loading={loading.keys}
            >
              刷新
            </Button>
          </Space>
        </div>
        
        <Table 
          columns={keyColumns} 
          dataSource={keys} 
          rowKey="id" 
          loading={loading.keys}
          pagination={{ pageSize: 10 }}
        />
        
        {/* 生成密钥弹窗 */}
        <Modal
          title="生成新密钥"
          open={showKeyModal}
          onCancel={() => setShowKeyModal(false)}
          footer={[
            <Button key="cancel" onClick={() => setShowKeyModal(false)}>
              取消
            </Button>,
            <Button 
              key="submit" 
              type="primary" 
              onClick={handleGenerateKey}
            >
              生成
            </Button>
          ]}
        >
          <Form layout="vertical">
            <Form.Item
              label="选择客服"
              required
            >
              <Select
                value={selectedAgent}
              onChange={setSelectedAgent}
              placeholder="选择客服"
              style={{ width: '100%' }}
            >
              {agents.map(agent => (
                <Option key={agent.id} value={agent.id}>
                  {agent.nickname}
                </Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item
            label="有效期(天)"
          >
            <InputNumber
              min={1}
              max={365}
              value={keyExpiryDays}
              onChange={val => setKeyExpiryDays(val || 30)}
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
  
  return (
    <Layout className="admin-layout">
      <Sider width={200} className="admin-sider">
        <div className="logo">
          <Title level={4} style={{ color: '#fff', margin: '16px 0', textAlign: 'center' }}>
            管理后台
          </Title>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[activeMenu]}
          style={{ height: '100%', borderRight: 0 }}
          onClick={e => setActiveMenu(e.key)}
          items={[
            {
              key: 'dashboard',
              icon: <DashboardOutlined />,
              label: '仪表盘'
            },
            {
              key: 'agents',
              icon: <TeamOutlined />,
              label: '客服管理'
            },
            {
              key: 'keys',
              icon: <KeyOutlined />,
              label: '密钥管理'
            }
          ]}
        />
        <div className="sider-footer">
          <Button 
            type="link" 
            icon={<LogoutOutlined />} 
            onClick={logout}
            style={{ color: '#fff' }}
          >
            退出登录
          </Button>
        </div>
      </Sider>
      
      <Layout className="admin-content-layout">
        <Header className="admin-header">
          <div className="header-title">
            {activeMenu === 'dashboard' && '系统仪表盘'}
            {activeMenu === 'agents' && '客服管理'}
            {activeMenu === 'keys' && '密钥管理'}
          </div>
        </Header>
        
        <Content className="admin-content">
          {activeMenu === 'dashboard' && renderDashboard()}
          {activeMenu === 'agents' && renderAgentsManagement()}
          {activeMenu === 'keys' && renderKeysManagement()}
        </Content>
      </Layout>
    </Layout>
  );
};

export default AdminPage;