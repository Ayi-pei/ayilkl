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
  UserOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import {
  Button,
  Card,
  Col,
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
  Typography,
  message,
} from 'antd';
import React, { useCallback, useEffect, useState } from 'react';
import { toast } from '../components/common/Toast';
import { AdminService } from '../services/adminService';
import { KeyService } from '../services/keyService';
import { useAuthStore } from '../stores/authStore';
import '../styles/admin.css';
import { testSupabaseConnection } from '../utils/testSupabase';
import { Agent as AgentModel, AgentKey as AgentKeyModel, Stats as StatsModel } from '../models/databaseModels';

const { Header, Content, Sider } = Layout;
const { Title, Text } = Typography;
const { Option } = Select;
const { confirm } = Modal;

// 定义类型
interface Agent {
  id: string;
  nickname: string;
  avatar?: string;
  status: 'online' | 'away' | 'busy';
  key: string | null;
  expiryTime: string | null;
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
  totalAgents: number;
  totalMessages: number;
  todayMessages: number;  // 添加这个属性
}

// 添加辅助函数处理状态显示
const getStatusTag = (status: string) => {
  if (status === 'online') return { color: 'green', text: '在线' };
  if (status === 'away') return { color: 'orange', text: '离开' };
  return { color: 'red', text: '忙碌' };
};

// 添加辅助函数处理剩余天数显示
const getRemainingDaysTag = (days: number) => {
  if (days > 7) return { color: 'green', text: `${days}天` };
  if (days > 0) return { color: 'orange', text: `${days}天` };
  return { color: 'red', text: '已过期' };
};

// 当使用 Agent 对象时，可为缺失字段赋默认值
// processAgent function removed because it was never used.

// 修改 processAgentKey 参数类型为 AgentKeyModel，并确保 agentId 有默认值
const processAgentKey = (agentKey: AgentKeyModel): AgentKeyModel => ({
  ...agentKey,
  agentId: agentKey.agentId ?? ''  // 默认赋值空字符串，或根据业务需求调整默认值
});

// 示例：当获取所有客服后，对每个客服进行默认处理

const AdminPage: React.FC = () => {
  const { logout } = useAuthStore();
  const [newAgentForm] = Form.useForm();
  
  // 状态
  const [activeMenu, setActiveMenu] = useState<string>('dashboard');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [keys, setKeys] = useState<AgentKey[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalCustomers: 0,
    totalAgents: 0,
    totalMessages: 0,
    todayMessages: 0
  });
  const [loading, setLoading] = useState({
    stats: false,
    agents: false,
    keys: false,
    addingAgent: false
  });
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [keyExpiryDays, setKeyExpiryDays] = useState<number>(30);
  
  // 复制到剪贴板
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        message.success('已复制到剪贴板');
      })
      .catch(() => {
        message.error('复制失败');
      });
  };
  
  // 加载客服数据
  const loadAgentsData = useCallback(async (setLoadingState = true) => {
    if (setLoadingState) {
      setLoading(prev => ({ ...prev, agents: true, addingAgent: false }));
    }
    
    try {
      // 获取所有客服
      const agentsData = await AdminService.getAllAgents();
      
      // 获取每个客服的有效密钥
      const agentsWithKeys = await Promise.all(
        agentsData.map(async (agent: AgentModel) => {
          // 获取客服的密钥数据
          const keyData = await AdminService.getAgentKeys(agent.id);
          const processedKeys = keyData.map(processAgentKey);
          const activeKeys = processedKeys.filter(k => k.isActive);
          
          return {
            id: agent.id,
            nickname: agent.nickname,
            avatar: agent.avatar,
            status: agent.status,
            key: activeKeys.length > 0 ? activeKeys[0].key : null,
            expiryTime: activeKeys.length > 0 ? activeKeys[0].expiresAt : null
          };
        })
      );
      
      setAgents(agentsWithKeys);
    } catch (error) {
      console.error('加载客服数据失败:', error);
      toast.error('加载客服数据失败');
    } finally {
      if (setLoadingState) {
        setLoading(prev => ({ ...prev, agents: false, addingAgent: false }));
      }
    }
  }, []);
  
  // 加载密钥数据
  const loadKeysData = useCallback(async (setLoadingState = true) => {
    if (setLoadingState) {
      setLoading(prev => ({ ...prev, keys: true, addingAgent: false }));
    }
    
    try {
      // 使用KeyService获取所有密钥
      const keysData = await KeyService.getAllKeys();
      setKeys(keysData);
    } catch (error) {
      console.error('加载密钥数据失败:', error);
      toast.error('加载密钥数据失败');
    } finally {
      if (setLoadingState) {
        setLoading(prev => ({ ...prev, keys: false, addingAgent: false }));
      }
    }
  }, []);
  
  // 加载统计数据
  const fetchStats = useCallback(async () => {
    setLoading(prev => ({ ...prev, stats: true, addingAgent: false }));
    
    try {
      const statsData = await AdminService.getSystemStats();
      setStats({
        totalCustomers: statsData.customersCount,
        totalAgents: statsData.agentsCount,
        totalMessages: statsData.messagesCount,
        todayMessages: (statsData as any).todayMessages || 0
      });
    } catch (error) {
      console.error('获取统计数据失败:', error);
      toast.error('获取统计数据失败');
    } finally {
      setLoading(prev => ({ ...prev, stats: false, addingAgent: false }));
    }
  }, []);
  
  // 加载仪表盘数据
  const loadDashboardData = useCallback(async () => {
    setLoading({ stats: true, agents: true, keys: true, addingAgent: false });
    
    try {
      await fetchStats();
      await loadAgentsData(false);
      await loadKeysData(false);
    } finally {
      setLoading({ stats: false, agents: false, keys: false, addingAgent: false });
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
    setLoading(prev => ({ ...prev, addingAgent: true }));
    
    try {
      console.log('开始创建客服...');
      
      // 尝试连接测试
      testSupabaseConnection();
      
      // 创建客服
      const agentId = await AdminService.createAgent(values.nickname);
      console.log('创建客服结果:', agentId);
      
      if (!agentId) {
        message.error('创建客服失败');
        return;
      }
      
      message.success('客服创建成功');
      
      // 生成密钥
      console.log('开始为新客服生成密钥...');
      const newKey = await KeyService.generateAgentKey(agentId, 30);
      console.log('生成密钥结果:', newKey);
      
      if (!newKey) {
        message.warning('客服已创建，但密钥生成失败，请手动生成');
      } else {
        message.success('密钥生成成功');
        // 复制密钥到剪贴板
        await navigator.clipboard.writeText(newKey);
        message.success('密钥已复制到剪贴板');
      }
      
      // 刷新客服列表
      setShowAgentModal(false);
      newAgentForm.resetFields();
      await loadAgentsData();
    } catch (error) {
      console.error('创建客服过程中出错:', error);
      message.error('创建客服过程中出错，请检查控制台日志');
    } finally {
      setLoading(prev => ({ ...prev, addingAgent: false }));
    }
  };
  
  // 删除客服
  const handleDeleteAgent = (agentId: string) => {
    confirm({
      title: '确认删除此客服',
      icon: <ExclamationCircleOutlined />,
      content: '删除后将无法恢复，相关密钥也将被停用',
      okText: '确认',
      okType: 'danger',
      cancelText: '取消',
      async onOk() {
        setLoading(prev => ({ ...prev, agents: true, addingAgent: false }));
        try {
          const success = await AdminService.deleteAgent(agentId);
          
          if (success) {
            toast.success('客服删除成功');
            loadAgentsData();
            loadKeysData();
          } else {
            toast.error('客服删除失败');
          }
        } catch (error) {
          console.error('删除客服失败:', error);
          toast.error('删除客服失败');
        } finally {
          setLoading(prev => ({ ...prev, agents: false, addingAgent: false }));
        }
      }
    });
  };
  
  // 生成新密钥
  const handleGenerateKey = async () => {
    if (!selectedAgent) {
      toast.error('请选择客服');
      return;
    }
    
    setLoading(prev => ({ ...prev, keys: true, addingAgent: false }));
    try {
      const newKey = await AdminService.generateKeyForAgent(selectedAgent, keyExpiryDays);
      
      if (newKey) {
        toast.success('密钥生成成功');
        setShowKeyModal(false);
        await loadAgentsData();
        await loadKeysData();
        
        // 显示新生成的密钥
        Modal.success({
          title: '密钥生成成功',
          content: (
            <div>
              <p>新密钥: </p>
              <div className="key-container">
                <Text copyable>{newKey}</Text>
              </div>
              <p>密钥有效期: {keyExpiryDays} 天</p>
            </div>
          )
        });
      } else {
        toast.error('密钥生成失败');
      }
    } catch (error) {
      console.error('生成密钥失败:', error);
      toast.error('生成密钥失败');
    } finally {
      setLoading(prev => ({ ...prev, keys: false, addingAgent: false }));
    }
  };
  
  // 停用密钥
  const handleDeactivateKey = async (keyId: string) => {
    confirm({
      title: '确认停用密钥',
      icon: <ExclamationCircleOutlined />,
      content: '停用后，该密钥将无法用于登录',
      okText: '确认',
      okType: 'danger',
      cancelText: '取消',
      async onOk() {
        setLoading(prev => ({ ...prev, keys: true, addingAgent: false }));
        try {
          const success = await KeyService.deactivateKey(keyId);
          
          if (success) {
            toast.success('密钥已停用');
            loadKeysData();
            loadAgentsData();
          } else {
            toast.error('停用密钥失败');
          }
        } catch (error) {
          console.error('停用密钥失败:', error);
          toast.error('停用密钥失败');
        } finally {
          setLoading(prev => ({ ...prev, keys: false, addingAgent: false }));
        }
      }
    });
  };
  
  // 客服表格列
  const agentColumns = [
    {
      title: '客服名',
      dataIndex: 'nickname',
      key: 'nickname',
      render: (text: string, record: Agent) => (
        <div className="agent-row">
          <img 
            src={record.avatar ?? '/default-avatar.png'} 
            alt="头像"
            className="agent-avatar-small"
          />
          <span>{text}</span>
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const { color, text } = getStatusTag(status);
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: '当前密钥',
      key: 'key',
      dataIndex: 'key',
      render: (text: string | null) => (
        <div className="key-container">
          <span className="key-text">{text ?? '无密钥'}</span>
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
      render: (text: string | null) => text 
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
      render: (days: number) => {
        const { color, text } = getRemainingDaysTag(days);
        return <Tag color={color}>{text}</Tag>;
      },
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
              title="总客服数"
              value={stats.totalAgents}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#3f8600' }}
              loading={loading.stats}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="在线用户数"
              value={stats.totalCustomers} // 修改为使用总客户数替代
              prefix={<UserOutlined />}
              valueStyle={{ color: '#fa8c16' }}
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
              title="今日消息数"
              value={stats.todayMessages}
              prefix={<MessageOutlined />}
              valueStyle={{ color: '#3f8600' }}
              loading={loading.stats}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="密钥总数"
              value={keys.length} // 修改为使用keys数组长度
              prefix={<KeyOutlined />}
              valueStyle={{ color: '#722ed1' }}
              loading={loading.stats}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="本月生成密钥"
              value={keys.filter(k => {
                const keyDate = new Date(k.createdAt);
                const now = new Date();
                return keyDate.getMonth() === now.getMonth() && 
                       keyDate.getFullYear() === now.getFullYear();
              }).length} // 修改为计算当月生成的密钥数量
              prefix={<CalendarOutlined />}
              valueStyle={{ color: '#eb2f96' }}
              loading={loading.stats}
            />
          </Card>
        </Col>
      </Row>
      
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
                        src={record.avatar ?? '/default-avatar.png'} 
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
                  render: (status) => {
                    const { color, text } = getStatusTag(status);
                    return <Tag color={color}>{text}</Tag>;
                  }
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
                  render: (days) => {
                    const { color, text } = getRemainingDaysTag(days);
                    return <Tag color={color}>{text}</Tag>;
                  }
                }
              ]}
            />
          </Card>
        </Col>
      </Row>
      
      <div className="action-row">
        <Space>
          <Button 
            type="primary"
            icon={<ReloadOutlined />}
            onClick={loadDashboardData}
            loading={loading.stats || loading.agents || loading.keys}
          >
            刷新数据
          </Button>
          <Button 
            type="default"
            onClick={() => {
              testSupabaseConnection();
              message.info('正在控制台输出Supabase连接测试结果，请查看浏览器控制台');
            }}
          >
            测试Supabase连接
          </Button>
        </Space>
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
            loading={loading.addingAgent}
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
            setSelectedAgent(agents.length > 0 ? agents[0].id : '');
            setShowKeyModal(true);
          }}
        >
          生成新密钥
        </Button>
      </div>
      
      <div className="actions-bar">
        <Space>
          <Text>密钥总数: {keys.length}</Text>
          <Text>有效密钥: {keys.filter(k => k.isActive).length}</Text>
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
            loading={loading.keys}
          >
            生成密钥
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
              onChange={val => setKeyExpiryDays(val ?? 30)}
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

// 示例：调用 getAllAgents，因类型提示问题，可临时使用类型断言
(AdminService as any).getAllAgents().then((agents: AgentModel[]) => {
  agents.forEach((agent: AgentModel) => {
    console.log(agent);
  });
});

// 示例：调用 getAgentKeys
(AdminService as any).getAgentKeys('some-agent-id').then((keys: AgentKeyModel[]) => {
  keys.forEach((key: AgentKeyModel) => {
    console.log(key);
  });
});

// 示例：调用 getSystemStats
(AdminService as any).getSystemStats().then((stats: StatsModel) => {
  console.log('统计数据:', stats);
});

// 示例：调用 createAgent，返回 string | null
(AdminService as any).createAgent('测试昵称').then((agentId: string | null) => {
  console.log('创建的客服ID:', agentId);
});

// 示例：调用 deleteAgent
(AdminService as any).deleteAgent('some-agent-id').then((success: boolean) => {
  console.log('删除结果:', success);
});

// 示例：调用 generateKeyForAgent
(AdminService as any).generateKeyForAgent('some-agent-id').then((key: string | null) => {
  console.log('生成的密钥:', key);
});

// 针对回调中隐式 any 的参数添加类型注解示例

export default AdminPage;