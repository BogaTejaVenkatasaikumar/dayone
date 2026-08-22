import { body, query, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

// Centralized validation error handler
export function handleValidationErrors(req: Request, res: Response, next: NextFunction): void {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const sanitizedErrors = errors.array().map((err) => ({
      field: 'path' in err ? err.path : 'unknown',
      message: err.msg,
    }));
    res.status(400).json({ error: 'Validation failed', details: sanitizedErrors });
    return;
  }
  next();
}

// --- User Validators ---

export const validateUpdateProfile = [
  body('name')
    .optional()
    .trim()
    .escape()
    .isLength({ min: 1, max: 100 }).withMessage('Name must be 1-100 characters'),
  body('avatar_url')
    .optional()
    .trim()
    .isURL({ protocols: ['https'], require_protocol: true })
    .not().matches(/^https?:\/\/(localhost|127\.|10\.|192\.168\.|169\.254\.)/)
    .withMessage('Avatar must be an https URL from a public domain'),
  handleValidationErrors,
];

// --- Progress Validators ---

export const validateCompleteDay = [
  body('day_id')
    .notEmpty().withMessage('Day ID is required')
    .isUUID().withMessage('Invalid day ID format'),
  handleValidationErrors,
];

// --- Search Validators ---

export const validateSearch = [
  query('q')
    .optional()
    .trim()
    .escape()
    .isLength({ max: 200 }).withMessage('Search query too long'),
  handleValidationErrors,
];
