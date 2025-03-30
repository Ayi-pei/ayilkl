import React from 'react';
import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';

import ProtectedRoute from './components/auth/ProtectedRoute';
import AdminPage from './pages/AdminPage';
import ChatPage from './pages/ChatPage';
import LoginPage from './pages/LoginPage';
import NotFoundPage from './pages/NotFoundPage';
import { useAuthStore } from './stores/authStore';
import DebugPanel from './components/common/DebugPanel';

// 辅助函数：提取嵌套三元表达式
const getRedirectPath = (isAuthenticated: boolean, userType: string): string => {
  if (!isAuthenticated) {
    return "/login";
  } else if (userType === 'admin') {
    return "/admin";
  }
  return "/chat";
};

const App: React.FC = () => {
  const { isAuthenticated, userType } = useAuthStore();

  // 使用辅助函数获取重定向路径
  const redirectPath = getRedirectPath(isAuthenticated, userType);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={
          isAuthenticated ? 
            (userType === 'admin' ? <Navigate to="/admin" /> : <Navigate to="/chat" />) : 
            <LoginPage />
        } />
        
        <Route path="/chat" element={
          <ProtectedRoute requiredUserType="user">
            <ChatPage />
          </ProtectedRoute>
        } />
        
        <Route path="/chat/:linkId" element={<ChatPage />} />
        
        <Route path="/admin" element={
          <ProtectedRoute requiredUserType="admin">
            <AdminPage />
          </ProtectedRoute>
        } />
        
        <Route path="/" element={<Navigate to={redirectPath} />} />
        
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      
      {/* <ToastContainer 
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      /> */}
      
      {/* 添加调试面板 */}
      <DebugPanel />
    </Router>
  );
};

export default App;
