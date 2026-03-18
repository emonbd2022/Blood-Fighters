import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../contexts/ChatContext';
import { Droplet, LogOut, User, PlusCircle } from 'lucide-react';
import Notifications from './Notifications';
import FloatingChatIcon from './FloatingChatIcon';
import ChatBox from './ChatBox';

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
              <span className="text-xl font-bold text-slate-900 tracking-tight">Rokto</span>
            </Link>
            
            {user && (
              <nav className="flex items-center space-x-2 sm:space-x-4">
                <Notifications />
                <Link to="/request" className="text-slate-600 hover:text-red-600 flex items-center space-x-1 transition-colors px-2 py-1">
                  <PlusCircle className="h-5 w-5" />
                  <span className="hidden sm:inline font-medium">Request</span>
                </Link>
                <Link to="/profile" className="text-slate-600 hover:text-red-600 flex items-center space-x-1 transition-colors px-2 py-1">
                  <User className="h-5 w-5" />
                  <span className="hidden sm:inline font-medium">Profile</span>
                </Link>
                <button 
                  onClick={handleLogout}
                  className="text-slate-600 hover:text-red-600 flex items-center space-x-1 transition-colors px-2 py-1"
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

      <footer className="bg-white border-t border-slate-200 py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex items-center space-x-2">
              <Droplet className="h-6 w-6 text-red-600 fill-red-600" />
              <span className="text-lg font-bold text-slate-900 tracking-tight">Rokto</span>
            </div>
            <div className="flex space-x-6 text-sm font-medium text-slate-500">
              <Link to="/faq" className="hover:text-red-600 transition-colors">FAQ</Link>
              <Link to="/terms" className="hover:text-red-600 transition-colors">Terms & Conditions</Link>
              <a href="mailto:support@rokto.com" className="hover:text-red-600 transition-colors">Support</a>
            </div>
            <p className="text-slate-400 text-xs">
              &copy; {new Date().getFullYear()} Rokto. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

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
