import 'dotenv/config'; // Must be first!
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { initializeDatabase } from './src/server/db.js';
import { seedDatabase } from './src/server/seed.js';
import logger, { securityLogger } from './src/server/logger.js';
import { apiLimiter } from './src/server/middleware/rateLimiter.js';

// Route imports
import authRoutes from './src/server/routes/auth.js';
import userRoutes from './src/server/routes/user.js';
import onboardingRoutes from './src/server/routes/onboarding.js';
import roadmapRoutes from './src/server/routes/roadmap.js';
import roadmapsRoutes from './src/server/routes/roadmaps.js';
import progressRoutes from './src/server/routes/progress.js';
import resourcesRoutes from './src/server/routes/resources.js';
import adviceRoutes from './src/server/routes/advice.js';
import plannerRoutes from './src/server/routes/planner.js';
import chatRoutes from './src/server/routes/chat.js';
import projectsRoutes from './src/server/routes/projects.js';
import assignmentsRoutes from './src/server/routes/assignments.js';
import interviewsRoutes from './src/server/routes/interviews.js';
import communityRoutes from './src/server/routes/community.js';
import dashboardsRoutes from './src/server/routes/dashboards.js';
import internshipsRoutes from './src/server/routes/internships.js';
import notificationsRoutes from './src/server/routes/notifications.js';
import voiceRoutes from './src/server/routes/voice.js';
import playgroundRoutes from './src/server/routes/playground.js';
import engagementRoutes from './src/server/routes/engagement.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Ensure logs directory exists
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Validate Clerk secret key
if (!process.env.CLERK_SECRET_KEY) {
  console.error('❌ FATAL: CLERK_SECRET_KEY is not set in .env');
  if (process.env.NODE_ENV === 'production') process.exit(1);
}

// Initialize database
initializeDatabase();
seedDatabase();

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);
const isProduction = process.env.NODE_ENV === 'production';

// --- Security Middleware ---

app.use(helmet({
  contentSecurityPolicy: isProduction ? undefined : false,
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// HTTPS redirect in production
if (isProduction) {
  app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
    next();
  });
}

// Raw body for Clerk webhook signature verification (MUST be before express.json)
app.use('/api/auth/webhook', express.raw({ type: 'application/json' }));

// Body parsing
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));

// Cookie parser
app.use(cookieParser());

// Trust proxy
app.set('trust proxy', 1);

// Global rate limiter
app.use('/api', apiLimiter);

// --- Request logging ---
app.use('/api', (req, _res, next) => {
  logger.info('API request', {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('User-Agent')?.substring(0, 100),
  });
  next();
});

// --- API Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/user', onboardingRoutes);
app.use('/api/roadmap', roadmapRoutes);
app.use('/api/roadmaps', roadmapsRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/resources', resourcesRoutes);
app.use('/api/advice', adviceRoutes);
app.use('/api/planner', plannerRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/assignments', assignmentsRoutes);
app.use('/api/interviews', interviewsRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/dashboards', dashboardsRoutes);
app.use('/api/internships', internshipsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/voice', voiceRoutes);
app.use('/api/playground', playgroundRoutes);
app.use('/api/engagement', engagementRoutes);

// --- Health check ---
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// --- Global error handler ---
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  securityLogger.apiError(req.method, req.path, 500, undefined, err.message);
  res.status(500).json({
    error: isProduction ? 'Internal server error' : err.message,
  });
});

// --- 404 handler ---
app.use('/api/*', (_req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// --- Start server ---
app.listen(PORT, () => {
  console.log(`\n🚀 DayOne API server running on http://localhost:${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   CORS origin: ${process.env.CORS_ORIGIN || 'http://localhost:3000'}`);
  console.log(`   Auth: Clerk\n`);
});

export default app;
