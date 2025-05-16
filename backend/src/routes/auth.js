const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Get JWT secret from environment or use a default (not recommended for production)
const JWT_SECRET = process.env.JWT_SECRET || '654965189491';

console.log('Auth routes initialized');

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
        email: user.email
      }
    });
  } catch (error) {
    console.error('Error in login endpoint:', error);
    res.status(500).json({ message: 'Error logging in', error: error.message });
  }
});

module.exports = router; 