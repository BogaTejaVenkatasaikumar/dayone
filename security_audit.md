# 🔒 DayOne Security Audit Report

> **Audit Date:** 2026-04-21  
> **Auth System:** Clerk (managed auth provider)  
> **Stack:** Express + better-sqlite3 + Clerk + Vite/React

---

## Summary Table

| # | Category | Status | Critical Issues |
|---|----------|--------|----------------|
| 1 | Login Protection | ⚠️ WARN | Rate limiter exists but `registrationLimiter` dev override is unsafe |
| 2 | Signup & Verification | ⚠️ WARN | Email verification delegated to Clerk (good), but error in onboarding leaks error message |
| 3 | Session Security | ✅ PASS | Clerk JWT via Bearer header; no sensitive cookie storage |
| 4 | Error Messages | ❌ FAIL | `onboarding.ts` returns raw `error.message` to client |
| 5 | Password Reset Flow | ✅ PASS | Fully delegated to Clerk; DB tables exist as backup |
| 6 | MFA | ⚠️ WARN | Supported via Clerk dashboard but not enforced for sensitive actions |
| 7 | Backend & API Security | ⚠️ WARN | `goal` field in onboarding has no length/sanitization limit |
| 8 | Logging & Monitoring | ✅ PASS | Winston with structured security events; email masking present |
| 9 | Authorization (RBAC) | ⚠️ WARN | No roles system; all users have the same access level |

---

## 1. 🔐 Login Protection

### Status: ⚠️ WARN

### What's Working
- `authLimiter`: 5 attempts per 15 min per IP on auth endpoints ✅
- `apiLimiter`: 100 req/15 min global rate limit ✅
- `passwordResetLimiter`: 3 attempts per hour ✅
- Rate limit violations are logged to `security.log` ✅
- `express-rate-limit` with `standardHeaders: true` (sends `Retry-After`) ✅

### Issues Found

#### ❌ CRITICAL: `registrationLimiter` is set to 100/hour (development override left in production)

```typescript
// rateLimiter.ts line 36
max: 100, // Changed from 3 to 100 for development testing  ← LEFT IN DEV MODE
```

This completely defeats account-creation brute force protection.

#### ⚠️ No account lockout after repeated failures
Rate limiting blocks by IP, but a distributed attack (many IPs) can still hammer a single account. Clerk handles this internally, but your local `login_attempts` table is never read — it's only written to.

#### ⚠️ No CAPTCHA integration
No CAPTCHA trigger after N failed attempts. Clerk's hosted components can be configured with bot detection — this should be enabled in the Clerk dashboard.

### Fix

```typescript
// rateLimiter.ts — restore registration limit
export const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3, // Restore to 3 — proper for production
  // ...
});
```

---

## 2. 📧 Signup & Verification

### Status: ⚠️ WARN

### What's Working
- Email verification is handled by Clerk (verified before JWT is issued) ✅
- `email_verified` flag is synced from Clerk webhook and stored in DB ✅
- Duplicate account prevention: Clerk rejects duplicate emails ✅
- Webhook merges existing DB users by email when Clerk account is created ✅
- `validateRegister` enforces strong password rules ✅

### Issues Found

#### ❌ `onboarding.ts` exposes internal error details in signup flow

```typescript
// onboarding.ts line 143-145
res.status(500).json({ 
  error: 'Generation failed...',
  message: (error as Error).message  // ← Raw error sent to client!
});
```

The raw `.message` from AI or DB exceptions may contain internal paths, SQL fragments, or API key-related strings.

#### ⚠️ Lazy-init logs user email to console in plain text

```typescript
// onboarding.ts line 31
logger.info(`✨ Lazy-initialized new user: ${userEmail}`);
```

Email should be masked in logs (like `securityLogger` does elsewhere).

### Fix

```typescript
// onboarding.ts — sanitize error response
res.status(500).json({ 
  error: 'Roadmap generation failed. Please try a more specific goal.',
  // NEVER include: message: (error as Error).message
});

// And mask the email in the log:
logger.info('Lazy-initialized new user', { 
  email: userEmail.substring(0, 3) + '***',
  clerkId: clerkId.slice(-6)
});
```

---

## 3. 🍪 Session Security

### Status: ✅ PASS

### What's Working
- Clerk JWT is passed as `Authorization: Bearer <token>` — no cookies used for auth ✅
- Tokens are NOT stored in `localStorage` or `sessionStorage` — fetched fresh from Clerk on every request ✅
- `verifyToken` calls Clerk's JWKS on every auth check (no local caching vulnerability) ✅
- `cookie-parser` is present but only used for non-auth purposes ✅
- `credentials: 'include'` on the frontend (future-proof for refresh cookie strategy) ✅
- Helmet provides `Strict-Transport-Security` in production ✅
- HTTPS redirect enforced in production ✅

### Minor Note
The `.env.example` still references `JWT_SECRET` and `JWT_REFRESH_SECRET` — leftover from a previous custom JWT system. These vars are **never used** in the current code. This could confuse future developers. They should be removed from `.env.example`.

---

## 4. ⚠️ Error Messages

### Status: ❌ FAIL

### What's Working
- Auth errors return generic `"Authentication required"` and `"Invalid or expired token"` ✅
- 500 errors in production hide internal messages via `isProduction ? 'Internal server error' : err.message` ✅
- DB query errors are caught and return `'Internal server error'` ✅

### Issues Found

#### ❌ CRITICAL: `onboarding.ts` leaks `error.message` to the client regardless of environment

```typescript
// onboarding.ts line 144
message: (error as Error).message  // Sent to browser in all environments!
```

Node.js errors can expose: file paths, SQL error details, Groq API error messages (which may contain model names/internal info), JSON parsing errors with snippets of sensitive data.

#### ❌ `auth.ts` webhook handler logs raw errors to `console.error`

```typescript
// auth.ts line 143
console.error('Webhook verification failed:', err);
```

Should use `logger.error()` (structured, file-based) instead of `console.error` (goes to stdout, which may be captured by hosting platforms as unstructured output).

### Fix

```typescript
// auth.ts line 143 — use structured logger
logger.error('Webhook verification failed', { 
  error: (err as Error).message,
  event: 'WEBHOOK_VERIFY_FAIL'
});
```

---

## 5. 🔑 Password Reset Flow

### Status: ✅ PASS

### What's Working
- Password reset is fully delegated to Clerk, which uses:
  - Expiring, single-use OTP codes ✅
  - No email existence disclosure (Clerk handles generically) ✅
  - Session invalidation after password change ✅
- `password_resets` table exists in DB as a backup/audit mechanism ✅
- `validateResetPassword` validator applies strong password rules to new passwords ✅
- `passwordResetLimiter` limits to 3 requests/hour ✅

### Minor Note
The `password_resets` DB table and `validateResetPasswordRequest` / `validateResetPassword` validators exist but are **not connected to any route**. They appear to be legacy code from before Clerk was integrated. This dead code could create confusion. Consider removing it if it's no longer needed.

---

## 6. 📱 Multi-Factor Auth (MFA)

### Status: ⚠️ WARN

### What's Working
- Clerk natively supports TOTP (Google Authenticator, Authy) and SMS OTP ✅
- MFA can be configured in the Clerk dashboard ✅

### Issues Found

#### ⚠️ MFA is not enforced in the application

MFA must be explicitly enabled in the Clerk dashboard under **User & Authentication → Multi-factor**. There is no code in the app that checks if a user has MFA enabled or blocks sensitive actions without MFA.

#### ⚠️ Sensitive actions (e.g. goal reset/change which wipes entire roadmap) have no step-up auth

The `POST /api/user/goal` route completely resets a user's roadmap and all progress. This is a destructive action and should require re-authentication confirmation.

### Recommended Actions

1. **Enable MFA in Clerk Dashboard**: Go to Clerk Dashboard → User & Authentication → Multi-factor → Enable TOTP.
2. **Add a confirmation gate** for the goal reset endpoint:

```typescript
// onboarding.ts — add a confirmation check for destructive action
router.post('/goal', requireAuth, async (req: AuthRequest, res: Response) => {
  const { goal, confirmReset } = req.body;
  
  // If user already has a goal, require explicit confirmation
  const existingUser = db.prepare('SELECT goal FROM users WHERE id = ?').get(userId);
  if (existingUser?.goal && !confirmReset) {
    res.status(409).json({ 
      error: 'This will reset your entire roadmap. Send confirmReset: true to proceed.' 
    });
    return;
  }
  // ... proceed
});
```

---

## 7. 🛡️ Backend & API Security

### Status: ⚠️ WARN

### What's Working
- All DB queries use **parameterized statements** (`db.prepare('... WHERE id = ?').run(id)`) — no SQL injection possible ✅
- `express-validator` validates and sanitizes all user input ✅
- `helmet()` sets 11 security headers (CSP, HSTS, X-Frame-Options, etc.) ✅
- Body size limited to `10kb` preventing large payload attacks ✅
- `requireAuth` middleware on all protected routes ✅
- IDOR prevention: all queries are scoped by `req.user.dbId` (never from request body) ✅
- CORS is configured to a single origin ✅

### Issues Found

#### ❌ `goal` field in `POST /api/user/goal` has no server-side length limit

```typescript
// onboarding.ts line 49
if (!goal || typeof goal !== 'string' || goal.trim().length < 5) {
  // Only checks minimum length — no maximum!
```

An attacker sending a 10MB goal string would:
1. Pass the `10kb` JSON body limit (10kb check is on the raw body, but `goal` is one field in that body)
2. Be sent directly to the Groq/Gemini AI API — potentially causing costly API abuse

#### ⚠️ AI endpoint (`/api/roadmap/:dayId/stuck`) has no rate limit

The stuck-help endpoint calls an external AI API on every POST. There is no specific rate limiter beyond the global `apiLimiter` (100 req/15 min). A user could spam this 100 times and incur significant AI API costs.

#### ⚠️ `avatar_url` accepts any valid URL without domain allowlisting

```typescript
// validate.ts line 88
.isURL().withMessage('Invalid URL format'),
```

This allows setting an avatar to any external URL (including internal network URLs like `http://localhost`, `http://169.254.169.254` for AWS metadata service, etc.).

### Fixes

```typescript
// onboarding.ts — add max length check
if (!goal || typeof goal !== 'string' || goal.trim().length < 5 || goal.trim().length > 500) {
  res.status(400).json({ error: 'Goal must be between 5 and 500 characters.' });
  return;
}
```

```typescript
// rateLimiter.ts — add AI-specific limiter
export const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 AI requests per hour
  message: { error: 'AI request limit reached. Try again later.' },
});
```

```typescript
// validate.ts — restrict avatar_url to safe domains
body('avatar_url')
  .optional()
  .trim()
  .isURL({ protocols: ['https'], require_protocol: true })
  .not().matches(/^https?:\/\/(localhost|127\.|10\.|192\.168\.|169\.254\.)/)
  .withMessage('Avatar must be an https URL from a public domain'),
```

---

## 8. 📊 Logging & Monitoring

### Status: ✅ PASS

### What's Working
- **Winston** with structured JSON logging to rotating files ✅
- Separate log files: `error.log`, `security.log`, `combined.log` ✅
- Log rotation with max size (5MB/10MB) and max 5 files ✅
- **Email masking** in all security log events (`email.substring(0, 3) + '***'`) ✅
- Login attempts logged (success and failure) with IP ✅
- Rate limit hits logged with IP and endpoint ✅
- Suspicious activity events (`SUSPICIOUS`) logged ✅
- API errors logged with method, path, status code ✅
- `login_attempts` table in DB for persistent audit trail ✅

### Issues Found

#### ⚠️ `login_attempts` DB table is written but never queried

The table stores failed login attempts per IP/email, but no code reads it to trigger lockouts or alerts. It's currently only useful as an offline audit log.

#### ⚠️ No alerting/notification on suspicious events

`securityLogger.suspiciousActivity()` writes to the log file but does not send any real-time alert (email, webhook, Slack, etc.). In production, critical security events should trigger notifications.

#### ⚠️ No log-based device/location tracking

The `User-Agent` is logged (first 100 chars), but there's no detection for unusual geographic locations or new device logins.

### Recommended Additions

```typescript
// logger.ts — add a critical alert function
export const securityLogger = {
  // ... existing methods ...

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
  }
};
```

---

## 9. 🔑 Authorization (RBAC)

### Status: ⚠️ WARN

### What's Working
- All protected routes require authentication via `requireAuth` ✅
- All data queries include `WHERE user_id = ?` (scoped ownership) ✅
- No user ID is accepted from the request body — always from the verified JWT ✅
- Foreign key constraints enforce data integrity at the DB level ✅
- Clerk user deletion cascades correctly through the webhook handler ✅

### Issues Found

#### ⚠️ No roles system (RBAC) — all users are equal

There is no admin role, no `role` field in the users table, and no admin-only routes. This means:
- No way to view all users' data for support
- No way to disable a specific user's account without deleting them from Clerk
- No audit dashboard

#### ⚠️ Frontend-only navigation guard — no backend enforcement of onboarding state

The frontend checks `user.goal` to decide whether to show the onboarding screen. But the backend allows access to **all routes** (roadmap, progress, resources) even if the user has no goal/roadmap set. A user could call `/api/roadmap` directly and get an empty result without being redirected.

#### ⚠️ No admin middleware for sensitive operations

```typescript
// No admin routes exist — consider adding:
// GET  /api/admin/users       — list all users
// POST /api/admin/users/:id/disable — disable account
// GET  /api/admin/logs        — view security events
```

### Fix — Add Role Column to DB

```sql
-- db.ts migration addition
ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user' CHECK(role IN ('user', 'admin'));
```

```typescript
// middleware/auth.ts — add role-based guard
export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  const user = db.prepare('SELECT role FROM users WHERE id = ?').get(req.user!.dbId) as { role: string } | undefined;
  if (user?.role !== 'admin') {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  next();
}
```

---

## 🎯 Priority Fix List

| Priority | Issue | File | Fix |
|----------|-------|------|-----|
| 🔴 P0 | Raw `error.message` sent to client | `onboarding.ts:144` | Remove `message` field from error response |
| 🔴 P0 | `registrationLimiter` set to 100 (dev override) | `rateLimiter.ts:36` | Change `max` back to `3` |
| 🟠 P1 | No max length on `goal` field | `onboarding.ts:49` | Add `goal.trim().length > 500` check |
| 🟠 P1 | AI endpoint missing rate limit | `roadmap.ts:56` | Apply `aiLimiter` to `/stuck` route |
| 🟠 P1 | `console.error` in webhook handler | `auth.ts:143` | Replace with `logger.error()` |
| 🟡 P2 | `avatar_url` accepts internal network URLs | `validate.ts:88` | Add SSRF protection regex |
| 🟡 P2 | Dead code: unused reset validators/routes | `validate.ts` | Remove or wire up properly |
| 🟡 P2 | `login_attempts` table never read | `db.ts` | Add lockout logic or remove table |
| 🟡 P2 | No real-time alerting on suspicious events | `logger.ts` | Add alert hooks for `SUSPICIOUS` events |
| ⚪ P3 | No RBAC / admin roles | `db.ts`, `auth.ts` | Add `role` column + `requireAdmin` middleware |
| ⚪ P3 | MFA not enforced for destructive actions | `onboarding.ts` | Add `confirmReset` gate |
| ⚪ P3 | JWT env vars in `.env.example` (unused) | `.env.example` | Remove stale `JWT_SECRET` references |
