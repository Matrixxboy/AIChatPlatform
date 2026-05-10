const express = require('express');
const router = express.Router();
const Session = require('../models/Session');
const Message = require('../models/Message');
const auth = require('../middleware/auth');

// Create new session
router.post('/', auth, async (req, res) => {
  try {
    const { name, participantIds } = req.body;
    
    const participants = [...new Set([...participantIds, req.userId])];
    
    const session = new Session({
      name,
      participants,
      createdBy: req.userId
    });

    await session.save();
    res.status(201).json(session);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user sessions
router.get('/', auth, async (req, res) => {
  try {
    const sessions = await Session.find({ participants: req.userId })
      .populate('participants', 'username name')
      .sort({ lastMessageTime: -1 });
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get session messages
router.get('/:id/messages', auth, async (req, res) => {
  try {
    const session = await Session.findOne({ _id: req.params.id, participants: req.userId });
    if (!session) return res.status(404).json({ message: 'Session not found' });

    const messages = await Message.find({ sessionId: req.params.id })
      .sort({ createdAt: 1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
