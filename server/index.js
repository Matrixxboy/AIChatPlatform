require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const sessionRoutes = require('./routes/sessions');
const Message = require('./models/Message');
const Session = require('./models/Session');
const { translate } = require('./services/translation');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // In production, restrict this
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/sessions', sessionRoutes);

// Socket.io Logic
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Authentication error'));

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return next(new Error('Authentication error'));
    socket.userId = decoded.userId;
    next();
  });
});

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.userId}`);

  socket.on('join_session', (sessionId) => {
    socket.join(sessionId);
    console.log(`User ${socket.userId} joined session: ${sessionId}`);
  });

  socket.on('send_message', async (data) => {
    const { sessionId, text, fromLang, toLang, domain } = data;

    try {
      // 1. Translate message
      const translationResult = await translate(text, fromLang, toLang, domain);

      // 2. Save to database
      const newMessage = new Message({
        sessionId,
        senderId: socket.userId,
        originalText: text,
        translatedText: translationResult.translation,
        fromLang,
        toLang,
        confidence: translationResult.confidence
      });
      await newMessage.save();

      // Update session last message
      await Session.findByIdAndUpdate(sessionId, {
        lastMessage: translationResult.translation,
        lastMessageTime: Date.now()
      });

      // 3. Emit to session
      io.to(sessionId).emit('receive_message', {
        ...newMessage.toObject(),
        senderId: socket.userId
      });
    } catch (error) {
      console.error('Socket Message Error:', error.message);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.userId}`);
  });
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
