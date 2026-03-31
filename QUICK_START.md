# ERNESTO Quick Start Guide

## 5-Minute Setup

### 1. Prerequisites
- Supabase account (free tier OK)
- Node.js 18+
- npm or yarn

### 2. Clone & Install
```bash
cd ernesto
npm install
```

### 3. Setup Supabase
```bash
# Create project at https://supabase.com
# Get your URL and ANON_KEY from Settings > API

echo "REACT_APP_SUPABASE_URL=https://xxxx.supabase.co" > .env.local
echo "REACT_APP_SUPABASE_ANON_KEY=your-anon-key" >> .env.local
```

### 4. Deploy Database
```bash
npm install -g supabase
supabase link --project-ref your-project-id
supabase db push
```

### 5. Deploy Edge Functions
```bash
# Generate encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Deploy functions
supabase functions deploy ernesto-auth
supabase functions deploy ernesto-vault

# Set VAULT_ENCRYPTION_KEY in Supabase Dashboard
# Project Settings > Functions > Secrets > Add new secret
```

### 6. Create First Admin
```bash
# Run this in Supabase SQL Editor
INSERT INTO auth.users (email, encrypted_password, email_confirmed_at)
SELECT 'admin@example.com',
       crypt('TempPassword123!', gen_salt('bf')),
       now()
WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@example.com');

-- Get user ID from users list, then:
INSERT INTO ernesto_profiles (id, email, full_name, role)
VALUES ('user-uuid-from-above', 'admin@example.com', 'Admin', 'admin');
```

### 7. Run Locally
```bash
npm run dev
# Visit http://localhost:5173
# Login: admin@example.com / TempPassword123!
```

## Common Tasks

### Invite a New Employee
1. Go to Admin > Team tab
2. Click "Invite Employee"
3. Enter email and select role
4. Share invite code with employee
5. Employee registers with code

### Add API Key
1. Go to Admin > API Keys tab
2. Click "Add API Key"
3. Select provider (Anthropic, OpenAI, etc.)
4. Paste key (encrypted automatically)
5. Set budget and rate limit
6. Click "Test" to verify
7. Save

### Change Employee Role
1. Go to Admin > Team tab
2. Click "Edit" on employee row
3. Select new role from dropdown
4. Click "Save"

### Monitor Costs
1. Go to Admin > Usage tab
2. See monthly costs per provider
3. Check budget usage bars
4. View success rates and errors

### Review Audit Log
1. Go to Admin > Activity tab
2. Search by action or user
3. See all changes with timestamps
4. Export for compliance

## Key Features at a Glance

✅ **Secure**: AES-256-GCM encryption for API keys
✅ **Dark Theme**: Eye-friendly UI optimized for long hours
✅ **Team Management**: Invite, role-based access, deactivate
✅ **Budget Tracking**: Monitor costs in real-time
✅ **Audit Trail**: Complete activity log of all actions
✅ **Multiple Providers**: Support for 7 major AI/voice APIs
✅ **Rate Limiting**: RPM limits per key
✅ **Activity Log**: Searchable history with IP tracking

## Roles Explained

| Role | Permissions |
|------|-------------|
| **admin** | Everything: manage users, keys, view all usage |
| **manager** | View team & usage, can't manage keys |
| **operator** | Use API keys, view own usage |
| **viewer** | Read-only dashboards, no modifications |

## Typical Workflow

```
Admin creates team → Invites employees → Employees register with code
                ↓
Admin adds API keys with budgets
                ↓
Employees use keys (usage tracked)
                ↓
Admin monitors costs & adjusts budgets
                ↓
Monthly review of activity log & compliance
```

## Troubleshooting

**"Invalid invite code"**
- Code must not be expired (7 days from creation)
- Email must match exactly
- Code can only be used once

**"API key test failed"**
- Key format may be incorrect
- Key may not have proper scopes/permissions
- Network firewall may block validation

**"Login fails"**
- Check email is exact match
- Verify account is active (not deactivated)
- Check password is correct

**"Keys not showing"**
- User must be admin role
- Keys must be marked is_active = true

## Important Notes

⚠️ **Encryption Key**: Store VAULT_ENCRYPTION_KEY safely, losing it means losing key decryption ability
⚠️ **Session Timeout**: Implement client timeout for security
⚠️ **Key Rotation**: Rotate sensitive API keys every 90 days
⚠️ **Backups**: Regularly export usage data

## Next Steps

1. Read [SYSTEM_SETUP.md](./SYSTEM_SETUP.md) for detailed architecture
2. Review RLS policies in database migration
3. Setup monitoring/alerting for usage
4. Plan key rotation schedule
5. Configure backup strategy

## Support

- Check Supabase logs: Project > Logs > Functions
- Check browser console: Dev Tools > Console
- Review database logs: Supabase Dashboard > Logs

---

Need help? Check the SYSTEM_SETUP.md file for detailed documentation!
