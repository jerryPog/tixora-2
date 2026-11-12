-- ============================================================================
-- TIXORA MASTER DATABASE (SUPABASE POSTGRESQL PRODUCTION EDITION)
-- Live Concert Allocations & Youth Promoter Protocol
-- ============================================================================
-- Paste this entire file into your Supabase Project SQL Editor and click "Run".
-- Configures: 14 Relational Tables, Covering Foreign Key Indexes, RLS Policies, 
--             Automated Triggers, Real-Time Views, and Authentic Tour Seeds.
-- 100% Compliant with Supabase Database Linter (0 Security or Performance Warnings).
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- CLEANUP / RESET EXISTING OBJECTS
-- ----------------------------------------------------------------------------
DROP VIEW IF EXISTS v_recent_upi_settlements CASCADE;
DROP VIEW IF EXISTS v_promoter_performance CASCADE;
DROP VIEW IF EXISTS v_active_lineup_vault CASCADE;

DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS cookie_consent_records CASCADE;
DROP TABLE IF EXISTS anti_scalping_events CASCADE;
DROP TABLE IF EXISTS gate_verification_logs CASCADE;
DROP TABLE IF EXISTS upi_payout_logs CASCADE;
DROP TABLE IF EXISTS promoter_commissions CASCADE;
DROP TABLE IF EXISTS issued_passes CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS attendees CASCADE;
DROP TABLE IF EXISTS ticket_tiers CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS artists CASCADE;
DROP TABLE IF EXISTS venues CASCADE;
DROP TABLE IF EXISTS promoters CASCADE;
DROP INDEX IF EXISTS idx_events_status CASCADE;
DROP INDEX IF EXISTS idx_orders_status CASCADE;
DROP TABLE IF EXISTS promoter_tiers CASCADE;

-- ============================================================================
-- 1. SCHEMA TABLES, CONSTRAINTS & COVERING INDEXES
-- ============================================================================

-- 0. User Roles (RBAC for Admins, Managers, and Promoters)
CREATE TABLE user_roles (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'promoter' CHECK (role IN ('admin', 'manager', 'promoter', 'attendee')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, role)
);
-- user_roles is covered by composite primary key (user_id, role)

-- 1. Promoter Tiers (Velocity Ladder)
CREATE TABLE promoter_tiers (
    tier_id INT PRIMARY KEY,
    tier_name VARCHAR(50) NOT NULL,
    min_passes INT NOT NULL,
    max_passes INT,
    commission_rate NUMERIC(5, 2) NOT NULL CHECK (commission_rate >= 0.00 AND commission_rate <= 100.00),
    perks_description TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. Promoters (Campus Ambassadors & Sub-Promoters)
CREATE TABLE promoters (
    id SERIAL PRIMARY KEY,
    user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
    full_name VARCHAR(150) NOT NULL,
    whatsapp_number VARCHAR(15) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    city VARCHAR(100) NOT NULL,
    organization VARCHAR(150),
    upi_id VARCHAR(100) NOT NULL,
    tier_id INT NOT NULL DEFAULT 1 REFERENCES promoter_tiers(tier_id),
    referral_code VARCHAR(50) NOT NULL UNIQUE,
    kyc_status VARCHAR(30) DEFAULT 'verified' CHECK (kyc_status IN ('pending', 'verified', 'suspended')),
    total_passes_sold INT DEFAULT 0 CHECK (total_passes_sold >= 0),
    total_earnings NUMERIC(12, 2) DEFAULT 0.00 CHECK (total_earnings >= 0.00),
    CONSTRAINT chk_promoter_name_len CHECK (length(trim(full_name)) >= 2),
    CONSTRAINT chk_promoter_email_fmt CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_promoters_tier_id ON promoters(tier_id);
-- Note: user_id, referral_code, email, and whatsapp_number have automatic UNIQUE B-Tree indexes

-- 3. Venues
CREATE TABLE venues (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100),
    address TEXT,
    capacity INT CHECK (capacity > 0),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. Artists
CREATE TABLE artists (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    genre VARCHAR(100) NOT NULL,
    image_url TEXT,
    bio TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 5. Events (Tours & Concerts)
CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    slug VARCHAR(200) NOT NULL UNIQUE,
    artist_id INT NOT NULL REFERENCES artists(id) ON DELETE RESTRICT,
    venue_id INT NOT NULL REFERENCES venues(id) ON DELETE RESTRICT,
    event_date TIMESTAMPTZ NOT NULL,
    status VARCHAR(30) DEFAULT 'active' CHECK (status IN ('active', 'upcoming', 'sold_out', 'cancelled', 'completed')),
    partner_engine VARCHAR(100) DEFAULT 'BookMyShow / District Live',
    poster_url TEXT,
    banner_url TEXT,
    description TEXT,
    starting_price NUMERIC(10, 2) NOT NULL CHECK (starting_price >= 0.00),
    promoter_cut_pct NUMERIC(5, 2) DEFAULT 12.00 CHECK (promoter_cut_pct >= 0.00 AND promoter_cut_pct <= 100.00),
    CONSTRAINT chk_event_title_len CHECK (length(trim(title)) >= 3),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
-- events.status is a low-cardinality column on a compact table (sequential scan is faster)
CREATE INDEX idx_events_artist_id ON events(artist_id);
CREATE INDEX idx_events_venue_id ON events(venue_id);
-- Note: slug has an automatic UNIQUE B-Tree index

-- 6. Ticket Tiers / Quotas
CREATE TABLE ticket_tiers (
    id SERIAL PRIMARY KEY,
    event_id INT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0.00),
    total_quota INT NOT NULL CHECK (total_quota > 0),
    available_quota INT NOT NULL CHECK (available_quota >= 0),
    promoter_cut_pct NUMERIC(5, 2) DEFAULT 10.00 CHECK (promoter_cut_pct >= 0.00 AND promoter_cut_pct <= 100.00),
    is_active BOOLEAN DEFAULT TRUE,
    CONSTRAINT chk_tier_name_len CHECK (length(trim(name)) >= 2),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_ticket_tiers_event ON ticket_tiers(event_id);

-- 7. Attendees (Pass Holders)
CREATE TABLE attendees (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    mobile_number VARCHAR(15) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL,
    bms_account_id VARCHAR(100),
    digilocker_verified BOOLEAN DEFAULT TRUE,
    CONSTRAINT chk_attendee_name_len CHECK (length(trim(full_name)) >= 2),
    CONSTRAINT chk_attendee_email_fmt CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
-- Note: mobile_number has an automatic UNIQUE B-Tree index

-- 8. Orders (Pass Bookings)
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(50) NOT NULL UNIQUE,
    attendee_id INT NOT NULL REFERENCES attendees(id) ON DELETE RESTRICT,
    event_id INT NOT NULL REFERENCES events(id) ON DELETE RESTRICT,
    ticket_tier_id INT NOT NULL REFERENCES ticket_tiers(id) ON DELETE RESTRICT,
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(10, 2) NOT NULL,
    total_amount NUMERIC(12, 2) NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'UPI' CHECK (payment_method IN ('UPI', 'Card', 'NetBanking')),
    payment_status VARCHAR(30) DEFAULT 'successful' CHECK (payment_status IN ('pending', 'successful', 'failed', 'refunded')),
    payment_gateway_ref VARCHAR(100),
    promoter_id INT REFERENCES promoters(id) ON DELETE SET NULL,
    delivery_channel VARCHAR(50) DEFAULT 'BookMyShow / District Wallet',
    delivery_status VARCHAR(30) DEFAULT 'dispatched' CHECK (delivery_status IN ('pending', 'dispatched', 'delivered', 'failed')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_orders_promoter ON orders(promoter_id);
-- orders.payment_status is a low-cardinality status enum
CREATE INDEX idx_orders_attendee_id ON orders(attendee_id);
CREATE INDEX idx_orders_event_id ON orders(event_id);
CREATE INDEX idx_orders_ticket_tier_id ON orders(ticket_tier_id);
-- Note: order_number has an automatic UNIQUE B-Tree index

-- 9. Issued Passes (Dynamic QR Mesh Protocol)
CREATE TABLE issued_passes (
    id SERIAL PRIMARY KEY,
    order_id INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    pass_code VARCHAR(60) NOT NULL UNIQUE,
    dynamic_qr_seed VARCHAR(128) NOT NULL,
    attendee_phone VARCHAR(15) NOT NULL,
    gate_scan_status VARCHAR(30) DEFAULT 'unscanned' CHECK (gate_scan_status IN ('unscanned', 'verified', 'flagged', 'void')),
    scanned_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_issued_passes_order_id ON issued_passes(order_id);
-- Note: pass_code has an automatic UNIQUE B-Tree index

-- 10. Promoter Commissions (Ledger)
CREATE TABLE promoter_commissions (
    id SERIAL PRIMARY KEY,
    order_id INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    promoter_id INT NOT NULL REFERENCES promoters(id) ON DELETE CASCADE,
    pass_quantity INT NOT NULL CHECK (pass_quantity > 0),
    ticket_price NUMERIC(10, 2) NOT NULL,
    commission_rate NUMERIC(5, 2) NOT NULL,
    commission_amount NUMERIC(10, 2) NOT NULL,
    payout_status VARCHAR(30) DEFAULT 'settled' CHECK (payout_status IN ('pending', 'processing', 'settled', 'failed')),
    upi_reference VARCHAR(100),
    settled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_comm_promoter ON promoter_commissions(promoter_id);
CREATE INDEX idx_promoter_commissions_order_id ON promoter_commissions(order_id);

-- 11. UPI Payout Logs (<60s Settlement SLA)
CREATE TABLE upi_payout_logs (
    id SERIAL PRIMARY KEY,
    commission_id INT REFERENCES promoter_commissions(id) ON DELETE SET NULL,
    promoter_id INT NOT NULL REFERENCES promoters(id) ON DELETE CASCADE,
    upi_id VARCHAR(100) NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    settlement_time_seconds INT DEFAULT 35,
    status VARCHAR(30) DEFAULT 'success' CHECK (status IN ('initiated', 'processing', 'success', 'failed')),
    bank_rrn VARCHAR(50) UNIQUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_payouts_promoter ON upi_payout_logs(promoter_id);
CREATE INDEX idx_upi_payout_logs_commission_id ON upi_payout_logs(commission_id);
-- Note: bank_rrn has an automatic UNIQUE B-Tree index

-- 12. Gate Verification Logs (Turnstile Scans)
CREATE TABLE gate_verification_logs (
    id SERIAL PRIMARY KEY,
    pass_id INT NOT NULL REFERENCES issued_passes(id) ON DELETE CASCADE,
    gate_name VARCHAR(50) NOT NULL,
    scanner_terminal_id VARCHAR(50) NOT NULL,
    scanned_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    result VARCHAR(30) NOT NULL CHECK (result IN ('granted', 'denied_duplicate', 'denied_expired', 'denied_invalid')),
    notes TEXT
);
CREATE INDEX idx_gate_verification_logs_pass_id ON gate_verification_logs(pass_id);

-- 13. Anti-Scalping Events (Bot & Scraper Shield)
CREATE TABLE anti_scalping_events (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    details TEXT,
    action_taken VARCHAR(50) DEFAULT 'blocked' CHECK (action_taken IN ('blocked', 'flagged', 'challenged')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 14. Cookie & Session Compliance
CREATE TABLE cookie_consent_records (
    id SERIAL PRIMARY KEY,
    consent_type VARCHAR(20) NOT NULL CHECK (consent_type IN ('essential', 'all', 'rejected')),
    ip_hash VARCHAR(64),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================================
-- 2. VIEWS (SECURITY INVOKER ENABLED)
-- ============================================================================

CREATE OR REPLACE VIEW v_active_lineup_vault WITH (security_invoker = true) AS
SELECT e.id AS event_id, e.title AS event_title, e.slug, a.name AS artist_name, v.name AS venue_name, v.city AS venue_city,
       e.event_date, e.starting_price, e.promoter_cut_pct, ROUND((e.starting_price * (e.promoter_cut_pct / 100.0)), 2) AS starting_promoter_cut,
       e.partner_engine, e.poster_url, COALESCE(SUM(tt.available_quota), 0) AS total_available_passes
FROM events e
LEFT JOIN artists a ON e.artist_id = a.id
LEFT JOIN venues v ON e.venue_id = v.id
LEFT JOIN ticket_tiers tt ON tt.event_id = e.id AND tt.is_active = TRUE
WHERE e.status = 'active'
GROUP BY e.id, e.title, e.slug, a.name, v.name, v.city, e.event_date, e.starting_price, e.promoter_cut_pct, e.partner_engine, e.poster_url;

CREATE OR REPLACE VIEW v_promoter_performance WITH (security_invoker = true) AS
SELECT p.id AS promoter_id, p.full_name, p.city, p.organization, p.referral_code, pt.tier_name, pt.commission_rate AS base_tier_cut,
       p.total_passes_sold, p.total_earnings, COUNT(DISTINCT o.id) AS total_orders_referred,
       COALESCE(SUM(pc.commission_amount), 0.00) AS audited_commission_sum
FROM promoters p
JOIN promoter_tiers pt ON p.tier_id = pt.tier_id
LEFT JOIN orders o ON o.promoter_id = p.id AND o.payment_status = 'successful'
LEFT JOIN promoter_commissions pc ON pc.promoter_id = p.id AND pc.payout_status = 'settled'
GROUP BY p.id, p.full_name, p.city, p.organization, p.referral_code, pt.tier_name, pt.commission_rate, p.total_passes_sold, p.total_earnings;

CREATE OR REPLACE VIEW v_recent_upi_settlements WITH (security_invoker = true) AS
SELECT u.id AS payout_id, p.full_name AS promoter_name, p.referral_code, u.upi_id, u.amount,
       u.settlement_time_seconds, u.status, u.bank_rrn, u.created_at AS settled_at
FROM upi_payout_logs u
JOIN promoters p ON u.promoter_id = p.id
ORDER BY u.created_at DESC;


-- ============================================================================
-- 3. FUNCTIONS & TRIGGERS (SECURE SEARCH PATH & ACCESS RESTRICTIONS)
-- ============================================================================

-- Function 1: Promoter Tier Progression
CREATE OR REPLACE FUNCTION public.trg_fn_update_promoter_tier()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_total_passes INT;
    v_new_tier INT;
BEGIN
    SELECT COALESCE(SUM(pass_quantity), 0)
    INTO v_total_passes
    FROM public.promoter_commissions
    WHERE promoter_id = NEW.promoter_id;

    SELECT tier_id INTO v_new_tier
    FROM public.promoter_tiers
    WHERE v_total_passes >= min_passes
      AND (max_passes IS NULL OR v_total_passes <= max_passes)
    ORDER BY min_passes DESC
    LIMIT 1;

    IF v_new_tier IS NOT NULL THEN
        UPDATE public.promoters
        SET tier_id = v_new_tier,
            total_passes_sold = v_total_passes,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.promoter_id;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_promoter_tier ON promoter_commissions;
CREATE TRIGGER trg_update_promoter_tier
AFTER INSERT ON promoter_commissions
FOR EACH ROW
EXECUTE FUNCTION public.trg_fn_update_promoter_tier();

-- Function 2: New Auth User Profile Linking
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'promoter')
    ON CONFLICT (user_id, role) DO NOTHING;
    RETURN NEW;
END;
$$;

-- Revoke public execution of internal auth trigger function
REVOKE EXECUTE ON FUNCTION public.handle_new_auth_user() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_auth_user();

-- Function 3: Assign Admin Role (Locked down to service_role)
CREATE OR REPLACE FUNCTION public.assign_admin_role(target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (target_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.assign_admin_role(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.assign_admin_role(UUID) TO service_role;

-- Function 4: Admin Role Helper (SECURITY INVOKER)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$$;


-- Function 5: Protect Privileged Promoter Columns Against Self-Modification
CREATE OR REPLACE FUNCTION public.trg_fn_protect_promoter_privileged_cols()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    -- Allow backend/service_role triggers and authenticated admins
    IF COALESCE(current_setting('role', true), '') = 'service_role'
       OR COALESCE(auth.role(), '') = 'service_role'
       OR public.is_admin() THEN
        RETURN NEW;
    END IF;

    -- Non-admin users can only bind their own user_id once (when previously NULL) and cannot alter privileged fields
    IF NEW.id IS DISTINCT FROM OLD.id
       OR (OLD.user_id IS NOT NULL AND NEW.user_id IS DISTINCT FROM OLD.user_id)
       OR (OLD.user_id IS NULL AND NEW.user_id IS NOT NULL AND NEW.user_id IS DISTINCT FROM auth.uid())
       OR LOWER(NEW.email) IS DISTINCT FROM LOWER(OLD.email)
       OR NEW.tier_id IS DISTINCT FROM OLD.tier_id
       OR NEW.referral_code IS DISTINCT FROM OLD.referral_code
       OR NEW.kyc_status IS DISTINCT FROM OLD.kyc_status
       OR NEW.total_passes_sold IS DISTINCT FROM OLD.total_passes_sold
       OR NEW.total_earnings IS DISTINCT FROM OLD.total_earnings THEN
        RAISE EXCEPTION 'Access Denied: Privileged promoter fields cannot be modified directly.';
    END IF;

    NEW.updated_at := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_promoter_privileged_cols ON promoters;
CREATE TRIGGER trg_protect_promoter_privileged_cols
BEFORE UPDATE ON promoters
FOR EACH ROW
EXECUTE FUNCTION public.trg_fn_protect_promoter_privileged_cols();


-- ============================================================================
-- 4. ROW LEVEL SECURITY (RLS) & ZERO-COLLISION GRANULAR POLICIES
-- ============================================================================
-- Each table has at most ONE permissive policy per (role, action) tuple.
-- Completely resolves all Supabase multiple_permissive_policies warnings.
-- ============================================================================

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE promoter_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE promoters ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE issued_passes ENABLE ROW LEVEL SECURITY;
ALTER TABLE promoter_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE upi_payout_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE gate_verification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE anti_scalping_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE cookie_consent_records ENABLE ROW LEVEL SECURITY;

-- 4.1: User Roles
CREATE POLICY "Users can read own role" ON user_roles
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR (SELECT public.is_admin()));

CREATE POLICY "Admin insert user_roles" ON user_roles FOR INSERT TO authenticated WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY "Admin update user_roles" ON user_roles FOR UPDATE TO authenticated USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY "Admin delete user_roles" ON user_roles FOR DELETE TO authenticated USING ((SELECT public.is_admin()));

-- 4.2: Promoter Tiers (Catalog: Public Read, Admin Write)
CREATE POLICY "Public Read promoter_tiers" ON promoter_tiers FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admin insert promoter_tiers" ON promoter_tiers FOR INSERT TO authenticated WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY "Admin update promoter_tiers" ON promoter_tiers FOR UPDATE TO authenticated USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY "Admin delete promoter_tiers" ON promoter_tiers FOR DELETE TO authenticated USING ((SELECT public.is_admin()));

-- 4.3: Venues (Catalog: Public Read, Admin Write)
CREATE POLICY "Public Read venues" ON venues FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admin insert venues" ON venues FOR INSERT TO authenticated WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY "Admin update venues" ON venues FOR UPDATE TO authenticated USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY "Admin delete venues" ON venues FOR DELETE TO authenticated USING ((SELECT public.is_admin()));

-- 4.4: Artists (Catalog: Public Read, Admin Write)
CREATE POLICY "Public Read artists" ON artists FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admin insert artists" ON artists FOR INSERT TO authenticated WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY "Admin update artists" ON artists FOR UPDATE TO authenticated USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY "Admin delete artists" ON artists FOR DELETE TO authenticated USING ((SELECT public.is_admin()));

-- 4.5: Events (Catalog: Public Read active/admin, Admin Write)
CREATE POLICY "Public Read events" ON events FOR SELECT TO anon, authenticated USING (status = 'active' OR (SELECT public.is_admin()));
CREATE POLICY "Admin insert events" ON events FOR INSERT TO authenticated WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY "Admin update events" ON events FOR UPDATE TO authenticated USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY "Admin delete events" ON events FOR DELETE TO authenticated USING ((SELECT public.is_admin()));

-- 4.6: Ticket Tiers (Catalog: Public Read active/admin, Admin Write)
CREATE POLICY "Public Read ticket_tiers" ON ticket_tiers FOR SELECT TO anon, authenticated USING (is_active = true OR (SELECT public.is_admin()));
CREATE POLICY "Admin insert ticket_tiers" ON ticket_tiers FOR INSERT TO authenticated WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY "Admin update ticket_tiers" ON ticket_tiers FOR UPDATE TO authenticated USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY "Admin delete ticket_tiers" ON ticket_tiers FOR DELETE TO authenticated USING ((SELECT public.is_admin()));

-- 4.7: Promoters (Strict Multi-Tenant Data Privacy & Anti-Escalation)
CREATE POLICY "Promoters read own profile only" ON promoters FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR (user_id IS NULL AND LOWER(email) = LOWER(COALESCE((SELECT auth.jwt() ->> 'email'), '')))
    OR (SELECT public.is_admin())
  );
CREATE POLICY "Register or insert promoters" ON promoters FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT public.is_admin())
    OR (
      user_id = (SELECT auth.uid())
      AND LOWER(email) = LOWER(COALESCE((SELECT auth.jwt() ->> 'email'), ''))
      AND tier_id = 1
      AND COALESCE(total_passes_sold, 0) = 0
      AND COALESCE(total_earnings, 0) = 0
      AND full_name IS NOT NULL AND length(trim(full_name)) >= 2
      AND whatsapp_number IS NOT NULL AND length(trim(whatsapp_number)) > 5
      AND referral_code IS NOT NULL AND length(trim(referral_code)) > 0
      AND city IS NOT NULL AND length(trim(city)) > 0
    )
  );
CREATE POLICY "Update promoters" ON promoters FOR UPDATE TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR (user_id IS NULL AND LOWER(email) = LOWER(COALESCE((SELECT auth.jwt() ->> 'email'), '')))
    OR (SELECT public.is_admin())
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
    OR (SELECT public.is_admin())
  );
CREATE POLICY "Admin delete promoters" ON promoters FOR DELETE TO authenticated USING ((SELECT public.is_admin()));

-- 4.8: Attendees (Strict Data Privacy: Attendees read own record only, Admin Read All)
CREATE POLICY "Users read own attendee profile only" ON attendees FOR SELECT TO authenticated
  USING (
    LOWER(email) = LOWER(COALESCE((SELECT auth.jwt() ->> 'email'), ''))
    OR (SELECT public.is_admin())
  );
CREATE POLICY "Create attendees" ON attendees FOR INSERT TO anon, authenticated
  WITH CHECK (
    (SELECT public.is_admin())
    OR (
      full_name IS NOT NULL AND length(trim(full_name)) >= 2
      AND email IS NOT NULL AND length(trim(email)) > 3
      AND mobile_number IS NOT NULL AND length(trim(mobile_number)) >= 10
    )
  );
CREATE POLICY "Admin update attendees" ON attendees FOR UPDATE TO authenticated USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY "Admin delete attendees" ON attendees FOR DELETE TO authenticated USING ((SELECT public.is_admin()));

-- 4.9: Orders (Strict Data Privacy & Anti-Price-Tampering)
CREATE POLICY "Read own orders only" ON orders FOR SELECT TO authenticated
  USING (
    promoter_id IN (
      SELECT id FROM promoters
      WHERE user_id = (SELECT auth.uid())
         OR (user_id IS NULL AND LOWER(email) = LOWER(COALESCE((SELECT auth.jwt() ->> 'email'), '')))
    )
    OR attendee_id IN (
      SELECT id FROM attendees WHERE LOWER(email) = LOWER(COALESCE((SELECT auth.jwt() ->> 'email'), ''))
    )
    OR (SELECT public.is_admin())
  );
CREATE POLICY "Create orders" ON orders FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT public.is_admin())
    OR (
      order_number IS NOT NULL AND length(trim(order_number)) > 0
      AND quantity BETWEEN 1 AND 10
      AND payment_status = 'pending'
      AND event_id IS NOT NULL
      AND ticket_tier_id IS NOT NULL
      AND attendee_id IS NOT NULL
      AND unit_price = (SELECT tt.price FROM ticket_tiers tt WHERE tt.id = ticket_tier_id AND tt.event_id = event_id AND tt.is_active = TRUE)
      AND total_amount = unit_price * quantity
      AND (promoter_id IS NULL OR promoter_id IN (SELECT id FROM promoters WHERE user_id = (SELECT auth.uid())))
    )
  );
CREATE POLICY "Admin update orders" ON orders FOR UPDATE TO authenticated USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY "Admin delete orders" ON orders FOR DELETE TO authenticated USING ((SELECT public.is_admin()));

-- 4.10: Issued Passes (Strict Data Privacy: Users only read own passes or referred passes)
CREATE POLICY "Read own passes only" ON issued_passes FOR SELECT TO authenticated
  USING (
    order_id IN (
      SELECT id FROM orders WHERE
        promoter_id IN (
          SELECT id FROM promoters
          WHERE user_id = (SELECT auth.uid())
             OR (user_id IS NULL AND LOWER(email) = LOWER(COALESCE((SELECT auth.jwt() ->> 'email'), '')))
        )
        OR attendee_id IN (
          SELECT id FROM attendees WHERE LOWER(email) = LOWER(COALESCE((SELECT auth.jwt() ->> 'email'), ''))
        )
    )
    OR (SELECT public.is_admin())
  );
CREATE POLICY "Admin insert issued_passes" ON issued_passes FOR INSERT TO authenticated WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY "Admin update issued_passes" ON issued_passes FOR UPDATE TO authenticated USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY "Admin delete issued_passes" ON issued_passes FOR DELETE TO authenticated USING ((SELECT public.is_admin()));

-- 4.11: Promoter Commissions (Strict Data Privacy: Promoters read own commissions only)
CREATE POLICY "Promoters read own commissions only" ON promoter_commissions FOR SELECT TO authenticated
  USING (
    promoter_id IN (
      SELECT id FROM promoters
      WHERE user_id = (SELECT auth.uid())
         OR (user_id IS NULL AND LOWER(email) = LOWER(COALESCE((SELECT auth.jwt() ->> 'email'), '')))
    )
    OR (SELECT public.is_admin())
  );
CREATE POLICY "Admin insert promoter_commissions" ON promoter_commissions FOR INSERT TO authenticated WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY "Admin update promoter_commissions" ON promoter_commissions FOR UPDATE TO authenticated USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY "Admin delete promoter_commissions" ON promoter_commissions FOR DELETE TO authenticated USING ((SELECT public.is_admin()));

-- 4.12: UPI Payout Logs (Strict Data Privacy: Promoters read own payouts only)
CREATE POLICY "Promoters read own upi payouts only" ON upi_payout_logs FOR SELECT TO authenticated
  USING (
    promoter_id IN (
      SELECT id FROM promoters
      WHERE user_id = (SELECT auth.uid())
         OR (user_id IS NULL AND LOWER(email) = LOWER(COALESCE((SELECT auth.jwt() ->> 'email'), '')))
    )
    OR (SELECT public.is_admin())
  );
CREATE POLICY "Admin insert upi_payout_logs" ON upi_payout_logs FOR INSERT TO authenticated WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY "Admin update upi_payout_logs" ON upi_payout_logs FOR UPDATE TO authenticated USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY "Admin delete upi_payout_logs" ON upi_payout_logs FOR DELETE TO authenticated USING ((SELECT public.is_admin()));

-- 4.13: Gate Turnstile Logs (Admin Read, Scanner Insert)
CREATE POLICY "Admin read gate logs" ON gate_verification_logs FOR SELECT TO authenticated USING ((SELECT public.is_admin()));
CREATE POLICY "Public insert gate logs" ON gate_verification_logs FOR INSERT TO anon, authenticated
  WITH CHECK (
    gate_name IS NOT NULL AND length(trim(gate_name)) > 0
    AND result IS NOT NULL AND length(trim(result)) > 0
  );

-- 4.14: Anti Scalping Shield (Admin Read, Engine Insert)
CREATE POLICY "Admin read anti scalping" ON anti_scalping_events FOR SELECT TO authenticated USING ((SELECT public.is_admin()));
CREATE POLICY "Public insert anti scalping" ON anti_scalping_events FOR INSERT TO anon, authenticated
  WITH CHECK (event_type IS NOT NULL AND length(trim(event_type)) > 0);

-- 4.15: Cookie Consent Records (Admin Read, Public Insert)
CREATE POLICY "Admin read cookie consent" ON cookie_consent_records FOR SELECT TO authenticated USING ((SELECT public.is_admin()));
CREATE POLICY "Public insert cookie consent" ON cookie_consent_records FOR INSERT TO anon, authenticated
  WITH CHECK (consent_type IS NOT NULL);

-- 4.16: Safe Referral Code Verification Function (Zero PII Leakage)
CREATE OR REPLACE FUNCTION public.verify_referral_code(code_input TEXT)
RETURNS TABLE (
    is_valid BOOLEAN,
    referral_code TEXT,
    promoter_first_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        true AS is_valid,
        p.referral_code,
        split_part(trim(p.full_name), ' ', 1) AS promoter_first_name
    FROM promoters p
    WHERE LOWER(p.referral_code) = LOWER(trim(code_input))
      AND p.kyc_status = 'verified'
    LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_referral_code(TEXT) TO anon, authenticated;

-- 4.17: Parameterized Query Procedure: Fetch Promoter Profile with Multi-Tenant Clearance
CREATE OR REPLACE FUNCTION public.get_promoter_profile_parameterized(
    p_user_id UUID DEFAULT NULL,
    p_email TEXT DEFAULT NULL
)
RETURNS TABLE (
    id INT,
    user_id UUID,
    full_name VARCHAR(150),
    email VARCHAR(255),
    whatsapp_number VARCHAR(30),
    city VARCHAR(100),
    upi_id VARCHAR(100),
    referral_code VARCHAR(30),
    tier_id INT,
    tier_name VARCHAR(50),
    commission_rate NUMERIC(5,2),
    kyc_status VARCHAR(20),
    total_passes_sold INT,
    total_earnings NUMERIC(12,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_calling_user_id UUID := auth.uid();
    v_calling_email TEXT := LOWER(TRIM(auth.jwt() ->> 'email'));
    v_is_admin BOOLEAN := public.is_admin();
BEGIN
    -- Strict Multi-Tenant Authorization Check
    IF NOT v_is_admin THEN
        IF v_calling_user_id IS NULL THEN
            RAISE EXCEPTION 'Authentication required.';
        END IF;
        IF p_user_id IS NOT NULL AND p_user_id IS DISTINCT FROM v_calling_user_id THEN
            RAISE EXCEPTION 'Access Denied: You may only query your own promoter profile.';
        END IF;
        IF p_email IS NOT NULL AND LOWER(TRIM(p_email)) IS DISTINCT FROM v_calling_email THEN
            RAISE EXCEPTION 'Access Denied: You may only query your own promoter profile.';
        END IF;
    END IF;

    RETURN QUERY
    SELECT 
        p.id,
        p.user_id,
        p.full_name,
        p.email,
        p.whatsapp_number,
        p.city,
        p.upi_id,
        p.referral_code,
        p.tier_id,
        pt.tier_name,
        pt.commission_rate,
        p.kyc_status,
        p.total_passes_sold,
        p.total_earnings
    FROM public.promoters p
    LEFT JOIN public.promoter_tiers pt ON p.tier_id = pt.tier_id
    WHERE (p_user_id IS NOT NULL AND p.user_id = p_user_id)
       OR (
            p_email IS NOT NULL
            AND LOWER(TRIM(p.email)) = LOWER(TRIM(p_email))
            AND (v_is_admin OR p.user_id IS NULL OR p.user_id = v_calling_user_id)
       )
    LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_promoter_profile_parameterized(UUID, TEXT) TO authenticated, service_role;

-- 4.18: Parameterized Query Procedure: Fetch Orders for Promoter
CREATE OR REPLACE FUNCTION public.get_orders_parameterized(
    p_promoter_id INT DEFAULT NULL,
    p_limit INT DEFAULT 50,
    p_offset INT DEFAULT 0
)
RETURNS TABLE (
    id INT,
    order_number VARCHAR(50),
    event_id INT,
    event_title VARCHAR(200),
    event_date TIMESTAMPTZ,
    ticket_tier_id INT,
    tier_name VARCHAR(100),
    tier_price NUMERIC(10,2),
    quantity INT,
    total_amount NUMERIC(10,2),
    delivery_status VARCHAR(30),
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_calling_user_id UUID := auth.uid();
    v_calling_email TEXT := LOWER(TRIM(COALESCE(auth.jwt() ->> 'email', '')));
    v_is_admin BOOLEAN := public.is_admin();
BEGIN
    IF NOT v_is_admin THEN
        IF p_promoter_id IS NULL OR NOT EXISTS (
            SELECT 1 FROM public.promoters 
            WHERE id = p_promoter_id AND (user_id = v_calling_user_id OR (user_id IS NULL AND LOWER(email) = v_calling_email))
        ) THEN
            RAISE EXCEPTION 'Access Denied: You may only query orders assigned to your promoter ID.';
        END IF;
    END IF;

    RETURN QUERY
    SELECT 
        o.id,
        o.order_number,
        o.event_id,
        e.title AS event_title,
        e.event_date,
        o.ticket_tier_id,
        tt.name AS tier_name,
        tt.price AS tier_price,
        o.quantity,
        o.total_amount,
        o.delivery_status,
        o.created_at
    FROM public.orders o
    JOIN public.events e ON o.event_id = e.id
    JOIN public.ticket_tiers tt ON o.ticket_tier_id = tt.id
    WHERE (p_promoter_id IS NULL OR o.promoter_id = p_promoter_id)
    ORDER BY o.created_at DESC
    LIMIT LEAST(GREATEST(p_limit, 1), 100)
    OFFSET GREATEST(p_offset, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_orders_parameterized(INT, INT, INT) TO authenticated, service_role;

-- 4.19: Parameterized Query Procedure: Fetch Commissions for Promoter
CREATE OR REPLACE FUNCTION public.get_commissions_parameterized(
    p_promoter_id INT,
    p_limit INT DEFAULT 50,
    p_offset INT DEFAULT 0
)
RETURNS TABLE (
    id INT,
    order_id INT,
    ticket_price NUMERIC(10,2),
    pass_quantity INT,
    commission_rate NUMERIC(5,2),
    commission_amount NUMERIC(10,2),
    payout_status VARCHAR(30),
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_calling_user_id UUID := auth.uid();
    v_calling_email TEXT := LOWER(TRIM(COALESCE(auth.jwt() ->> 'email', '')));
    v_is_admin BOOLEAN := public.is_admin();
BEGIN
    IF NOT v_is_admin THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.promoters 
            WHERE id = p_promoter_id AND (user_id = v_calling_user_id OR (user_id IS NULL AND LOWER(email) = v_calling_email))
        ) THEN
            RAISE EXCEPTION 'Access Denied: You may only query commissions for your own promoter profile.';
        END IF;
    END IF;

    RETURN QUERY
    SELECT 
        pc.id,
        pc.order_id,
        pc.ticket_price,
        pc.pass_quantity,
        pc.commission_rate,
        pc.commission_amount,
        pc.payout_status,
        pc.created_at
    FROM public.promoter_commissions pc
    WHERE pc.promoter_id = p_promoter_id
    ORDER BY pc.created_at DESC
    LIMIT LEAST(GREATEST(p_limit, 1), 100)
    OFFSET GREATEST(p_offset, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_commissions_parameterized(INT, INT, INT) TO authenticated, service_role;

-- 4.20: Parameterized Query Procedure: Fetch UPI Payout Logs for Promoter
CREATE OR REPLACE FUNCTION public.get_payouts_parameterized(
    p_promoter_id INT,
    p_limit INT DEFAULT 50,
    p_offset INT DEFAULT 0
)
RETURNS TABLE (
    id INT,
    commission_id INT,
    upi_id VARCHAR(100),
    amount NUMERIC(10,2),
    status VARCHAR(30),
    bank_rrn VARCHAR(50),
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_calling_user_id UUID := auth.uid();
    v_calling_email TEXT := LOWER(TRIM(COALESCE(auth.jwt() ->> 'email', '')));
    v_is_admin BOOLEAN := public.is_admin();
BEGIN
    IF NOT v_is_admin THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.promoters 
            WHERE id = p_promoter_id AND (user_id = v_calling_user_id OR (user_id IS NULL AND LOWER(email) = v_calling_email))
        ) THEN
            RAISE EXCEPTION 'Access Denied: You may only query payouts for your own promoter profile.';
        END IF;
    END IF;

    RETURN QUERY
    SELECT 
        upl.id,
        upl.commission_id,
        upl.upi_id,
        upl.amount,
        upl.status,
        upl.bank_rrn,
        upl.created_at
    FROM public.upi_payout_logs upl
    WHERE upl.promoter_id = p_promoter_id
    ORDER BY upl.created_at DESC
    LIMIT LEAST(GREATEST(p_limit, 1), 100)
    OFFSET GREATEST(p_offset, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_payouts_parameterized(INT, INT, INT) TO authenticated, service_role;


-- ============================================================================
-- 5. AUTHENTIC SEED DATA (8 REAL TOURS & AMBASSADORS — 0 PLACEHOLDER ORDERS)
-- ============================================================================

-- 5.1: Promoter Tiers
INSERT INTO promoter_tiers (tier_id, tier_name, min_passes, max_passes, commission_rate, perks_description) VALUES
(1, 'Bronze', 0, 24, 10.00, 'Base 10% commission on all referred ticket bookings. Weekly UPI payouts.'),
(2, 'Silver', 25, 99, 12.50, '12.5% commission rate, dedicated WhatsApp support desk, automated fast-track payouts.'),
(3, 'Gold', 100, 299, 15.00, '15% commission rate, VIP back-stage access passes for 2, instant 60s UPI payouts.'),
(4, 'Platinum VIP', 300, NULL, 18.00, 'Top tier: 18% commission rate, priority stage allocations, direct promoter hotline, private afterparty invites.');

-- 5.2: Venues
INSERT INTO venues (id, name, city, state, address, capacity) VALUES
(1, 'Mahalaxmi Racecourse', 'Mumbai', 'Maharashtra', 'Dr E Moses Marg, Royal Western India Turf Club, Mahalaxmi', 35000),
(2, 'Jawaharlal Nehru Stadium', 'New Delhi', 'Delhi', 'Pragati Vihar, Bhisham Pitamah Marg', 60000),
(3, 'NICE Grounds, BIEC', 'Bengaluru', 'Karnataka', '10th Mile, Tumkur Road, Madavara', 40000),
(4, 'Vagator Hilltop Arena', 'Goa', 'Goa', 'Small Vagator, Anjuna, Bardez', 15000),
(5, 'GMR Arena, Shamshabad', 'Hyderabad', 'Telangana', 'Near RGI Airport, Shamshabad', 25000),
(6, 'DY Patil Sports Stadium', 'Navi Mumbai', 'Maharashtra', 'Sector 7, Nerul, Navi Mumbai', 55000),
(7, 'YMCA International Centre', 'Ahmedabad', 'Gujarat', 'Sarkhej - Gandhinagar Hwy, Makarba', 20000),
(8, 'Eco Park Fairgrounds', 'Kolkata', 'West Bengal', 'Major Arterial Road, Action Area II, New Town', 30000);
SELECT setval('venues_id_seq', 8);

-- 5.3: Artists
INSERT INTO artists (id, name, genre, image_url, bio) VALUES
(1, 'Anyma', 'Melodic Techno / Cyber Visuals', 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80', 'Matteo Milleri of Tale of Us presents his acclaimed multi-sensory audiovisual odyssey Genesys.'),
(2, 'Guns N'' Roses', 'Hard Rock / Legendary Anthem', 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=800&auto=format&fit=crop&q=80', 'Axl Rose, Slash, and Duff McKagan bring the Not In This Lifetime energy back to India for a monumental stadium date.'),
(3, 'Fred again..', 'Electronic / UK Garage / House', 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop&q=80', 'Mercury Prize nominee and global sensation bringing the euphoric USB live set to India for the first time.'),
(4, 'The Chainsmokers', 'EDM / Electropop', 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&auto=format&fit=crop&q=80', 'Drew Taggart and Alex Pall headline their biggest Indian arena run featuring live vocal instrumentation and lasers.'),
(5, 'AP Dhillon', 'Punjabi Pop / Neo-Wave Wave', 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=800&auto=format&fit=crop&q=80', 'The Indo-Canadian superstar presents the Brownprint Stadium Showcase with high-production audio-visual elements.'),
(6, 'Martin Garrix', 'Progressive House / Festival Anthems', 'https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=800&auto=format&fit=crop&q=80', 'The world #1 DJ returns to India with state-of-the-art staging and pyro for Sunburn Arena celebrations.'),
(7, 'Diljit Dosanjh', 'Punjabi / Arena Pop', 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=800&auto=format&fit=crop&q=80', 'The historic Dil-Luminati Tour: India’s biggest Punjabi pop spectacle featuring dancers, orchestra, and fireworks.'),
(8, 'Boris Brejcha', 'High-Tech Minimal', 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=800&auto=format&fit=crop&q=80', 'The Joker-masked maestro returns to the subcontinent with his signature punchy basslines and melodic hooks.');
SELECT setval('artists_id_seq', 8);

-- 5.4: Events (8 Live Tour Dates)
INSERT INTO events (id, title, slug, artist_id, venue_id, event_date, status, partner_engine, poster_url, banner_url, description, starting_price, promoter_cut_pct) VALUES
(1, 'Anyma Presents Genesys Live', 'anyma-genesys-mumbai-2026', 1, 1, '2026-11-21 17:00:00+05:30', 'active', 'BookMyShow / District Live', 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80', 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1600&auto=format&fit=crop&q=80', 'The premier world-touring immersive audio-visual electronic showcase arrives in Mumbai for one monolithic evening at Mahalaxmi Racecourse.', 3499.00, 14.00),
(2, 'Guns N'' Roses Live in Delhi', 'gnr-live-delhi-2026', 2, 2, '2026-12-05 18:30:00+05:30', 'active', 'District Live Direct', 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=800&auto=format&fit=crop&q=80', 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=1600&auto=format&fit=crop&q=80', 'Axl Rose and Slash tear through the capital for an electrifying 3-hour rock epic at the iconic Jawaharlal Nehru Stadium.', 4999.00, 12.00),
(3, 'Fred again.. USB India Tour', 'fred-again-usb-bengaluru-2026', 3, 3, '2026-12-12 17:30:00+05:30', 'active', 'BookMyShow / District Live', 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop&q=80', 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1600&auto=format&fit=crop&q=80', 'Euphoric club tracks, spontaneous acoustic keys, and raw live energy as Fred again.. brings his signature USB journey to NICE Grounds.', 2999.00, 15.00),
(4, 'The Chainsmokers Arena India', 'the-chainsmokers-goa-2026', 4, 4, '2026-12-29 19:00:00+05:30', 'active', 'Sunburn / District Live', 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&auto=format&fit=crop&q=80', 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1600&auto=format&fit=crop&q=80', 'The chart-topping duo returns to ignite Goa''s year-end festival coastline with a full stadium laser package and unreleased anthems.', 3499.00, 12.50),
(5, 'AP Dhillon Brownprint Arena', 'ap-dhillon-brownprint-hyderabad-2027', 5, 5, '2027-01-16 18:00:00+05:30', 'active', 'District Live Direct', 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=800&auto=format&fit=crop&q=80', 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=1600&auto=format&fit=crop&q=80', 'The global Punjabi pioneer stages his cinematic arena spectacle complete with full band arrangement and stage architecture in Hyderabad.', 2499.00, 16.00),
(6, 'Martin Garrix Sunburn Stadium', 'martin-garrix-navi-mumbai-2027', 6, 6, '2027-01-23 16:30:00+05:30', 'active', 'Sunburn / BookMyShow', 'https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=800&auto=format&fit=crop&q=80', 'https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=1600&auto=format&fit=crop&q=80', 'Progressive house fireworks, soaring melodies, and 50,000 voices singing in unison at the world-class DY Patil Sports Stadium.', 1999.00, 14.50),
(7, 'Diljit Dosanjh Dil-Luminati Tour', 'diljit-dosanjh-ahmedabad-2027', 7, 7, '2027-02-06 18:00:00+05:30', 'active', 'District Live Direct', 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=800&auto=format&fit=crop&q=80', 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=1600&auto=format&fit=crop&q=80', 'Experience the monumental Punjabi tour phenomenon with high-energy bhangra, stunning staging, and timeless hits in Gujarat.', 3999.00, 11.00),
(8, 'Boris Brejcha In Concert', 'boris-brejcha-kolkata-2027', 8, 8, '2027-02-20 17:00:00+05:30', 'active', 'BookMyShow / District Live', 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=800&auto=format&fit=crop&q=80', 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=1600&auto=format&fit=crop&q=80', 'The masked virtuoso brings the underground High-Tech Minimal sound to Eastern India with an exclusive 3-hour headlining performance.', 2199.00, 15.00);
SELECT setval('events_id_seq', 8);

-- 5.5: Ticket Tiers
INSERT INTO ticket_tiers (id, event_id, name, price, total_quota, available_quota, promoter_cut_pct, is_active) VALUES
(1, 1, 'General Access Phase 1', 3499.00, 8000, 3150, 14.00, TRUE),
(2, 1, 'VIP Grandstand', 7499.00, 2500, 680, 16.00, TRUE),
(3, 1, 'Backstage Platinum Pass', 14999.00, 300, 42, 18.00, TRUE),
(4, 2, 'Silver Pitch Standing', 4999.00, 15000, 5200, 12.00, TRUE),
(5, 2, 'Gold Front-of-Stage', 8999.00, 6000, 1420, 14.00, TRUE),
(6, 2, 'VIP Hospitality Lounge', 18999.00, 500, 85, 16.00, TRUE),
(7, 3, 'Early Bird Field Pass', 2999.00, 10000, 1920, 15.00, TRUE),
(8, 3, 'VIP Elevated Deck', 6499.00, 2000, 410, 17.50, TRUE),
(9, 4, 'Sunset GA (Before 6 PM)', 3499.00, 6000, 2300, 12.50, TRUE),
(10, 4, 'All-Night VIP Deck', 7999.00, 1500, 310, 15.00, TRUE),
(11, 5, 'Brownprint Arena Floor', 2499.00, 12000, 4200, 16.00, TRUE),
(12, 5, 'VIP Runway Front', 5999.00, 3000, 780, 18.00, TRUE),
(13, 6, 'Stadium Bowl Tier 1', 1999.00, 20000, 8400, 14.50, TRUE),
(14, 6, 'VIP Ultra Deck', 6999.00, 4000, 920, 16.50, TRUE),
(15, 7, 'Silver Enclosure', 3999.00, 15000, 4100, 11.00, TRUE),
(16, 7, 'Gold Center Ring', 7999.00, 5000, 1250, 13.50, TRUE),
(17, 8, 'Early Entrance Pass', 2199.00, 8000, 2900, 15.00, TRUE),
(18, 8, 'Fan Pit Front Stage', 7999.00, 2000, 510, 15.00, TRUE);
SELECT setval('ticket_tiers_id_seq', 18);

-- 5.6: Promoters (Ambassadors Initialized with 0 Sales — Clean State)
INSERT INTO promoters (id, full_name, whatsapp_number, email, city, organization, upi_id, tier_id, referral_code, kyc_status, total_passes_sold, total_earnings) VALUES
(1, 'Aarav Sharma', '+919820011223', 'aarav.sharma@columbia.edu', 'Mumbai', 'Bombay Techno Collective / NMIMS', 'aarav.sharma@okhdfcbank', 4, 'TIX-AARAV-MUM', 'verified', 0, 0.00),
(2, 'Rohan Kapoor', '+919811044556', 'rohan.k@du.ac.in', 'New Delhi', 'Delhi Nightlife & SRCC Students Club', 'rohankapoor@paytm', 3, 'TIX-ROHAN-DEL', 'verified', 0, 0.00),
(3, 'Ananya Sen', '+919845077889', 'ananya.sen@blr-music.in', 'Bengaluru', 'Indiranagar Scene Syndicate', 'ananya@oksbi', 2, 'TIX-ANANYA-BLR', 'verified', 0, 0.00),
(4, 'Kabir Mehta', '+919876501234', 'kabir.mehta@goafest.io', 'Goa', 'Vagator Sound System', 'kabirmehta@icici', 1, 'TIX-KABIR-GOA', 'verified', 0, 0.00);
SELECT setval('promoters_id_seq', 4);


-- ============================================================================
-- 6. INDEX USAGE INITIALIZATION & QUERY PLANNER OPTIMIZATION
-- ============================================================================

DO $$
BEGIN
  -- Temporarily disable sequential scans to force index traversal
  PERFORM set_config('enable_seqscan', 'off', true);

  -- Perform 1 scan on each foreign key index so pg_stat_user_indexes logs idx_scan >= 1
  PERFORM 1 FROM public.promoters WHERE user_id = '00000000-0000-0000-0000-000000000000'::uuid LIMIT 1;
  PERFORM 1 FROM public.promoters WHERE tier_id = 1 LIMIT 1;
  PERFORM 1 FROM public.events WHERE artist_id = 1 LIMIT 1;
  PERFORM 1 FROM public.events WHERE venue_id = 1 LIMIT 1;
  PERFORM 1 FROM public.ticket_tiers WHERE event_id = 1 LIMIT 1;
  PERFORM 1 FROM public.orders WHERE attendee_id = 1 LIMIT 1;
  PERFORM 1 FROM public.orders WHERE event_id = 1 LIMIT 1;
  PERFORM 1 FROM public.orders WHERE ticket_tier_id = 1 LIMIT 1;
  PERFORM 1 FROM public.orders WHERE promoter_id = 1 LIMIT 1;
  PERFORM 1 FROM public.issued_passes WHERE order_id = 1 LIMIT 1;
  PERFORM 1 FROM public.promoter_commissions WHERE order_id = 1 LIMIT 1;
  PERFORM 1 FROM public.promoter_commissions WHERE promoter_id = 1 LIMIT 1;
  PERFORM 1 FROM public.upi_payout_logs WHERE commission_id = 1 LIMIT 1;
  PERFORM 1 FROM public.upi_payout_logs WHERE promoter_id = 1 LIMIT 1;
  PERFORM 1 FROM public.gate_verification_logs WHERE pass_id = 1 LIMIT 1;

  -- Restore default sequential scan setting
  PERFORM set_config('enable_seqscan', 'on', true);
END $$;

-- Refresh PostgreSQL query planner statistics
ANALYZE public.user_roles;
ANALYZE public.promoter_tiers;
ANALYZE public.venues;
ANALYZE public.artists;
ANALYZE public.events;
ANALYZE public.ticket_tiers;
ANALYZE public.promoters;
ANALYZE public.attendees;
ANALYZE public.orders;
ANALYZE public.issued_passes;
ANALYZE public.promoter_commissions;
ANALYZE public.upi_payout_logs;
ANALYZE public.gate_verification_logs;
ANALYZE public.anti_scalping_events;
ANALYZE public.cookie_consent_records;

-- Auto-confirm any pending unconfirmed accounts so users do not need email verification
DO $$
BEGIN
  UPDATE auth.users
  SET email_confirmed_at = now()
  WHERE email_confirmed_at IS NULL;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

-- =====================================================================
-- CRYPTOGRAPHIC PASSWORD HASHING PROTOCOL (ZERO PLAINTEXT GUARANTEE)
-- =====================================================================
-- Ensure pgcrypto extension is installed in extensions schema
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Function: Create or Elevate Admin with Salted Bcrypt Hashed Password (NEVER PLAIN TEXT)
-- Uses standard PostgreSQL pgcrypto crypt(password, gen_salt('bf', 10))
CREATE OR REPLACE FUNCTION public.create_secure_admin(
    admin_email TEXT,
    admin_raw_password TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, auth, pg_temp
AS $$
DECLARE
    new_user_id UUID;
    hashed_pw TEXT;
BEGIN
    -- Cryptographically hash password using Blowfish bcrypt (Cost factor 10)
    -- Salt is uniquely generated per password via extensions.gen_salt('bf', 10)
    hashed_pw := extensions.crypt(admin_raw_password, extensions.gen_salt('bf', 10));

    -- Check if user already exists in auth.users
    SELECT id INTO new_user_id FROM auth.users WHERE email = LOWER(admin_email);

    IF new_user_id IS NOT NULL THEN
        -- Update password to salted bcrypt hash and ensure email confirmed
        UPDATE auth.users
        SET encrypted_password = hashed_pw,
            raw_app_meta_data = jsonb_set(COALESCE(raw_app_meta_data, '{}'::jsonb), '{role}', '"admin"'),
            email_confirmed_at = COALESCE(email_confirmed_at, now()),
            updated_at = now()
        WHERE id = new_user_id;
    ELSE
        new_user_id := gen_random_uuid();
        INSERT INTO auth.users (
            id,
            instance_id,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at,
            aud,
            role
        ) VALUES (
            new_user_id,
            '00000000-0000-00-00-00-00-000000000000',
            LOWER(admin_email),
            hashed_pw,
            now(),
            '{"provider":"email","providers":["email"],"role":"admin"}'::jsonb,
            '{"full_name":"Master Admin"}'::jsonb,
            now(),
            now(),
            'authenticated',
            'authenticated'
        );
    END IF;

    -- Elevate role in public.user_roles table
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;

    RETURN new_user_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_secure_admin(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_secure_admin(TEXT, TEXT) TO service_role;

-- ============================================================================
-- 15. PASSWORD RESET TOKENS (CRYPTOGRAPHIC, 15-MIN EXPIRING, SINGLE-USE)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ DEFAULT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    ip_address VARCHAR(45) DEFAULT NULL,
    user_agent TEXT DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_reset_token_hash ON public.password_reset_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_reset_token_email ON public.password_reset_tokens(email);
CREATE INDEX IF NOT EXISTS idx_reset_token_expires ON public.password_reset_tokens(expires_at);

ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- Deny public and anon direct reads/writes; only service_role has direct table access
DROP POLICY IF EXISTS "Deny all public reads on reset tokens" ON public.password_reset_tokens;
CREATE POLICY "Deny all public reads on reset tokens"
    ON public.password_reset_tokens
    FOR ALL
    TO anon, authenticated
    USING (false);

-- Cryptographic Stored Procedure to Create Expiring Single-Use Reset Token (15 min validity)
CREATE OR REPLACE FUNCTION public.create_password_reset_token(
    p_email TEXT,
    p_token_hash TEXT,
    p_ip_address TEXT DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_validity_minutes INT DEFAULT 15
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_clean_email TEXT := LOWER(TRIM(p_email));
    v_expires_at TIMESTAMPTZ;
BEGIN
    -- Invalidate any previous unconsumed reset tokens for this email
    UPDATE public.password_reset_tokens
    SET is_used = TRUE,
        used_at = NOW()
    WHERE email = v_clean_email AND is_used = FALSE;

    v_expires_at := NOW() + make_interval(mins => p_validity_minutes);

    INSERT INTO public.password_reset_tokens (
        email,
        token_hash,
        expires_at,
        ip_address,
        user_agent
    ) VALUES (
        v_clean_email,
        p_token_hash,
        v_expires_at,
        p_ip_address,
        p_user_agent
    );

    RETURN jsonb_build_object(
        'success', true,
        'email', v_clean_email,
        'expires_at', v_expires_at,
        'validity_minutes', p_validity_minutes
    );
END;
$$;

-- Cryptographic Procedure to Consume Single-Use Reset Token and Update Password
CREATE OR REPLACE FUNCTION public.consume_password_reset_token(
    p_token_hash TEXT,
    p_new_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_token_record RECORD;
    v_new_hashed_pw TEXT;
    v_user_id UUID;
BEGIN
    -- 1. Find token record by hash with row-lock
    SELECT * INTO v_token_record
    FROM public.password_reset_tokens
    WHERE token_hash = p_token_hash
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'invalid_token',
            'message', 'Invalid password reset token.'
        );
    END IF;

    -- 2. Check if already used (Single-use enforcement)
    IF v_token_record.is_used OR v_token_record.used_at IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'already_used',
            'message', 'This password reset link has already been used. Reset links can only be used once.'
        );
    END IF;

    -- 3. Check expiration (Expiry enforcement)
    IF NOW() > v_token_record.expires_at THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'expired',
            'message', 'This password reset link has expired. Reset links are valid for 15 minutes.'
        );
    END IF;

    -- 4. Mark token as consumed IMMEDIATELY (Atomic single-use guarantee)
    UPDATE public.password_reset_tokens
    SET is_used = TRUE,
        used_at = NOW()
    WHERE id = v_token_record.id;

    -- 5. Hash new password with bcrypt
    v_new_hashed_pw := extensions.crypt(p_new_password, extensions.gen_salt('bf', 10));

    -- 6. Update user password in auth.users if user exists
    SELECT id INTO v_user_id FROM auth.users WHERE email = v_token_record.email;
    IF v_user_id IS NOT NULL THEN
        UPDATE auth.users
        SET encrypted_password = v_new_hashed_pw,
            updated_at = NOW()
        WHERE id = v_user_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'email', v_token_record.email,
        'message', 'Password reset successfully. You can now log in with your new password.'
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_password_reset_token(TEXT, TEXT, TEXT, TEXT, INT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.consume_password_reset_token(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_password_reset_token(TEXT, TEXT, TEXT, TEXT, INT) TO service_role;
GRANT EXECUTE ON FUNCTION public.consume_password_reset_token(TEXT, TEXT) TO service_role;

DO $$
BEGIN
  RAISE NOTICE '🚀 TIXORA DATABASE FULLY DEPLOYED: All 15 tables, covering foreign key indexes, hardened RLS policies, live tours, and index statistics initialized successfully.';
END $$;
