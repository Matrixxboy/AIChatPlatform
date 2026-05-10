import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Bell } from 'lucide-react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ChatRoom from './pages/ChatRoom';
import io from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL;

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!socket) return;
    
    const handleMessage = (msg) => {
      // Don't notify if it's my own message
      if (msg.senderId === user?.id) return;
      
      // Don't notify if we are already in the chat room (optional, but cleaner)
      // For now, let's always notify to be safe, or we'd need to track current route
      
      setNotifications(prev => [...prev, {
        id: Date.now(),
        text: msg.originalText,
        senderName: msg.senderName || 'New Message',
        sessionId: msg.sessionId
      }]);
    };

    socket.on('receive_message', handleMessage);
    return () => socket.off('receive_message', handleMessage);
  }, [socket, user?.id]);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (savedUser && token) {
      setUser(JSON.parse(savedUser));
      
      const newSocket = io(API_URL, {
        auth: { token },
        reconnection: true
      });
      setSocket(newSocket);
    }
    setLoading(false);
  }, []);

  // Separate effect for socket cleanup
  useEffect(() => {
    return () => {
      if (socket) {
        console.log("Closing socket connection");
        socket.close();
      }
    };
  }, [socket]);

  const handleLogin = (userData, token) => {
    // Close old socket if exists
    if (socket) {
      socket.close();
    }
    
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', token);
    
    const newSocket = io(API_URL, {
      auth: { token },
      reconnection: true
    });
    setSocket(newSocket);
  };

  const handleLogout = () => {
    if (socket) socket.close();
    setSocket(null);
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  const handleUserUpdate = (updates) => {
    const updatedUser = { ...user, ...updates };
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;

  return (
    <Router>
      <div className="relative">
        <Routes>
          <Route path="/login" element={!user ? <Login onLogin={handleLogin} /> : <Navigate to="/" />} />
          <Route path="/" element={user ? <Dashboard user={user} onLogout={handleLogout} onUserUpdate={handleUserUpdate} socket={socket} /> : <Navigate to="/login" />} />
          <Route path="/chat/:sessionId" element={user ? <ChatRoom user={user} onUserUpdate={handleUserUpdate} socket={socket} /> : <Navigate to="/login" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
