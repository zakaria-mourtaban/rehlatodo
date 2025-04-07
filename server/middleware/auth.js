import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';

/**
 * Middleware to verify JWT access token
 */
const verifyToken = async (req, res, next) => {
  // Get the token from the Authorization header
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN format
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    
    // Check if the user exists
    const user = await User.findByPk(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    // Set user in request object
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(403).json({ error: 'Invalid token' });
  }
};

/**
 * Middleware to get user from token (optional auth)
 * This doesn't reject the request if no token is present
 */
const getUserFromToken = async (req, res, next) => {
  // Get the token from the Authorization header
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN format
  
  if (!token) {
    req.user = null;
    return next();
  }
  
  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    
    // Check if the user exists
    const user = await User.findByPk(decoded.userId);
    if (user) {
      // Set user in request object
      req.user = decoded;
    } else {
      req.user = null;
    }
    
    next();
  } catch (err) {
    // Token is invalid, but we don't reject the request
    req.user = null;
    next();
  }
};

export { verifyToken, getUserFromToken };