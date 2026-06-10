import React, { useState } from 'react';
import axios from 'axios';
import { ShieldCheck, User, Lock, ArrowRight, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

function AdminLogin({ onLogin }) {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/login`, formData);
      const user = res.data.user;
      
      if (user.role !== 'admin') {
        setError('Access Denied. You do not have administrator privileges.');
        return;
      }
      
      onLogin(user, res.data.token, res.data.refreshToken);
    } catch (err) {
      setError(err.response?.data?.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-900 relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-brand-500 rounded-full blur-[120px] opacity-20"></div>

      <div className="w-full max-w-[480px] z-10">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 bg-slate-800 rounded-3xl shadow-xl border border-slate-700 mb-8 relative group">
            <ShieldCheck className="w-10 h-10 text-brand-400 relative z-10" />
          </div>
          <h1 className="text-4xl font-display font-extrabold tracking-tight text-white mb-3">
            Admin <span className="text-brand-400">Portal</span>
          </h1>
          <p className="text-slate-400 font-medium tracking-wide uppercase text-[10px]">Restricted Access Area</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-slate-800 rounded-[32px] p-10 shadow-2xl border border-slate-700 relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-1.5 bg-brand-500"></div>

          <form onSubmit={handleSubmit} className="space-y-6 mt-4">
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Admin Username</label>
              <div className="relative">
                <User className="absolute left-5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Enter admin username"
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-2xl pl-12 pr-5 py-4 outline-none focus:border-brand-500 text-white transition-all text-sm font-medium"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Secure Password</label>
              <div className="relative">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-2xl pl-12 pr-5 py-4 outline-none focus:border-brand-500 text-white transition-all text-sm font-medium"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                />
              </div>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-red-500/10 text-red-400 text-xs p-4 rounded-2xl border border-red-500/20 flex items-center gap-3 font-medium"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-brand-600 hover:bg-brand-500 text-white py-4 rounded-2xl font-display font-bold transition-all duration-300 flex items-center justify-center gap-3 mt-4"
            >
              <span>{isLoading ? 'Authenticating...' : 'Secure Login'}</span>
              {!isLoading && <ArrowRight className="w-5 h-5" />}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}

const AlertCircle = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

export default AdminLogin;
