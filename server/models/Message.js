const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session',
    required: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  originalText: {
    type: String,
    required: true
  },
  translatedText: {
    type: String,
    required: true
  },
  fromLang: {
    type: String,
    required: true
  },
  toLang: {
    type: String,
    required: true
  },
  confidence: {
    type: Number,
    default: 100
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Message', MessageSchema);
