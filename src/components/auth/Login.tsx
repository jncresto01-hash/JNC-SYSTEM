import { Shield, Lock, Loader2 } from 'lucide-react';
import { useAuth } from '../../App';
import { motion } from 'motion/react';
import React, { useState } from 'react';

export default function Login() {
  const { signIn } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { user, adminData, logout } = useAuth();
  
  const handleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      await signIn();
    } catch (err: any) {
      setError('Access denied. Please check your connection or permissions.');
      console.error(err);
      setLoading(false);
    }
  };

  const isUnauthorized = user && !adminData && !loading;

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white rounded-[2.5rem] p-10 shadow-xl shadow-gray-100 border border-gray-100"
      >
        <div className="flex flex-col items-center text-center mb-10">
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-6">
            <Shield className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">Admin Portal</h1>
          <p className="text-gray-500">Log in with your company account to access the dashboard.</p>
        </div>

        {(error || isUnauthorized) && (
          <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-2xl text-sm font-medium border border-red-100 italic">
            {error || `Account ${user?.email} is not authorized as an admin.`}
            {isUnauthorized && (
              <button 
                onClick={logout}
                className="block mt-2 text-xs font-bold underline"
              >
                Sign out and try another account
              </button>
            )}
          </div>
        )}

        <button
          onClick={handleSignIn}
          disabled={loading || !!adminData}
          className="w-full bg-white border-2 border-gray-100 hover:border-blue-100 flex items-center justify-center gap-4 py-4 px-6 rounded-2xl font-bold text-gray-700 transition-all active:scale-[0.98] focus:outline-none focus:ring-4 focus:ring-blue-50/50 group disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
          ) : (
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5 group-hover:scale-110 transition-transform" />
          )}
          {loading ? 'Authenticating...' : 'Continue with Google'}
        </button>

        <div className="flex items-center gap-2 justify-center text-xs text-gray-400 mt-10">
          <Lock className="w-3 h-3" />
          <span>Internal Use Only</span>
        </div>
      </motion.div>
    </div>
  );
}

