import React, { useState } from "react";
import axios from "axios";
import {
  ShieldCheck,
  User,
  Lock,
  ArrowRight,
  Sparkles,
  Globe2,
  EyeOff,
  Eye,
} from "lucide-react";
import { motion } from "framer-motion";

function Login({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    name: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}${endpoint}`,
        formData,
      );
      onLogin(res.data.user, res.data.token, res.data.refreshToken);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Authentication failed. Please check your credentials.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#FDFDFD] relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-grid opacity-[0.03] pointer-events-none"></div>
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-brand-50 rounded-full blur-[120px] opacity-60 animate-pulse-subtle"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-brand-100/30 rounded-full blur-[120px] opacity-40"></div>

      <div className="w-full max-w-[480px] z-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-3xl shadow-premium border border-slate-100 mb-8 relative group overflow-hidden">
            <div className="absolute inset-0 bg-brand/5 rounded-3xl scale-0 group-hover:scale-100 transition-transform duration-500"></div>
            <img
              src="/ai-chat-platform/LOGO.jpg"
              alt="Logo"
              className="w-full h-full object-cover relative z-10"
            />
            <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity z-20" />
          </div>
          <h1 className="text-4xl font-display font-extrabold tracking-tight text-slate-900 mb-3">
            Biz-
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand-600 to-brand-400">
              Translate
            </span>
          </h1>
          <p className="text-slate-400 font-medium tracking-wide uppercase text-[10px]">
            Real-time Multilingual Intelligence
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-[32px] p-10 shadow-premium border border-slate-100/50 backdrop-blur-xl relative group overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-brand-600 to-brand-400"></div>

          <div className="flex bg-slate-50 p-1.5 rounded-2xl mb-10 border border-slate-100">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all duration-300 ${
                isLogin
                  ? "bg-white text-brand shadow-sm scale-[1.02]"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              Access Portal
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all duration-300 ${
                !isLogin
                  ? "bg-white text-brand shadow-sm scale-[1.02]"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              New Account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {!isLogin && (
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-300" />
                  <input
                    type="text"
                    placeholder="Enter your name"
                    className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl pl-12 pr-5 py-4 outline-none focus:border-brand-300 focus:bg-white transition-all text-sm font-medium"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required={!isLogin}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-300" />
                <input
                  type="text"
                  placeholder="Choose a username"
                  className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl pl-12 pr-5 py-4 outline-none focus:border-brand-300 focus:bg-white transition-all text-sm font-medium"
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                Secure Password
              </label>

              <div className="relative">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-300" />

                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl pl-12 pr-14 py-4 outline-none focus:border-brand-300 focus:bg-white transition-all text-sm font-medium"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  required
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-4.5 h-4.5" />
                  ) : (
                    <Eye className="w-4.5 h-4.5" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-red-50 text-red-500 text-xs p-4 rounded-2xl border border-red-100 flex items-center gap-3 font-medium"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-brand-500 text-white py-4 rounded-2xl font-display font-bold hover:bg-brand-600 transition-all duration-300 flex items-center justify-center gap-3 group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-brand-600 to-brand-400 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <span className="relative z-10">
                {isLoading
                  ? "Initializing..."
                  : isLogin
                    ? "Sign In"
                    : "Join the Network"}
              </span>
              {!isLoading && (
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform relative z-10" />
              )}
            </button>
          </form>
        </motion.div>

        <footer className="mt-16 text-center space-y-4">
          <p className="text-slate-300 text-[10px] font-bold uppercase tracking-[0.2em] mb-4">
            Secured by Biz Insights Enterprise
          </p>
          <div className="flex justify-center gap-8 text-slate-400 text-xs font-medium">
            <a href="#" className="hover:text-brand transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="hover:text-brand transition-colors">
              Terms of Service
            </a>
            <a href="#" className="hover:text-brand transition-colors">
              Contact Support
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
}

// Simple AlertCircle icon since lucide might not have it in the expected version
const AlertCircle = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

export default Login;
