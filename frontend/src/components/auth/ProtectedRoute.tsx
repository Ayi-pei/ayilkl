import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredUserType: 'user' | 'agent' | 'admin';
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredUserType 
}) => {
  const { isAuthenticated, userType } = useAuthStore();

  // 如果未认证，重定向到登录页
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // 如果用户类型不匹配，重定向到适当的页面
  if (userType !== requiredUserType) {
    if (userType === 'admin') {
      return <Navigate to="/admin" replace />;
    } else {
      return <Navigate to="/chat" replace />;
    }
  }

  // 认证通过且用户类型匹配，渲染子组件
  return <>{children}</>;
};

export default ProtectedRoute;