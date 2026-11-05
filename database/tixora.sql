-- ============================================================================
-- TIXORA MASTER DATABASE (SUPABASE POSTGRESQL EDITION)
-- Live Concert Allocations & Youth Promoter Protocol
-- ============================================================================
-- Paste this entire file into your Supabase Project SQL Editor and click "Run".
-- Configures: 14 Relational Tables, Foreign Keys, Indexes, RLS Policies, 
--             Automated Triggers, Real-Time Views, and Authentic Tour Seeds.
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
DROP TABLE IF EXISTS promoter_tiers CASCADE;


-- ============================================================================
-- 1. SCHEMA TABLES, CONSTRAINTS & INDEXES
-- ============================================================================

-- 0. User Roles (RBAC mapping auth.users to App Roles)
CREATE TABLE user_roles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'promoter' CHECK (role IN ('admin', 'manager', 'promoter', 'attendee')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_user_roles_role ON user_roles(role);

-- 1. Promoter Tiers (Velocity Ladder)
CREATE TABLE promoter_tiers (
    tier_id INT PRIMARY KEY,
    tier_name VARCHAR(50) NOT NULL UNIQUE,
    min_passes INT NOT NULL,
    max_passes INT, -- NULL indicates unlimited (300+ passes)
    commission_rate NUMERIC(5, 2) NOT NULL, -- percentage: 8.00, 11.00, 13.50, 16.00
    perks_description TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. Promoters
CREATE TABLE promoters (
    id SERIAL PRIMARY KEY,
    user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
    full_name VARCHAR(150) NOT NULL,
    whatsapp_number VARCHAR(20) NOT NULL UNIQUE,
    email VARCHAR(150) UNIQUE,
    city VARCHAR(100) NOT NULL,
    organization VARCHAR(150),
    upi_id VARCHAR(100) NOT NULL,
    tier_id INT NOT NULL DEFAULT 1 REFERENCES promoter_tiers(tier_id),
    referral_code VARCHAR(50) NOT NULL UNIQUE,
    kyc_status VARCHAR(30) DEFAULT 'verified' CHECK (kyc_status IN ('pending', 'verified', 'suspended')),
    total_passes_sold INT DEFAULT 0 CHECK (total_passes_sold >= 0),
    total_earnings NUMERIC(12, 2) DEFAULT 0.00 CHECK (total_earnings >= 0.00),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_promoters_user ON promoters(user_id);
CREATE INDEX idx_promoters_ref ON promoters(referral_code);
CREATE INDEX idx_promoters_phone ON promoters(whatsapp_number);
CREATE INDEX idx_promoters_tier ON promoters(tier_id);

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
CREATE INDEX idx_venues_city ON venues(city);

-- 4. Artists
CREATE TABLE artists (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    genre VARCHAR(100),
    image_url VARCHAR(255),
    bio TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 5. Events (Concert Allocations & Tours)
CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    slug VARCHAR(200) NOT NULL UNIQUE,
    artist_id INT REFERENCES artists(id) ON DELETE SET NULL,
    venue_id INT REFERENCES venues(id) ON DELETE SET NULL,
    event_date TIMESTAMPTZ NOT NULL,
    status VARCHAR(30) DEFAULT 'active' CHECK (status IN ('draft', 'active', 'sold_out', 'completed', 'cancelled')),
    partner_engine VARCHAR(50) DEFAULT 'BookMyShow' CHECK (partner_engine IN ('BookMyShow', 'District', 'Direct')),
    poster_url VARCHAR(255),
    banner_url VARCHAR(255),
    description TEXT,
    starting_price NUMERIC(10, 2) NOT NULL CHECK (starting_price >= 0),
    promoter_cut_pct NUMERIC(5, 2) NOT NULL DEFAULT 16.00 CHECK (promoter_cut_pct >= 0),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_events_slug ON events(slug);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_date ON events(event_date);

-- 6. Ticket Tiers / Quotas
CREATE TABLE ticket_tiers (
    id SERIAL PRIMARY KEY,
    event_id INT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    total_quota INT NOT NULL CHECK (total_quota > 0),
    available_quota INT NOT NULL CHECK (available_quota >= 0),
    promoter_cut_pct NUMERIC(5, 2) NOT NULL DEFAULT 16.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_quota CHECK (available_quota <= total_quota)
);
CREATE INDEX idx_ticket_tiers_event ON ticket_tiers(event_id);

-- 7. Attendees (Fans / Ticket Holders)
CREATE TABLE attendees (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    mobile_number VARCHAR(20) NOT NULL,
    email VARCHAR(150),
    bms_account_id VARCHAR(100),
    digilocker_verified BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_attendees_mobile ON attendees(mobile_number);

-- 8. Orders (Pass Bookings)
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(64) NOT NULL UNIQUE,
    attendee_id INT NOT NULL REFERENCES attendees(id),
    event_id INT NOT NULL REFERENCES events(id),
    ticket_tier_id INT NOT NULL REFERENCES ticket_tiers(id),
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
    total_amount NUMERIC(10, 2) NOT NULL CHECK (total_amount >= 0),
    payment_method VARCHAR(30) DEFAULT 'UPI' CHECK (payment_method IN ('UPI', 'Card', 'NetBanking', 'Wallet')),
    payment_status VARCHAR(30) DEFAULT 'successful' CHECK (payment_status IN ('pending', 'successful', 'failed', 'refunded')),
    payment_gateway_ref VARCHAR(100),
    promoter_id INT REFERENCES promoters(id) ON DELETE SET NULL,
    delivery_channel VARCHAR(50) DEFAULT 'BookMyShow / District Wallet',
    delivery_status VARCHAR(30) DEFAULT 'dispatched' CHECK (delivery_status IN ('pending', 'dispatched', 'delivered', 'failed')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_orders_num ON orders(order_number);
CREATE INDEX idx_orders_promoter ON orders(promoter_id);
CREATE INDEX idx_orders_status ON orders(payment_status);

-- 9. Issued Passes (Dynamic QR Mesh Protocol)
CREATE TABLE issued_passes (
    id SERIAL PRIMARY KEY,
    order_id INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    pass_code VARCHAR(64) NOT NULL UNIQUE,
    dynamic_qr_seed VARCHAR(128) NOT NULL,
    attendee_phone VARCHAR(20) NOT NULL,
    gate_scan_status VARCHAR(30) DEFAULT 'unscanned' CHECK (gate_scan_status IN ('unscanned', 'verified', 'duplicate_rejected', 'revoked')),
    scanned_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_passes_code ON issued_passes(pass_code);
CREATE INDEX idx_passes_phone ON issued_passes(attendee_phone);

-- 10. Promoter Commissions (Ledger)
CREATE TABLE promoter_commissions (
    id SERIAL PRIMARY KEY,
    order_id INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    promoter_id INT NOT NULL REFERENCES promoters(id) ON DELETE CASCADE,
    pass_quantity INT NOT NULL CHECK (pass_quantity > 0),
    ticket_price NUMERIC(10, 2) NOT NULL,
    commission_rate NUMERIC(5, 2) NOT NULL,
    commission_amount NUMERIC(10, 2) NOT NULL CHECK (commission_amount >= 0),
    payout_status VARCHAR(30) DEFAULT 'settled' CHECK (payout_status IN ('pending', 'processing', 'settled', 'failed')),
    upi_reference VARCHAR(100),
    settled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_comm_promoter ON promoter_commissions(promoter_id);

-- 11. UPI Payout Logs (<60s Settlement SLA)
CREATE TABLE upi_payout_logs (
    id SERIAL PRIMARY KEY,
    commission_id INT NOT NULL REFERENCES promoter_commissions(id) ON DELETE CASCADE,
    promoter_id INT NOT NULL REFERENCES promoters(id) ON DELETE CASCADE,
    upi_id VARCHAR(100) NOT NULL,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    settlement_time_seconds INT NOT NULL DEFAULT 42 CHECK (settlement_time_seconds <= 60),
    status VARCHAR(30) DEFAULT 'success' CHECK (status IN ('initiated', 'processing', 'success', 'failed')),
    bank_rrn VARCHAR(64) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_payouts_promoter ON upi_payout_logs(promoter_id);
CREATE INDEX idx_payouts_rrn ON upi_payout_logs(bank_rrn);

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
-- 2. VIEWS
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
SELECT upl.id AS settlement_id, p.full_name AS promoter_name, upl.upi_id, upl.amount, upl.settlement_time_seconds, upl.status, upl.bank_rrn, upl.created_at AS settled_at
FROM upi_payout_logs upl
JOIN promoters p ON upl.promoter_id = p.id
ORDER BY upl.created_at DESC;


-- ============================================================================
-- 3. PL/PGSQL TRIGGERS
-- ============================================================================

-- Auto-upgrade promoter tier & increment totals when commission is logged
CREATE OR REPLACE FUNCTION trg_fn_update_promoter_tier()
RETURNS TRIGGER AS $$
DECLARE
    v_total_passes INT;
    v_new_tier INT;
BEGIN
    SELECT COALESCE(SUM(pass_quantity), 0)
    INTO v_total_passes
    FROM promoter_commissions
    WHERE promoter_id = NEW.promoter_id;

    SELECT tier_id INTO v_new_tier
    FROM promoter_tiers
    WHERE v_total_passes >= min_passes
      AND (max_passes IS NULL OR v_total_passes <= max_passes)
    ORDER BY min_passes DESC
    LIMIT 1;

    UPDATE promoters
    SET total_passes_sold = v_total_passes,
        total_earnings = total_earnings + NEW.commission_amount,
        tier_id = COALESCE(v_new_tier, tier_id),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.promoter_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_commission_after_insert ON promoter_commissions;
CREATE TRIGGER trg_commission_after_insert
AFTER INSERT ON promoter_commissions
FOR EACH ROW EXECUTE FUNCTION trg_fn_update_promoter_tier();

-- Decrement ticket quota on successful order
CREATE OR REPLACE FUNCTION trg_fn_decrement_ticket_quota()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.payment_status = 'successful' THEN
        UPDATE ticket_tiers
        SET available_quota = available_quota - NEW.quantity
        WHERE id = NEW.ticket_tier_id
          AND available_quota >= NEW.quantity;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_order_after_insert ON orders;
CREATE TRIGGER trg_order_after_insert
AFTER INSERT ON orders
FOR EACH ROW EXECUTE FUNCTION trg_fn_decrement_ticket_quota();


-- ============================================================================
-- 4. AUTHENTICATION & ROW LEVEL SECURITY (RLS) FOR SUPABASE
-- ============================================================================

-- Enable RLS on all tables (including user_roles)
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

-- ----------------------------------------------------------------------------
-- RBAC HELPER FUNCTIONS & TRIGGER
-- ----------------------------------------------------------------------------

-- Check if current authenticated caller is an admin or manager
CREATE OR REPLACE FUNCTION auth.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = (SELECT auth.uid()) AND role IN ('admin', 'manager')
  ) OR (
    COALESCE((SELECT auth.jwt() -> 'app_metadata' ->> 'role'), '') IN ('admin', 'manager')
  );
$$;

-- Automatic user provisioning trigger on auth.users
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_app_meta_data ->> 'role', NEW.raw_user_meta_data ->> 'role', 'promoter')
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- Admin elevation utility: call in SQL editor with SELECT assign_admin_role('user@example.com');
CREATE OR REPLACE FUNCTION public.assign_admin_role(target_email TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = target_email LIMIT 1;
  IF v_user_id IS NULL THEN
    RETURN 'User with email ' || target_email || ' not found in auth.users. Please sign up first!';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'admin')
  ON CONFLICT (user_id) DO UPDATE SET role = 'admin';

  UPDATE auth.users
  SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"role": "admin"}'::jsonb
  WHERE id = v_user_id;

  RETURN 'Success: ' || target_email || ' is now an authorized Tixora Administrator.';
END;
$$;

-- ----------------------------------------------------------------------------
-- POLICIES: 1. User Roles
-- ----------------------------------------------------------------------------
CREATE POLICY "Users can read own role" ON user_roles
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR auth.is_admin());

CREATE POLICY "Admins can manage user roles" ON user_roles
  FOR ALL TO authenticated
  USING (auth.is_admin())
  WITH CHECK (auth.is_admin());

-- ----------------------------------------------------------------------------
-- POLICIES: 2. Public Catalog (Tiers, Venues, Artists, Events, Ticket Tiers)
-- ----------------------------------------------------------------------------
CREATE POLICY "Public Read promoter_tiers" ON promoter_tiers FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admin Manage promoter_tiers" ON promoter_tiers FOR ALL TO authenticated USING (auth.is_admin()) WITH CHECK (auth.is_admin());

CREATE POLICY "Public Read venues" ON venues FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admin Manage venues" ON venues FOR ALL TO authenticated USING (auth.is_admin()) WITH CHECK (auth.is_admin());

CREATE POLICY "Public Read artists" ON artists FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admin Manage artists" ON artists FOR ALL TO authenticated USING (auth.is_admin()) WITH CHECK (auth.is_admin());

CREATE POLICY "Public Read events" ON events FOR SELECT TO anon, authenticated USING (status = 'active' OR auth.is_admin());
CREATE POLICY "Admin Manage events" ON events FOR ALL TO authenticated USING (auth.is_admin()) WITH CHECK (auth.is_admin());

CREATE POLICY "Public Read ticket_tiers" ON ticket_tiers FOR SELECT TO anon, authenticated USING (is_active = true OR auth.is_admin());
CREATE POLICY "Admin Manage ticket_tiers" ON ticket_tiers FOR ALL TO authenticated USING (auth.is_admin()) WITH CHECK (auth.is_admin());

-- ----------------------------------------------------------------------------
-- POLICIES: 3. Promoters
-- ----------------------------------------------------------------------------
-- Public can read promoters (needed for referral code lookups and roster)
CREATE POLICY "Public Read promoters" ON promoters FOR SELECT TO anon, authenticated USING (true);

-- Authenticated users can register as a promoter linked to their auth.uid()
CREATE POLICY "Promoter self-register" ON promoters FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()) OR auth.is_admin());

-- Promoters can update their own contact details / UPI ID
CREATE POLICY "Promoter update own profile" ON promoters FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()) OR auth.is_admin())
  WITH CHECK (user_id = (SELECT auth.uid()) OR auth.is_admin());

-- Admin full access to promoters
CREATE POLICY "Admin manage promoters" ON promoters FOR ALL TO authenticated
  USING (auth.is_admin()) WITH CHECK (auth.is_admin());

-- ----------------------------------------------------------------------------
-- POLICIES: 4. Attendees & Orders
-- ----------------------------------------------------------------------------
CREATE POLICY "Public create attendees" ON attendees FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Attendees/Admin read attendees" ON attendees FOR SELECT TO authenticated USING (auth.is_admin());

CREATE POLICY "Public create orders" ON orders FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Promoters read referred orders" ON orders FOR SELECT TO authenticated
  USING (promoter_id IN (SELECT id FROM promoters WHERE user_id = (SELECT auth.uid())) OR auth.is_admin());
CREATE POLICY "Admin manage orders" ON orders FOR ALL TO authenticated
  USING (auth.is_admin()) WITH CHECK (auth.is_admin());

-- ----------------------------------------------------------------------------
-- POLICIES: 5. Passes, Commissions & UPI Settlements
-- ----------------------------------------------------------------------------
CREATE POLICY "Promoters read referred passes" ON issued_passes FOR SELECT TO authenticated
  USING (order_id IN (SELECT id FROM orders WHERE promoter_id IN (SELECT id FROM promoters WHERE user_id = (SELECT auth.uid()))) OR auth.is_admin());
CREATE POLICY "Admin manage passes" ON issued_passes FOR ALL TO authenticated
  USING (auth.is_admin()) WITH CHECK (auth.is_admin());

CREATE POLICY "Promoters read own commissions" ON promoter_commissions FOR SELECT TO authenticated
  USING (promoter_id IN (SELECT id FROM promoters WHERE user_id = (SELECT auth.uid())) OR auth.is_admin());
CREATE POLICY "Admin manage commissions" ON promoter_commissions FOR ALL TO authenticated
  USING (auth.is_admin()) WITH CHECK (auth.is_admin());

CREATE POLICY "Promoters read own upi payouts" ON upi_payout_logs FOR SELECT TO authenticated
  USING (promoter_id IN (SELECT id FROM promoters WHERE user_id = (SELECT auth.uid())) OR auth.is_admin());
CREATE POLICY "Admin manage upi payouts" ON upi_payout_logs FOR ALL TO authenticated
  USING (auth.is_admin()) WITH CHECK (auth.is_admin());

-- ----------------------------------------------------------------------------
-- POLICIES: 6. Logs & Compliance
-- ----------------------------------------------------------------------------
CREATE POLICY "Public insert gate logs" ON gate_verification_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admin read gate logs" ON gate_verification_logs FOR SELECT TO authenticated USING (auth.is_admin());

CREATE POLICY "Public insert anti scalping" ON anti_scalping_events FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admin read anti scalping" ON anti_scalping_events FOR SELECT TO authenticated USING (auth.is_admin());

CREATE POLICY "Public insert cookie consent" ON cookie_consent_records FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admin read cookie consent" ON cookie_consent_records FOR SELECT TO authenticated USING (auth.is_admin());


-- ============================================================================
-- 5. AUTHENTIC SEED DATA
-- ============================================================================

INSERT INTO promoter_tiers (tier_id, tier_name, min_passes, max_passes, commission_rate, perks_description) VALUES
(1, 'Scout', 1, 25, 8.00, 'Baseline promoter tier. Instant UPI settlement per scan, dynamic referral link generation.'),
(2, 'Capo', 26, 100, 11.00, 'Unlocked priority guestlist, personal WhatsApp account manager, custom branded landing pages.'),
(3, 'Syndicate', 101, 300, 13.50, 'VIP artist lounge passes, backstage credentials, private pre-sale allocation access.'),
(4, 'Patron', 301, NULL, 16.00, 'Dedicated nationwide tour quota contract, maximum yield split, co-promoter billing on stage.');

INSERT INTO venues (id, name, city, state, address, capacity) VALUES
(1, 'Mahalaxmi Racecourse', 'Mumbai', 'Maharashtra', 'Keshavrao Khadye Marg, Royal Western India Turf Club', 35000),
(2, 'Jawaharlal Nehru Stadium', 'New Delhi', 'Delhi', 'Pragati Vihar, Bhisham Pitamah Marg', 60000),
(3, 'Vagator Beach Arena', 'Vagator', 'Goa', 'Small Vagator Beach Cliffs', 40000),
(4, 'Nesco Center Grounds', 'Mumbai', 'Maharashtra', 'Western Express Highway, Goregaon East', 25000),
(5, 'The Warehouse Okhla', 'New Delhi', 'Delhi', 'Plot 42, Okhla Industrial Area Phase III', 8000),
(6, 'Exhibition Ground Sector 34', 'Chandigarh', 'Punjab / UT', 'Sector 34-A Grounds', 20000),
(7, 'BIEC Grounds', 'Bengaluru', 'Karnataka', '10th Mile, Tumkur Road, Madavara', 45000),
(8, 'Major Dhyan Chand National Stadium', 'New Delhi', 'Delhi', 'India Gate Circle', 25000);
SELECT setval('venues_id_seq', 8);

INSERT INTO artists (id, name, genre, image_url, bio) VALUES
(1, 'Anyma', 'Melodic Techno / Audiovisual', 'artists/anyma.jpg', 'Matteo Milleri (Tale of Us co-founder) presents visionary cybernetic audiovisual concepts.'),
(2, 'Guns N'' Roses', 'Hard Rock / Stadium Rock', 'artists/guns-n-roses.jpg', 'Axl Rose, Slash, and Duff McKagan bringing their iconic high-octane stadium world tour to India.'),
(3, 'Fred again..', 'Electronic / Club / UK Garage', 'artists/fred-again.jpg', 'Grammy-winning electronic producer renowned for transformative communal live sets and raw energy.'),
(4, 'The Chainsmokers', 'EDM / Dance Pop', 'artists/chainsmokers.jpg', 'Multi-platinum duo Alex Pall and Drew Taggart headlining massive festival arena stages across India.'),
(5, 'Khalid', 'Contemporary R&B / Pop', 'artists/khalid.jpg', 'Global chart-topping superstar behind timeless anthems Location and Young Dumb & Broke.'),
(6, 'Karan Aujla', 'Punjabi Hip-Hop / Contemporary', 'artists/anyma.jpg', 'Superstar singer-songwriter dominating global Spotify charts with It Was All A Dream tour.'),
(7, 'Diljit Dosanjh', 'Punjabi Pop / Folk Fusion', 'artists/fred-again.jpg', 'Global phenomenon breaking stadium attendance records on his historic Dil-Luminati Tour.'),
(8, 'AP Dhillon', 'Indo-Canadian Hip-Hop / Trap', 'artists/chainsmokers.jpg', 'Brownprint Tour innovator bringing gritty fusion basslines and arena production.');
SELECT setval('artists_id_seq', 8);

INSERT INTO events (id, title, slug, artist_id, venue_id, event_date, status, partner_engine, poster_url, banner_url, description, starting_price, promoter_cut_pct) VALUES
(1, 'Anyma presents ÆDEN', 'anyma-aeden-mumbai-2026', 1, 1, '2026-11-21 16:00:00+05:30', 'active', 'BookMyShow', 'posters/anyma-aeden-poster-1.jpg', 'posters/anyma-aeden-poster-2.jpg', 'Matteo Milleri''s legendary audiovisual melodic-techno spectacle with futuristic multidimensional visual rigs.', 4250.00, 16.00),
(2, 'Guns N'' Roses India Tour', 'guns-n-roses-delhi-2026', 2, 2, '2026-11-28 17:30:00+05:30', 'active', 'BookMyShow', 'posters/guns-n-roses-india-poster.jpg', NULL, 'Rock legends Axl Rose and Slash bring their marathon world tour to Delhi for one historic stadium night.', 5499.00, 14.00),
(3, 'Fred again.. Live in Delhi', 'fred-again-delhi-2026', 3, 5, '2026-12-05 18:00:00+05:30', 'active', 'District', 'posters/fred-again-india-poster-1.png', NULL, 'The most in-demand electronic artist on the planet lands in Delhi for a raw, high-energy warehouse set.', 3999.00, 12.00),
(4, 'The Chainsmokers Sunburn Arena', 'chainsmokers-bengaluru-2026', 4, 7, '2026-12-19 16:00:00+05:30', 'active', 'BookMyShow', 'posters/chainsmokers-bengaluru-banner.jpg', NULL, 'Grammy-winning EDM duo returns to India for Sunburn Arena tour with massive pyro, lasers, and live vocals.', 3499.00, 15.00),
(5, 'Fred again.. Live in Mumbai', 'fred-again-mumbai-2026', 3, 4, '2026-12-08 18:00:00+05:30', 'active', 'District', 'posters/fred-again-india-poster-2.png', NULL, 'Second date added due to unprecedented demand. An intimate, high-octane live production celebrating modern dance culture.', 4200.00, 12.00),
(6, 'Khalid Live in Delhi', 'khalid-delhi-2026', 5, 8, '2026-12-13 18:00:00+05:30', 'active', 'BookMyShow', 'posters/khalid-india-banner.jpg', NULL, 'Multi-platinum R&B pop sensation Khalid brings his global anthems Location and Young Dumb & Broke to Delhi.', 2999.00, 15.00),
(7, 'Sunburn Goa 2026', 'sunburn-goa-2026', 4, 3, '2026-12-28 14:00:00+05:30', 'active', 'BookMyShow', 'posters/chainsmokers-bengaluru-banner.jpg', NULL, 'Asia''s biggest electronic music festival returns to the coastal cliffs of Vagator with 4 massive multi-genre stages.', 4999.00, 16.00),
(8, 'Karan Aujla — It Was All A Dream Tour', 'karan-aujla-delhi-2026', 6, 2, '2026-11-15 18:30:00+05:30', 'active', 'BookMyShow', 'posters/anyma-aeden-poster-1.jpg', NULL, 'Record-breaking Punjabi superstar tour live with full orchestra and surprise international guest artists.', 3499.00, 15.00);
SELECT setval('events_id_seq', 8);

INSERT INTO ticket_tiers (id, event_id, name, price, total_quota, available_quota, promoter_cut_pct, is_active) VALUES
(1, 1, 'General Admission (Phase 1)', 4250.00, 5000, 1840, 16.00, TRUE),
(2, 1, 'VIP Elevated Deck', 8500.00, 1500, 420, 16.00, TRUE),
(3, 1, 'Afterlife Stage Fan Pit', 14999.00, 500, 68, 16.00, TRUE),
(4, 2, 'Silver Field Standing', 5499.00, 8000, 2910, 14.00, TRUE),
(5, 2, 'Gold Front Pit', 9999.00, 3000, 850, 14.00, TRUE),
(6, 2, 'Paradise City VIP Lounge', 18500.00, 800, 195, 14.00, TRUE),
(7, 3, 'Warehouse Floor Access', 3999.00, 4000, 1120, 12.00, TRUE),
(8, 3, 'VIP Balcony & Fast Track', 7499.00, 1000, 310, 12.00, TRUE),
(9, 4, 'General Arena Access', 3499.00, 6000, 2450, 15.00, TRUE),
(10, 4, 'VIP Fan Pit', 6999.00, 2000, 780, 15.00, TRUE),
(11, 5, 'Ground Standing Phase 1', 4200.00, 4500, 940, 12.00, TRUE),
(12, 5, 'VIP Hospitality Pass', 7999.00, 1200, 260, 12.00, TRUE),
(13, 6, 'Standard Fan Zone', 2999.00, 5000, 1620, 15.00, TRUE),
(14, 6, 'VIP Lounge Pass', 5999.00, 1200, 410, 15.00, TRUE),
(15, 7, '4-Day GA Festival Pass', 4999.00, 10000, 3800, 16.00, TRUE),
(16, 7, '4-Day VIP Platinum Pass', 9999.00, 3000, 920, 16.00, TRUE),
(17, 8, 'Silver GA Standing', 3499.00, 7000, 2100, 15.00, TRUE),
(18, 8, 'Fan Pit Front Stage', 7999.00, 2000, 510, 15.00, TRUE);
SELECT setval('ticket_tiers_id_seq', 18);

INSERT INTO promoters (id, full_name, whatsapp_number, email, city, organization, upi_id, tier_id, referral_code, kyc_status, total_passes_sold, total_earnings) VALUES
(1, 'Aarav Sharma', '+919820011223', 'aarav.sharma@columbia.edu', 'Mumbai', 'Bombay Techno Collective / NMIMS', 'aarav.sharma@okhdfcbank', 4, 'TIX-AARAV-MUM', 'verified', 342, 232560.00),
(2, 'Rohan Kapoor', '+919811044556', 'rohan.k@du.ac.in', 'New Delhi', 'Delhi Nightlife & SRCC Students Club', 'rohankapoor@paytm', 3, 'TIX-ROHAN-DEL', 'verified', 148, 83120.00),
(3, 'Ananya Sen', '+919845077889', 'ananya.sen@blr-music.in', 'Bengaluru', 'Indiranagar Scene Syndicate', 'ananya@oksbi', 2, 'TIX-ANANYA-BLR', 'verified', 54, 25380.00),
(4, 'Kabir Mehta', '+919876501234', 'kabir.mehta@goafest.io', 'Goa', 'Vagator Sound System', 'kabirmehta@icici', 1, 'TIX-KABIR-GOA', 'verified', 18, 6120.00);
SELECT setval('promoters_id_seq', 4);

INSERT INTO attendees (id, full_name, mobile_number, email, bms_account_id, digilocker_verified) VALUES
(1, 'Vikramaditya Rao', '+919820198201', 'vikram.rao@gmail.com', 'BMS-USR-893012', TRUE),
(2, 'Simran Walia', '+919811234567', 'simran.w@gmail.com', 'BMS-USR-472019', TRUE),
(3, 'Nikhil Verma', '+919711823901', 'nikhil.verma@outlook.com', 'BMS-USR-109283', TRUE),
(4, 'Pooja Hegde', '+919844019283', 'pooja.h@yahoo.com', 'BMS-USR-381920', TRUE);
SELECT setval('attendees_id_seq', 4);

INSERT INTO orders (id, order_number, attendee_id, event_id, ticket_tier_id, quantity, unit_price, total_amount, payment_method, payment_status, payment_gateway_ref, promoter_id, delivery_channel, delivery_status) VALUES
(1, 'TXR-ORD-2026-9801', 1, 1, 1, 2, 4250.00, 8500.00, 'UPI', 'successful', 'UPI-TXN-884910284', 1, 'BookMyShow / District Wallet', 'delivered'),
(2, 'TXR-ORD-2026-9802', 2, 2, 4, 1, 5499.00, 5499.00, 'UPI', 'successful', 'UPI-TXN-991823019', 2, 'BookMyShow / District Wallet', 'delivered'),
(3, 'TXR-ORD-2026-9803', 3, 3, 7, 2, 3999.00, 7998.00, 'Card', 'successful', 'PAY-GATEWAY-771829', 2, 'BookMyShow / District Wallet', 'delivered'),
(4, 'TXR-ORD-2026-9804', 4, 4, 9, 2, 3499.00, 6998.00, 'UPI', 'successful', 'UPI-TXN-449102938', 3, 'BookMyShow / District Wallet', 'dispatched');
SELECT setval('orders_id_seq', 4);

INSERT INTO issued_passes (id, order_id, pass_code, dynamic_qr_seed, attendee_phone, gate_scan_status, scanned_at) VALUES
(1, 1, 'TIX-ANYMA-PASS-001A', 'seed_a7f9c2d1b084e3110948ac', '+919820198201', 'verified', '2026-11-21 17:12:44+05:30'),
(2, 1, 'TIX-ANYMA-PASS-001B', 'seed_b8e0d3e2c195f4221059bd', '+919820198201', 'verified', '2026-11-21 17:13:02+05:30'),
(3, 2, 'TIX-GNR-PASS-002A', 'seed_c9f1e4f3d206a5332160ce', '+919811234567', 'unscanned', NULL),
(4, 3, 'TIX-FRED-PASS-003A', 'seed_da02f5a4e317b6443271df', '+919711823901', 'unscanned', NULL),
(5, 3, 'TIX-FRED-PASS-003B', 'seed_eb13a6b5f428c7554382ea', '+919711823901', 'unscanned', NULL),
(6, 4, 'TIX-CHAIN-PASS-004A', 'seed_fc24b7c6a539d8665493fb', '+919844019283', 'unscanned', NULL),
(7, 4, 'TIX-CHAIN-PASS-004B', 'seed_0d35c8d7b64ae9776504ac', '+919844019283', 'unscanned', NULL);
SELECT setval('issued_passes_id_seq', 7);

INSERT INTO promoter_commissions (id, order_id, promoter_id, pass_quantity, ticket_price, commission_rate, commission_amount, payout_status, upi_reference, settled_at) VALUES
(1, 1, 1, 2, 4250.00, 16.00, 1360.00, 'settled', 'UPI-REF-NPCI-98401928', '2026-11-05 09:30:45+05:30'),
(2, 2, 2, 1, 5499.00, 13.50, 742.36, 'settled', 'UPI-REF-NPCI-88391029', '2026-11-05 09:45:18+05:30'),
(3, 3, 2, 2, 3999.00, 13.50, 1079.73, 'settled', 'UPI-REF-NPCI-77291038', '2026-11-05 09:58:32+05:30'),
(4, 4, 3, 2, 3499.00, 11.00, 769.78, 'settled', 'UPI-REF-NPCI-66192837', '2026-11-05 10:05:12+05:30');
SELECT setval('promoter_commissions_id_seq', 4);

INSERT INTO upi_payout_logs (id, commission_id, promoter_id, upi_id, amount, settlement_time_seconds, status, bank_rrn) VALUES
(1, 1, 1, 'aarav.sharma@okhdfcbank', 1360.00, 38, 'success', 'NPCI20261105001298401928'),
(2, 2, 2, 'rohankapoor@paytm', 742.36, 42, 'success', 'NPCI20261105001288391029'),
(3, 3, 2, 'rohankapoor@paytm', 1079.73, 29, 'success', 'NPCI20261105001277291038'),
(4, 4, 3, 'ananya@oksbi', 769.78, 34, 'success', 'NPCI20261105001266192837');
SELECT setval('upi_payout_logs_id_seq', 4);

INSERT INTO gate_verification_logs (id, pass_id, gate_name, scanner_terminal_id, scanned_at, result, notes) VALUES
(1, 1, 'Gate 3 VIP Turnstile', 'TERM-MUM-G3-01', '2026-11-21 17:12:44+05:30', 'granted', 'Dynamic QR verified. Biometric match via BookMyShow pass hash.'),
(2, 2, 'Gate 3 VIP Turnstile', 'TERM-MUM-G3-01', '2026-11-21 17:13:02+05:30', 'granted', 'Dynamic QR verified. Identity linked to attendee +919820198201.');
SELECT setval('gate_verification_logs_id_seq', 2);

INSERT INTO anti_scalping_events (id, event_type, ip_address, user_agent, details, action_taken) VALUES
(1, 'bot_rate_limit', '185.220.101.4', 'Mozilla/5.0 HeadlessChrome', 'Rapid checkout attempt: 140 pass requests in 2s.', 'blocked'),
(2, 'duplicate_qr_detected', '49.36.120.88', 'Mobile Safari', 'Screenshot replay detected at gate. Expired barcode.', 'flagged');
SELECT setval('anti_scalping_events_id_seq', 2);

INSERT INTO cookie_consent_records (id, consent_type, ip_hash, user_agent) VALUES
(1, 'all', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', 'Mobile Safari'),
(2, 'essential', 'a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e', 'Chrome macOS');
SELECT setval('cookie_consent_records_id_seq', 2);


