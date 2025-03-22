// src/pages/LoginPage.tsx
import { KeyOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { Button, Card, Form, Input, Typography } from 'antd';
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from '../components/common/Toast';
import { useAuthStore } from '../stores/authStore';
import '../styles/login.css';

const { Title, Text, Paragraph } = Typography;

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, userType, login, isLoading, error, clearError } = useAuthStore();
  const [showHelp, setShowHelp] = useState(false);
  const [form] = Form.useForm();
  
  // 检查用户是否已登录，如果已登录则重定向
  useEffect(() => {
    if (isAuthenticated) {
      if (userType === 'admin') {
        navigate('/admin');
      } else if (userType === 'agent') {
        navigate('/chat');
      }
    }
    
    // 检查URL参数中是否有错误信息
    const params = new URLSearchParams(location.search);
    const errorMsg = params.get('error');
    if (errorMsg) {
      toast.error(decodeURIComponent(errorMsg));
    }
  }, [isAuthenticated, userType, navigate, location]);
  
  // 处理表单提交
  interface LoginFormValues {
    key: string;
  }
  
  const handleSubmit = async (values: LoginFormValues) => {
    clearError(); // 清除之前的错误
    
    try {
      const result = await login(values.key);
      
      if (result.success) {
        toast.success('验证成功');
        
        // 根据用户类型重定向
        if (result.isAdmin) {
          navigate('/admin');
        } else if (result.linkId) {
          navigate(`/chat/${result.linkId}`);
        } else {
          navigate('/chat');
        }
      } else {
        toast.error(result.message ?? '无效的卡密');
        form.setFields([
          {
            name: 'key',
            errors: [result.message ?? '无效的卡密']
          }
        ]);
      }
    } catch  {
      toast.error('登录过程中出错，请稍后重试');
    }
  };
  
  // 信息提示切换
  const toggleHelp = () => {
    setShowHelp(!showHelp);
  };

  return (
    <div className="login-container">
      <Card className="login-card">
        <Title level={2} className="login-title">客服系统</Title>
        
        {showHelp ? (
          <div className="help-content">
            <Paragraph>
              <Title level={4}>如何使用此系统</Title>
              <ul>
                <li><strong>管理员</strong>：使用管理员专用卡密登录，可以管理客服和密钥</li>
                <li><strong>客服</strong>：使用管理员提供的卡密登录，可以与用户聊天</li>
                <li><strong>用户</strong>：通过客服分享的链接或扫描二维码直接访问</li>
              </ul>
            </Paragraph>
            <Button type="link" onClick={toggleHelp}>返回登录</Button>
          </div>
        ) : (
          <>
            <Form
              form={form}
              name="login_form"
              onFinish={handleSubmit}
              layout="vertical"
              size="large"
            >
              <Form.Item
                name="key"
                rules={[{ required: true, message: '请输入卡密' }]}
                help={error}
                validateStatus={error ? 'error' : undefined}
              >
                <Input 
                  prefix={<KeyOutlined className="site-form-item-icon" />} 
                  placeholder="请输入卡密" 
                  size="large" 
                  autoComplete="off"
                  autoFocus
                />
              </Form.Item>

              <Form.Item>
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  block 
                  size="large"
                  loading={isLoading}
                >
                  {isLoading ? '验证中...' : '登录系统'}
                </Button>
              </Form.Item>
            </Form>
            
            <div className="login-footer">
              <Button 
                type="link" 
                icon={<QuestionCircleOutlined />} 
                onClick={toggleHelp}
              >
                如何使用此系统？
              </Button>
              <Text type="secondary">
                用户可通过客服分享的链接直接访问
              </Text>
            </div>
          </>
        )}
      </Card>
    </div>
  );
};

export default LoginPage;