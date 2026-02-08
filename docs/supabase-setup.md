# Supabase Setup (From Scratch)

## 1. Create the Supabase project

1. Create a new Supabase project in your Supabase org.
2. In `Project Settings -> API`, copy:
   - `Project URL`
   - `publishable key` (preferred) or `anon key` (legacy)
   - `secret key` (preferred) or `service_role key` (legacy)

## 2. Configure Google OAuth in Supabase

1. Open `Authentication -> Providers -> Google`.
2. Enable Google provider.
3. Create OAuth credentials in Google Cloud and set:
   - `Authorized redirect URI`: `https://<YOUR_SUPABASE_PROJECT_REF>.supabase.co/auth/v1/callback`
4. Paste Google client ID/secret in Supabase provider settings.

## 3. Configure app auth URLs

In `Authentication -> URL Configuration`:

1. `Site URL`:
   - Local: `http://localhost:3000`
   - Prod: your production domain
2. `Redirect URLs` include:
   - `http://localhost:3000/auth/callback`
   - `https://<YOUR_PROD_DOMAIN>/auth/callback`

## 4. Add environment variables

Update `.env.local` with:

```env
NEXT_PUBLIC_SUPABASE_URL="https://<project-ref>.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="<publishable-key>"
SUPABASE_SECRET_KEY="<secret-key>"
```

Supported fallbacks if your dashboard/project still exposes legacy names:

```env
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY="<publishable-key>"
NEXT_PUBLIC_SUPABASE_ANON_KEY="<anon-key>"
SUPABASE_SECRET_DEFAULT_KEY="<secret-key>"
SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"
```

## 5. Apply database migration

Run the SQL in:

- `supabase/migrations/20260207_001_auth_projects.sql`

You can run it in `Supabase SQL Editor` or via Supabase CLI migrations.

This creates:

1. `profiles`
2. `projects`
3. `project_versions`
4. `project_assets`
5. `project-assets` private storage bucket
6. RLS policies scoped to `auth.uid()`

## 6. Install dependencies

```bash
npm install @supabase/supabase-js @supabase/ssr
```

## 7. Run and verify

1. Start app: `npm run dev`
2. Visit `/`
3. Click `Continue with Google`
4. After login, confirm:
   - App shell loads
   - `projects` row is created
   - autosave writes `latest_snapshot`
   - periodic versions appear in `project_versions`
