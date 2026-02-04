# Security Documentation

## Overview

This document outlines the security measures implemented in Urban Manual and provides recommendations for maintaining a secure production environment. Operational runbooks live alongside the codebase:

- `vercel/monitoring.md` — how to review Vercel Pro analytics/logs, rotate secrets, and escalate incidents.
- `docs/security/vercel-pro-validation.md` — evidence capture process proving the Pro plan + WAF/log drains are active.

---

## Current Security Stack

### Professional Services (In Use)

| Service | Purpose | Cost | Status |
|---------|---------|------|--------|
| **Supabase** | Authentication, Database, Storage | Free → $25/mo Pro | ✅ Active |
| **Vercel** | Hosting, HTTPS, DDoS Protection | Free → $20/mo Pro | ✅ Active |
| **Cloudflare** | CDN, Rate Limiting (Optional) | Free → $20/mo Pro | ⚠️ Check if Pro |

### Security Features Implemented

- ✅ **Authentication**: Supabase Auth with OAuth (Apple Sign-In)
- ✅ **Row-Level Security (RLS)**: Comprehensive policies across all tables
- ✅ **Rate Limiting**: Upstash Redis-based (with in-memory fallback)
- ✅ **Security Headers**: X-Frame-Options, CSP, HSTS, etc.
- ✅ **XSS Prevention**: DOMPurify HTML sanitization
- ✅ **File Upload Validation**: Type and size restrictions
- ✅ **Environment-based Secrets**: No hardcoded credentials
- ✅ **Admin-only Routes**: Bearer token + role verification

---

## Authentication & Authorization

### Supabase Authentication

**Location**: `lib/supabase.ts`, `contexts/AuthContext.tsx`

```typescript
// Session stored in localStorage: 'sb-auth-token'
// Auto-refresh enabled
// OAuth providers: Apple Sign-In (PKCE flow)
```

**Best Practices**:
- Session tokens are auto-refreshed by Supabase
- JWT tokens are validated server-side via `createServerClient()`
- User ID extracted from session for context in tRPC/API routes

### Admin Authorization

**Location**: `lib/adminAuth.ts`

```typescript
// Admin check: role === 'admin' in user.app_metadata
// Bearer token validation required for admin routes
```

**Protected Routes**:
- `/api/upload-image` - Admin-only destination image uploads
- `/api/regenerate-content` - Admin content management

---

## Rate Limiting

### Implementation

**Location**: `lib/rate-limit.ts`

We've implemented rate limiting using **Upstash Redis** (with in-memory fallback for development).

### Rate Limits by Endpoint Type

| Endpoint Type | Limit | Window | Purpose |
|--------------|-------|--------|---------|
| Conversation API | 5 requests | 10 seconds | Prevent AI API abuse |
| Search API | 20 requests | 10 seconds | Balance performance and abuse prevention |
| File Uploads | 3 requests | 60 seconds | Prevent storage abuse |
| Auth Endpoints | 5 requests | 60 seconds | Prevent brute-force attempts |
| General API | 10 requests | 10 seconds | Default protection |

### Setup Instructions

**1. Create Upstash Account** (Free Tier Available)

```bash
# Visit: https://upstash.com
# Create a Redis database
```

**2. Add Environment Variables**

```bash
UPSTASH_REDIS_REST_URL=your_url_here
UPSTASH_REDIS_REST_TOKEN=your_token_here
```

**3. Install Dependencies**

```bash
npm install @upstash/ratelimit @upstash/redis
```

**4. Rate Limiting is Active**

Rate limiting will automatically use:
- **Upstash Redis** if configured (recommended for production)
- **In-memory fallback** if Upstash not configured (development only)

### Protected Endpoints

- ✅ `/api/conversation/[user_id]` - 5 req/10s
- ✅ `/api/search` - 20 req/10s
- ✅ `/api/upload-profile-picture` - 3 req/min
- ⚠️ Consider adding to: `/api/ai-chat`, `/api/intelligence/*`

---

## Security Headers

**Location**: `next.config.ts`

```typescript
headers: {
  'X-Frame-Options': 'DENY',                    // Prevent clickjacking
  'X-Content-Type-Options': 'nosniff',          // Prevent MIME sniffing
  'X-XSS-Protection': '1; mode=block',          // Enable XSS filter
  'Referrer-Policy': 'strict-origin-when-cross-origin', // Control referrer info
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(self)', // Restrict features
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload', // Force HTTPS
}
```

---

## Data Protection

### Row-Level Security (RLS)

**Location**: `supabase/migrations/*.sql`

**Key Policies**:

1. **User Profiles**: Users can only view/modify their own profile
   ```sql
   auth.uid() = user_id
   ```

2. **Saved Destinations**: User-specific access
   ```sql
   auth.uid() = user_id
   ```

3. **Collections & Itineraries**: Public read, user-owned writes
   ```sql
   -- Public collections visible to all
   -- Private collections only to owner
   ```

4. **Social Features**: Activity feed, follows, likes
   ```sql
   -- Users see: their own + followed users + public profiles
   ```

### File Upload Security

**Profile Pictures** (`/api/upload-profile-picture`):
- Max size: 2MB
- MIME type: `image/*` only
- Authenticated users only
- Rate limited: 3 uploads/minute

**Destination Images** (`/api/upload-image`):
- Max size: 5MB
- MIME type: `image/*` only
- Admin-only access
- Rate limited: 3 uploads/minute

### HTML Sanitization

**Location**: `lib/sanitize-html.ts`

```typescript
// Uses DOMPurify with whitelist approach
// Allows: p, br, strong, em, a, ul, ol, li, blockquote, code
// Forbids: script, style, iframe, object, embed
// Forbids attributes: onerror, onclick, onload
```

### Account Data Requests & Privacy Logging

- **APIs**: `app/api/account/export`, `app/api/account/delete`, `app/api/account/privacy`
  - All routes require an authenticated Supabase session via `createServerClient()`
  - Inserts/selects go through RLS-safe tables (`account_data_requests`, `account_privacy_audit`)
- **Background job**: `app/api/cron/account-data-requests`
  - Called by Vercel Cron (or any worker) with `CRON_SECRET`
  - Uses `createServiceRoleClient()` to gather exports, purge deletions, and email confirmations via Resend
- **Data model**: `migrations/029_account_privacy_requests.sql`
  - Tracks request type, status, payloads, and processed timestamps
  - Privacy audit table keeps a tamper-resistant log of every change or destructive action
- **Support expectations**: users receive an email when exports are ready or deletions finish. Failed jobs set `account_data_requests.last_error` so support@ or privacy@ inboxes can triage within 72 hours.

---

## Production Security Checklist

### ✅ Already Implemented

- [x] Authentication via Supabase
- [x] Row-Level Security policies
- [x] Rate limiting on critical endpoints
- [x] Security headers configured
- [x] XSS prevention via DOMPurify
- [x] File upload validation
- [x] Environment-based secrets
- [x] HTTPS via Vercel
- [x] Admin role-based access control

### ⚠️ Recommended Upgrades

#### Immediate (Budget: $65/month)

- [ ] **Cloudflare Pro** ($20/mo) - Full WAF, bot protection, priority routing
- [ ] **Supabase Pro** ($25/mo) - 7-day logs, 7-day backups, better support
- [ ] **Vercel Pro** ($20/mo) - Remove hobby restrictions, custom firewall rules

#### Phase 2 (Budget: +$26-80/month)

- [ ] **Sentry** ($26+/mo) - Error tracking, security monitoring, session replay
- [ ] **Better logging** - Datadog/Better Stack for real-time log analysis

#### Phase 3 (Enterprise) (Budget: +$534/month)

- [ ] **Supabase Team** ($599/mo) - SOC 2 compliance, SSO, 28-day logs, HIPAA add-on

### 🔴 Security Gaps to Address

1. **No Security Monitoring**
   - **Risk**: Won't detect attacks until too late
   - **Solution**: Add Sentry or similar monitoring
   - **Priority**: HIGH

2. **Limited Rate Limiting Coverage**
   - **Risk**: Some API endpoints still unprotected
   - **Solution**: Add rate limiting to `/api/ai-chat`, `/api/intelligence/*`
   - **Priority**: MEDIUM

3. **No API Key Rotation Policy**
   - **Risk**: Compromised keys remain valid indefinitely
   - **Solution**: Implement key rotation schedule
   - **Priority**: MEDIUM

4. **No CORS Policy Documentation**
   - **Risk**: Unclear allowed origins
   - **Solution**: Document and review CORS configuration
   - **Priority**: LOW

---

## Professional Security Audit

### When to Get an Audit

You should get a professional security audit if:
- You're handling sensitive user data (PII, payment info)
- You're selling to enterprise customers (they'll require it)
- You're raising funding (investors often request it)
- You have over 10,000 users
- You're planning GDPR/HIPAA compliance

### Recommended Audit Providers

**Full-Service Firms** ($5,000-15,000):
- **Trail of Bits** - Comprehensive security audits
- **Cure53** - Web application security specialists
- **Bishop Fox** - Application security testing
- **NCC Group** - Full-stack security audits

**Bug Bounty Platforms** ($500-2,000/month):
- **HackerOne** - Crowdsourced security testing
- **Bugcrowd** - Pay-per-bug model
- **Cobalt.io** - Pentesting as a service

### DIY Security Audit (Free)

Before hiring a professional, do this yourself:

```bash
# 1. Check dependencies for vulnerabilities
npm audit

# 2. Run Snyk (free for open source)
npx snyk test

# 3. Check Supabase security
# Visit: https://supabase.com/docs/guides/platform/going-into-prod

# 4. Enable Vercel security headers
# Already done in next.config.ts

# 5. Review RLS policies
# Check all policies in supabase/migrations/
```

---

## Incident Response Plan

### If You Detect a Security Issue

1. **Immediate Actions**:
   ```bash
   # Rotate all API keys
   # - Supabase service role key
   # - Google AI API key
   # - OpenAI API key

   # Review recent logs
   # - Supabase: Dashboard > Logs
   # - Vercel: Dashboard > Logs

   # Check for unauthorized database changes
   # - Review RLS policies
   # - Check user_profiles, destinations, collections
   ```

2. **Containment**:
   - Disable compromised API keys immediately
   - Enable additional rate limiting
   - Block suspicious IP addresses via Cloudflare

3. **Investigation**:
   - Review all logs for suspicious activity
   - Check for data exfiltration
   - Identify attack vector

4. **Notification**:
   - If user data compromised: Notify affected users within 72 hours (GDPR)
   - Document timeline of events
   - Prepare incident report

5. **Recovery**:
   - Patch vulnerability
   - Restore from backups if needed (Supabase Pro/Team)
   - Implement additional security measures

### Contact Information

**For Security Reports**:
- Email: [Your security email]
- Response time: Within 24 hours

---

## GDPR & Privacy Compliance

### Data We Collect

**User Profiles**:
- Email, name, avatar, bio, location
- Favorite cities, categories, travel style
- Dietary preferences, price preferences

**Activity Data**:
- Saved destinations, visited places
- Search history, conversation logs
- Collections, itineraries, follows

### User Rights

Users can:
- **Access**: View all their data via account page
- **Delete**: Request account deletion (implement this!)
- **Export**: Request data export (implement this!)
- **Opt-out**: Disable tracking (implement this!)

### TODO: Implement GDPR Features

```typescript
// Add these API endpoints:
// - POST /api/account/delete - Delete user account
// - GET /api/account/export - Export user data
// - POST /api/account/privacy - Update privacy settings
```

---

## Security Best Practices for Development

### For Developers

1. **Never commit secrets**
   ```bash
   # Add to .gitignore
   .env.local
   .env.production
   ```

2. **Use environment variables**
   ```typescript
   // ✅ Good
   const apiKey = process.env.API_KEY;

   // ❌ Bad
   const apiKey = "sk-1234567890";
   ```

3. **Validate all inputs**
   ```typescript
   // Use Zod for validation
   import { z } from 'zod';

   const schema = z.object({
     email: z.string().email(),
     age: z.number().min(0).max(120),
   });
   ```

4. **Use parameterized queries**
   ```typescript
   // ✅ Good (Supabase handles this)
   supabase.from('users').select().eq('id', userId);

   // ❌ Bad (vulnerable to SQL injection)
   // await sql`SELECT * FROM users WHERE id = ${userId}`
   ```

5. **Test RLS policies**
   ```sql
   -- Test as different users
   -- Verify users can't access other users' data
   ```

---

## Resources

### Official Documentation

- [Supabase Security](https://supabase.com/docs/guides/security)
- [Vercel Security](https://vercel.com/security)
- [Cloudflare Security](https://www.cloudflare.com/security/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)

### Security Scanning Tools

- [Snyk](https://snyk.io/) - Dependency scanning
- [npm audit](https://docs.npmjs.com/cli/v8/commands/npm-audit) - Built-in vulnerability check
- [GitGuardian](https://www.gitguardian.com/) - Secret scanning

### Security News

- [Hacker News Security](https://news.ycombinator.com/news)
- [r/netsec](https://reddit.com/r/netsec)
- [The Hacker News](https://thehackernews.com/)

---

## Version History

- **v1.0** (2025-11-06): Initial security documentation
  - Added rate limiting
  - Added security headers
  - Documented existing security measures
  - Created audit recommendations

---

## Contact

For security concerns or questions:
- Create an issue: [GitHub Issues](https://github.com/your-org/urban-manual/issues)
- Email: security@yourdomain.com (set this up!)
- Response time: Within 24 hours for critical issues

---

**Last Updated**: November 6, 2025
