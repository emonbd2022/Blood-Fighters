import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../contexts/ChatContext';
import { Droplet, LogOut, User, PlusCircle } from 'lucide-react';
import Notifications from './Notifications';
import FloatingChatIcon from './FloatingChatIcon';
import ChatBox from './ChatBox';
import Footer from './Footer';

export default function Layout() {
  const { user, logout } = useAuth();
  const { chatRecipient, setChatRecipient } = useChat();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link to="/" className="flex items-center space-x-2">
              <Droplet className="h-8 w-8 text-red-600 fill-red-600" />
              <span className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight truncate max-w-[120px] sm:max-w-none">Blood Fighters</span>
            </Link>
            
            {user && (
              <nav className="flex items-center space-x-1 sm:space-x-4">
                <Notifications />
                <Link to="/request" className="text-slate-600 hover:text-red-600 flex items-center space-x-1 transition-colors p-1.5 sm:px-2 sm:py-1">
                  <PlusCircle className="h-5 w-5" />
                  <span className="hidden sm:inline font-medium">Request</span>
                </Link>
                <Link to="/profile" className="text-slate-600 hover:text-red-600 flex items-center space-x-1 transition-colors p-1.5 sm:px-2 sm:py-1">
                  <User className="h-5 w-5" />
                  <span className="hidden sm:inline font-medium">Profile</span>
                </Link>
                <button 
                  onClick={handleLogout}
                  className="text-slate-600 hover:text-red-600 flex items-center space-x-1 transition-colors p-1.5 sm:px-2 sm:py-1"
                >
                  <LogOut className="h-5 w-5" />
                  <span className="hidden sm:inline font-medium">Logout</span>
                </button>
              </nav>
            )}
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      <Footer />

      {user && <FloatingChatIcon />}

      {chatRecipient && (
        <ChatBox
          recipientId={chatRecipient.id}
          recipientName={chatRecipient.name}
          recipientPhoto={chatRecipient.photo}
          onClose={() => setChatRecipient(null)}
        />
      )}
    </div>
  );
}
