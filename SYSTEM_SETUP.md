# ERNESTO Auth & API Key Vault System - Setup Guide

A production-ready authentication and encrypted API key management system for ERNESTO.

## Architecture Overview

### Components

1. **Supabase Database** - PostgreSQL with RLS and encryption
2. **Edge Functions** - Serverless auth and vault operations
3. **React Frontend** - Dark-themed admin dashboard
4. **Web Crypto API** - AES-256-GCM encryption

## Database Setup

### Migration File
- **Location**: `supabase/migrations/002_auth_and_vault.sql`
- **Tables**: 5 main tables + functions + triggers
- **RLS**: Row-Level Security policies for all tables
- **Indexes**: Performance optimized queries

### Tables

1. **ernesto_profiles** - Employee profiles linked to auth.users
2. **ernesto_api_keys** - Encrypted API key storage with budget tracking
3. **ernesto_api_usage** - Usage metrics and cost tracking
4. **ernesto_invites** - Invite codes for onboarding (expires after 7 days)
5. **ernesto_activity_log** - Audit trail of all actions

### Key Security Features

- API keys are encrypted with AES-256-GCM before storage
- Only plaintext decryption happens in Edge Functions (server-side)
- Keys are NEVER returned to frontend; only key_hint (last 4 chars) is shown
- All operations are logged with user_id, action, timestamp
- RLS prevents users from accessing other users' data

## Environment Variables

### Supabase (.env.local or similar)

```env
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key
```

### Server (Supabase Secrets)

```env
VAULT_ENCRYPTION_KEY=your-secret-encryption-key-256-bits
```

**Generating VAULT_ENCRYPTION_KEY:**
```bash
# Generate a 64-character hex string (256 bits)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Deployment Steps

### 1. Create Supabase Project

```bash
# Install Supabase CLI
npm install -g supabase

# Link to project
supabase link --project-ref your-project-id

# Migrate database
supabase db push
```

### 2. Deploy Edge Functions

```bash
# Deploy auth function
supabase functions deploy ernesto-auth

# Deploy vault function
supabase functions deploy ernesto-vault

# Set encryption key in Supabase dashboard
# Project Settings > Edge Functions > Secrets
# Add: VAULT_ENCRYPTION_KEY = your-generated-key
```

### 3. Setup Initial Admin

```sql
-- In Supabase SQL Editor
INSERT INTO auth.users (email, encrypted_password, email_confirmed_at)
VALUES ('admin@example.com', crypt('password123', gen_salt('bf')), now());

-- Get the user ID from the insert, then:
INSERT INTO ernesto_profiles (id, email, full_name, role)
VALUES ('user-uuid-here', 'admin@example.com', 'Admin User', 'admin');
```

### 4. React App Setup

```bash
# Install dependencies
npm install

# Add environment variables
echo 'REACT_APP_SUPABASE_URL=...' > .env.local
echo 'REACT_APP_SUPABASE_ANON_KEY=...' >> .env.local

# Build
npm run build

# Deploy to Vercel/Netlify
npm run deploy
```

## Features

### Authentication

- **Login**: Email + password authentication via Supabase
- **Register**: Requires valid invite code (7-day expiration)
- **Session Management**: Automatic token refresh
- **Activity Logging**: All login/logout events tracked

### Admin Dashboard

#### Team Tab
- List all employees with role, status, last login
- Invite new employees with email and role selection
- Edit employee roles (admin, manager, operator, viewer)
- Deactivate employees (soft delete)
- View pending invites with expiration dates

#### API Keys Tab
- Add/manage keys for 7 providers:
  - Anthropic, OpenAI, Gemini, Grok, Qwen, ElevenLabs, Lovable
- Display key hints (****abc1) - never full key
- Set default model per provider
- Configure rate limits (RPM)
- Track monthly budget and usage
- Test keys (minimal API call validation)
- Rotate keys (deactivate old, activate new)

#### Usage Tab
- Monthly cost tracking per provider
- API call counts and success rates
- Token usage (input/output)
- Error tracking
- Latency metrics
- Visual budget bar with status

#### Activity Tab
- Searchable audit log
- Shows: user, action, timestamp, details, IP
- Filters by action type
- Color-coded action badges

#### Settings Tab
- Default provider selection
- Global rate limiting
- Budget alert thresholds
- Usage tracking toggle
- Activity log retention period
- Security info display
- Data export buttons (stubs for future implementation)

### Encryption

**AES-256-GCM Implementation:**
- Salt: 16 bytes (random)
- IV: 12 bytes (random per encryption)
- Key derivation: PBKDF2 (100,000 iterations)
- Output: Base64-encoded combined (salt + IV + ciphertext)

**Process:**
1. User pastes API key in form (encrypted in transit via HTTPS)
2. Edge Function receives key
3. Derives encryption key from VAULT_ENCRYPTION_KEY
4. Encrypts with AES-256-GCM
5. Stores Base64 in database
6. Never decrypted on client-side

### Role-Based Access Control

- **admin**: Full access to all features
- **manager**: Can view employees and usage, limited editing
- **operator**: Can use API keys, view own usage
- **viewer**: Read-only access to dashboards

## API Functions

### Edge Function: ernesto-auth

**Endpoints:**
- `action: login` - Authenticate user
- `action: register` - Create account with invite code
- `action: invite` - Generate invite (admin only)
- `action: list_employees` - Get all employees (admin/manager)
- `action: update_employee` - Change role (admin only)
- `action: deactivate` - Deactivate employee (admin only)

### Edge Function: ernesto-vault

**Endpoints:**
- `action: save_key` - Add/rotate API key (admin only)
- `action: list_keys` - Get all keys with hints (admin only)
- `action: delete_key` - Deactivate key (admin only)
- `action: test_key` - Validate key with provider (admin only)
- `action: get_usage` - Monthly usage stats (admin only)

## File Structure

```
ernesto/
├── supabase/
│   ├── migrations/
│   │   └── 002_auth_and_vault.sql      # Database schema
│   └── functions/
│       ├── ernesto-auth/index.ts        # Auth operations
│       ├── ernesto-vault/index.ts       # Key management
│       └── _shared/cors.ts              # CORS headers
├── src/
│   ├── pages/
│   │   ├── LoginPage.tsx                # Login & register
│   │   └── AdminPage.tsx                # Admin dashboard
│   ├── components/admin/
│   │   ├── TeamManager.tsx              # Employee management
│   │   ├── ApiKeyManager.tsx            # Key vault UI
│   │   ├── UsageStats.tsx               # Usage dashboard
│   │   ├── ActivityLog.tsx              # Audit log
│   │   └── SettingsPanel.tsx            # Settings
│   ├── hooks/
│   │   └── useAuth.ts                   # Auth context & logic
│   ├── lib/
│   │   └── supabaseClient.ts            # Supabase client
│   └── styles/
│       ├── global.css                   # Global styles
│       ├── LoginPage.css
│       ├── AdminPage.css
│       └── admin/
│           ├── TeamManager.css
│           ├── ApiKeyManager.css
│           ├── UsageStats.css
│           ├── ActivityLog.css
│           └── SettingsPanel.css
└── SYSTEM_SETUP.md                      # This file
```

## Security Best Practices

1. **Encryption Key**: Store VAULT_ENCRYPTION_KEY in Supabase Secrets, not in code
2. **HTTPS Only**: All API calls must be over HTTPS
3. **Session Timeout**: Implement client-side session timeout (15-30 min recommended)
4. **API Key Rotation**: Rotate keys every 90 days
5. **Audit Logging**: Review activity log regularly
6. **Rate Limiting**: Monitor API usage against budgets
7. **Employee Deactivation**: Soft delete - don't hard delete for audit trail
8. **Budget Alerts**: Set alerts at 75% and 90% of monthly budget

## Monitoring & Maintenance

### Weekly
- Check activity log for unusual behavior
- Monitor API usage trends

### Monthly
- Review budget utilization
- Check for inactive employees to deactivate
- Rotate sensitive API keys

### Quarterly
- Audit access roles
- Review and update rate limits
- Analyze cost trends

## Troubleshooting

### API Key Decryption Fails
- Verify VAULT_ENCRYPTION_KEY matches between Edge Functions
- Check if Base64 encoding is intact in database

### Login Always Fails
- Verify Supabase auth is enabled for email/password
- Check if user account is marked is_active = true
- Verify email is confirmed in auth.users

### Keys Not Appearing in List
- Check RLS policy: user must have admin role
- Verify is_active = true in database

### Edge Functions Return 500
- Check Supabase function logs in dashboard
- Verify all environment variables are set
- Test with curl to isolate frontend vs backend issue

## Performance Considerations

- Indexes on provider, user_id, created_at for fast queries
- RLS policies are evaluated per-request; use caching where possible
- Edge Functions cold start: ~300ms (acceptable for admin operations)
- API key encryption: ~10ms per operation

## Future Enhancements

1. **Two-Factor Authentication**: SMS or TOTP
2. **IP Whitelist**: Restrict API calls to specific IPs
3. **Usage Alerts**: Email notifications when budget threshold reached
4. **API Key Expiration**: Auto-expire keys after N days
5. **Webhook Events**: Real-time notifications for key events
6. **Backup & Export**: Encrypted backup of configurations
7. **Team Segregation**: Multi-tenant support with team ownership
8. **Custom Roles**: Define custom permission sets beyond standard roles

## Support & Resources

- **Supabase Docs**: https://supabase.com/docs
- **PostgreSQL RLS**: https://www.postgresql.org/docs/current/ddl-rowsecurity.html
- **Web Crypto API**: https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto
- **React Router**: https://reactrouter.com/

---

**Created**: March 2026
**Version**: 1.0.0
**Status**: Production Ready
