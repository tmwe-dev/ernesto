# ERNESTO Dependencies & Configuration

## Frontend Dependencies

Add these to your `package.json`:

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.15.0",
    "@supabase/supabase-js": "^2.38.4"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@types/node": "^20.0.0",
    "typescript": "^5.1.0",
    "vite": "^4.4.0",
    "@vitejs/plugin-react": "^4.0.0"
  }
}
```

## Backend (Supabase Edge Functions)

### TypeScript Configuration
- Deno runtime (built-in for Supabase)
- Standard Library: `deno.land/std@0.168.0`
- @supabase modules via ESM

### Required Imports
```typescript
// HTTP Server
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Supabase Client (TypeScript/JavaScript)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
```

## Database (PostgreSQL via Supabase)

### Extensions Required
- `uuid-ossp` - UUID generation
- `pgcrypto` - Password hashing (crypt function)

### Functions & Triggers
All defined in migration file:
- `update_updated_at_column()` - Auto-update timestamps
- `handle_new_user()` - Auto-create profile on signup
- `ernesto_get_api_key()` - Decrypt API keys
- `ernesto_log_api_usage()` - Log API calls
- `ernesto_get_monthly_usage()` - Usage statistics

## Environment Variables

### React App (.env.local)
```
REACT_APP_SUPABASE_URL=https://xxxx.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Supabase Secrets (via Dashboard)
```
VAULT_ENCRYPTION_KEY=a1b2c3d4e5f6... (64 hex chars = 256 bits)
```

## Supported Node Versions

- **Node 18.x**: ✅ Full support
- **Node 20.x**: ✅ Full support
- **Node 16.x**: ⚠️ May need polyfills for crypto

## Browser Support

- Chrome/Edge 90+: ✅ Full support
- Firefox 87+: ✅ Full support
- Safari 14+: ✅ Full support (with crypto polyfill if needed)
- Mobile browsers: ✅ Full support

## Crypto Library Notes

### AES-256-GCM Implementation
Uses **Web Crypto API** (native browser crypto):
- `crypto.subtle.encrypt()` - Encryption
- `crypto.subtle.decrypt()` - Decryption
- `crypto.subtle.importKey()` - Key import
- `crypto.subtle.deriveBits()` - PBKDF2 derivation

### PBKDF2 Key Derivation
- Algorithm: PBKDF2
- Hash: SHA-256
- Iterations: 100,000
- Salt: 16 bytes (random per encryption)
- Output key: 256 bits

## Database Schema Size Estimates

### Tables
- `ernesto_profiles`: ~500 bytes per employee
- `ernesto_api_keys`: ~1 KB per key (encrypted key is long)
- `ernesto_api_usage`: ~200 bytes per API call
- `ernesto_invites`: ~300 bytes per invite
- `ernesto_activity_log`: ~300 bytes per action

### Example Storage (100 employees, 50K API calls/month)
- Profiles: 50 KB
- API Keys: 700 KB (7 providers × 100 keys)
- Usage: 10 MB (50K × 200 bytes)
- Invites: 30 KB
- Activity: 9 MB (30K actions)
- **Total**: ~20 MB (well within Supabase free tier 1GB)

## Build & Deployment

### Build Command
```bash
npm run build
# Outputs to: dist/
```

### Deployment Targets
- **Vercel**: Automatic deployment from GitHub
- **Netlify**: Drag & drop or GitHub integration
- **Self-hosted**: Docker or direct Node.js

### Environment File for Deployment
Create `.env.production`:
```
REACT_APP_SUPABASE_URL=https://prod.supabase.co
REACT_APP_SUPABASE_ANON_KEY=prod-key-here
```

## Optional: Rate Limiting

For production, add rate limiting middleware:

```typescript
// Suggested: Deno Deploy with built-in rate limiting
// Or: Add rate limiting to Edge Functions with Redis
```

## Optional: Monitoring

### Supabase Built-in Logs
- Database logs
- Edge Function logs
- Authentication logs

### Recommended Third-party (optional)
- **Sentry** - Error tracking
- **LogRocket** - Session replay
- **Datadog** - Infrastructure monitoring

## Version Compatibility

| Component | Version | Release Date |
|-----------|---------|--------------|
| Supabase | v2 | 2021+ |
| React | 18+ | 2022+ |
| TypeScript | 5.0+ | 2023+ |
| Deno | 1.0+ | 2020+ |
| Node | 18+ | 2022+ |

## Security: Dependency Scanning

### Run Periodically
```bash
npm audit
npm audit fix
```

### Critical Dependencies to Monitor
- @supabase/supabase-js: Check for auth vulnerabilities
- react, react-dom: Check for XSS vulnerabilities
- Web Crypto: Standard API, minimal risk

## SSL/TLS Requirements

- All API calls must use HTTPS
- Supabase provides free SSL
- Edge Functions use HTTPS by default

## CORS Configuration

CORS headers are set in `_shared/cors.ts`:
```typescript
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
```

For production, restrict `Allow-Origin` to your domain:
```
"Access-Control-Allow-Origin": "https://yourdomain.com"
```

## Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| Page Load | < 2s | Includes auth check |
| Login | < 1s | Supabase auth is fast |
| Key Encryption | < 50ms | PBKDF2 is slow by design |
| List Keys | < 500ms | RLS evaluation overhead |
| Usage Query | < 1s | DB index on provider + created_at |

## Scaling Considerations

### Small (< 10 employees)
- Supabase free tier sufficient
- No special configuration needed

### Medium (10-100 employees)
- Supabase Pro tier recommended
- Add database indexes (already done in migration)
- Monitor storage usage

### Large (100-1000+ employees)
- Supabase Teams tier
- Consider sharding by provider
- Add connection pooling (Supabase pgBouncer)
- Implement usage caching layer

---

## Checklist Before Production

- [ ] All .env variables set correctly
- [ ] Database migration applied
- [ ] Edge Functions deployed
- [ ] VAULT_ENCRYPTION_KEY in Supabase Secrets
- [ ] First admin user created
- [ ] CORS headers updated to production domain
- [ ] SSL certificate installed
- [ ] Backup strategy planned
- [ ] Monitoring configured
- [ ] Rate limiting tested
- [ ] Load testing completed
- [ ] Security audit passed

---

**Last Updated**: March 2026
