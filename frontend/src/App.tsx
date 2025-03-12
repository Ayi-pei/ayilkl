import React from 'react';
import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import ProtectedRoute from './components/auth/ProtectedRoute';
import AdminPage from './pages/AdminPage';
import ChatPage from './pages/ChatPage';
import LoginPage from './pages/LoginPage';
import NotFoundPage from './pages/NotFoundPage';
import { useAuthStore } from './stores/authStore';
import DebugPanel from './components/common/DebugPanel';

const App: React.FC = () => {
  const { isAuthenticated, userType } = useAuthStore();

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
        
        <Route path="/admin" element={
          <ProtectedRoute requiredUserType="admin">
            <AdminPage />
          </ProtectedRoute>
        } />
        
        <Route path="/" element={
          !isAuthenticated ? <Navigate to="/login" /> :
          userType === 'admin' ? <Navigate to="/admin" /> :
          <Navigate to="/chat" />
        } />
        
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      
      <ToastContainer 
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
      
      {/* 添加调试面板 */}
      <DebugPanel />
    </Router>
  );
};

export default App;
