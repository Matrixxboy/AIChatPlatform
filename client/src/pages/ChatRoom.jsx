import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import axios from 'axios';
import { Send, Mic, ArrowLeft, MoreHorizontal, Globe, ShieldCheck, ChevronDown, CheckCircle2, AlertCircle, Sparkles, Hash, Volume2, Settings, Search, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function ChatRoom({ user, socket }) {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [session, setSession] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [myLang, setMyLang] = useState(() => user.preferredLanguage || localStorage.getItem('pref_myLang') || 'English');
  const [isConfirmingLang, setIsConfirmingLang] = useState(false);
  const [pendingLang, setPendingLang] = useState(null);

  useEffect(() => {
    localStorage.setItem('pref_myLang', myLang);
  }, [myLang]);

  const handleLanguageChangeRequest = (newLang) => {
    if (newLang === myLang) return;
    setPendingLang(newLang);
    setIsConfirmingLang(true);
    
    // Always update global language for FUTURE messages immediately
    setMyLang(newLang);
    
    // Update user profile silently
    try {
      const token = localStorage.getItem('token');
      axios.patch('http://localhost:5000/api/users/profile', 
        { preferredLanguage: newLang },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (err) {
      console.error('Failed to update language profile');
    }
  };

  const confirmHistoryTranslation = () => {
    // Apply the new language to all EXISTING messages
    setMessages(prev => prev.map(msg => ({
      ...msg,
      targetLang: pendingLang
    })));
    setIsConfirmingLang(false);
  };

  const cancelHistoryTranslation = () => {
    setIsConfirmingLang(false);
    // Future messages will already be in pendingLang (myLang), 
    // old ones stay as they were.
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

    const handleReceiveMessage = (message) => {
      setIsTranslating(false);
      // Lock the incoming message to the CURRENT language
      const messageWithLang = { ...message, targetLang: myLang };
      
      setMessages(prev => {
        if (messageWithLang.senderId === user.id) {
          const exists = prev.find(m => m.isOptimistic && m.text === messageWithLang.text);
          if (exists) return prev.map(m => (m._id === exists._id ? messageWithLang : m));
        }
        if (prev.find(m => m._id === messageWithLang._id)) return prev;
        return [...prev, messageWithLang];
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

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('receive_message', handleReceiveMessage);
      socket.off('user_typing', handleUserTyping);
    };
  }, [socket, sessionId, user.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchSessionDetails = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/sessions', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const current = res.data.find(s => s._id === sessionId);
      setSession(current);
    } catch (err) {
      console.error('Failed to fetch session details');
    }
  };

  const fetchMessages = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`http://localhost:5000/api/sessions/${sessionId}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Lock history messages to the CURRENTLY SELECTED language
      const messagesWithLang = res.data.map(msg => ({ ...msg, targetLang: myLang }));
      setMessages(messagesWithLang);
    } catch (err) {
      console.error('Failed to fetch messages');
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
      if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
        alert('Speech recognition not supported');
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
      {/* Language Confirmation Modal */}
      <AnimatePresence>
        {isConfirmingLang && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsConfirmingLang(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-2xl p-6 shadow-2xl max-w-sm w-full relative z-10"
            >
              <div className="w-12 h-12 bg-brand/10 rounded-full flex items-center justify-center mb-4">
                <Globe className="w-6 h-6 text-brand" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Change Language?</h3>
              <p className="text-slate-500 text-sm leading-relaxed mb-6">
                Language updated to <span className="font-bold text-slate-900">{pendingLang}</span> for new messages. Would you like to re-translate the previous chat history as well?
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={cancelHistoryTranslation}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-colors text-sm"
                >
                  Keep Original
                </button>
                <button 
                  onClick={confirmHistoryTranslation}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-brand text-white font-semibold shadow-lg shadow-brand/20 hover:bg-brand/90 transition-colors text-sm"
                >
                  Translate All
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
            className="absolute inset-y-0 right-0 w-[420px] bg-[#f0f2f5] z-50 shadow-2xl flex flex-col border-l border-slate-200"
          >
            <div className="h-[70px] bg-[#f0f2f5] border-b border-slate-200 flex items-center px-6 gap-6">
              <button 
                onClick={() => setIsOtherProfileOpen(false)}
                className="text-slate-500 p-2 hover:bg-slate-200 rounded-full transition-all"
              >
                <ArrowLeft className="w-6 h-6 rotate-180" />
              </button>
              <h2 className="text-slate-800 font-bold text-lg">Contact info</h2>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="bg-white py-8 flex flex-col items-center shadow-sm mb-4">
                <div className="w-52 h-52 bg-slate-100 rounded-full flex items-center justify-center shadow-md mb-6 overflow-hidden">
                   {session?.name ? (
                     <div className="w-full h-full bg-brand/10 text-brand flex items-center justify-center font-bold text-6xl">
                       {session.name[0].toUpperCase()}
                     </div>
                   ) : (
                     <Globe className="w-16 h-16 text-slate-300" />
                   )}
                </div>
                <h2 className="text-2xl font-medium text-slate-900">{session?.name}</h2>
                <p className="text-slate-500 text-sm mt-1 tracking-tight">Active via Neural Link</p>
              </div>

              <div className="bg-white px-8 py-6 shadow-sm mb-4">
                 <p className="text-slate-400 text-sm font-medium mb-1">About</p>
                 <p className="text-slate-800 text-[15px] leading-relaxed">
                   High-performance participant in the {domain} network.
                 </p>
              </div>

              <div className="bg-white px-8 py-4 shadow-sm flex items-center gap-4 text-red-500 cursor-pointer hover:bg-red-50 transition-all">
                 <LogOut className="w-5 h-5" />
                 <p className="font-medium">Block {session?.name}</p>
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
               {session?.name ? (
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
                ) : (
                  <p className="text-[11px] text-slate-500 font-medium">
                    {isConnected ? 'online' : 'reconnecting...'}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm p-1.5 px-3 rounded-xl border border-slate-200 shadow-sm">
             <Globe className="w-3.5 h-3.5 text-brand" />
             <select 
                value={myLang} 
                onChange={(e) => handleLanguageChangeRequest(e.target.value)}
                className="text-[11px] font-bold bg-transparent border-none outline-none text-slate-700 cursor-pointer uppercase tracking-tight"
             >
               {languages.map(l => <option key={l} value={l}>{l}</option>)}
             </select>
          </div>
          
          <div className="flex items-center gap-1 text-slate-500">
             <button className="p-2 hover:bg-slate-200/50 rounded-full transition-all"><Search className="w-5 h-5" /></button>
             <button className="p-2 hover:bg-slate-200/50 rounded-full transition-all"><MoreHorizontal className="w-5 h-5" /></button>
          </div>
        </div>
      </header>

      {/* Message Feed */}
      <div className="flex-1 overflow-y-auto p-4 md:px-10 lg:px-32 space-y-2 custom-scrollbar relative z-10">
        <AnimatePresence>
        {messages.map((msg, i) => (
          <MessageBubble 
            key={msg._id || i}
            msg={msg}
            isOwn={String(msg.senderId) === String(user.id)}
            targetLang={msg.targetLang || myLang}
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

const MessageBubble = ({ msg, isOwn, targetLang, domain }) => {
  const [displayText, setDisplayText] = useState(() => {
    if (msg.translations && msg.translations[targetLang]) {
      return msg.translations[targetLang];
    }
    return msg.originalText || msg.text;
  });
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    if (msg.fromLang === targetLang) {
      setDisplayText(msg.originalText || msg.text);
      return;
    }

    if (msg.translations && msg.translations[targetLang]) {
      setDisplayText(msg.translations[targetLang]);
      return;
    }

    const fetchTranslation = async () => {
      if (!msg._id || isTranslating) return;
      setIsTranslating(true);
      try {
        const token = localStorage.getItem('token');
        const res = await axios.post(`http://localhost:5000/api/sessions/messages/${msg._id}/translate`, {
          toLang: targetLang,
          domain: domain
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setDisplayText(res.data.translation);
        if (!msg.translations) msg.translations = {};
        msg.translations[targetLang] = res.data.translation;
      } catch (err) {
        setDisplayText(msg.originalText || msg.text);
      } finally {
        setIsTranslating(false);
      }
    };

    fetchTranslation();
  }, [targetLang, msg._id, domain]);

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
              <p className="text-[14.5px] leading-[1.4] pr-16 break-words whitespace-pre-wrap">{displayText}</p>
              <div className="flex items-center gap-1 opacity-40 ml-auto mt-[-4px]">
                <span className="text-[10px] font-medium uppercase">
                  {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : ''}
                </span>
                {isOwn && (
                   <svg className="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                     <path d="m3 12 4 4 10-10"/><path d="m2 12 5 5 11-11"/>
                   </svg>
                )}
              </div>
            </div>
          )}
      </div>
    </motion.div>
  );
};

export default ChatRoom;
