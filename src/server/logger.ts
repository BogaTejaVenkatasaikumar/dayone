import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logsDir = path.join(__dirname, '..', '..', 'logs');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'dayone-api' },
  transports: [
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join(logsDir, 'security.log'),
      level: 'warn',
      maxsize: 5242880,
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    }),
  ],
});

// In development, also log to console
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    })
  );
}

// Security-specific logging helpers
export const securityLogger = {
  loginAttempt(email: string, ip: string, success: boolean) {
    const level = success ? 'info' : 'warn';
    logger.log(level, 'Login attempt', {
      event: 'AUTH_LOGIN',
      email: email.substring(0, 3) + '***', // Mask email in logs
      ip,
      success,
      timestamp: new Date().toISOString(),
    });
  },

  registrationAttempt(email: string, ip: string, success: boolean) {
    logger.info('Registration attempt', {
      event: 'AUTH_REGISTER',
      email: email.substring(0, 3) + '***',
      ip,
      success,
    });
  },

  rateLimitHit(ip: string, endpoint: string) {
    logger.warn('Rate limit exceeded', {
      event: 'RATE_LIMIT',
      ip,
      endpoint,
    });
  },

  suspiciousActivity(ip: string, reason: string, details?: Record<string, unknown>) {
    logger.warn('Suspicious activity detected', {
      event: 'SUSPICIOUS',
      ip,
      reason,
      ...details,
    });
  },

  apiError(method: string, path: string, statusCode: number, userId?: string, error?: string) {
    logger.error('API error', {
      event: 'API_ERROR',
      method,
      path,
      statusCode,
      userId: userId || 'anonymous',
      error,
    });
  },

  passwordResetRequest(email: string, ip: string) {
    logger.info('Password reset requested', {
      event: 'AUTH_PASSWORD_RESET',
      email: email.substring(0, 3) + '***',
      ip,
    });
  },

  criticalAlert(ip: string, event: string, details?: Record<string, unknown>) {
    logger.error('CRITICAL SECURITY EVENT', {
      event: 'CRITICAL',
      ip,
      alert: event,
      ...details,
    });
    // TODO: In production, call your alerting service here:
    // await sendSlackAlert(event, details);
    // await sendEmailAlert(event, details);
  },
};

export default logger;
