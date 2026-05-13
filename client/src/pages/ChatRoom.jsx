import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import axios from 'axios';
import { Search, Plus, MessageSquare, Mic, Send, ArrowLeft, Globe, Sparkles, LogOut, X, Phone, Video, MoreVertical, MoreHorizontal, Globe2, Check, CheckCheck, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function ChatRoom({ user, onUserUpdate, socket }) {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState(() => {
    const cached = localStorage.getItem(`cached_messages_${sessionId}`);
    return cached ? JSON.parse(cached) : [];
  });
  const [isFetchingMessages, setIsFetchingMessages] = useState(false);
  const [inputText, setInputText] = useState('');
  const [session, setSession] = useState(null);
  const [myLang, setMyLang] = useState(() => user.preferredLanguage || localStorage.getItem('pref_myLang') || 'English');
  const [isTranslationModalOpen, setIsTranslationModalOpen] = useState(false);
  const [translationTargetLang, setTranslationTargetLang] = useState(myLang);
  const [isProcessingTranslation, setIsProcessingTranslation] = useState(false);
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  useEffect(() => {
    localStorage.setItem('pref_myLang', myLang);
  }, [myLang]);


  const handleLanguageChangeRequest = async (newLang) => {
    if (newLang === myLang) return;
    
    // 1. Update local state and profile immediately
    setMyLang(newLang);
    onUserUpdate({ preferredLanguage: newLang });
    
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${import.meta.env.VITE_API_URL}/api/users/profile`, 
        { preferredLanguage: newLang },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // 2. Open the confirmation modal - fulfilling "ask user before calling translating all api"
      setTranslationTargetLang(newLang);
      setIsTranslationModalOpen(true);
      
    } catch (err) {
      console.error('Failed to update language profile');
    }
  };

  const handleDeleteConversation = async () => {
    if (!window.confirm('Are you sure you want to permanently delete this entire conversation? This action cannot be undone.')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/sessions/${sessionId}/permanent`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      navigate('/');
    } catch (err) {
      console.error('Failed to delete conversation:', err);
      alert('Failed to delete conversation. Please try again.');
    }
  };

  const handleTranslateFullChat = async (targetLangOverride = null) => {
    const target = targetLangOverride || translationTargetLang;
    setIsProcessingTranslation(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${import.meta.env.VITE_API_URL}/api/sessions/${sessionId}/translate-all`, {
        toLang: target,
        domain: domain
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Refresh messages to show the newly stored translations
      await fetchMessages();
    } catch (err) {
      console.error('Batch translation failed:', err);
    } finally {
      setIsProcessingTranslation(false);
      setIsTranslationModalOpen(false);
    }
  };

  const [domain, setDomain] = useState('general');
  const [isTranslating, setIsTranslating] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isOtherProfileOpen, setIsOtherProfileOpen] = useState(false);
  const typingTimeoutRef = useRef(null);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  const languages = [
    'English', 'Chinese (Mandarin)', 'Spanish', 'French', 'German', 
    'Japanese', 'Korean', 'Arabic', 'Hindi', 'Portuguese', 
    'Russian', 'Italian', 'Dutch', 'Turkish', 'Gujarati'
  ];

  const langCodes = {
    'English': 'en-US', 'Chinese (Mandarin)': 'zh-CN', 'Spanish': 'es-ES', 'French': 'fr-FR',
    'German': 'de-DE', 'Japanese': 'ja-JP', 'Korean': 'ko-KR', 'Arabic': 'ar-SA',
    'Hindi': 'hi-IN', 'Portuguese': 'pt-BR', 'Russian': 'ru-RU', 'Italian': 'it-IT',
    'Dutch': 'nl-NL', 'Turkish': 'tr-TR', 'Gujarati': 'gu-IN'
  };

  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    fetchSessionDetails();
    fetchMessages();

    if (!socket) return;

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);
    
    if (socket.connected) setIsConnected(true);

    socket.emit('join_session', sessionId);

    const handleReceiveMessage = async (message) => {
      setIsTranslating(false);
      
      // Ensure we have a text field for UI consistency
      if (!message.text && message.originalText) {
        message.text = message.originalText;
      }
      
      const messageWithLang = { ...message };
      
      setMessages(prev => {
        if (messageWithLang.senderId === user.id) {
          // Match by originalText to replace optimistic message
          const exists = prev.find(m => m.isOptimistic && m.originalText === messageWithLang.originalText);
          if (exists) {
             console.log("Replacing optimistic message", exists._id, "with", messageWithLang._id);
             return prev.map(m => (m._id === exists._id ? messageWithLang : m));
          }
        }
        
        if (prev.find(m => m._id === messageWithLang._id)) return prev;
        
        // Mark as seen if it's from others
        if (messageWithLang.senderId !== user.id) {
          socket.emit('mark_seen', { 
            messageId: messageWithLang._id, 
            sessionId, 
            userId: user.id 
          });
        }
        
        const updated = [...prev, messageWithLang];
        localStorage.setItem(`cached_messages_${sessionId}`, JSON.stringify(updated));
        return updated;
      });
    };

    const handleStatusUpdate = (data) => {
      setMessages(prev => {
        const updated = prev.map(m => 
          m._id === data.messageId ? { ...m, status: data.status } : m
        );
        localStorage.setItem(`cached_messages_${sessionId}`, JSON.stringify(updated));
        return updated;
      });
    };

    const handleUserTyping = (data) => {
      if (data.userId !== user.id) {
        setIsTyping(data.isTyping);
      }
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('receive_message', handleReceiveMessage);
    socket.on('user_typing', handleUserTyping);
    socket.on('message_status_update', handleStatusUpdate);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('receive_message', handleReceiveMessage);
      socket.off('user_typing', handleUserTyping);
      socket.off('message_status_update', handleStatusUpdate);
    };
  }, [socket, sessionId, user.id, myLang, domain]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchSessionDetails = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/sessions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const current = res.data.find(s => s._id === sessionId);
      setSession(current);
    } catch (err) {
      console.error('Failed to fetch session details');
    }
  };

  const fetchMessages = async () => {
    setIsFetchingMessages(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/sessions/${sessionId}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const messagesData = res.data;
      setMessages(messagesData);
      localStorage.setItem(`cached_messages_${sessionId}`, JSON.stringify(messagesData));
    } catch (err) {
      console.error('Failed to fetch messages');
    } finally {
      setIsFetchingMessages(false);
    }
  };

  const handleTextChange = (e) => {
    const text = e.target.value;
    setInputText(text);

    if (socket && text.trim().length > 0) {
      socket.emit('typing', { sessionId, userId: user.id });
      
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('stop_typing', { sessionId, userId: user.id });
      }, 2000);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !socket) return;

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    socket.emit('stop_typing', { sessionId, userId: user.id });

    const optimisticMsg = {
      _id: 'temp-' + Date.now(),
      senderId: user.id,
      text: inputText,
      originalText: inputText,
      fromLang: myLang,
      targetLang: myLang,
      createdAt: new Date().toISOString(),
      isOptimistic: true
    };

    setMessages(prev => [...prev, optimisticMsg]);
    
    socket.emit('send_message', {
      sessionId,
      userId: user.id, // Fallback for multi-worker environments
      text: inputText,
      fromLang: myLang,
      domain
    });

    setInputText('');
  };

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    } else {
      if (!window.isSecureContext && window.location.hostname !== 'localhost') {
        alert('Microphone access is restricted on non-secure connections (HTTP). Please use HTTPS or enable "Insecure origins treated as secure" in your browser flags.');
        console.warn('To enable mic on this IP, go to: chrome://flags/#unsafely-treat-insecure-origin-as-secure and add ' + window.location.origin + ' to the list.');
        return;
      }
      if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
        alert('Speech recognition not supported in this browser.');
        return;
      }
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SR();
      recognition.lang = langCodes[myLang] || 'en-US';
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputText(transcript);
      };
      recognition.onend = () => setIsRecording(false);
      recognition.start();
      recognitionRef.current = recognition;
      setIsRecording(true);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#efeae2] relative overflow-hidden font-sans">
      {/* Translation Modal - New Separate Feature */}
      <AnimatePresence>
        {isTranslationModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsTranslationModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-2xl p-6 shadow-2xl max-w-sm w-full relative z-10"
            >
              <div className="w-12 h-12 bg-brand/10 rounded-full flex items-center justify-center mb-4">
                <Globe2 className="w-6 h-6 text-brand" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Translate Full Chat?</h3>
              <p className="text-slate-500 text-sm leading-relaxed mb-4">
                This will convert the whole conversation into your selected language and save it to your history.
              </p>
              
              <div className="mb-6">
                <select 
                  value={translationTargetLang}
                  onChange={(e) => setTranslationTargetLang(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 text-slate-700 font-medium focus:ring-2 focus:ring-brand/20 outline-none"
                >
                  {languages.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>

              <div className="flex gap-3">
                <button 
                  disabled={isProcessingTranslation}
                  onClick={() => setIsTranslationModalOpen(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-colors text-sm disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  disabled={isProcessingTranslation}
                  onClick={handleTranslateFullChat}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-brand text-white font-semibold shadow-lg shadow-brand/20 hover:bg-brand/90 transition-colors text-sm flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {isProcessingTranslation && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  {isProcessingTranslation ? 'Processing...' : 'Translate All'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* WhatsApp Doodle Pattern Background */}
      <div className="absolute inset-0 opacity-[0.06] pointer-events-none z-0" style={{ backgroundImage: 'url("https://w0.peakpx.com/wallpaper/580/650/wallpaper-whatsapp-doodle-patterns-chat-background-texture.jpg")', backgroundSize: '400px' }}></div>

      {/* Other Participant Profile (Slides in from right) */}
      <AnimatePresence>
        {isOtherProfileOpen && (
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed md:absolute inset-y-0 right-0 w-full md:w-[400px] bg-white z-[60] shadow-2xl flex flex-col border-l border-slate-200"
          >
            <div className="h-[110px] bg-[#f0f2f5] flex items-end p-6 pb-4 gap-6">
              <button 
                onClick={() => setIsOtherProfileOpen(false)}
                className="text-slate-500 p-1 hover:bg-slate-200 rounded-full transition-all"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <h2 className="text-slate-800 font-bold text-lg">Contact info</h2>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="bg-white py-8 flex flex-col items-center shadow-sm mb-4">
                <div className="w-52 h-52 bg-slate-100 rounded-full flex items-center justify-center shadow-md mb-6 overflow-hidden">
                   {session?.otherUser?.profileImage ? (
                      <img src={session.otherUser.profileImage} alt="Profile" className="w-full h-full object-cover" />
                   ) : session?.name ? (
                     <div className="w-full h-full bg-brand/10 text-brand flex items-center justify-center font-bold text-6xl">
                       {session.name[0].toUpperCase()}
                     </div>
                   ) : (
                     <Globe className="w-16 h-16 text-slate-300" />
                   )}
                </div>
                <h2 className="text-2xl font-medium text-slate-900">{session?.name}</h2>
                <p className="text-slate-500 text-sm mt-1 tracking-tight">@{session?.otherUser?.username || 'user'}</p>
              </div>

              <div className="bg-white px-8 py-6 shadow-sm mb-4">
                 <p className="text-slate-400 text-sm font-medium mb-1">About</p>
                 <p className="text-slate-800 text-[15px] leading-relaxed">
                   {session?.otherUser?.bio || `Professional participant in the ${domain} network.`}
                 </p>
              </div>

              <div 
                 onClick={handleDeleteConversation}
                 className="bg-white px-8 py-4 shadow-sm flex items-center gap-4 text-red-500 cursor-pointer hover:bg-red-50 transition-all"
              >
                 <LogOut className="w-5 h-5" />
                 <p className="font-medium">Delete Conversation Permanently</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Professional Header */}
      <header className="h-[70px] bg-[#f0f2f5] border-b border-slate-200/60 px-4 flex items-center justify-between shadow-sm z-30 relative">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/')}
            className="p-2 hover:bg-slate-200/50 rounded-full transition-colors text-slate-500"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div 
            onClick={() => setIsOtherProfileOpen(true)}
            className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
          >
            <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center shadow-sm overflow-hidden">
               {session?.otherUser?.profileImage ? (
                  <img src={session.otherUser.profileImage} alt="Profile" className="w-full h-full object-cover" />
               ) : session?.name ? (
                 <div className="w-full h-full bg-brand/10 text-brand flex items-center justify-center font-bold text-base">
                   {session.name[0].toUpperCase()}
                 </div>
               ) : (
                 <Globe className="w-5 h-5 text-slate-400" />
               )}
            </div>
            <div className="flex flex-col">
              <h3 className="font-bold text-[15px] text-slate-900 leading-tight">
                {session?.name || 'Loading...'}
              </h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-slate-300'}`}></div>
                {isTyping ? (
                  <p className="text-[11px] text-brand font-bold animate-pulse">typing...</p>
                ) : isFetchingMessages ? (
                  <div className="flex items-center gap-1">
                    <div className="w-1 h-1 bg-brand rounded-full animate-bounce"></div>
                    <p className="text-[11px] text-brand font-bold">syncing messages...</p>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500 font-medium">
                    {isConnected ? 'online' : 'reconnecting...'}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <div className="flex items-center gap-1 md:gap-2 bg-white/80 backdrop-blur-sm p-1.5 px-2 md:px-3 rounded-xl border border-slate-200 shadow-sm">
             <Globe className="hidden xs:block w-3 h-3 md:w-3.5 md:h-3.5 text-brand" />
             <select 
                value={myLang} 
                onChange={(e) => handleLanguageChangeRequest(e.target.value)}
                className="text-[11px] font-bold bg-transparent border-none outline-none text-slate-700 cursor-pointer uppercase tracking-tight"
             >
               {languages.map(l => <option key={l} value={l}>{l}</option>)}
             </select>
          </div>
          
          <div className="flex items-center gap-1 text-slate-500">
             <button 
                onClick={() => setIsTranslationModalOpen(true)}
                className="p-2 rounded-full transition-all flex items-center gap-2 px-3 hover:bg-slate-200/50 text-brand font-bold"
                title="Translate Entire Conversation"
             >
                <Globe2 className="w-5 h-5" />
                <span className="text-xs hidden sm:inline">Translate History</span>
             </button>
             <button className="p-2 hover:bg-slate-200/50 rounded-full transition-all"><Search className="w-5 h-5" /></button>
             <div className="relative">
                <button 
                  onClick={() => setIsHeaderMenuOpen(!isHeaderMenuOpen)}
                  className={`p-2 hover:bg-slate-200/50 rounded-full transition-all ${isHeaderMenuOpen ? 'bg-slate-200' : ''}`}
                >
                  <MoreHorizontal className="w-5 h-5" />
                </button>
                
                <AnimatePresence>
                  {isHeaderMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsHeaderMenuOpen(false)} />
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden py-1"
                      >
                        <button 
                          onClick={() => {
                            setIsHeaderMenuOpen(false);
                            setIsTranslationModalOpen(true);
                          }}
                          className="w-full px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors"
                        >
                          <Globe2 className="w-4 h-4 text-brand" />
                          Translate Chat History
                        </button>
                        <div className="h-[1px] bg-slate-100 my-1" />
                        <button 
                          onClick={() => {
                            setIsHeaderMenuOpen(false);
                            handleDeleteConversation();
                          }}
                          className="w-full px-4 py-3 text-left text-sm font-medium text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete Chat Permanently
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
             </div>
          </div>
        </div>
      </header>

      {/* Message Feed */}
      <div className="flex-1 overflow-y-auto p-4 md:px-10 lg:px-32 space-y-2 custom-scrollbar relative z-10 no-scrollbar">
        <AnimatePresence>
          {messages.map((msg, i) => (
          <MessageBubble 
            key={msg._id || i}
            msg={msg}
            isOwn={String(msg.senderId) === String(user.id)}
            myLang={myLang}
            domain={domain}
          />
        ))}
        </AnimatePresence>
        
        {isTranslating && (
          <div className="flex items-start mb-4">
             <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-slate-100 italic text-[12px] text-slate-400">
               Translating neural link...
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <footer className="p-3 bg-[#f0f2f5] border-t border-slate-200/60 z-30 relative">
        <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex items-center gap-3">
          <div className="flex gap-1">
            <button type="button" className="p-2.5 hover:bg-slate-200/50 rounded-full text-slate-500 transition-all">
              <Sparkles className="w-6 h-6" />
            </button>
            <button 
              type="button" 
              onClick={toggleRecording}
              className={`p-2.5 rounded-full transition-all ${isRecording ? 'text-red-500 bg-red-50' : 'text-slate-500 hover:bg-slate-200/50'}`}
            >
              <Mic className="w-6 h-6" />
            </button>
          </div>
          
          <div className="flex-1">
            <input
              type="text"
              placeholder="Type a message"
              className="w-full bg-white border-none rounded-xl px-5 py-3 text-[15px] focus:ring-0 transition-all outline-none shadow-sm placeholder:text-slate-400"
              value={inputText}
              onChange={handleTextChange}
            />
          </div>

          <button 
            type="submit" 
            disabled={!inputText.trim()}
            className={`w-12 h-12 flex items-center justify-center rounded-full shadow-md transition-all ${
              inputText.trim() 
                ? 'bg-brand text-white scale-105 active:scale-95' 
                : 'bg-white text-slate-300'
            }`}
          >
            <Send className="w-5 h-5 ml-0.5" />
          </button>
        </form>
      </footer>
    </div>
  );
}

const MessageBubble = ({ msg, isOwn, myLang, domain }) => {
  const [displayText, setDisplayText] = useState(msg.originalText || msg.text);
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    // Show translation if available for the user's current preferred language
    if (msg.translations && msg.translations[myLang]) {
      setDisplayText(msg.translations[myLang]);
    } else {
      setDisplayText(msg.originalText || msg.text);
    }
  }, [myLang, msg.translations]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} mb-1 relative`}
    >
      <div className={`max-w-[85%] md:max-w-[70%] lg:max-w-[60%] px-3 py-1.5 rounded-[12px] shadow-sm relative ${
        isOwn 
          ? 'bg-[#dcf8c6] text-slate-900 rounded-tr-none' 
          : 'bg-white text-slate-900 rounded-tl-none border border-slate-100/50'
      }`}>
          {isTranslating ? (
            <div className="flex gap-1 items-center py-2 px-1">
              <div className="w-1 h-1 bg-slate-300 rounded-full animate-bounce"></div>
              <div className="w-1 h-1 bg-slate-300 rounded-full animate-bounce [animation-delay:0.2s]"></div>
              <div className="w-1 h-1 bg-slate-300 rounded-full animate-bounce [animation-delay:0.4s]"></div>
            </div>
          ) : (
            <div className="flex flex-col">
              <div className="text-[14.5px] leading-[1.4] pr-12 break-words whitespace-pre-wrap">
                {displayText.split(/(https?:\/\/[^\s]+)/g).map((part, index) => {
                  if (part.match(/^https?:\/\//)) {
                    return (
                      <a 
                        key={index} 
                        href={part} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline break-all"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {part}
                      </a>
                    );
                  }
                  return part;
                })}
              </div>
              
              {/* Basic Link Preview */}
              {displayText.match(/https?:\/\/[^\s]+/) && (
                <div className="mt-2 bg-black/5 rounded-lg overflow-hidden border border-black/5 flex flex-col pointer-events-auto">
                   {/* We could fetch real metadata here, but for now we show a nice "Link" indicator */}
                   <div className="p-2 flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded flex items-center justify-center shadow-sm">
                         <Globe className="w-5 h-5 text-blue-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Shared Link</p>
                         <p className="text-xs text-slate-600 truncate font-medium">
                            {displayText.match(/https?:\/\/[^\s]+/)[0]}
                         </p>
                      </div>
                   </div>
                </div>
              )}

              <div className="flex items-center gap-1 opacity-60 ml-auto mt-1">
                <span className="text-[10px] font-medium uppercase text-slate-500">
                  {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : ''}
                </span>
                {isOwn && (
                   <div className="flex items-center">
                      {msg.status === 'seen' ? (
                         <div className="flex -space-x-2">
                           <CheckCheck className="w-4 h-4 text-blue-500" strokeWidth={3} />
                         </div>
                      ) : (
                         <Check className="w-4 h-4 text-slate-400" strokeWidth={3} />
                      )}
                   </div>
                )}
              </div>
            </div>
          )}
      </div>
    </motion.div>
  );
};

export default ChatRoom;
