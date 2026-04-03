# Supabase Auth Migration Design
**Date:** 2026-03-29
**Project:** isinnova.cloud (hostinger)
**Status:** Approved

---

## Problem

The current login system is broken. The app uses a custom auth system: bcrypt password hashes stored in the `consultants` table, compared client-side via `bcryptjs`. Login fails with HTTP 406 / PGRST116 because the Supabase anon key cannot SELECT from the `consultants` table (RLS blocks it). The minimal fix (add anon SELECT policy) would expose password hashes via the API — architecturally wrong.

---

## Goal

Migrate authentication to Supabase Auth natively. Login must work correctly, securely, and maintainably. No changes to how timesheet/expense data is queried.

---

## Users

- ~14 consultants + 1 admin (total 15 users)
- Admin manages all passwords manually (no self-service reset, no email invites)
- Two roles: `admin` (sees everything), `consultant` (sees only own data)

---

## Architecture

### Login flow after migration

```
User submits email + password
   ↓
supabase.auth.signInWithPassword(email, password)
   ↓
Supabase Auth validates credentials
   ↓
onAuthStateChange fires with session
   ↓
Fetch consultant profile: SELECT * FROM consultants WHERE auth_user_id = auth.uid()
   ↓
AuthContext exposes: { id: consultants.id, email, name, role }
   ↓
ProtectedRoute checks user.role → redirects to /admin or /consultant-dashboard
```

### Key invariant

`user.id` in the auth context continues to return `consultants.id` (not `auth.users.id`). This ensures all existing data queries using `consultant_id` work without modification.

---

## Database Changes

### 1. Add `auth_user_id` column to `consultants`

```sql
ALTER TABLE consultants ADD COLUMN auth_user_id UUID REFERENCES auth.users(id);
```

### 2. Create Supabase Auth users

For each of the 15 users, the admin creates a user manually in **Supabase > Authentication > Users** with their email and a password. No email invites sent.

### 3. Link auth users to consultants rows

After creating each auth user, copy their UUID from `auth.users` and set it in the `consultants` row:

```sql
UPDATE consultants SET auth_user_id = '<auth-user-uuid>' WHERE email = 'user@isinnova.org';
```

### 4. RLS policies on `consultants`

Remove any existing anon SELECT policy. Add:

```sql
-- Consultants can read their own row
CREATE POLICY "consultant_read_own"
ON consultants FOR SELECT
TO authenticated
USING (auth_user_id = auth.uid());

-- Admin can read all rows (admin role stored in user_metadata or checked via self-join)
-- Simplest approach: allow authenticated users to read all rows (app-level role check handles access control)
CREATE POLICY "authenticated_read_all"
ON consultants FOR SELECT
TO authenticated
USING (true);
```

Use the second (simpler) policy — role-based UI access is enforced by `ProtectedRoute`, not RLS.

---

## Code Changes

### `src/context/AuthContext.jsx` — full replacement

Replace the custom bcrypt auth with Supabase Auth + consultant profile fetch. The new context:

- Uses `supabase.auth.signInWithPassword()` and `supabase.auth.signOut()`
- Listens to `onAuthStateChange` for session state
- After auth, fetches consultant profile from `consultants WHERE auth_user_id = auth.uid()`
- Exposes the same interface shape as before:
  - `user` → `{ id: consultants.id, email, name, role }`
  - `isAuthenticated` → boolean
  - `loading` → boolean
  - `login(email, password)` → calls signInWithPassword (keeps LoginPage compatible)
  - `logout()` → calls signOut (keeps Header compatible)
  - `consultants` → array (still fetched for admin features)
  - All consultant management functions (`addConsultant`, `updateConsultant`, `deleteConsultant`, etc.)

### `src/pages/LoginPage.jsx` — minor update

The `login()` function signature stays the same (`login(email, password)` returning `{ success, error }`). No changes needed if AuthContext wraps signInWithPassword in a compatible login() function.

### `src/components/ProtectedRoute.jsx` — no changes needed

Already uses `useAuth()` → `{ user, isAuthenticated, loading }`. Interface unchanged.

### `src/components/Header.jsx` and `AdminHeader.jsx` — no changes needed

Already calls `logout()` from useAuth(). Interface unchanged.

### Files to remove

- `src/pages/SetupPage.jsx` — bcrypt setup utility, no longer needed
- `src/pages/HashGeneratorPage.jsx` — edge function trigger, no longer needed
- `src/contexts/SupabaseAuthContext.jsx` — absorbed into the new AuthContext

### `src/App.jsx` — remove routes

Remove routes for `/setup` and `/generate-hash`.

---

## Migration Steps (ordered)

1. Add `auth_user_id` column to `consultants` table in Supabase
2. Create all 15 Supabase Auth users via dashboard
3. Link each auth user to their `consultants` row via SQL
4. Add RLS policy for authenticated reads on `consultants`
5. Replace `src/context/AuthContext.jsx`
6. Update `src/App.jsx` (remove setup routes)
7. Delete obsolete files
8. Deploy and test login for both roles

---

## What Does NOT Change

- `consultants.id` — primary key, still used as `consultant_id` in all data tables
- TimesheetContext and ExpenseContext — no changes
- ProtectedRoute role logic — no changes
- All admin data management pages — no changes
- URL structure — `/login`, `/admin`, `/consultant-dashboard` unchanged
