import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { UserType } from '../../types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredUserType: UserType;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredUserType }) => {
  const { isAuthenticated, userType, verifySession } = useAuthStore();
  
  useEffect(() => {
    // 如果用户已登录但会话可能已过期，验证会话
    if (isAuthenticated) {
      verifySession();
    }
  }, [isAuthenticated, verifySession]);
  
  // 如果用户未登录，重定向到登录页面
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  // 严格检查用户类型是否匹配所需类型
  if (userType !== requiredUserType) {
    // 根据实际用户类型重定向到适当的页面
    if (userType === 'admin') {
      return <Navigate to="/admin" />;
    } else if (userType === 'agent') {
      return <Navigate to="/chat" />;
    } else if (userType === 'user') {
      // 用户应该只能访问聊天页面
      return <Navigate to="/chat" />;
    } else {
      // 未知用户类型，重定向到登录页面
      return <Navigate to="/login" />;
    }
  }
  
  // 用户已登录且类型匹配，渲染子组件
  return <>{children}</>;
};

export default ProtectedRoute;