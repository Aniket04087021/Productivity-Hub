const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');

// Route Imports
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const entityRoutes = require('./routes/entityRoutes');

// Load environment variables
dotenv.config();

// Connect to database
connectDB();

const app = express();

// --- Middleware Setup ---
app.use(express.json()); // Body parser for JSON data - MUST come first

// CORS configuration: allow local dev + deployed frontends
app.use(
  cors({
    origin: [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175',
      'https://productivity-hub-sand.vercel.app',
      'https://productivity-hub-r9ze.vercel.app',
    ],
    credentials: true,
  })
); // Allow frontend access

// --- Route Mounting ---
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tasks', entityRoutes); 

// --- Health Check / Root Route ---
app.get('/', (req, res) => {
    res.send('API is running...');
});

// --- General Error Handler Middleware ---
// Note: This needs four arguments (err, req, res, next)
app.use((err, req, res, next) => {
    if (process.env.NODE_ENV !== 'test') {
        console.error(err);
    }
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
        message: err.message,
        // Optional: show stack trace only in development
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running in ${process.env.PORT}`));
