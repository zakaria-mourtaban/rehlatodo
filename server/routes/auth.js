import express from 'express';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import validator from 'validator';
import { User, RefreshToken } from '../models/index.js';
import sequelize from '../database/config.js';

const router = express.Router();

// Helper function to parse time strings like '15m', '1h', '7d' to milliseconds
const ms = (timeStr) => {
  const num = parseInt(timeStr);
  const unit = timeStr.slice(-1);
  
  switch (unit) {
    case 's': return num * 1000;
    case 'm': return num * 60 * 1000;
    case 'h': return num * 60 * 60 * 1000;
    case 'd': return num * 24 * 60 * 60 * 1000;
    default: return 0;
  }
};

/**
 * Helper function to generate an access token
 */
const generateAccessToken = (userId, email) => {
  return jwt.sign({ userId, email }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRATION
  });
};

/**
 * Helper function to generate a refresh token
 */
const generateRefreshToken = (userId, email) => {
  return jwt.sign({ userId, email, tokenId: uuidv4() }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRATION
  });
};

/**
 * User Registration
 */
router.post('/register', async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { email, password, name } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    if (!validator.isEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email }, transaction });
    if (existingUser) {
      await transaction.rollback();
      return res.status(409).json({ error: 'User already exists' });
    }

    // Create new user
    const user = await User.create(
      { email, password, name },
      { transaction }
    );

    await transaction.commit();

    // Don't include password in response
    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        created_at: user.created_at
      }
    });
  } catch (err) {
    await transaction.rollback();
    console.error('Error registering user:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * User Login
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user by email
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isPasswordValid = await user.isValidPassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Create JWT tokens
    const accessToken = generateAccessToken(user.id, user.email);
    const refreshToken = generateRefreshToken(user.id, user.email);

    // Store refresh token in database
    const refreshExpiry = new Date(Date.now() + ms(process.env.JWT_REFRESH_EXPIRATION));
    await RefreshToken.create({
      userId: user.id,
      token: refreshToken,
      expiresAt: refreshExpiry
    });

    // Set refresh token as HTTP-only cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: ms(process.env.JWT_REFRESH_EXPIRATION),
      sameSite: 'strict',
      path: '/'
    });

    // Send response with access token and user info
    res.json({
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    });
  } catch (err) {
    console.error('Error logging in:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Refresh Token
 */
router.post('/refresh-token', async (req, res) => {
  try {
    // Get refresh token from cookie
    const refreshToken = req.cookies.refreshToken;
    
    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token not found' });
    }

    // Verify refresh token in database
    const tokenRecord = await RefreshToken.findOne({
      where: {
        token: refreshToken,
        expiresAt: { [sequelize.Op.gt]: new Date() }
      }
    });

    if (!tokenRecord) {
      return res.status(403).json({ error: 'Invalid or expired refresh token' });
    }

    // Verify JWT refresh token
    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      
      // Get user
      const user = await User.findByPk(decoded.userId);
      
      if (!user) {
        return res.status(403).json({ error: 'User not found' });
      }

      // Generate new access token
      const accessToken = generateAccessToken(user.id, user.email);

      // Send new access token
      res.json({
        accessToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name
        }
      });
    } catch (err) {
      // Delete invalid refresh token
      await RefreshToken.destroy({ where: { token: refreshToken } });
      return res.status(403).json({ error: 'Invalid refresh token' });
    }
  } catch (err) {
    console.error('Error refreshing token:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Logout
 */
router.post('/logout', async (req, res) => {
  try {
    // Get refresh token from cookie
    const refreshToken = req.cookies.refreshToken;
    
    if (refreshToken) {
      // Delete refresh token from database
      await RefreshToken.destroy({ where: { token: refreshToken } });
    }

    // Clear refresh token cookie
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/'
    });

    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    console.error('Error logging out:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Get current user info
 */
router.get('/me', async (req, res) => {
  try {
    // Get user ID from token (set by auth middleware)
    const userId = req.user.userId;

    // Get user from database
    const user = await User.findByPk(userId, {
      attributes: ['id', 'email', 'name', 'created_at']
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (err) {
    console.error('Error getting user info:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;