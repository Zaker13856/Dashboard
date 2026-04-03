# Supabase Auth Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the broken custom bcrypt auth system with Supabase Auth native, making login work correctly and securely.

**Architecture:** Supabase Auth handles credentials and sessions. After login, the app fetches the consultant profile from the `consultants` table using `auth_user_id = auth.uid()`. The `user` object shape stays identical so no component outside `AuthContext` needs changes.

**Tech Stack:** React, Supabase JS v2, Supabase Auth, PostgreSQL RLS

---

## File Map

| Action | File | What changes |
|--------|------|-------------|
| Modify | `src/context/AuthContext.jsx` | Full replacement — Supabase Auth + profile fetch |
| Modify | `src/App.jsx` | Remove `/setup` and `/generate-hash` routes + imports |
| Delete | `src/pages/SetupPage.jsx` | No longer needed |
| Delete | `src/pages/HashGeneratorPage.jsx` | No longer needed |
| Delete | `src/contexts/SupabaseAuthContext.jsx` | Absorbed into AuthContext |
| No change | `src/pages/LoginPage.jsx` | `login(email, password)` interface preserved |
| No change | `src/components/ProtectedRoute.jsx` | `user`, `isAuthenticated`, `loading` interface preserved |
| No change | `src/components/Header.jsx` | `logout()` interface preserved |
| No change | `src/components/AdminHeader.jsx` | `logout()` interface preserved |

---

## Task 1: Add `auth_user_id` column to `consultants` table

**Where:** Supabase Dashboard → SQL Editor

- [ ] **Step 1: Run migration SQL**

Go to **Supabase > SQL Editor** and run:

```sql
ALTER TABLE consultants ADD COLUMN auth_user_id UUID REFERENCES auth.users(id);
```

- [ ] **Step 2: Verify column was added**

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'consultants' AND column_name = 'auth_user_id';
```

Expected output: one row with `auth_user_id | uuid`

---

## Task 2: Create Supabase Auth users and link them to `consultants`

**Where:** Supabase Dashboard → Authentication → Users, then SQL Editor

This task must be done for all 15 users (14 consultants + 1 admin). Steps shown for one user — repeat for each.

- [ ] **Step 1: Create each user in Supabase Auth**

Go to **Supabase > Authentication > Users > Add User**.

For each user:
- Email: their `@isinnova.org` email
- Password: set the password you want them to use
- **Do NOT check "Send email invite"**

Repeat for all 15 users.

- [ ] **Step 2: Link each auth user to their `consultants` row**

After creating all users, go to **Authentication > Users** and copy the UUID of each user.

Then in SQL Editor, run one UPDATE per user:

```sql
-- Example for dzaini@isinnova.org — replace the UUID with the actual one from Auth > Users
UPDATE consultants
SET auth_user_id = '00000000-0000-0000-0000-000000000000'
WHERE email = 'dzaini@isinnova.org';
```

Repeat for every user. To verify all are linked:

```sql
SELECT email, name, role,
       CASE WHEN auth_user_id IS NULL THEN 'NOT LINKED' ELSE 'OK' END as status
FROM consultants
ORDER BY email;
```

Expected: all rows show `OK`.

---

## Task 3: Enable RLS and add authenticated read policy on `consultants`

**Where:** Supabase Dashboard → SQL Editor

- [ ] **Step 1: Enable RLS on consultants table (if not already enabled)**

```sql
ALTER TABLE consultants ENABLE ROW LEVEL SECURITY;
```

- [ ] **Step 2: Drop any existing anon SELECT policy**

```sql
DROP POLICY IF EXISTS "Allow anon select for login" ON consultants;
```

- [ ] **Step 3: Add policy for authenticated users**

```sql
CREATE POLICY "authenticated_read_all"
ON consultants
FOR SELECT
TO authenticated
USING (true);
```

- [ ] **Step 4: Verify policy exists**

```sql
SELECT policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'consultants';
```

Expected: row with `authenticated_read_all | SELECT | {authenticated}`

---

## Task 4: Replace `src/context/AuthContext.jsx`

**File:** `src/context/AuthContext.jsx`

This is the core change. The new implementation:
- Uses `supabase.auth.signInWithPassword()` and `supabase.auth.signOut()`
- Listens to `onAuthStateChange` for session persistence across page refreshes
- After auth, fetches the consultant profile using `auth_user_id = auth.uid()`
- Exposes the same interface so no other file needs to change: `user`, `isAuthenticated`, `loading`, `login()`, `logout()`, `consultants`, and all consultant management functions

- [ ] **Step 1: Replace the file**

Replace the entire contents of `src/context/AuthContext.jsx` with:

```jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

const fetchConsultantProfile = async (authUserId) => {
  const { data, error } = await supabase
    .from('consultants')
    .select('*')
    .eq('auth_user_id', authUserId)
    .limit(1);

  if (error || !data || data.length === 0) return null;

  const c = data[0];
  return {
    id: c.id,
    email: c.email,
    name: c.name,
    role: c.role || 'consultant',
    isAuthenticated: true,
  };
};

const fetchAllConsultants = async () => {
  const { data } = await supabase.from('consultants').select('*');
  return data || [];
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [consultants, setConsultants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ratesVersion, setRatesVersion] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const profile = await fetchConsultantProfile(session.user.id);
        setUser(profile);
        const all = await fetchAllConsultants();
        setConsultants(all);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          const profile = await fetchConsultantProfile(session.user.id);
          setUser(profile);
          const all = await fetchAllConsultants();
          setConsultants(all);
        } else {
          setUser(null);
          setConsultants([]);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (error) {
        return { success: false, error: 'Email o password non valida' };
      }

      const profile = await fetchConsultantProfile(data.user.id);
      if (!profile) {
        await supabase.auth.signOut();
        return { success: false, error: 'Profilo utente non trovato. Contatta l\'amministratore.' };
      }

      setUser(profile);
      const all = await fetchAllConsultants();
      setConsultants(all);

      return { success: true, user: profile };
    } catch (err) {
      console.error('Login error:', err);
      return { success: false, error: 'Errore imprevisto durante il login.' };
    }
  };

  const logout = async () => {
    // Clear state first so UI updates immediately even though Header calls logout() without await
    setUser(null);
    setConsultants([]);
    await supabase.auth.signOut();
  };

  const getCurrentUser = () => user;
  const getConsultantHourlyRate = () => 0;
  const getHourlyRateByConsultantAndYear = () => 0;
  const addConsultant = async (c) => c;
  const updateConsultant = async () => {};
  const deleteConsultant = async () => {};
  const incrementRatesVersion = () => setRatesVersion(v => v + 1);
  const cleanupStaleRatesData = () => {};

  return (
    <AuthContext.Provider value={{
      user,
      consultants,
      loading,
      isAuthenticated: !!user,
      ratesVersion,
      login,
      logout,
      getCurrentUser,
      addConsultant,
      updateConsultant,
      deleteConsultant,
      getConsultantHourlyRate,
      getHourlyRateByConsultantAndYear,
      incrementRatesVersion,
      cleanupStaleRatesData,
      DEFAULT_PASSWORD: 'password',
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
```

- [ ] **Step 2: Verify the app starts without errors**

```bash
cd /c/Users/DZ/hostinger && npm run dev
```

Expected: no console errors, login page loads at `http://localhost:5173/login`

- [ ] **Step 3: Test login with a linked user**

Open `http://localhost:5173/login`, enter email + password of a user you linked in Task 2.

Expected:
- No "email o password non valida" error
- Toast "Accesso Effettuato" appears
- Redirect to `/consultant-dashboard` (or `/admin` for admin role)

- [ ] **Step 4: Test logout**

Click logout button.

Expected: redirect to `/login`, session cleared, navigating to `/consultant-dashboard` redirects back to `/login`.

- [ ] **Step 5: Test session persistence**

Log in, then close and reopen the browser tab.

Expected: user remains logged in (Supabase manages the session token in localStorage automatically).

- [ ] **Step 6: Commit**

```bash
cd /c/Users/DZ/hostinger
git add src/context/AuthContext.jsx
git commit -m "feat: replace custom bcrypt auth with Supabase Auth native"
```

---

## Task 5: Remove obsolete routes from `src/App.jsx`

**File:** `src/App.jsx`

- [ ] **Step 1: Remove imports and routes**

Remove the following 2 import lines:

```jsx
import SetupPage from './pages/SetupPage';
import HashGeneratorPage from './pages/HashGeneratorPage';
```

Remove the following 2 route lines:

```jsx
<Route path="/setup" element={<SetupPage />} />
<Route path="/generate-hash" element={<HashGeneratorPage />} />
```

- [ ] **Step 2: Verify app still starts**

```bash
npm run dev
```

Expected: no import errors, app loads normally.

- [ ] **Step 3: Commit**

```bash
git add src/App.jsx
git commit -m "chore: remove setup and hash-generator routes"
```

---

## Task 6: Delete obsolete files

- [ ] **Step 1: Delete the three obsolete files**

```bash
cd /c/Users/DZ/hostinger
rm src/pages/SetupPage.jsx
rm src/pages/HashGeneratorPage.jsx
rm src/contexts/SupabaseAuthContext.jsx
```

- [ ] **Step 2: Verify no remaining imports**

```bash
grep -r "SetupPage\|HashGeneratorPage\|SupabaseAuthContext" src/
```

Expected: no output (nothing imports these files anymore).

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: delete obsolete auth and setup files"
```

---

## Task 7: Build and deploy

- [ ] **Step 1: Run production build**

```bash
cd /c/Users/DZ/hostinger && npm run build
```

Expected: build completes with no errors. Output in `dist/`.

- [ ] **Step 2: Deploy to Hostinger**

Deploy the `dist/` folder to Hostinger via the method currently used (drag-and-drop in Hostinger panel, or CLI deploy).

- [ ] **Step 3: Verify login works on production**

Open `https://www.isinnova.cloud/login` and log in with a real user.

Expected:
- No HTTP 406 in browser Network tab
- Toast "Accesso Effettuato" appears
- Correct dashboard loads based on role

- [ ] **Step 4: Verify session persists on production**

Refresh the page while logged in.

Expected: user stays logged in, no redirect to `/login`.
