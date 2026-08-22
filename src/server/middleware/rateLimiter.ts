import rateLimit from 'express-rate-limit';
import { securityLogger } from '../logger.js';

// General API rate limit: 100 requests per 15 minutes per IP
export const apiLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
  handler: (req, res, _next, options) => {
    securityLogger.rateLimitHit(req.ip || 'unknown', req.path);
    res.status(429).json(options.message);
  },
});

// Auth endpoints: 5 attempts per 15 minutes per IP (login, password reset)
export const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please try again in 15 minutes.' },
  handler: (req, res, _next, options) => {
    securityLogger.rateLimitHit(req.ip || 'unknown', `AUTH:${req.path}`);
    securityLogger.suspiciousActivity(req.ip || 'unknown', 'Excessive auth attempts', {
      endpoint: req.path,
    });
    res.status(429).json(options.message);
  },
});

// Account creation: 100 per hour per IP (Increased for testing)
export const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Changed from 100 to 3 for production
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many accounts created. Please try again later.' },
  handler: (req, res, _next, options) => {
    securityLogger.rateLimitHit(req.ip || 'unknown', 'REGISTRATION');
    securityLogger.suspiciousActivity(req.ip || 'unknown', 'Excessive account creation attempts');
    res.status(429).json(options.message);
  },
});

export const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 AI requests per hour
  message: { error: 'AI request limit reached. Try again later.' },
});

// Password reset: 3 per hour per IP
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many password reset requests. Please try again later.' },
  handler: (req, res, _next, options) => {
    securityLogger.rateLimitHit(req.ip || 'unknown', 'PASSWORD_RESET');
    res.status(429).json(options.message);
  },
});
