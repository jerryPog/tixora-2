# TIXORA Supabase Authentication & Protected Routes Protocol

Tixora uses **Supabase Auth (v2)** combined with **PostgreSQL Row Level Security (RLS)** and **Role-Based Access Control (RBAC)** to secure the entire platform.

---

## 1. Architecture Overview

```
                          ┌───────────────────────────┐
                          │   Visitor / Attendee      │
                          │   (Public Concert Drops)  │
                          └─────────────┬─────────────┘
                                        │
                 ┌──────────────────────┴──────────────────────┐
                 ▼                                             ▼
  ┌─────────────────────────────┐               ┌─────────────────────────────┐
  │      Promoter Portal        │               │   Protected Operations Desk │
  │        (index.html)         │               │        (admin.html)         │
  ├─────────────────────────────┤               ├─────────────────────────────┤
  │ • Role: 'promoter'          │               │ • Role: 'admin' / 'manager' │
  │ • Real-time Pass Tracking   │               │ • Auth Gate Barrier         │
  │ • Unique Referral Link      │               │ • Tour Allocation & Quotas  │
  │ • Audited Commission Ledger │               │ • Instant UPI Settlements   │
  │ • <60s UPI Payout Status    │               │ • Anti-Scalping & Gate Logs │
  └──────────────┬──────────────┘               └──────────────┬──────────────┘
                 │                                             │
                 └──────────────────────┬──────────────────────┘
                                        ▼
                      ┌───────────────────────────────────┐
                      │    auth.js (Route Guard Core)     │
                      │  • @supabase/supabase-js v2       │
                      │  • Session & Token Management     │
                      │  • RBAC Verification & RLS Query  │
                      └─────────────────┬─────────────────┘
                                        ▼
                      ┌───────────────────────────────────┐
                      │    Supabase PostgreSQL Engine    │
                      │  • user_roles & auth.is_admin()   │
                      │  • 15 Hardened RLS Policies       │
                      │  • security_invoker = true Views  │
                      └───────────────────────────────────┘
```

---

## 2. Quick Setup in Supabase Dashboard

### Step 1: Execute Database Schema & RLS
1. Open your [Supabase Project Dashboard](https://supabase.com/dashboard).
2. Go to the **SQL Editor** in the left sidebar.
3. Open or paste the full contents of `database/tixora.sql`.
4. Click **Run**.
   - Creates all 15 tables (including `user_roles`).
   - Enables Row Level Security (RLS) on every table.
   - Sets up `auth.is_admin()` and automated user provisioning triggers.
   - Configures `WITH (security_invoker = true)` on all real-time views.

### Step 2: Configure Supabase Auth Settings
1. In the Supabase Dashboard, go to **Authentication** -> **Providers** -> **Email**.
2. Ensure **Email Provider** is **Enabled**.
3. (Optional for development) Toggle **Confirm email** OFF if you want immediate logins without clicking verification links.

### Step 3: Link Project URL & Anon Key in Tixora
1. In your Supabase Dashboard, go to **Project Settings** -> **API**.
2. Copy your **Project URL** (`https://<project-ref>.supabase.co`) and **anon / public** key.
3. Open Tixora Admin (`http://localhost:3000/admin` or your Vercel deployment).
4. Click the **Supabase Config** button or **Supabase Settings** on the login gate.
5. Paste your URL and Anon Key and click **Save & Sync Database**.

---

## 3. Creating & Elevating Administrators

### Method A: Via Supabase SQL Editor (Recommended)
After an admin user registers with their email, run this single query inside your Supabase SQL Editor:

```sql
SELECT assign_admin_role('admin@tixora.live');
```
*This safely adds the user to `user_roles` with the `'admin'` role and stamps their `raw_app_meta_data` JWT claims.*

### Method B: Via App Metadata in Supabase Dashboard
1. Go to **Authentication** -> **Users**.
2. Click on the user.
3. In `App Metadata`, set:
```json
{
  "role": "admin"
}
```

---

## 4. Protected Routes Implementation

### Route 1: Executive Operations Desk (`/admin` / `admin.html`)
- **Guard**: `TixoraAuth.guardAdminRoute()`
- **Behavior**:
  - **Unauthenticated**: Conceals workspace DOM and renders the branded Admin Login Gate.
  - **Unauthorized (Promoter / Fan)**: Shows the "Access Restricted" screen with account email and role.
  - **Authorized (Admin / Manager)**: Unlocks the full operations workspace, displays user email/avatar and active role badge in the header, and mounts live Supabase real-time sync.
  - **Session Events**: Listens to `supabase.auth.onAuthStateChange`. Logging out instantly locks the screen.

### Route 2: Promoter Command Center (`index.html`)
- **Controller**: `initPromoterAuth()` & `TixoraAuth`
- **Behavior**:
  - **Unauthenticated**: The "Promoter Portal" button in the navbar opens the Auth Modal with tabs for **Sign In** and **Apply / Register**.
  - **Authenticated Promoter**: The navbar updates to show a live green indicator with the promoter's name and tier cut (`[● Aarav S. • 16%]`). Clicking opens the **Promoter Command Center** displaying their unique pass link (`https://tixora.live/?ref=...`), passes sold, lifetime earnings, and instant UPI settlement status.
  - **Admin Switcher**: When an admin logs in, a direct link (`Ops Desk →`) appears in the navbar.

---

## 5. Instant Test & Sandbox Credentials

For rapid sandbox testing without configuring external Supabase keys, Tixora includes built-in test environments:

| Role | Email | Password | Access |
|---|---|---|---|
| **Operations Admin** | `admin@tixora.live` | `tixora2026` | Full access to `/admin` Operations Desk |
| **Youth Promoter** | `aarav.sharma@columbia.edu` | `tixora2026` | Patron Tier promoter desk with live UPI settlements |

Click the **"Load Test Admin"** or **"Load Test Promoter"** buttons on the login modals for 1-click evaluation.

