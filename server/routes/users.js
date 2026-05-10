const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');

// Search users by username
router.get('/search', auth, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);

    const users = await User.find({ 
      username: { $regex: q, $options: 'i' },
      _id: { $ne: req.userId } // Don't include self
    }).select('username name').limit(10);

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
