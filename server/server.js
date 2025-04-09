import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

// Import database connection
import sequelize from './database/config.js';

// Import middleware
import { verifyToken, getUserFromToken } from './middleware/auth.js';

// Import routes
import authRoutes from './routes/auth.js';
import cardRoutes from './routes/cards.js';
import columnRoutes from './routes/columns.js';
import tagRoutes from './routes/tags.js';
import logRoutes from './routes/logs.js';

// Initialize environment variables
dotenv.config();

// Create Express app
const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true // Allow cookies to be sent with requests
}));
app.use(bodyParser.json());
app.use(cookieParser(process.env.COOKIE_SECRET));

// Test database connection
sequelize.authenticate()
  .then(() => console.log('Database connection established successfully'))
  .catch(err => console.error('Unable to connect to the database:', err));

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/cards', verifyToken, cardRoutes);
app.use('/api/columns', verifyToken, columnRoutes);
app.use('/api/tags', verifyToken, tagRoutes);
app.use('/api/logs', verifyToken, logRoutes);

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

export default app;