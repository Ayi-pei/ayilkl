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
  ReloadOutlined, // Added ReloadOutlined
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
  Alert, // Added Alert
  Spin, // Added Spin
} from 'antd';
import React, { useCallback, useEffect, useState } from 'react';
// Ensure AntD specific type imports are present
import { ColumnsType, TablePaginationConfig } from 'antd/es/table'; 

// Imports for the new admin functionality
import { 
    getAdminAgents, AdminAgentListItem, PaginatedAgentsResponse, GetAgentsParams, 
    AdminKeyBasicInfo, getAvailableKeysForAssignment,
    createAdminAgent, CreateAdminAgentPayload // Add these
} from '../services/adminApiService';

import { toast } from '../components/common/Toast';
import { AdminService } from '../services/adminService';
import { KeyService } from '../services/keyService';
import { useAuthStore } from '../stores/authStore';
import '../styles/admin.css';
import { testSupabaseConnection } from '../utils/testSupabase';
import { Agent as AgentModel, AgentKey as AgentKeyModel, Stats as StatsModel } from '../models/databaseModels';
import { StreamChat } from 'stream-chat';
import { Chat, Channel, MessageList, MessageInput } from 'stream-chat-react';

const { Header, Content, Sider } = Layout; // Sider might not be used with new layout
const { Title, Text, Paragraph } = Typography; // Added Paragraph
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

const STREAM_API_KEY = import.meta.env.VITE_STREAM_CHAT_API_KEY; // This might be from old code, review if needed

const AdminPage: React.FC = () => {
    // State variables as requested by the subtask
    const [agentsResponse, setAgentsResponse] = useState<PaginatedAgentsResponse | null>(null);
    const [loading, setLoading] = useState<boolean>(true); // Ensured this is the boolean version
    const [error, setError] = useState<string | null>(null);
    
    const [tableParams, setTableParams] = useState<GetAgentsParams>({
        page: 1,
        limit: 10,
    });

    const { userType, isAuthenticated, logout } = useAuthStore(); // Kept logout as it's used in old code
    
    // New state variables for Add Agent Modal
    const [isAddAgentModalVisible, setIsAddAgentModalVisible] = useState<boolean>(false);
    const [availableKeys, setAvailableKeys] = useState<AdminKeyBasicInfo[]>([]);
    const [loadingKeys, setLoadingKeys] = useState<boolean>(false);
    const [addAgentForm] = Form.useForm();
    const [isSubmittingAgent, setIsSubmittingAgent] = useState<boolean>(false);
    
    // Remaining state variables from the old code structure, to be reviewed later for relevance
    const [newAgentForm] = Form.useForm(); // This is duplicated by addAgentForm, consider removing. For now, keeping both as per file content.
    const [activeMenu, setActiveMenu] = useState<string>('dashboard'); 
    const [agents, setAgents] = useState<Agent[]>([]); 
    const [keys, setKeys] = useState<AgentKey[]>([]); 
    const [stats, setStats] = useState<Stats>({ 
        totalCustomers: 0,
        totalAgents: 0,
        totalMessages: 0,
        todayMessages: 0
    });
    // The object-based setLoading was removed by the previous diff, this is correct.
    const [showAgentModal, setShowAgentModal] = useState(false); 
    const [showKeyModal, setShowKeyModal] = useState(false);
    const [selectedAgent, setSelectedAgent] = useState<string>('');
    const [keyExpiryDays, setKeyExpiryDays] = useState<number>(30);
    const [chatClient, setChatClient] = useState<StreamChat | null>(null);
  
    const fetchAgents = useCallback(async (params: GetAgentsParams) => {
        setLoading(true);
        setError(null);
        try {
            const response = await getAdminAgents(params);
            setAgentsResponse(response);
        } catch (err: any) => {
            setError(err.message || 'Failed to fetch agents.');
            message.error(err.message || 'Failed to fetch agents.');
            setAgentsResponse(null);
        } finally {
            setLoading(false);
        }
    }, []); // useCallback dependencies are empty if getAdminAgents doesn't rely on component scope variables that change

    const showAddAgentModal = async () => {
        setLoadingKeys(true);
        addAgentForm.resetFields(); // Reset form before opening
        try {
            const keys = await getAvailableKeysForAssignment();
            setAvailableKeys(keys);
            setIsAddAgentModalVisible(true);
        } catch (err: any) {
            message.error(err.message || "Failed to fetch available keys for assignment.");
            setAvailableKeys([]); // Clear keys on error
        } finally {
            setLoadingKeys(false);
        }
    };

    const handleAddAgentCancel = () => {
        setIsAddAgentModalVisible(false);
        // addAgentForm.resetFields(); // Already done in showAddAgentModal or via Modal's destroyOnClose
    };

    const handleAddAgentOk = async () => {
        try {
            const values = await addAgentForm.validateFields();
            setIsSubmittingAgent(true);
            
            const payload: CreateAdminAgentPayload = {
                nickname: values.nickname || undefined, // Send undefined if empty, not an empty string unless API handles it
                generated_key_id: values.generated_key_id,
            };

            await createAdminAgent(payload);
            
            message.success(`Agent '${payload.nickname || "Unnamed"}' created successfully!`);
            setIsAddAgentModalVisible(false);
            // addAgentForm.resetFields(); // destroyOnClose on Modal handles this
            fetchAgents(tableParams); // Refresh the main agent list
        } catch (error: any) {
            // If error is from form validation (info object), it's handled by Form.
            // This catch is primarily for API errors from createAdminAgent.
            if (error.message) { // Check if error is an Error object with a message
                 message.error(`Failed to create agent: ${error.message}`);
            } else {
                // For form validation errors that might not have a .message
                console.log('Form validation failed or other error:', error);
                message.error('Failed to create agent. Please check form values or try again.');
            }
        } finally {
            setIsSubmittingAgent(false);
        }
    };

    useEffect(() => {
        if (isAuthenticated && userType === 'admin') {
            fetchAgents(tableParams);
        } else if (isAuthenticated && userType !== 'admin') {
            // If user is authenticated but not admin, show error message.
            // The main auth check below will prevent rendering the admin content.
            setError("Access Denied: You do not have admin privileges.");
            setLoading(false);
            setAgentsResponse(null);
        } else if (!isAuthenticated) {
            // User is not authenticated, might be redirected by a ProtectedRoute or show login.
            // For now, just ensure loading stops and no data is shown.
            setLoading(false);
            setAgentsResponse(null);
        }
    }, [fetchAgents, tableParams, isAuthenticated, userType]);

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

  useEffect(() => {
    const initAdminChat = async () => {
      try {
        const client = StreamChat.getInstance(STREAM_API_KEY);
        const { token } = await fetchAdminToken();

        await client.connectUser(
          {
            id: 'admin',
            name: 'System Admin',
            role: 'admin'
          },
          token
        );

        setChatClient(client);
      } catch (err) {
        console.error('Admin chat initialization failed:', err);
      }
    };

    initAdminChat();
    return () => {
      if (chatClient) {
        chatClient.disconnectUser();
      }
    };
  }, []);

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

  const client = StreamChat.getInstance('你的API密钥');

  // 客服用户登录
  client.connectUser({
    id: 'admin-id',
    name: '客服',
    image: '客服头像URL'
  }, '客服令牌');

  // 监听所有客户频道
  const channel = client.channel('messaging', 'customer-service');

    if (!isAuthenticated || userType !== 'admin') {
        // If there's an error message (e.g. from the useEffect above), display it.
        // Otherwise, show a generic access denied message.
        const description = error || "You do not have permission to view this page. Please log in as an administrator.";
        return (
            <Layout style={{ minHeight: '100vh', padding: '50px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                {loading ? <Spin size="large" /> : <Alert message="Access Denied" description={description} type="error" showIcon />}
            </Layout>
        );
    }

    // This is the main return statement for the AdminPage component
    return (
        <Layout style={{ minHeight: '100vh' }}>
            {/* Sidebar could be added here if needed for more admin sections */}
            <Layout style={{ padding: '0 16px 16px' }}> {/* Main content layout area */}
                <Content style={{ 
                    background: '#fff', 
                    padding: 20, 
                    margin: '16px 0', 
                    borderRadius: '8px', 
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)' 
                }}>
                    <Title level={4} style={{ marginBottom: 20, borderBottom: '1px solid #f0f0f0', paddingBottom: 10 }}>
                        Agent Management Console
                    </Title>
                    
                    <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
                        <Col xs={24} sm={24} md={10} lg={7} xl={6}>
                            <Search
                                placeholder="Search by nickname..."
                                onSearch={(value) => {
                                    setTableParams(prev => ({ ...prev, page: 1, search: value.trim() || undefined }));
                                }}
                                enterButton
                                allowClear
                                // value={tableParams.search} // Controlled component if needed, but defaultValue might be enough
                                defaultValue={tableParams.search} 
                            />
                        </Col>
                        <Col xs={24} sm={12} md={7} lg={5} xl={4}>
                            <Select
                                placeholder="Filter by account status"
                                onChange={(value?: 'enabled' | 'disabled') => {
                                    setTableParams(prev => ({ ...prev, page: 1, account_status: value }));
                                }}
                                style={{ width: '100%' }}
                                allowClear
                                value={tableParams.account_status}
                            >
                                <Option value="enabled">Enabled</Option>
                                <Option value="disabled">Disabled</Option>
                            </Select>
                        </Col>
                        <Col xs={24} sm={12} md={7} lg={5} xl={4}>
                                <Button 
                                    icon={<ReloadOutlined />} 
                                    onClick={() => {
                                        setError(null); 
                                        fetchAgents(tableParams);
                                    }} 
                                    loading={loading} 
                                    block
                                >
                                Refresh Data
                            </Button>
                        </Col>
                        <Col xs={24} sm={12} md={7} lg={5} xl={4}> {/* Adjust column spans as needed */}
                            <Button 
                                type="primary" 
                                onClick={showAddAgentModal} 
                                block
                                loading={loadingKeys} 
                            >
                                Add New Agent
                            </Button>
                        </Col>
                    </Row>

                    {error && !loading && (
                        <Alert 
                            message="Error Fetching Agents" 
                            description={error} 
                            type="error" 
                            showIcon 
                            closable 
                            style={{ marginBottom: 16 }} 
                            onClose={() => setError(null)} // Allow dismissing error
                        />
                    )}
                    
                    <Table<AdminAgentListItem>
                        columns={[
                            { title: 'ID', dataIndex: 'id', key: 'id', width: 180, ellipsis: true, fixed: 'left', sorter: (a, b) => a.id.localeCompare(b.id) },
                            { title: 'Nickname', dataIndex: 'nickname', key: 'nickname', width: 150, sorter: (a,b) => (a.nickname || "").localeCompare(b.nickname || "") },
                            { 
                                title: 'Account Status', 
                                dataIndex: 'account_status', 
                                key: 'account_status',
                                width: 150,
                                render: (status: 'enabled' | 'disabled') => (
                                    <Tag color={status === 'enabled' ? 'green' : 'red'}>{status.toUpperCase()}</Tag>
                                ),
                                // Server-side filtering is preferred for larger datasets.
                                // Client-side example (can be removed if server-side is fully used via tableParams):
                                // filters: [ {text: 'Enabled', value: 'enabled'}, {text: 'Disabled', value: 'disabled'}],
                                // onFilter: (value, record) => record.account_status === value,
                            },
                            { 
                                title: 'Online Status', 
                                dataIndex: 'online_status', 
                                key: 'online_status', 
                                width: 130,
                                render: (status: 'online' | 'offline' | 'away' | undefined) => {
                                    let color = 'default';
                                    if (status === 'online') color = 'blue';
                                    else if (status === 'away') color = 'orange';
                                    return <Tag color={color}>{status?.toUpperCase() || 'N/A'}</Tag>;
                                }
                            },
                            { title: 'Created At', dataIndex: 'created_at', key: 'created_at', width: 180, render: (date: string) => new Date(date).toLocaleString(), sorter: (a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime() },
                            { title: 'Assigned Key', dataIndex: 'assigned_key_value_masked', key: 'assigned_key_value_masked', width: 150 },
                            { title: 'Key Expires At', dataIndex: 'key_expires_at', key: 'key_expires_at', width: 180, render: (date: string | null) => date ? new Date(date).toLocaleString() : 'N/A', sorter: (a,b) => new Date(a.key_expires_at || 0).getTime() - new Date(b.key_expires_at || 0).getTime() },
                            // { 
                            //     title: 'Actions', 
                            //     key: 'actions',
                            //     fixed: 'right',
                            //     width: 180,
                            //     render: (_, record) => (
                            //         <Space size="small">
                            //             <Button type="link" size="small" onClick={() => console.log('Edit Agent', record.id)}>Edit</Button>
                            //             <Button type="link" size="small" onClick={() => console.log('Assign Key', record.id)}>Assign Key</Button>
                            //             <Button type="link" danger size="small" onClick={() => console.log('Delete Agent', record.id)}>Delete</Button>
                            //         </Space>
                            //     ),
                            // },
                        ]}
                        dataSource={agentsResponse?.data || []}
                        rowKey="id"
                        pagination={{
                            current: tableParams.page,
                            pageSize: tableParams.limit,
                            total: agentsResponse?.pagination?.total || 0,
                            showSizeChanger: true,
                            pageSizeOptions: ['10', '20', '50', '100'],
                            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} agents`,
                            position: ["bottomRight"],
                        }}
                        loading={loading}
                        onChange={(pagination: TablePaginationConfig /*, filters, sorter */) => {
                            setTableParams(prev => ({
                                ...prev,
                                page: pagination.current || 1,
                                limit: pagination.pageSize || 10,
                                // If using server-side sort/filter, get values from sorter/filters here
                            }));
                        }}
                        scroll={{ x: 1200 }} 
                        bordered
                        size="default"
                    />
                    <Typography.Paragraph type="secondary" style={{marginTop: 15, fontSize: '0.85em', textAlign: 'center'}}>
                        Note: "Online Status" is indicative and based on the last data refresh. For real-time status, WebSocket integration would be needed for this panel. Client-side sorting is enabled for some columns.
                    </Typography.Paragraph>
                </Content> 
            </Layout> {/* This is the inner Layout closing tag */}

                <Modal
                    title="Add New Agent"
                    open={isAddAgentModalVisible} /* Use 'open' for newer AntD versions */
                    onOk={handleAddAgentOk}
                    onCancel={handleAddAgentCancel}
                    confirmLoading={isSubmittingAgent}
                    destroyOnClose 
                    forceRender /* Ensures form is available even if modal not visible initially */
                >
                    <Form form={addAgentForm} layout="vertical" name="add_agent_form_in_modal">
                        <Form.Item
                            name="nickname"
                            label="Nickname"
                            rules={[{ required: false, message: 'Agent nickname (optional)' }]}
                        >
                            <Input placeholder="Enter agent nickname (e.g., Agent Smith)" />
                        </Form.Item>
                        <Form.Item
                            name="generated_key_id"
                            label="Assign Key"
                            rules={[{ required: true, message: 'You must select an available key!' }]}
                        >
                            <Select
                                loading={loadingKeys}
                                placeholder="Select an available key to assign"
                                notFoundContent={loadingKeys ? <Spin size="small" /> : "No available keys (or error loading them)."}
                                disabled={loadingKeys || availableKeys.length === 0}
                            >
                                {availableKeys.map(key => (
                                    <Option key={key.id} value={key.id} title={`Expires: ${new Date(key.expires_at).toLocaleString()}`}>
                                        {`${key.key_value_masked} (Expires: ${new Date(key.expires_at).toLocaleDateString()})`}
                                    </Option>
                                ))}
                            </Select>
                        </Form.Item>
                    </Form>
                </Modal>
            {/* This is the final closing </Layout> tag for the top-level Layout */}
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