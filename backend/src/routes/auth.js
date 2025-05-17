const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Get JWT secret from environment
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('WARNING: JWT_SECRET is not set in environment variables');
  process.exit(1); // Exit if no JWT secret is provided
}

console.log('Auth routes initialized with JWT configuration');

// Register endpoint
router.post('/register', async (req, res) => {
  try {
    console.log('Register request received:', {
      body: req.body,
      headers: req.headers,
      url: req.url,
      method: req.method
    });

    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      console.log('Missing required fields:', { 
        username: username || 'missing', 
        email: email || 'missing', 
        password: password ? 'provided' : 'missing' 
      });
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      console.log('User already exists:', { 
        email, 
        username,
        existingUser: {
          id: existingUser._id,
          email: existingUser.email,
          username: existingUser.username
        }
      });
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create new user
    const user = new User({
      username,
      email,
      password
    });

    await user.save();
    console.log('New user created:', { 
      id: user._id,
      username: user.username, 
      email: user.email 
    });

    // Create token
    const token = jwt.sign(
      { userId: user._id },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Error in register endpoint:', error);
    res.status(500).json({ message: 'Error creating user', error: error.message });
  }
});

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find user by username
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Update user status to online
    user.status = 'online';
    await user.save();

    // Create token
    const token = jwt.sign(
      { userId: user._id },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        status: user.status
      }
    });
  } catch (error) {
    console.error('Error in login endpoint:', error);
    res.status(500).json({ message: 'Error logging in', error: error.message });
  }
});

// Get online users endpoint
router.get('/online-users', async (req, res) => {
  try {
    const onlineUsers = await User.find({ status: 'online' })
      .select('username status')
      .sort({ username: 1 });
    
    res.json(onlineUsers);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching online users', error: error.message });
  }
});

// Update user status endpoint
router.put('/status', async (req, res) => {
  try {
    const { userId, status } = req.body;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.status = status;
    await user.save();

    res.json({ message: 'Status updated successfully', status: user.status });
  } catch (error) {
    res.status(500).json({ message: 'Error updating status', error: error.message });
  }
});

module.exports = router; 