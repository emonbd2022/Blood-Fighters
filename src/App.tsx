import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ChatProvider } from './contexts/ChatContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import Profile from './pages/Profile';
import CreateRequest from './pages/CreateRequest';
import FAQ from './pages/FAQ';
import Terms from './pages/Terms';
import { Toaster } from 'react-hot-toast';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <ChatProvider>
        <Router>
          <Toaster position="top-center" />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route index element={<Home />} />
              <Route path="profile" element={<Profile />} />
              <Route path="request" element={<CreateRequest />} />
              <Route path="edit-request/:id" element={<CreateRequest />} />
              <Route path="faq" element={<FAQ />} />
              <Route path="terms" element={<Terms />} />
            </Route>
          </Routes>
        </Router>
      </ChatProvider>
    </AuthProvider>
  );
}
