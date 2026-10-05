/**
 * East Africa Accounting Platform - Main Server Entry Point
 */

import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { logger } from './shared/utils/logger';
import { errorHandler } from './shared/middleware/error.middleware';
import { requestLogger } from './shared/middleware/request-logger.middleware';
import { rateLimiter } from './shared/middleware/rate-limit.middleware';

// Routes
import authRoutes from './routes/auth.routes';
import businessRoutes from './routes/business.routes';
import accountsRoutes from './routes/accounts.routes';
import journalRoutes from './routes/journal.routes';
import invoicesRoutes from './routes/invoices.routes';
import transactionsRoutes from './routes/transactions.routes';
import paymentsRoutes from './routes/payments.routes';
import contactsRoutes from './routes/contacts.routes';
import reportsRoutes from './routes/reports.routes';
import taxRoutes from './routes/tax.routes';
import aiRoutes from './routes/ai.routes';
import usersRoutes from './routes/users.routes';
import salesRoutes from './routes/sales.routes'; // NEW: AI Sales Configurator
import proposalsRoutes from './routes/proposals.routes'; // NEW: Customer proposals

// Load environment variables
dotenv.config();

// Initialize Express app
const app: Application = express();
const PORT = process.env.PORT || 3000;

// Trust proxy (for Heroku, AWS ELB, etc.)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

// Request logging
app.use(requestLogger);

// Rate limiting
app.use('/api', rateLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: '1.0.0',
  });
});

// API Routes
const API_PREFIX = '/api/v1';

// Public routes
app.use(`${API_PREFIX}/auth`, authRoutes);

// Protected routes (require authentication)
app.use(`${API_PREFIX}/business`, businessRoutes);
app.use(`${API_PREFIX}/users`, usersRoutes);
app.use(`${API_PREFIX}/accounts`, accountsRoutes);
app.use(`${API_PREFIX}/journal-entries`, journalRoutes);
app.use(`${API_PREFIX}/invoices`, invoicesRoutes);
app.use(`${API_PREFIX}/transactions`, transactionsRoutes);
app.use(`${API_PREFIX}/payments`, paymentsRoutes);
app.use(`${API_PREFIX}/contacts`, contactsRoutes);
app.use(`${API_PREFIX}/reports`, reportsRoutes);
app.use(`${API_PREFIX}/tax-returns`, taxRoutes);
app.use(`${API_PREFIX}/ai`, aiRoutes);
// Sales configure returns a pricing recommendation from the caller's own input.
// It does not read stored customer records.
app.use(`${API_PREFIX}/sales`, salesRoutes);
// POST /proposals is public lead intake. List, read, status, and invoice require
// a JWT and only return the caller's tenant (see proposals.routes.ts).
app.use(`${API_PREFIX}/proposals`, proposalsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.url} not found`,
    },
  });
});

// Global error handler
app.use(errorHandler);

// Create HTTP server
const server = createServer(app);

// Start server
server.listen(PORT, () => {
  logger.info(`🚀 EA Accounting API Server started on port ${PORT}`);
  logger.info(`📍 Environment: ${process.env.NODE_ENV}`);
  logger.info(`🌐 API URL: http://localhost:${PORT}${API_PREFIX}`);
  logger.info(`💚 Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Application specific logging, throwing an error, or other logic here
});

export default app;