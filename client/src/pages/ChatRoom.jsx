import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import io from "socket.io-client";
import api from "../api";
import {
  Search,
  Plus,
  MessageSquare,
  Mic,
  Send,
  ArrowLeft,
  Globe,
  Sparkles,
  LogOut,
  X,
  Phone,
  Video,
  MoreVertical,
  MoreHorizontal,
  Globe2,
  Check,
  CheckCheck,
  Trash2,
  FileText,
  FileImage,
  File,
  FileVideo,
  FileAudio,
  Download,
  ExternalLink,
  Eye,
  ZoomIn,
  Users,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import AddGroupMemberModal from "../components/AddGroupMemberModal";
import chatBg from "../assets/chat-bg.png";

const formatChatDate = (dateString) => {
  const date = new Date(dateString);
  const today = new Date();

  const isToday = date.toDateString() === today.toDateString();

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (isToday) return "Today";
  if (isYesterday) return "Yesterday";

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

function ChatRoom({ user, onUserUpdate, socket }) {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const [messages, setMessages] = useState(() => {
    const cached = localStorage.getItem(`cached_messages_${sessionId}`);
    return cached ? JSON.parse(cached) : [];
  });
  const [isFetchingMessages, setIsFetchingMessages] = useState(false);
  const [inputText, setInputText] = useState("");
  const [session, setSession] = useState(null);
  const [myLang, setMyLang] = useState(
    () =>
      user.preferredLanguage ||
      localStorage.getItem("pref_myLang") ||
      "English",
  );
  const [isTranslationModalOpen, setIsTranslationModalOpen] = useState(false);
  const [translationTargetLang, setTranslationTargetLang] = useState(myLang);
  const [isProcessingTranslation, setIsProcessingTranslation] = useState(false);
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  const [attachedFile, setAttachedFile] = useState(null); // { name, url, type }
  const [previewImage, setPreviewImage] = useState(null); // For full-screen modal
  const [notification, setNotification] = useState({
    show: false,
    message: "",
    type: "info",
  });
  const [replyingTo, setReplyingTo] = useState(null); // { _id, text, senderName }
  const [originalMsgView, setOriginalMsgView] = useState(null); // { text, sender }

  const showToast = (message, type = "info") => {
    setNotification({ show: true, message, type });
    setTimeout(
      () => setNotification((prev) => ({ ...prev, show: false })),
      4000,
    );
  };

  // Safe localStorage writer — evicts old message caches on QuotaExceededError
  const safeLocalStorageSet = (key, value) => {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      if (e instanceof DOMException && (e.name === "QuotaExceededError" || e.name === "NS_ERROR_DOM_QUOTA_REACHED")) {
        // Evict all cached message keys to free space
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith("cached_messages_") && k !== key) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
        // Retry once after eviction
        try {
          localStorage.setItem(key, value);
        } catch (_) {
          // Still too large — skip cache silently (in-memory state still works)
        }
      }
    }
  };

  const [isRecording, setIsRecording] = useState(false);
  useEffect(() => {
    localStorage.setItem("pref_myLang", myLang);
  }, [myLang]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      const newHeight = Math.max(Math.min(textarea.scrollHeight, 120), 36);
      textarea.style.height = `${newHeight}px`;
    }
  }, [inputText]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  const handleLanguageChangeRequest = async (newLang) => {
    if (newLang === myLang) return;

    // 1. Update local state and profile immediately
    setMyLang(newLang);
    onUserUpdate({ preferredLanguage: newLang });

    try {
      await api.patch(`/api/users/profile`, { preferredLanguage: newLang });

      // 2. Open the confirmation modal - fulfilling "ask user before calling translating all api"
      setTranslationTargetLang(newLang);
      setIsTranslationModalOpen(true);
    } catch (err) {
      console.error("Failed to update language profile");
    }
  };

  const handleDeleteConversation = async () => {
    if (
      !window.confirm(
        "Are you sure you want to permanently delete this entire conversation? This action cannot be undone.",
      )
    )
      return;

    try {
      await api.delete(`/api/sessions/${sessionId}/permanent`);
      navigate("/dashboard");
    } catch (err) {
      console.error("Failed to delete conversation:", err);
      alert("Failed to delete conversation. Please try again.");
    }
  };

  const handleTranslateFullChat = async (targetLangOverride = null) => {
    const target = targetLangOverride || translationTargetLang;
    setIsProcessingTranslation(true);
    try {
      await api.post(`/api/sessions/${sessionId}/translate-all`, {
        toLang: target,
        domain: domain,
      });

      // Refresh messages to show the newly stored translations
      await fetchMessages();
    } catch (err) {
      console.error("Batch translation failed:", err);
    } finally {
      setIsProcessingTranslation(false);
      setIsTranslationModalOpen(false);
    }
  };

  const [domain, setDomain] = useState("general");
  const [isTranslating, setIsTranslating] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isOtherProfileOpen, setIsOtherProfileOpen] = useState(false);
  const [isGroupDetailsOpen, setIsGroupDetailsOpen] = useState(false);
  const [groupMembers, setGroupMembers] = useState([]);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [allUsersList, setAllUsersList] = useState([]);

  const fetchGroupMembers = async () => {
    try {
      const res = await api.get(`/api/sessions/${sessionId}/members`);
      setGroupMembers(res.data || []);
    } catch (err) {
      console.error("Failed to fetch group members", err);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const res = await api.get("/api/users");
      setAllUsersList(res.data || []);
    } catch (err) {
      console.error("Failed to fetch all users", err);
    }
  };

  useEffect(() => {
    if (isGroupDetailsOpen && sessionId) {
      fetchGroupMembers();
      fetchAllUsers();
    }
  }, [isGroupDetailsOpen, sessionId]);

  const typingTimeoutRef = useRef(null);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  const languages = [
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
  ];

  const langCodes = {
    English: "en-US",
    "Chinese (Mandarin)": "zh-CN",
    Spanish: "es-ES",
    French: "fr-FR",
    German: "de-DE",
    Japanese: "ja-JP",
    Korean: "ko-KR",
    Arabic: "ar-SA",
    Hindi: "hi-IN",
    Portuguese: "pt-BR",
    Russian: "ru-RU",
    Italian: "it-IT",
    Dutch: "nl-NL",
    Turkish: "tr-TR",
    Gujarati: "gu-IN",
  };

  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    fetchSessionDetails();
    fetchMessages();

    if (!socket) return;

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    if (socket.connected) setIsConnected(true);

    socket.emit("join_session", sessionId);

    const handleReceiveMessage = (message) => {
      setIsTranslating(false);

      // Ensure we have a text field for UI consistency
      if (!message.text && message.originalText) {
        message.text = message.originalText;
      }

      const messageWithLang = { ...message };

      setMessages((prev) => {
        const senderMatch =
          String(messageWithLang.senderId) === String(user.id);

        if (senderMatch) {
          // Match by originalText (trimmed) to replace optimistic message
          const exists = prev.find(
            (m) =>
              m.isOptimistic &&
              (m.originalText || "").trim() ===
                (messageWithLang.originalText || "").trim(),
          );
          if (exists) {
            console.log(
              "Replacing optimistic message",
              exists._id,
              "with",
              messageWithLang._id,
            );
            const updated = prev.map((m) =>
              m._id === exists._id ? messageWithLang : m,
            );
            safeLocalStorageSet(
              `cached_messages_${sessionId}`,
              JSON.stringify(updated),
            );
            return updated;
          }
        }

        if (prev.find((m) => m._id === messageWithLang._id)) return prev;

        // Mark as seen if it's from others
        if (String(messageWithLang.senderId) !== String(user.id)) {
          socket.emit("mark_seen", {
            messageId: messageWithLang._id,
            sessionId,
            userId: user.id,
          });
        }

        const updated = [...prev, messageWithLang];
        safeLocalStorageSet(
          `cached_messages_${sessionId}`,
          JSON.stringify(updated),
        );
        return updated;
      });
    };

    const handleStatusUpdate = (data) => {
      setMessages((prev) => {
        const updated = prev.map((m) =>
          m._id === data.messageId ? { ...m, status: data.status } : m,
        );
        safeLocalStorageSet(
          `cached_messages_${sessionId}`,
          JSON.stringify(updated),
        );
        return updated;
      });
    };

    const handleSessionMessagesSeen = (data) => {
      setMessages((prev) => {
        const updated = prev.map((m) =>
          m.senderId === user.id ? { ...m, status: "seen" } : m,
        );
        safeLocalStorageSet(
          `cached_messages_${sessionId}`,
          JSON.stringify(updated),
        );
        return updated;
      });
    };

    const handleUserTyping = (data) => {
      if (data.userId !== user.id) {
        setIsTyping(data.isTyping);
      }
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("receive_message", handleReceiveMessage);
    socket.on("user_typing", handleUserTyping);
    socket.on("message_status_update", handleStatusUpdate);
    socket.on("session_messages_seen", handleSessionMessagesSeen);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("receive_message", handleReceiveMessage);
      socket.off("user_typing", handleUserTyping);
      socket.off("message_status_update", handleStatusUpdate);
      socket.off("session_messages_seen", handleSessionMessagesSeen);
    };
  }, [socket, sessionId, user.id, myLang, domain]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchSessionDetails = async () => {
    try {
      const res = await api.get(`/api/sessions`);
      const current = res.data.find((s) => s._id === sessionId);
      setSession(current);
    } catch (err) {
      console.error("Failed to fetch session details");
      showToast("Could not load session details", "error");
    }
  };

  const fetchMessages = async () => {
    setIsFetchingMessages(true);
    let messagesData = null;
    try {
      const res = await api.get(`/api/sessions/${sessionId}/messages`);
      messagesData = res.data;
      setMessages(messagesData);
    } catch (err) {
      console.error("Failed to fetch messages:", err);
      showToast("Could not load message history", "error");
    } finally {
      setIsFetchingMessages(false);
    }
    // Write to cache separately — never let a storage error trigger the error toast
    if (messagesData) {
      safeLocalStorageSet(
        `cached_messages_${sessionId}`,
        JSON.stringify(messagesData),
      );
    }
  };

  const handleTextChange = (e) => {
    const text = e.target.value;
    setInputText(text);

    if (socket && text.trim().length > 0) {
      socket.emit("typing", { sessionId, userId: user.id });

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit("stop_typing", { sessionId, userId: user.id });
      }, 2000);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !socket) return;

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    socket.emit("stop_typing", { sessionId, userId: user.id });

    const optimisticMsg = {
      _id: "temp-" + Date.now(),
      senderId: user.id,
      text: inputText,
      originalText: inputText,
      fromLang: myLang,
      targetLang: myLang,
      messageType: attachedFile ? "file" : "text",
      fileUrl: attachedFile?.url,
      fileName: attachedFile?.name,
      fileSize: attachedFile?.size,
      replyTo: replyingTo?._id,
      replyToText: replyingTo?.text,
      replyToSender: replyingTo?.senderName,
      createdAt: new Date().toISOString(),
      isOptimistic: true,
    };

    setMessages((prev) => [...prev, optimisticMsg]);

    socket.emit("send_message", {
      sessionId,
      userId: user.id,
      text: inputText,
      fromLang: myLang,
      domain,
      messageType: attachedFile ? "file" : "text",
      fileUrl: attachedFile?.url,
      fileName: attachedFile?.name,
      fileSize: attachedFile?.size,
      replyTo: replyingTo?._id,
      replyToText: replyingTo?.text,
      replyToSender: replyingTo?.senderName,
    });

    setInputText("");
    setAttachedFile(null); // Clear attachment
    setReplyingTo(null); // Clear reply state
  };

  const handleCancelUpload = async () => {
    if (!attachedFile) return;

    // Extract filename from stored_filename or url
    // The stored_filename is what the API uses for deletion
    const filenameToDelete = attachedFile.stored_filename;

    if (!filenameToDelete) {
      setAttachedFile(null);
      return;
    }

    try {
      await api.delete(`/api/upload/${filenameToDelete}`);
      setAttachedFile(null);
    } catch (err) {
      console.error("Failed to delete file:", err);
      // Even if delete fails on server (maybe already gone), clear locally
      setAttachedFile(null);
    }
  };

  const getFileIcon = (filename, type) => {
    const name = filename?.toLowerCase() || "";
    if (name.endsWith(".pdf"))
      return <FileText className="w-6 h-6 text-red-500" />;
    if (name.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i))
      return <FileImage className="w-6 h-6 text-blue-500" />;
    if (name.match(/\.(mp4|mov|avi|wmv)$/i))
      return <FileVideo className="w-6 h-6 text-purple-500" />;
    if (name.match(/\.(mp3|wav|ogg)$/i))
      return <FileAudio className="w-6 h-6 text-emerald-500" />;
    return <File className="w-6 h-6 text-slate-500" />;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check size - fulfilling "refuse when some on try to upload more than 10mb"
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_SIZE) {
      showToast(
        `File is too large (${formatFileSize(file.size)}). Max limit is 10MB.`,
        "warning",
      );
      e.target.value = "";
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      setIsFetchingMessages(true);
      const res = await api.post(`/api/upload`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setAttachedFile({
        name: file.name,
        url: res.data.url,
        stored_filename: res.data.stored_filename,
        type: file.type,
        size: res.data.size,
      });

      e.target.value = ""; // Reset input
    } catch (err) {
      console.error("File upload failed:", err);
      const errorMsg = err.response?.data?.detail || "Failed to upload file";
      showToast(errorMsg, "error");
    } finally {
      setIsFetchingMessages(false);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    } else {
      if (!window.isSecureContext && window.location.hostname !== "localhost") {
        showToast("Microphone access requires HTTPS", "warning");
        return;
      }
      if (
        !("webkitSpeechRecognition" in window || "SpeechRecognition" in window)
      ) {
        showToast("Speech recognition not supported in this browser", "error");
        return;
      }
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SR();
      recognition.lang = langCodes[myLang] || "en-US";
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
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                Translate Full Chat?
              </h3>
              <p className="text-slate-500 text-sm leading-relaxed mb-4">
                This will convert the whole conversation into your selected
                language and save it to your history.
              </p>

              <div className="mb-6">
                <select
                  value={translationTargetLang}
                  onChange={(e) => setTranslationTargetLang(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 text-slate-700 font-medium focus:ring-2 focus:ring-brand/20 outline-none"
                >
                  {languages.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
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
                  {isProcessingTranslation && (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  )}
                  {isProcessingTranslation ? "Processing..." : "Translate All"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Generated Subtle Doodle Pattern Background */}
      <div
        className="absolute inset-0 opacity-[0.05] pointer-events-none z-0"
        style={{
          backgroundImage: `url("${chatBg}")`,
          backgroundSize: "500px",
          backgroundRepeat: "repeat",
        }}
      ></div>

      {/* Other Participant Profile (Slides in from right) */}
      <AnimatePresence>
        {isOtherProfileOpen && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
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
                    <img
                      src={session.otherUser.profileImage}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : session?.name ? (
                    <div className="w-full h-full bg-brand/10 text-brand flex items-center justify-center font-bold text-6xl">
                      {session.name[0].toUpperCase()}
                    </div>
                  ) : (
                    <Globe className="w-16 h-16 text-slate-300" />
                  )}
                </div>
                <h2 className="text-2xl font-medium text-slate-900">
                  {session?.name}
                </h2>
                <p className="text-slate-500 text-sm mt-1 tracking-tight">
                  @{session?.otherUser?.username || "user"}
                </p>
              </div>

              <div className="bg-white px-8 py-6 shadow-sm mb-4">
                <p className="text-slate-400 text-sm font-medium mb-1">About</p>
                <p className="text-slate-800 text-[15px] leading-relaxed">
                  {session?.otherUser?.bio ||
                    `Professional participant in the ${domain} network.`}
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

      {/* Group Details Profile (Slides in from right) */}
      <AnimatePresence>
        {isGroupDetailsOpen && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed md:absolute inset-y-0 right-0 w-full md:w-[400px] bg-white z-[60] shadow-2xl flex flex-col border-l border-slate-200"
          >
            <div className="h-[110px] bg-[#f0f2f5] flex items-end p-6 pb-4 gap-6 shrink-0">
              <button
                onClick={() => setIsGroupDetailsOpen(false)}
                className="text-slate-500 p-1 hover:bg-slate-200 rounded-full transition-all"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <h2 className="text-slate-800 font-bold text-lg">Group info</h2>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="bg-white py-6 flex flex-col items-center shadow-sm rounded-2xl border border-slate-100">
                <div className="w-28 h-28 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center shadow-md mb-4">
                  <Users className="w-12 h-12" />
                </div>
                <h2 className="text-xl font-black text-slate-900 text-center px-4">
                  {session?.name}
                </h2>
                <p className="text-slate-400 text-xs mt-1 font-bold uppercase tracking-wider">
                  {groupMembers.length} Members
                </p>
              </div>

              {/* Add Member Section */}
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Group Members
                  </h3>
                  {session?.isGroup && session?.admins?.includes(user.id) && (
                    <button
                      onClick={() => setIsAddMemberOpen(true)}
                      className="text-xs font-bold text-brand hover:underline cursor-pointer"
                    >
                      + Add Member
                    </button>
                  )}
                </div>

                <div className="divide-y divide-slate-100 max-h-[30vh] overflow-y-auto pr-1">
                  {groupMembers.map((m) => (
                    <div
                      key={m._id}
                      className="py-2.5 flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <p className="font-bold text-slate-800 flex items-center gap-1.5">
                          {m.name}
                          {m.isAdmin && (
                            <span className="text-[9px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                              Admin
                            </span>
                          )}
                        </p>
                        <p className="text-[10px] text-slate-400 font-medium">
                          Speaks {m.preferredLanguage || "English"}
                        </p>
                      </div>

                      {/* Allow admins (or creator) to remove members, and allow leaving */}
                      {String(m._id) !== String(user.id)
                        ? session?.admins?.includes(user.id) && (
                            <button
                              onClick={async () => {
                                try {
                                  await api.delete(
                                    `/api/sessions/${sessionId}/members/${m._id}`,
                                  );
                                  fetchGroupMembers();
                                  showToast(
                                    `${m.name} removed from group`,
                                    "info",
                                  );
                                } catch (err) {
                                  console.error("Failed to remove member", err);
                                  showToast("Failed to remove member", "error");
                                }
                              }}
                              className="text-[10px] text-red-500 font-bold hover:underline"
                            >
                              Remove
                            </button>
                          )
                        : null}
                    </div>
                  ))}
                </div>
              </div>

              {/* Leave Group Action */}
              <button
                onClick={async () => {
                  try {
                    await api.delete(
                      `/api/sessions/${sessionId}/members/${user.id}`,
                    );
                    navigate("/dashboard");
                  } catch (err) {
                    console.error("Failed to leave group", err);
                    showToast("Failed to leave group", "error");
                  }
                }}
                className="w-full bg-red-50 hover:bg-red-100 text-red-600 rounded-2xl py-3 text-xs font-bold transition-colors flex items-center justify-center gap-2 border border-red-100"
              >
                <LogOut className="w-4 h-4" />
                Leave Group
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Professional Header */}
      <header className="h-[70px] bg-[#f0f2f5] border-b border-slate-200/60 px-4 flex items-center justify-between shadow-sm z-30 relative">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/dashboard")}
            className="p-2 hover:bg-slate-200/50 rounded-full transition-colors text-slate-500"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div
            onClick={() =>
              session?.isGroup
                ? setIsGroupDetailsOpen(true)
                : setIsOtherProfileOpen(true)
            }
            className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
          >
            <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center shadow-sm overflow-hidden">
              {session?.otherUser?.profileImage ? (
                <img
                  src={session.otherUser.profileImage}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : session?.isGroup ? (
                <div className="w-full h-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Users className="w-5.5 h-5.5" />
                </div>
              ) : session?.name ? (
                <div className="w-full h-full bg-brand/10 text-brand flex items-center justify-center font-bold text-base">
                  {session.name[0].toUpperCase()}
                </div>
              ) : (
                <Globe className="w-5 h-5 text-slate-400" />
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <h3 className="font-bold text-[13px] sm:text-[15px] text-slate-900 leading-tight truncate max-w-[80px] xs:max-w-[135px] sm:max-w-[220px] md:max-w-xs">
                {session?.name || "Loading..."}
              </h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div
                  className={`w-1.5 h-1.5 rounded-full ${isConnected ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-slate-300"}`}
                ></div>
                {isTyping ? (
                  <p className="text-[11px] text-brand font-bold animate-pulse">
                    typing...
                  </p>
                ) : isFetchingMessages ? (
                  <div className="flex items-center gap-1">
                    <div className="w-1 h-1 bg-brand rounded-full animate-bounce"></div>
                    <p className="text-[11px] text-brand font-bold">
                      syncing messages...
                    </p>
                  </div>
                ) : session?.isGroup ? (
                  <p className="text-[11px] text-slate-500 font-medium">
                    Tap to view members
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-500 font-medium">
                    {isConnected ? "online" : "reconnecting..."}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 md:gap-4 shrink-0">
          <div className="flex items-center gap-1 bg-white/80 backdrop-blur-sm p-1 sm:p-1.5 px-1.5 sm:px-2 rounded-lg sm:rounded-xl border border-slate-200 shadow-sm max-w-[85px] xs:max-w-[125px] sm:max-w-none">
            <Globe className="hidden sm:block w-3 h-3 sm:w-3.5 sm:h-3.5 text-brand shrink-0" />
            <select
              value={myLang}
              onChange={(e) => handleLanguageChangeRequest(e.target.value)}
              className="text-[10px] sm:text-[11px] font-black bg-transparent border-none outline-none text-slate-700 cursor-pointer uppercase tracking-tight max-w-full truncate"
            >
              {languages.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1 text-slate-500">
            {/* <button 
                onClick={() => setIsTranslationModalOpen(true)}
                className="p-2 rounded-full transition-all flex items-center gap-2 px-3 hover:bg-slate-200/50 text-brand font-bold"
                title="Translate Entire Conversation"
             >
                <Globe2 className="w-5 h-5" />
                <span className="text-xs hidden sm:inline">Translate History</span>
             </button> */}
            {/* <button className="p-2 hover:bg-slate-200/50 rounded-full transition-all">
              <Search className="w-5 h-5" />
            </button> */}
            <div className="relative">
              <button
                onClick={() => setIsHeaderMenuOpen(!isHeaderMenuOpen)}
                className={`p-2 hover:bg-slate-200/50 rounded-full transition-all ${isHeaderMenuOpen ? "bg-slate-200" : ""}`}
              >
                <MoreHorizontal className="w-5 h-5" />
              </button>

              <AnimatePresence>
                {isHeaderMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsHeaderMenuOpen(false)}
                    />
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
                      {(!session?.isGroup ||
                        session?.admins?.includes(user.id)) && (
                        <button
                          onClick={() => {
                            setIsHeaderMenuOpen(false);
                            handleDeleteConversation();
                          }}
                          className="w-full px-4 py-3 text-left text-sm font-medium text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                          {session?.isGroup
                            ? "Delete Group Permanently"
                            : "Delete Chat Permanently"}
                        </button>
                      )}
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
          {messages.map((msg, index) => {
            const currentDate = new Date(msg.createdAt).toDateString();

            const previousDate =
              index > 0
                ? new Date(messages[index - 1].createdAt).toDateString()
                : null;

            const showDateSeparator = currentDate !== previousDate;

            return (
              <React.Fragment key={msg._id || msg.id || index}>
                {showDateSeparator && (
                  <div className="flex justify-center my-3 sticky top-2 z-20">
                    <div className="bg-[#e1f2fb] text-slate-700 text-[11px] px-3 py-1 rounded-lg shadow-sm">
                      {formatChatDate(msg.createdAt)}
                    </div>
                  </div>
                )}

                <MessageBubble
                  msg={msg}
                  allMessages={messages}
                  isOwn={String(msg.senderId) === String(user.id)}
                  otherName={session?.name}
                  isGroup={session?.isGroup}
                  myLang={myLang}
                  domain={session?.domain || "General"}
                  onImageClick={(data) => setPreviewImage(data)}
                  onReply={(m) => setReplyingTo(m)}
                  onShowOriginal={(text, sender) =>
                    setOriginalMsgView({ text, sender })
                  }
                />
              </React.Fragment>
            );
          })}
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
        <div className="max-w-4xl mx-auto">
          {/* Attachment Preview - fulfilling "make preview in the chat" */}
          <AnimatePresence>
            {attachedFile && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="mb-3 p-3 bg-white rounded-xl shadow-lg border border-brand/20 flex items-center gap-4 group"
              >
                <div className="w-12 h-12 bg-brand/10 rounded-lg flex items-center justify-center overflow-hidden">
                  {attachedFile.type?.startsWith("image/") ? (
                    <img
                      src={
                        attachedFile.url.startsWith("http") ||
                        attachedFile.url.startsWith("/ai-chat-platform")
                          ? attachedFile.url
                          : `${import.meta.env.VITE_API_URL}${attachedFile.url}`
                      }
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    getFileIcon(attachedFile.name, attachedFile.type)
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800 truncate">
                    {attachedFile.name}
                  </p>
                  <p className="text-[11px] text-brand uppercase font-bold tracking-wider">
                    {formatFileSize(attachedFile.size)} • Ready to send
                  </p>
                </div>
                <button
                  onClick={handleCancelUpload}
                  className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-full transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Reply Preview */}
          <AnimatePresence>
            {replyingTo && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="mb-3 p-3 bg-white rounded-xl shadow-lg border-l-4 border-l-brand flex items-center gap-4"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold text-brand uppercase tracking-wider">
                    Replying to {replyingTo.senderName}
                  </p>
                  <p className="text-sm text-slate-600 truncate">
                    {replyingTo.text}
                  </p>
                </div>
                <button
                  onClick={() => setReplyingTo(null)}
                  className="p-2 hover:bg-slate-100 text-slate-400 rounded-full transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSendMessage} className="flex items-end gap-2.5">
            {/* Left Capsule containing Attachment, Mic and Textarea */}
            <div className="flex-1 bg-white rounded-[24px] pl-2 pr-3 py-1 flex items-end gap-2 shadow-sm border border-slate-200/50 min-w-0">
              {/* Voice Mic inside the capsule (Left) - aligned with the first line */}
              <div className="h-[36px] flex items-center shrink-0">
                <button
                  type="button"
                  onClick={toggleRecording}
                  className={`p-1.5 rounded-full transition-all shrink-0 ${
                    isRecording
                      ? "text-red-500 bg-red-55"
                      : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <Mic className="w-5.5 h-5.5" />
                </button>
              </div>

              {/* Textarea (Center) */}
              <div className="flex-1 min-w-0">
                <textarea
                  ref={textareaRef}
                  rows={1}
                  placeholder="Type a message"
                  className="w-full bg-transparent border-none p-0 py-2 text-[15px] focus:ring-0 outline-none resize-none max-h-[120px] overflow-y-auto leading-[20px] text-slate-800 placeholder:text-slate-400 block"
                  value={inputText}
                  onChange={handleTextChange}
                  onKeyDown={handleKeyDown}
                  style={{ height: "36px" }}
                />
              </div>

              {/* Attachment Button inside the capsule (Right) - aligned with the first line */}
              <div className="h-[36px] flex items-center shrink-0">
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current.click()}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"
                  title="Attach file"
                >
                  <Plus className="w-5.5 h-5.5" />
                </button>
              </div>
            </div>

            {/* Send/Submit Circular Button (Right) */}
            <button
              type="submit"
              disabled={!inputText.trim() && !attachedFile}
              className={`w-11 h-11 flex items-center justify-center rounded-full shadow-md shrink-0 transition-all cursor-pointer ${
                inputText.trim() || attachedFile
                  ? "bg-brand text-white hover:scale-105 active:scale-95"
                  : "bg-white text-slate-350 border border-slate-200"
              }`}
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      </footer>

      {/* Original Message View Modal */}
      <AnimatePresence>
        {originalMsgView && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOriginalMsgView(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-2xl p-6 shadow-2xl max-w-4xl w-full relative z-10"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Globe className="w-5 h-5 text-brand" />
                  Original Message
                </h3>
                <button
                  onClick={() => setOriginalMsgView(null)}
                  className="p-2 hover:bg-slate-100 rounded-full text-slate-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-4 max-h-[60vh] overflow-y-auto">
                <p className="text-slate-800 leading-relaxed whitespace-pre-wrap">
                  {originalMsgView.text}
                </p>
              </div>

              <div className="flex justify-between items-center text-[11px] text-slate-400 font-medium uppercase tracking-wider">
                <span>Sent by {originalMsgView.sender}</span>
                <span>Original Text</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Premium Full-Screen Image Viewer Modal */}
      <AnimatePresence>
        {previewImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/95 flex flex-col items-center justify-center p-4 md:p-8 backdrop-blur-sm"
          >
            <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center bg-gradient-to-b from-black/50 to-transparent">
              <div className="flex flex-col">
                <span className="text-white font-bold text-sm truncate max-w-[200px] md:max-w-md">
                  {previewImage.name}
                </span>
                <span className="text-white/60 text-[10px] uppercase tracking-widest">
                  Shared Image
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    handleDownload(previewImage.url, previewImage.name)
                  }
                  className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
                  title="Download"
                >
                  <Download className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setPreviewImage(null)}
                  className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <motion.img
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              src={previewImage.url}
              alt={previewImage.name}
              className="max-w-full max-h-[85vh] object-contain shadow-2xl rounded-sm"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modern Responsive Toast Notification */}
      <AnimatePresence>
        {notification.show && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border min-w-[300px]"
            style={{
              backgroundColor:
                notification.type === "error"
                  ? "#fef2f2"
                  : notification.type === "warning"
                    ? "#fffbeb"
                    : "#f0f9ff",
              borderColor:
                notification.type === "error"
                  ? "#fee2e2"
                  : notification.type === "warning"
                    ? "#fef3c7"
                    : "#e0f2fe",
              color:
                notification.type === "error"
                  ? "#991b1b"
                  : notification.type === "warning"
                    ? "#92400e"
                    : "#075985",
            }}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                notification.type === "error"
                  ? "bg-red-100"
                  : notification.type === "warning"
                    ? "bg-amber-100"
                    : "bg-sky-100"
              }`}
            >
              {notification.type === "error" ? (
                <X className="w-4 h-4" />
              ) : (
                <Globe2 className="w-4 h-4" />
              )}
            </div>
            <p className="text-sm font-bold">{notification.message}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <AddGroupMemberModal
        isOpen={isAddMemberOpen}
        onClose={() => setIsAddMemberOpen(false)}
        sessionId={sessionId}
        existingMembers={groupMembers}
        onAddSuccess={fetchGroupMembers}
      />
    </div>
  );
}

const MessageBubble = ({
  msg,
  isOwn,
  myLang,
  domain,
  onImageClick,
  onReply,
  onShowOriginal,
  allMessages,
  otherName,
  isGroup,
}) => {
  const [displayText, setDisplayText] = useState(msg.originalText || msg.text);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const formatFileSize = (bytes) => {
    if (!bytes) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handleDownload = async (fileUrl, fileName) => {
    try {
      const url =
        fileUrl.startsWith("http") || fileUrl.startsWith("/ai-chat-platform")
          ? fileUrl
          : `${import.meta.env.VITE_API_URL}${fileUrl}`;

      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = fileName || "download";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Download failed:", error);
      window.open(fileUrl, "_blank");
    }
  };

  const getFileIcon = (filename, type) => {
    const name = filename?.toLowerCase() || "";
    if (name.endsWith(".pdf"))
      return <FileText className="w-5 h-5 text-red-500" />;
    if (name.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i))
      return <FileImage className="w-5 h-5 text-blue-500" />;
    if (name.match(/\.(mp4|mov|avi|wmv)$/i))
      return <FileVideo className="w-5 h-5 text-purple-500" />;
    if (name.match(/\.(mp3|wav|ogg)$/i))
      return <FileAudio className="w-5 h-5 text-emerald-500" />;
    return <File className="w-5 h-5 text-slate-500" />;
  };

  useEffect(() => {
    // Show translation if available for the user's current preferred language
    if (msg.translations && msg.translations[myLang]) {
      setDisplayText(msg.translations[myLang]);
    } else {
      setDisplayText(msg.originalText || msg.text);
    }
  }, [myLang, msg.translations, msg.originalText, msg.text]);

  if (msg.messageType === "system") {
    return (
      <div className="w-full flex justify-center my-2 shrink-0">
        <div className="bg-amber-50/60 border border-amber-100/40 text-slate-500 text-[10px] sm:text-[11px] px-3.5 py-1.5 rounded-full shadow-sm text-center max-w-[85%] font-bold tracking-wide">
          {displayText}
        </div>
      </div>
    );
  }

  const getAvatarColor = (name) => {
    if (!name) return "bg-brand/10 text-brand border-brand/20";
    const colors = [
      "bg-red-50 text-red-600 border-red-100",
      "bg-amber-50 text-amber-600 border-amber-100",
      "bg-emerald-50 text-emerald-600 border-emerald-100",
      "bg-teal-50 text-teal-600 border-teal-100",
      "bg-blue-50 text-blue-600 border-blue-100",
      "bg-indigo-50 text-indigo-600 border-indigo-100",
      "bg-purple-50 text-purple-600 border-purple-100",
      "bg-pink-50 text-pink-600 border-pink-100",
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={`flex ${isOwn ? "justify-end" : "justify-start"} items-end gap-2 mb-1.5 relative group w-full`}
    >
      {!isOwn && isGroup && (
        <div
          className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] uppercase shrink-0 select-none shadow-sm border ${getAvatarColor(msg.senderName)} mb-[2px] overflow-hidden`}
        >
          {msg.senderProfileImage ? (
            <img
              src={msg.senderProfileImage}
              alt="Profile"
              className="w-full h-full object-cover"
            />
          ) : msg.senderName ? (
            msg.senderName[0].toUpperCase()
          ) : (
            "M"
          )}
        </div>
      )}

      <div
        className={`max-w-[85%] md:max-w-[70%] lg:max-w-[60%] px-3 py-1.5 rounded-[12px] shadow-sm relative ${
          isOwn
            ? "bg-[#dcf8c6] text-slate-900 rounded-tr-none"
            : "bg-white text-slate-900 rounded-tl-none border border-slate-100/50"
        }`}
      >
        {isGroup && !isOwn && (
          <p className="text-[10px] font-bold text-brand uppercase tracking-wider mb-1 block">
            {msg.senderName || "Member"}
          </p>
        )}
        {/* Options Menu (3 dots) */}
        <div
          className={`absolute top-1 ${isOwn ? "left-[-35px]" : "right-[-35px]"} opacity-0 group-hover:opacity-100 transition-opacity z-20`}
        >
          <div className="relative">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-1.5 hover:bg-slate-200/50 rounded-full text-slate-500 bg-white/50 backdrop-blur-sm shadow-sm"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            <AnimatePresence>
              {isMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setIsMenuOpen(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, x: isOwn ? -10 : 10 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`absolute top-0 ${isOwn ? "right-0" : "left-0"} mt-8 w-40 bg-white rounded-xl shadow-xl border border-slate-100 z-40 overflow-hidden py-1`}
                  >
                    <button
                      onClick={() => {
                        onReply({
                          _id: msg._id,
                          text: displayText,
                          senderName: isOwn
                            ? "You"
                            : otherName || "Participant",
                        });
                        setIsMenuOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors uppercase tracking-tight"
                    >
                      Reply
                    </button>
                    <button
                      onClick={() => {
                        onShowOriginal(
                          msg.originalText,
                          isOwn ? "You" : otherName || "Participant",
                        );
                        setIsMenuOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors uppercase tracking-tight"
                    >
                      Show Original
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Reply Context Rendering */}
        {msg.replyTo && (
          <div
            className={`mb-1.5 p-2 rounded-lg border-l-4 border-l-brand/40 text-[12px] cursor-pointer hover:bg-black/5 transition-colors ${isOwn ? "bg-black/5" : "bg-slate-50"}`}
          >
            <p className="font-bold text-brand uppercase tracking-tight text-[10px] mb-0.5">
              {msg.replyToSender || "Replied to"}
            </p>
            <p className="text-slate-600 line-clamp-2 italic">
              {(() => {
                // 1. Try to use stored translations for the reply if available (most robust)
                if (
                  msg.replyToTranslations &&
                  msg.replyToTranslations[myLang]
                ) {
                  return msg.replyToTranslations[myLang];
                }

                // 2. Fallback: Find the replied-to message in current message list
                const repliedMsg = allMessages?.find(
                  (m) => String(m._id || m.id) === String(msg.replyTo),
                );
                if (repliedMsg) {
                  if (
                    repliedMsg.translations &&
                    repliedMsg.translations[myLang]
                  ) {
                    return repliedMsg.translations[myLang];
                  }
                  if (
                    String(repliedMsg.fromLang).toLowerCase() ===
                      String(myLang).toLowerCase() ||
                    myLang === "English"
                  ) {
                    return repliedMsg.originalText || repliedMsg.text;
                  }
                }

                // 3. Last resort: use the snapshot text from the time of reply
                return msg.replyToText;
              })()}
            </p>
          </div>
        )}

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

            {/* File Attachment Rendering */}
            {msg.messageType === "file" && msg.fileUrl && (
              <div className="mt-2 mb-1">
                {msg.fileName?.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                  <div className="relative group/img bg-black/5 rounded-lg overflow-hidden border border-black/5 flex flex-col">
                    <img
                      src={
                        msg.fileUrl.startsWith("http") ||
                        msg.fileUrl.startsWith("/ai-chat-platform")
                          ? msg.fileUrl
                          : `${import.meta.env.VITE_API_URL}${msg.fileUrl}`
                      }
                      alt={msg.fileName}
                      className="max-w-full h-auto block cursor-pointer hover:opacity-95 transition-opacity"
                      style={{ maxHeight: "300px" }}
                      onClick={() => {
                        const url =
                          msg.fileUrl.startsWith("http") ||
                          msg.fileUrl.startsWith("/ai-chat-platform")
                            ? msg.fileUrl
                            : `${import.meta.env.VITE_API_URL}${msg.fileUrl}`;
                        onImageClick({ url, name: msg.fileName });
                      }}
                    />
                    <div className="flex border-t border-black/10">
                      <button
                        onClick={() => {
                          const url =
                            msg.fileUrl.startsWith("http") ||
                            msg.fileUrl.startsWith("/ai-chat-platform")
                              ? msg.fileUrl
                              : `${import.meta.env.VITE_API_URL}${msg.fileUrl}`;
                          onImageClick({ url, name: msg.fileName });
                        }}
                        className="flex-1 py-2.5 flex items-center justify-center gap-2 text-[12px] font-bold text-slate-600 hover:bg-black/5 transition-colors border-r border-black/10"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        VIEW FULL
                      </button>
                      <button
                        onClick={() =>
                          handleDownload(msg.fileUrl, msg.fileName)
                        }
                        className="flex-1 py-2.5 flex items-center justify-center gap-2 text-[12px] font-bold text-brand hover:bg-black/5 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        DOWNLOAD
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-black/5 rounded-lg border border-black/5 overflow-hidden flex flex-col">
                    <div className="p-3 flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                        {getFileIcon(msg.fileName)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate">
                          {msg.fileName}
                        </p>
                        <p className="text-[11px] text-slate-500 uppercase font-bold">
                          {msg.fileSize
                            ? formatFileSize(msg.fileSize)
                            : "Document"}
                        </p>
                      </div>
                    </div>
                    <div className="flex border-t border-black/10">
                      <button
                        onClick={() =>
                          window.open(
                            msg.fileUrl.startsWith("http") ||
                              msg.fileUrl.startsWith("/ai-chat-platform")
                              ? msg.fileUrl
                              : `${import.meta.env.VITE_API_URL}${msg.fileUrl}`,
                            "_blank",
                          )
                        }
                        className="flex-1 py-2.5 flex items-center justify-center gap-2 text-[12px] font-bold text-slate-600 hover:bg-black/5 transition-colors border-r border-black/10"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        VIEW
                      </button>
                      <button
                        onClick={() =>
                          handleDownload(msg.fileUrl, msg.fileName)
                        }
                        className="flex-1 py-2.5 flex items-center justify-center gap-2 text-[12px] font-bold text-brand hover:bg-black/5 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        DOWNLOAD
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Basic Link Preview */}
            {displayText.match(/https?:\/\/[^\s]+/) && (
              <div className="mt-2 bg-black/5 rounded-lg overflow-hidden border border-black/5 flex flex-col pointer-events-auto">
                <div className="p-2 flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded flex items-center justify-center shadow-sm">
                    <Globe className="w-5 h-5 text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Shared Link
                    </p>
                    <p className="text-xs text-slate-600 truncate font-medium">
                      {displayText.match(/https?:\/\/[^\s]+/)[0]}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-1 opacity-60 ml-auto mt-1">
              <span className="text-[10px] font-medium uppercase text-slate-500">
                {msg.createdAt
                  ? new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    })
                  : ""}
              </span>
              {isOwn && (
                <div className="flex items-center">
                  {msg.status === "seen" ? (
                    <div className="flex -space-x-2">
                      <CheckCheck
                        className="w-4 h-4 text-blue-500"
                        strokeWidth={3}
                      />
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
