import React from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useChatStore } from '../../stores/chatStore';
import './DebugPanel.css';

const DebugPanel: React.FC = () => {
  const { isAuthenticated, userType, agentData } = useAuthStore();
  const { isInitializing, messages } = useChatStore();

  if (import.meta.env.MODE !== 'development') {
    return null;
  }

  return (
    <div className="debug-panel">
      <h4>调试信息</h4>
      <p>认证状态: {isAuthenticated ? '已登录' : '未登录'}</p>
      <p>用户类型: {userType || '未设置'}</p>
      <p>客服ID: {agentData?.id || '无'}</p>
      <p>初始化中: {isInitializing ? '是' : '否'}</p>
      <p>消息数量: {messages.length}</p>
    </div>
  );
};

export default DebugPanel;