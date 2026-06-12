import dotenv from 'dotenv';
// Load environment variables
dotenv.config();

import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import authRoutes from './routes/auth';
import submissionRoutes from './routes/submission';
import internalRoutes from './routes/internal';
import prisma from './prisma/client';
import { initStaticGeography } from './data/staticGeography';

initStaticGeography();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-token'],
}));

// Request logger
app.use(morgan('dev'));

// JSON parser
app.use(express.json());

// Main APIs
app.use('/api/auth', authRoutes);
app.use('/api/submission', submissionRoutes);
app.use('/api/internal', internalRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Centralized error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Internal Server Error'
  });
});

// Start Express Server
const server = app.listen(PORT, () => {
  console.log(`Humbee Backend Server running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received. Shutting down gracefully...');
  server.close(() => {
    console.log('HTTP server closed.');
  });
  await prisma.$disconnect();
  console.log('Prisma disconnected.');
});
