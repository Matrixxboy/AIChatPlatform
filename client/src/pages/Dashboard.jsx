import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Search, Plus, MessageSquare, LogOut, UserPlus, Bell, Settings, MoreHorizontal, Globe, Sparkles, LayoutGrid, ShieldCheck, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import io from 'socket.io-client';

function Dashboard({ user, onLogout, socket }) {
  const [sessions, setSessions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [myLang, setMyLang] = useState(() => user.preferredLanguage || localStorage.getItem('pref_myLang') || 'English');
  const navigate = useNavigate();

  useEffect(() => {
    localStorage.setItem('pref_myLang', myLang);
  }, [myLang]);

  const handleLanguageChange = async (newLang) => {
    setMyLang(newLang);
    try {
      const token = localStorage.getItem('token');
      await axios.patch('http://localhost:5000/api/users/profile', 
        { preferredLanguage: newLang },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (err) {
      console.error('Failed to update language profile');
    }
  };

  useEffect(() => {
    fetchSessions();
    if (!socket) return;

    socket.emit('join_user_room', { userId: user.userId });

    const handleSessionUpdate = (data) => {
      setSessions(prev => {
        const updated = prev.map(s => {
          if (s._id === data.sessionId) {
            return {
              ...s,
              lastMessage: data.lastMessage,
              lastMessageTime: data.lastMessageTime
            };
          }
          return s;
        });
        
        // Move updated session to top
        const sessionIdx = updated.findIndex(s => s._id === data.sessionId);
        if (sessionIdx > -1) {
          const session = updated.splice(sessionIdx, 1)[0];
          return [session, ...updated];
        }
        return updated;
      });
    };

    socket.on('session_update', handleSessionUpdate);
    return () => {
      socket.off('session_update', handleSessionUpdate);
    };
  }, [socket, user.userId]);

  const fetchSessions = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/sessions', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSessions(res.data);
    } catch (err) {
      console.error('Failed to fetch sessions');
    }
  };

  const handleSearch = async (e) => {
    const q = e.target.value;
    setSearchQuery(q);
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`http://localhost:5000/api/users/search?q=${q}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSearchResults(res.data);
    } catch (err) {
      console.error('Search failed');
    }
  };

  const createSession = async (otherUser) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('http://localhost:5000/api/sessions', {
        name: `Direct Message`,
        participantIds: [otherUser._id]
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      navigate(`/chat/${res.data._id}`);
    } catch (err) {
      console.error('Failed to create session');
    }
  };

  return (
    <div className="flex h-screen bg-[#f0f2f5] overflow-hidden font-sans relative">
      {/* Profile Sidebar (Slides in) */}
      <AnimatePresence>
        {isProfileOpen && (
          <motion.div 
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute inset-y-0 left-0 w-[420px] bg-[#f0f2f5] z-50 shadow-2xl flex flex-col border-r border-slate-200"
          >
            <div className="h-[110px] bg-brand flex items-end p-6 pb-4 gap-6">
              <button 
                onClick={() => setIsProfileOpen(false)}
                className="text-white p-1 hover:bg-white/10 rounded-full transition-all"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <h2 className="text-white font-bold text-lg">Profile</h2>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="py-8 flex flex-col items-center">
                <div className="w-52 h-52 bg-white rounded-full flex items-center justify-center shadow-lg border-4 border-white relative group overflow-hidden">
                   <div className="w-full h-full bg-brand/5 text-brand flex items-center justify-center font-bold text-6xl">
                      {user.name[0].toUpperCase()}
                   </div>
                   <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                      <p className="text-white text-[10px] font-bold uppercase tracking-widest">Change Photo</p>
                   </div>
                </div>
              </div>

              <div className="bg-white px-8 py-6 shadow-sm mb-4">
                 <p className="text-brand text-xs font-bold uppercase tracking-widest mb-4">Your Name</p>
                 <div className="flex justify-between items-center group">
                    <p className="text-slate-800 text-lg font-medium">{user.name}</p>
                    <Settings className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-all cursor-pointer" />
                 </div>
                 <p className="text-[13px] text-slate-400 mt-4 leading-relaxed font-medium">
                    This is not your username or pin. This name will be visible to your contacts.
                 </p>
              </div>

              <div className="bg-white px-8 py-6 shadow-sm mb-4">
                 <p className="text-brand text-xs font-bold uppercase tracking-widest mb-4">Username</p>
                 <p className="text-slate-800 text-lg font-medium tracking-tight">@{user.username}</p>
              </div>

              <div className="bg-white px-8 py-6 shadow-sm">
                 <p className="text-brand text-xs font-bold uppercase tracking-widest mb-4">My Language</p>
                 <div className="flex items-center gap-3">
                    <Globe className="w-5 h-5 text-slate-400" />
                    <p className="text-slate-800 text-lg font-medium">{myLang}</p>
                 </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* WhatsApp Web Style Sidebar */}
      <aside className="w-[420px] bg-white flex flex-col border-r border-slate-200">
        {/* Sidebar Header */}
        <div className="h-[60px] bg-[#f0f2f5] px-4 flex items-center justify-between">
          <div 
            onClick={() => setIsProfileOpen(true)}
            className="w-10 h-10 bg-slate-300 rounded-full flex items-center justify-center font-bold text-slate-600 shadow-sm overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
          >
             {user.name[0].toUpperCase()}
          </div>
          <div className="flex items-center gap-2 text-slate-500">
            <button className="p-2 hover:bg-slate-200 rounded-full transition-all"><Globe className="w-5 h-5" /></button>
            <button className="p-2 hover:bg-slate-200 rounded-full transition-all"><MessageSquare className="w-5 h-5" /></button>
            <button onClick={onLogout} className="p-2 hover:bg-slate-200 rounded-full transition-all hover:text-red-500"><LogOut className="w-5 h-5" /></button>
          </div>
        </div>

        {/* My Language Quick Setting */}
        <div className="p-3 bg-[#e9edef] border-b border-slate-100">
           <div className="bg-white rounded-lg p-3 flex items-center gap-4 shadow-sm border border-slate-100">
              <div className="w-10 h-10 bg-brand/10 rounded-full flex items-center justify-center text-brand">
                 <Globe className="w-5 h-5" />
              </div>
              <div className="flex-1">
                 <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">Display Language</p>
                 <select 
                   value={myLang} 
                   onChange={(e) => handleLanguageChange(e.target.value)}
                   className="text-sm font-bold bg-transparent border-none outline-none text-slate-700 cursor-pointer w-full"
                 >
                   {['English', 'Chinese (Mandarin)', 'Spanish', 'French', 'German', 'Japanese', 'Korean', 'Arabic', 'Hindi', 'Portuguese', 'Russian', 'Italian', 'Dutch', 'Turkish', 'Gujarati'].map(l => (
                     <option key={l} value={l}>{l}</option>
                   ))}
                 </select>
              </div>
           </div>
        </div>

        {/* Search Bar */}
        <div className="p-2 bg-white">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4.5 h-4.5" />
            <input
              type="text"
              placeholder="Search or start new chat"
              className="w-full pl-12 pr-4 py-2 bg-[#f0f2f5] rounded-lg text-sm placeholder:text-slate-500 transition-all outline-none"
              value={searchQuery}
              onChange={handleSearch}
              onFocus={() => setIsSearching(true)}
            />
          </div>
        </div>

        {/* Session List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {isSearching && searchQuery.length >= 2 ? (
            <div className="p-4 space-y-2">
               <h3 className="text-xs font-bold text-brand uppercase px-2 mb-2">Search Results</h3>
               {searchResults.map(u => (
                  <div 
                    key={u._id}
                    onClick={() => createSession(u)}
                    className="flex items-center gap-4 p-3 hover:bg-[#f5f6f6] cursor-pointer transition-all border-b border-slate-50 last:border-0"
                  >
                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center font-bold text-slate-400">
                       {u.name[0].toUpperCase()}
                    </div>
                    <div>
                       <p className="font-bold text-[15px] text-slate-900 leading-tight">{u.name}</p>
                       <p className="text-xs text-slate-400 font-medium italic">Click to start conversation</p>
                    </div>
                  </div>
               ))}
            </div>
          ) : (
            <div>
              {sessions.map((s) => (
                <div 
                  key={s._id}
                  onClick={() => navigate(`/chat/${s._id}`)}
                  className="flex items-center gap-4 p-3 px-4 hover:bg-[#f5f6f6] cursor-pointer transition-all border-b border-slate-50 last:border-0 group"
                >
                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center font-bold text-slate-400 relative overflow-hidden">
                     <div className="w-full h-full bg-brand/5 text-brand flex items-center justify-center">
                        {s.name[0].toUpperCase()}
                     </div>
                  </div>
                  <div className="flex-1 min-w-0 border-b border-slate-100 py-2 group-last:border-0">
                    <div className="flex justify-between items-start mb-0.5">
                      <p className="font-bold text-[15px] text-slate-900 truncate">{s.name}</p>
                      <span className="text-[11px] text-slate-400 font-medium">
                        {new Date(s.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 truncate leading-tight pr-4">
                      {s.lastMessage || 'Click to open chat...'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>

      {/* Main Empty State (WhatsApp Web Style) */}
      <main className="flex-1 bg-[#f8f9fa] flex flex-col items-center justify-center border-b-[6px] border-emerald-500">
        <div className="max-w-md text-center px-12">
           <div className="w-64 h-64 mx-auto mb-10 opacity-20 grayscale">
              <Globe className="w-full h-full text-slate-900" />
           </div>
           <h1 className="text-[32px] font-light text-slate-600 mb-4 tracking-tight">Biz Insights Web</h1>
           <p className="text-sm text-slate-500 leading-relaxed font-medium">
              Send and receive messages in any language securely.<br/>
              Select a conversation to begin your neural link.
           </p>
           
           <div className="mt-20 flex items-center justify-center gap-2 opacity-30">
              <ShieldCheck className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-medium text-slate-500 uppercase tracking-widest">End-to-End Encrypted</span>
           </div>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;