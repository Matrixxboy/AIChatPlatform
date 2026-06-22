import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import {
  Search,
  Plus,
  MessageSquare,
  LogOut,
  UserPlus,
  Bell,
  Settings,
  MoreHorizontal,
  Globe,
  Sparkles,
  LayoutGrid,
  ShieldCheck,
  ArrowLeft,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import io from "socket.io-client";
import { formatLastMessageTime } from "../libs/util";

function Dashboard({ user, onLogout, onUserUpdate, socket }) {
  const [sessions, setSessions] = useState(() => {
    const cached = localStorage.getItem("cached_sessions");
    return cached ? JSON.parse(cached) : [];
  });
  const [isFetching, setIsFetching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [myLang, setMyLang] = useState(
    () =>
      user.preferredLanguage ||
      localStorage.getItem("pref_myLang") ||
      "English",
  );
  const navigate = useNavigate();

  useEffect(() => {
    localStorage.setItem("pref_myLang", myLang);
  }, [myLang]);

  const handleLanguageChange = async (newLang) => {
    if (newLang === user.preferredLanguage) return;

    // Set flag for ChatRoom to ask for history translation
    localStorage.setItem("pending_history_translate", newLang);

    onUserUpdate({ preferredLanguage: newLang });
    try {
      await api.patch(`/api/users/profile`, { preferredLanguage: newLang });
      window.location.reload();
    } catch (err) {
      console.error("Failed to update language");
    }
  };

  useEffect(() => {
    fetchSessions();
    if (!socket) return;

    socket.emit("join_user_room", { userId: user.id });

    const handleSessionUpdate = (data) => {
      setSessions((prev) => {
        const updated = prev.map((s) => {
          if (s._id === data.sessionId) {
            return {
              ...s,
              lastMessage: data.lastMessage,
              lastMessageTime: data.lastMessageTime,
            };
          }
          return s;
        });

        // Move updated session to top
        const sessionIdx = updated.findIndex((s) => s._id === data.sessionId);
        if (sessionIdx > -1) {
          const session = updated.splice(sessionIdx, 1)[0];
          return [session, ...updated];
        }
        return updated;
      });
    };

    socket.on("session_update", handleSessionUpdate);
    return () => {
      socket.off("session_update", handleSessionUpdate);
    };
  }, [socket, user.id]);

  const fetchSessions = async () => {
    setIsFetching(true);
    try {
      const res = await api.get(`/api/sessions`);
      setSessions(res.data);
      localStorage.setItem("cached_sessions", JSON.stringify(res.data));
    } catch (err) {
      console.error("Failed to fetch sessions");
    } finally {
      setIsFetching(false);
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
      const res = await api.get(`/api/users/search?q=${q}`);
      setSearchResults(res.data);
    } catch (err) {
      console.error("Search failed");
    }
  };

  const createSession = async (otherUser) => {
    try {
      const res = await api.post(`/api/sessions`, {
        name: `Direct Message`,
        participantIds: [otherUser._id],
      });
      navigate(`/chat/${res.data._id}`);
    } catch (err) {
      console.error("Failed to create session");
    }
  };

  const [isDeleting, setIsDeleting] = useState(null); // sessionId
  const handleDeleteSession = async (sessionId) => {
    try {
      await api.delete(`/api/sessions/${sessionId}`);
      setSessions((prev) => prev.filter((s) => s._id !== sessionId));
      setIsDeleting(null);
    } catch (err) {
      console.error("Failed to delete session");
    }
  };

  const [editingName, setEditingName] = useState(user.name);
  const [editingBio, setEditingBio] = useState(user.bio || "");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  useEffect(() => {
    setEditingName(user.name);
    setEditingBio(user.bio || "");
  }, [user.name, user.bio]);

  const saveProfile = async () => {
    setIsSavingProfile(true);
    try {
      await api.patch(`/api/users/profile`, {
        name: editingName,
        bio: editingBio,
      });
      onUserUpdate({ name: editingName, bio: editingBio });
    } catch (err) {
      console.error("Failed to save profile");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result;
      try {
        await api.patch(`/api/users/profile`, { profileImage: base64String });
        onUserUpdate({ profileImage: base64String });
        setSessions([...sessions]); // Trigger re-render
      } catch (err) {
        console.error("Failed to upload image");
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex h-screen bg-[#f0f2f5] overflow-hidden font-sans relative">
      {/* Profile Sidebar (Slides in) */}
      <AnimatePresence>
        {isProfileOpen && (
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed md:absolute inset-y-0 left-0 w-full md:w-[420px] bg-[#f0f2f5] z-[60] shadow-2xl flex flex-col border-r border-slate-200"
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
                  {user.profileImage ? (
                    <img
                      src={user.profileImage}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-brand/5 text-brand flex items-center justify-center font-bold text-6xl">
                      {user.name[0].toUpperCase()}
                    </div>
                  )}
                  <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    <p className="text-white text-[10px] font-bold uppercase tracking-widest">
                      Change Photo
                    </p>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                  </label>
                </div>
              </div>

              <div className="bg-white px-8 py-6 shadow-sm mb-4">
                <p className="text-brand text-xs font-bold uppercase tracking-widest mb-2">
                  Your Name
                </p>
                <input
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  className="w-full text-slate-800 text-lg font-medium border-b border-transparent focus:border-brand outline-none pb-1 transition-all"
                />
                <p className="text-[11px] text-slate-400 mt-3 leading-relaxed font-medium">
                  Visible to your contacts and in search.
                </p>
              </div>

              <div className="bg-white px-8 py-6 shadow-sm mb-4">
                <p className="text-brand text-xs font-bold uppercase tracking-widest mb-2">
                  About / Bio
                </p>
                <textarea
                  value={editingBio}
                  onChange={(e) => setEditingBio(e.target.value)}
                  placeholder="Add a bio..."
                  className="w-full text-slate-700 text-[15px] font-medium border-b border-transparent focus:border-brand outline-none pb-1 transition-all resize-none h-16"
                />
              </div>

              <div className="px-8 py-6">
                <button
                  onClick={saveProfile}
                  disabled={
                    isSavingProfile ||
                    (editingName === user.name &&
                      editingBio === (user.bio || ""))
                  }
                  className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all shadow-lg ${
                    isSavingProfile ||
                    (editingName === user.name &&
                      editingBio === (user.bio || ""))
                      ? "bg-slate-100 text-slate-400 shadow-none"
                      : "bg-brand text-white shadow-brand/20 hover:bg-brand/90"
                  }`}
                >
                  {isSavingProfile ? "Saving Changes..." : "Save Profile"}
                </button>
              </div>

              <div className="bg-white px-8 py-6 shadow-sm mb-4">
                <p className="text-brand text-xs font-bold uppercase tracking-widest mb-1">
                  My Username
                </p>
                <p className="text-slate-800 text-lg font-medium tracking-tight">
                  @{user.username}
                </p>
                <p className="text-[11px] text-slate-400 mt-2 font-medium">
                  Use this to help others find you instantly.
                </p>
              </div>

              <div className="bg-white px-8 py-6 shadow-sm">
                <p className="text-brand text-xs font-bold uppercase tracking-widest mb-4">
                  My Language
                </p>
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
      <aside className="w-full md:w-[420px] bg-white flex flex-col border-r border-slate-200 h-full">
        {/* Sidebar Header */}
        <div className="h-[60px] bg-[#f0f2f5] px-4 flex items-center justify-between">
          <div
            onClick={() => setIsProfileOpen(true)}
            className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center font-bold text-slate-500 shadow-sm overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
          >
            {user.profileImage ? (
              <img
                src={user.profileImage}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-brand/10 text-brand flex items-center justify-center font-bold text-lg">
                {user.name[0].toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 text-slate-500">
            <div className="w-8 h-8 rounded-lg overflow-hidden mr-1">
              <img
                src="/ai-chat-platform/biz-insightslogo1.png"
                alt="Company Logo"
                className="w-full h-full object-cover"
              />
            </div>
            {/* <button className="p-2 hover:bg-slate-200 rounded-full transition-all">
              <MessageSquare className="w-5 h-5" />
            </button> */}
            <button
              onClick={onLogout}
              className="p-2 hover:bg-slate-200 rounded-full transition-all hover:text-red-500"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* My Language Quick Setting */}
        <div className="p-3 bg-[#e9edef] border-b border-slate-100">
          <div className="bg-white rounded-lg p-3 flex items-center gap-4 shadow-sm border border-slate-100">
            <div className="w-10 h-10 bg-brand/10 rounded-full flex items-center justify-center text-brand">
              <Globe className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">
                Display Language
              </p>
              <select
                value={myLang}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="text-sm font-bold bg-transparent border-none outline-none text-slate-700 cursor-pointer w-full"
              >
                {[
                  "English",
                  "Chinese (Mandarin)",
                  "Spanish",
                  "French",
                  "German",
                  "Japanese",
                  "Korean",
                  "Arabic",
                  "Hindi",
                  "Portuguese",
                  "Russian",
                  "Italian",
                  "Dutch",
                  "Turkish",
                  "Gujarati",
                ].map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
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
          {isFetching && (
            <div className="flex items-center justify-center gap-2 py-2 bg-slate-50 border-b border-slate-100">
              <div className="w-3 h-3 border-2 border-brand/20 border-t-brand rounded-full animate-spin"></div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Syncing chats...
              </span>
            </div>
          )}
          {isSearching && searchQuery.length >= 2 ? (
            <div className="p-4 space-y-2">
              <h3 className="text-xs font-bold text-brand uppercase px-2 mb-2">
                Search Results
              </h3>
              {searchResults.map((u) => (
                <div
                  key={u._id}
                  onClick={() => createSession(u)}
                  className="flex items-center gap-4 p-3 hover:bg-[#f5f6f6] cursor-pointer transition-all border-b border-slate-50 last:border-0"
                >
                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center font-bold text-slate-400 overflow-hidden shrink-0">
                    {u.profileImage ? (
                      <img
                        src={u.profileImage}
                        alt={u.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      u.name[0].toUpperCase()
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-[15px] text-slate-900 leading-tight">
                      {u.name}
                    </p>
                    <p className="text-[11px] text-slate-400 font-medium tracking-tight mt-0.5">
                      @{u.username}
                    </p>
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
                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center font-bold text-slate-400 relative overflow-hidden shrink-0">
                    {s.otherUser?.profileImage ? (
                      <img
                        src={s.otherUser.profileImage}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-brand/5 text-brand flex items-center justify-center">
                        {s.name[0].toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 border-b border-slate-100 py-2 group-last:border-0 relative">
                    <div className="flex justify-between items-start mb-0.5">
                      <div className="flex flex-col min-w-0">
                        <p className="font-bold text-[15px] text-slate-900 truncate">
                          {s.name}
                        </p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                          @{s.otherUser?.username || "user"}
                        </p>
                      </div>
                      <span className="text-[11px] text-slate-400 font-medium shrink-0 pt-1">
                        {formatLastMessageTime(s.lastMessageTime)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center gap-2">
                      <p className="text-sm text-slate-500 truncate leading-tight pr-4">
                        {s.lastMessage || "Click to open chat..."}
                      </p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsDeleting(s._id);
                        }}
                        className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {isDeleting && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-2xl p-6 shadow-2xl max-w-sm w-full"
              >
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  Delete Chat?
                </h3>
                <p className="text-slate-500 text-sm mb-6">
                  Are you sure you want to delete this chat? This will only
                  remove it for you.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setIsDeleting(null)}
                    className="flex-1 px-4 py-2 rounded-xl border border-slate-200 font-bold text-slate-600"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDeleteSession(isDeleting)}
                    className="flex-1 px-4 py-2 rounded-xl bg-red-500 text-white font-bold"
                  >
                    Delete
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </aside>

      {/* Main Empty State (WhatsApp Web Style) - Hidden on Mobile */}
      <main className="hidden md:flex flex-1 bg-[#f8f9fa] flex-col items-center justify-center border-b-[6px] border-brand">
        <div className="max-w-md text-center px-12">
          <div className="w-64 h-64 mx-auto mb-10 overflow-hidden rounded-[40px] shadow-2xl border-4 border-white grayscale-[0.2]">
            <img
              src="/ai-chat-platform/LOGO.jpg"
              alt="Neural Link Logo"
              className="w-full h-full object-cover"
            />
          </div>
          <h1 className="text-[32px] font-light text-slate-600 mb-4 tracking-tight">
            Biz-Translate Chat App{" "}
          </h1>
          <p className="text-sm text-slate-500 leading-relaxed font-medium">
            Send and receive messages in any language securely.
            <br />
            Select a conversation to begin your neural link.
          </p>

          <div className="mt-20 flex items-center justify-center gap-2 opacity-30">
            <ShieldCheck className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-medium text-slate-500 uppercase tracking-widest">
              End-to-End Encrypted
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
