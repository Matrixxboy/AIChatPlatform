import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ChatRoom from './pages/ChatRoom';
import io from 'socket.io-client';

const API_URL = 'http://localhost:5000';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (savedUser && token) {
      setUser(JSON.parse(savedUser));
      
      const newSocket = io(API_URL, {
        auth: { token }
      });
      setSocket(newSocket);
    }
    setLoading(false);
    
    return () => {
      if (socket) socket.close();
    }
  }, []);

  const handleLogin = (userData, token) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', token);
    
    const newSocket = io(API_URL, {
      auth: { token }
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

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;

  return (
    <Router>
      <Routes>
        <Route path="/login" element={!user ? <Login onLogin={handleLogin} /> : <Navigate to="/" />} />
        <Route path="/" element={user ? <Dashboard user={user} onLogout={handleLogout} socket={socket} /> : <Navigate to="/login" />} />
        <Route path="/chat/:sessionId" element={user ? <ChatRoom user={user} socket={socket} /> : <Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;
