import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, X, Bell } from "lucide-react";
import LandingPage from "./pages/LandingPage";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ChatRoom from "./pages/ChatRoom";
import AdminDashboard from "./pages/AdminDashboard";
import io from "socket.io-client";
import { Globe } from "lucide-react";
import { Toaster } from "./components/AdminComponents";

const API_URL = import.meta.env.VITE_API_URL;

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!socket) return;

    const handleMessage = (msg) => {
      if (msg.senderId === user?.id) return;

      setNotifications((prev) => [
        ...prev,
        {
          id: Date.now(),
          text: msg.originalText,
          senderName: msg.senderName || "New Message",
          sessionId: msg.sessionId,
        },
      ]);
    };

    socket.on("receive_message", handleMessage);
    return () => socket.off("receive_message", handleMessage);
  }, [socket, user?.id]);

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    const token = localStorage.getItem("token");
    if (savedUser && token) {
      setUser(JSON.parse(savedUser));

      const hasPrefix = API_URL.includes("/ai-chat-platform");
      const socketBaseUrl = hasPrefix
        ? API_URL.replace("/ai-chat-platform", "")
        : API_URL;
      const socketPath = hasPrefix
        ? "/ai-chat-platform/socket.io"
        : "/socket.io";

      const newSocket = io(socketBaseUrl, {
        path: socketPath,
        auth: { token },
        transports: ["polling", "websocket"],
        reconnection: true,
        forceNew: true,
        secure: socketBaseUrl.startsWith("https"),
      });
      setSocket(newSocket);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    return () => {
      if (socket) {
        console.log("Closing socket connection");
        socket.close();
      }
    };
  }, [socket]);

  useEffect(() => {
    const onForceLogout = () => {
      handleLogout();
    };
    window.addEventListener("force-logout", onForceLogout);
    return () => window.removeEventListener("force-logout", onForceLogout);
  }, [socket]);

  const handleLogin = (userData, token, refreshToken) => {
    if (socket) {
      socket.close();
    }

    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("token", token);
    if (refreshToken) {
      localStorage.setItem("refreshToken", refreshToken);
    }

    const hasPrefix = API_URL.includes("/ai-chat-platform");
    const socketBaseUrl = hasPrefix
      ? API_URL.replace("/ai-chat-platform", "")
      : API_URL;
    const socketPath = hasPrefix ? "/ai-chat-platform/socket.io" : "/socket.io";

    const newSocket = io(socketBaseUrl, {
      path: socketPath,
      auth: { token },
      transports: ["polling", "websocket"],
      reconnection: true,
      forceNew: true,
      secure: socketBaseUrl.startsWith("https"),
    });
    setSocket(newSocket);
  };

  const handleLogout = async () => {
    // Unsubscribe this browser session's push subscription from the backend
    if ("serviceWorker" in navigator) {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          const subscription = await registration.pushManager.getSubscription();
          if (subscription) {
            await api.post(
              "/api/users/push-subscription/unsubscribe",
              subscription,
            );
            await subscription.unsubscribe();
          } else {
            console.log("No active push subscription found on logout.");
          }
        } else {
          console.log("No service worker registration found on logout.");
        }
      } catch (err) {
        console.error("Clean up subscription error during logout:", err);
      }
    }

    if (socket) socket.close();
    setSocket(null);
    setUser(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
  };

  const handleUserUpdate = (updates) => {
    const updatedUser = { ...user, ...updates };
    setUser(updatedUser);
    localStorage.setItem("user", JSON.stringify(updatedUser));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#f0f2f5] gap-6">
        <div className="relative">
          <div className="w-20 h-20 border-4 border-slate-200 border-t-brand rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center p-2">
            <div className="w-full h-full rounded-full overflow-hidden shadow-lg animate-pulse">
              <img
                src="/ai-chat-platform/biz-insightslogo1.png"
                alt="Loading Logo"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
        <div className="flex flex-col items-center gap-2">
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">
            Neural Link
          </h2>
          <p className="text-sm text-slate-400 font-medium animate-pulse uppercase tracking-[0.2em]">
            Synchronizing...
          </p>
        </div>
      </div>
    );
  }

  return (
    <Router basename="/ai-chat-platform">
      <div className="relative">
        <Routes>
          <Route
            path="/"
            element={<LandingPage user={user} onLogout={handleLogout} />}
          />
          <Route
            path="/login"
            element={
              !user ? (
                <Login onLogin={handleLogin} />
              ) : (
                <Navigate
                  to={user.role === "admin" ? "/admin/dashboard" : "/dashboard"}
                />
              )
            }
          />
          <Route
            path="/dashboard"
            element={
              user && user.role !== "admin" ? (
                <Dashboard
                  user={user}
                  onLogout={handleLogout}
                  onUserUpdate={handleUserUpdate}
                  socket={socket}
                />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="/chat/:sessionId"
            element={
              user && user.role !== "admin" ? (
                <ChatRoom
                  user={user}
                  onUserUpdate={handleUserUpdate}
                  socket={socket}
                />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="/admin/dashboard"
            element={
              user && user.role === "admin" ? (
                <AdminDashboard
                  user={user}
                  onLogout={handleLogout}
                  tab="overview"
                />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="/admin/users"
            element={
              user && user.role === "admin" ? (
                <AdminDashboard
                  user={user}
                  onLogout={handleLogout}
                  tab="users"
                />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="/admin/contacts"
            element={
              user && user.role === "admin" ? (
                <AdminDashboard
                  user={user}
                  onLogout={handleLogout}
                  tab="contacts"
                />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
        </Routes>
        <Toaster />
      </div>
    </Router>
  );
}

export default App;
