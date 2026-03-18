import React from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Droplet } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Login() {
  const { user, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleLogin = async () => {
    try {
      await signInWithGoogle();
      navigate('/');
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full space-y-8 bg-white p-10 rounded-2xl shadow-xl border border-slate-100"
      >
        <div className="text-center">
          <Droplet className="mx-auto h-16 w-16 text-red-600 fill-red-600" />
          <h2 className="mt-6 text-3xl font-extrabold text-slate-900 tracking-tight">
            Welcome to Rokto
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            A modern platform for blood donation requests and matching.
          </p>
        </div>
        
        <div className="mt-8 space-y-6">
          <button
            onClick={handleLogin}
            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-xl text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors shadow-md"
          >
            <span className="absolute left-0 inset-y-0 flex items-center pl-3">
              <svg className="h-5 w-5 text-red-500 group-hover:text-red-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z" />
              </svg>
            </span>
            Sign in with Google
          </button>
          <div className="text-xs text-slate-500 text-center mt-4 p-3 bg-slate-50 rounded-lg border border-slate-100">
            <strong>Note for Vercel Deployments:</strong> If login fails, ensure your Vercel domain is added to <strong>Authorized domains</strong> in the Firebase Console (Authentication &gt; Settings &gt; Authorized domains).
          </div>
        </div>
      </motion.div>
    </div>
  );
}
