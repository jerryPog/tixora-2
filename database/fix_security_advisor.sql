-- ============================================================================
-- TIXORA NON-DESTRUCTIVE SECURITY ADVISOR MIGRATION
-- Resolves all 16 Supabase Security Advisor SQL lints:
--   * 0028_anon_security_definer_function_executable (7 warnings)
--   * 0029_authenticated_security_definer_function_executable (9 warnings)
-- Safe to run on a live database with existing users, promoters, and orders.
-- ============================================================================

BEGIN;

-- 1. Create non-exposed private schema for internal SECURITY DEFINER helpers & triggers
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO anon, authenticated, service_role;

-- Harden default privileges so future public functions do not inherit PUBLIC/anon execute
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;

-- 2. Move SECURITY DEFINER helpers & trigger functions to private schema
CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
  SELECT COALESCE(LOWER(auth.jwt() ->> 'email'), '') = 'admin@tixora.live'
    OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') IN ('admin', 'manager')
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
    );
$$;

REVOKE ALL ON FUNCTION private.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_admin() TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.trg_fn_update_promoter_tier()
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

REVOKE ALL ON FUNCTION private.trg_fn_update_promoter_tier() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.handle_new_auth_user()
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

REVOKE ALL ON FUNCTION private.handle_new_auth_user() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.trg_fn_protect_promoter_privileged_cols()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
    IF COALESCE(current_setting('role', true), '') = 'service_role'
       OR COALESCE(auth.role(), '') = 'service_role'
       OR private.is_admin() THEN
        RETURN NEW;
    END IF;

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

REVOKE ALL ON FUNCTION private.trg_fn_protect_promoter_privileged_cols() FROM PUBLIC, anon, authenticated;

-- 3. Rebind triggers to private.* trigger functions
DROP TRIGGER IF EXISTS trg_update_promoter_tier ON public.promoter_commissions;
CREATE TRIGGER trg_update_promoter_tier
AFTER INSERT ON public.promoter_commissions
FOR EACH ROW
EXECUTE FUNCTION private.trg_fn_update_promoter_tier();

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION private.handle_new_auth_user();

DROP TRIGGER IF EXISTS trg_protect_promoter_privileged_cols ON public.promoters;
CREATE TRIGGER trg_protect_promoter_privileged_cols
BEFORE UPDATE ON public.promoters
FOR EACH ROW
EXECUTE FUNCTION private.trg_fn_protect_promoter_privileged_cols();

-- 4. Update all RLS policies cleanly in-place to call (SELECT private.is_admin())
DROP POLICY IF EXISTS "Users can read own role" ON public.user_roles;
CREATE POLICY "Users can read own role" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR (SELECT private.is_admin()));
DROP POLICY IF EXISTS "Admin insert user_roles" ON public.user_roles;
CREATE POLICY "Admin insert user_roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK ((SELECT private.is_admin()));
DROP POLICY IF EXISTS "Admin update user_roles" ON public.user_roles;
CREATE POLICY "Admin update user_roles" ON public.user_roles FOR UPDATE TO authenticated USING ((SELECT private.is_admin())) WITH CHECK ((SELECT private.is_admin()));
DROP POLICY IF EXISTS "Admin delete user_roles" ON public.user_roles;
CREATE POLICY "Admin delete user_roles" ON public.user_roles FOR DELETE TO authenticated USING ((SELECT private.is_admin()));

DROP POLICY IF EXISTS "Admin insert promoter_tiers" ON public.promoter_tiers;
CREATE POLICY "Admin insert promoter_tiers" ON public.promoter_tiers FOR INSERT TO authenticated WITH CHECK ((SELECT private.is_admin()));
DROP POLICY IF EXISTS "Admin update promoter_tiers" ON public.promoter_tiers;
CREATE POLICY "Admin update promoter_tiers" ON public.promoter_tiers FOR UPDATE TO authenticated USING ((SELECT private.is_admin())) WITH CHECK ((SELECT private.is_admin()));
DROP POLICY IF EXISTS "Admin delete promoter_tiers" ON public.promoter_tiers;
CREATE POLICY "Admin delete promoter_tiers" ON public.promoter_tiers FOR DELETE TO authenticated USING ((SELECT private.is_admin()));

DROP POLICY IF EXISTS "Admin insert venues" ON public.venues;
CREATE POLICY "Admin insert venues" ON public.venues FOR INSERT TO authenticated WITH CHECK ((SELECT private.is_admin()));
DROP POLICY IF EXISTS "Admin update venues" ON public.venues;
CREATE POLICY "Admin update venues" ON public.venues FOR UPDATE TO authenticated USING ((SELECT private.is_admin())) WITH CHECK ((SELECT private.is_admin()));
DROP POLICY IF EXISTS "Admin delete venues" ON public.venues;
CREATE POLICY "Admin delete venues" ON public.venues FOR DELETE TO authenticated USING ((SELECT private.is_admin()));

DROP POLICY IF EXISTS "Admin insert artists" ON public.artists;
CREATE POLICY "Admin insert artists" ON public.artists FOR INSERT TO authenticated WITH CHECK ((SELECT private.is_admin()));
DROP POLICY IF EXISTS "Admin update artists" ON public.artists;
CREATE POLICY "Admin update artists" ON public.artists FOR UPDATE TO authenticated USING ((SELECT private.is_admin())) WITH CHECK ((SELECT private.is_admin()));
DROP POLICY IF EXISTS "Admin delete artists" ON public.artists;
CREATE POLICY "Admin delete artists" ON public.artists FOR DELETE TO authenticated USING ((SELECT private.is_admin()));

DROP POLICY IF EXISTS "Public Read events" ON public.events;
CREATE POLICY "Public Read events" ON public.events FOR SELECT TO anon, authenticated USING (status = 'active' OR (SELECT private.is_admin()));
DROP POLICY IF EXISTS "Admin insert events" ON public.events;
CREATE POLICY "Admin insert events" ON public.events FOR INSERT TO authenticated WITH CHECK ((SELECT private.is_admin()));
DROP POLICY IF EXISTS "Admin update events" ON public.events;
CREATE POLICY "Admin update events" ON public.events FOR UPDATE TO authenticated USING ((SELECT private.is_admin())) WITH CHECK ((SELECT private.is_admin()));
DROP POLICY IF EXISTS "Admin delete events" ON public.events;
CREATE POLICY "Admin delete events" ON public.events FOR DELETE TO authenticated USING ((SELECT private.is_admin()));

DROP POLICY IF EXISTS "Public Read ticket_tiers" ON public.ticket_tiers;
CREATE POLICY "Public Read ticket_tiers" ON public.ticket_tiers FOR SELECT TO anon, authenticated USING (is_active = true OR (SELECT private.is_admin()));
DROP POLICY IF EXISTS "Admin insert ticket_tiers" ON public.ticket_tiers;
CREATE POLICY "Admin insert ticket_tiers" ON public.ticket_tiers FOR INSERT TO authenticated WITH CHECK ((SELECT private.is_admin()));
DROP POLICY IF EXISTS "Admin update ticket_tiers" ON public.ticket_tiers;
CREATE POLICY "Admin update ticket_tiers" ON public.ticket_tiers FOR UPDATE TO authenticated USING ((SELECT private.is_admin())) WITH CHECK ((SELECT private.is_admin()));
DROP POLICY IF EXISTS "Admin delete ticket_tiers" ON public.ticket_tiers;
CREATE POLICY "Admin delete ticket_tiers" ON public.ticket_tiers FOR DELETE TO authenticated USING ((SELECT private.is_admin()));

DROP POLICY IF EXISTS "Promoters read own profile only" ON public.promoters;
CREATE POLICY "Promoters read own profile only" ON public.promoters FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR (user_id IS NULL AND LOWER(email) = LOWER(COALESCE((SELECT auth.jwt() ->> 'email'), '')))
    OR (SELECT private.is_admin())
  );
DROP POLICY IF EXISTS "Register or insert promoters" ON public.promoters;
CREATE POLICY "Register or insert promoters" ON public.promoters FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT private.is_admin())
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
DROP POLICY IF EXISTS "Update promoters" ON public.promoters;
CREATE POLICY "Update promoters" ON public.promoters FOR UPDATE TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR (user_id IS NULL AND LOWER(email) = LOWER(COALESCE((SELECT auth.jwt() ->> 'email'), '')))
    OR (SELECT private.is_admin())
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
    OR (SELECT private.is_admin())
  );
DROP POLICY IF EXISTS "Admin delete promoters" ON public.promoters;
CREATE POLICY "Admin delete promoters" ON public.promoters FOR DELETE TO authenticated USING ((SELECT private.is_admin()));

DROP POLICY IF EXISTS "Users read own attendee profile only" ON public.attendees;
CREATE POLICY "Users read own attendee profile only" ON public.attendees FOR SELECT TO authenticated
  USING (
    LOWER(email) = LOWER(COALESCE((SELECT auth.jwt() ->> 'email'), ''))
    OR (SELECT private.is_admin())
  );
DROP POLICY IF EXISTS "Create attendees" ON public.attendees;
CREATE POLICY "Create attendees" ON public.attendees FOR INSERT TO anon, authenticated
  WITH CHECK (
    (SELECT private.is_admin())
    OR (
      full_name IS NOT NULL AND length(trim(full_name)) >= 2
      AND email IS NOT NULL AND length(trim(email)) > 3
      AND mobile_number IS NOT NULL AND length(trim(mobile_number)) >= 10
    )
  );
DROP POLICY IF EXISTS "Admin update attendees" ON public.attendees;
CREATE POLICY "Admin update attendees" ON public.attendees FOR UPDATE TO authenticated USING ((SELECT private.is_admin())) WITH CHECK ((SELECT private.is_admin()));
DROP POLICY IF EXISTS "Admin delete attendees" ON public.attendees;
CREATE POLICY "Admin delete attendees" ON public.attendees FOR DELETE TO authenticated USING ((SELECT private.is_admin()));

DROP POLICY IF EXISTS "Read own orders only" ON public.orders;
CREATE POLICY "Read own orders only" ON public.orders FOR SELECT TO authenticated
  USING (
    promoter_id IN (
      SELECT id FROM public.promoters
      WHERE user_id = (SELECT auth.uid())
         OR (user_id IS NULL AND LOWER(email) = LOWER(COALESCE((SELECT auth.jwt() ->> 'email'), '')))
    )
    OR attendee_id IN (
      SELECT id FROM public.attendees WHERE LOWER(email) = LOWER(COALESCE((SELECT auth.jwt() ->> 'email'), ''))
    )
    OR (SELECT private.is_admin())
  );
DROP POLICY IF EXISTS "Create orders" ON public.orders;
CREATE POLICY "Create orders" ON public.orders FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT private.is_admin())
    OR (
      order_number IS NOT NULL AND length(trim(order_number)) > 0
      AND quantity BETWEEN 1 AND 10
      AND payment_status = 'pending'
      AND event_id IS NOT NULL
      AND ticket_tier_id IS NOT NULL
      AND attendee_id IS NOT NULL
      AND unit_price = (SELECT tt.price FROM public.ticket_tiers tt WHERE tt.id = ticket_tier_id AND tt.event_id = event_id AND tt.is_active = TRUE)
      AND total_amount = unit_price * quantity
      AND (promoter_id IS NULL OR promoter_id IN (SELECT id FROM public.promoters WHERE user_id = (SELECT auth.uid())))
    )
  );
DROP POLICY IF EXISTS "Admin update orders" ON public.orders;
CREATE POLICY "Admin update orders" ON public.orders FOR UPDATE TO authenticated USING ((SELECT private.is_admin())) WITH CHECK ((SELECT private.is_admin()));
DROP POLICY IF EXISTS "Admin delete orders" ON public.orders;
CREATE POLICY "Admin delete orders" ON public.orders FOR DELETE TO authenticated USING ((SELECT private.is_admin()));

DROP POLICY IF EXISTS "Read own passes only" ON public.issued_passes;
CREATE POLICY "Read own passes only" ON public.issued_passes FOR SELECT TO authenticated
  USING (
    order_id IN (
      SELECT id FROM public.orders WHERE
        promoter_id IN (
          SELECT id FROM public.promoters
          WHERE user_id = (SELECT auth.uid())
             OR (user_id IS NULL AND LOWER(email) = LOWER(COALESCE((SELECT auth.jwt() ->> 'email'), '')))
        )
        OR attendee_id IN (
          SELECT id FROM public.attendees WHERE LOWER(email) = LOWER(COALESCE((SELECT auth.jwt() ->> 'email'), ''))
        )
    )
    OR (SELECT private.is_admin())
  );
DROP POLICY IF EXISTS "Admin insert issued_passes" ON public.issued_passes;
CREATE POLICY "Admin insert issued_passes" ON public.issued_passes FOR INSERT TO authenticated WITH CHECK ((SELECT private.is_admin()));
DROP POLICY IF EXISTS "Admin update issued_passes" ON public.issued_passes;
CREATE POLICY "Admin update issued_passes" ON public.issued_passes FOR UPDATE TO authenticated USING ((SELECT private.is_admin())) WITH CHECK ((SELECT private.is_admin()));
DROP POLICY IF EXISTS "Admin delete issued_passes" ON public.issued_passes;
CREATE POLICY "Admin delete issued_passes" ON public.issued_passes FOR DELETE TO authenticated USING ((SELECT private.is_admin()));

DROP POLICY IF EXISTS "Promoters read own commissions only" ON public.promoter_commissions;
CREATE POLICY "Promoters read own commissions only" ON public.promoter_commissions FOR SELECT TO authenticated
  USING (
    promoter_id IN (
      SELECT id FROM public.promoters
      WHERE user_id = (SELECT auth.uid())
         OR (user_id IS NULL AND LOWER(email) = LOWER(COALESCE((SELECT auth.jwt() ->> 'email'), '')))
    )
    OR (SELECT private.is_admin())
  );
DROP POLICY IF EXISTS "Admin insert promoter_commissions" ON public.promoter_commissions;
CREATE POLICY "Admin insert promoter_commissions" ON public.promoter_commissions FOR INSERT TO authenticated WITH CHECK ((SELECT private.is_admin()));
DROP POLICY IF EXISTS "Admin update promoter_commissions" ON public.promoter_commissions;
CREATE POLICY "Admin update promoter_commissions" ON public.promoter_commissions FOR UPDATE TO authenticated USING ((SELECT private.is_admin())) WITH CHECK ((SELECT private.is_admin()));
DROP POLICY IF EXISTS "Admin delete promoter_commissions" ON public.promoter_commissions;
CREATE POLICY "Admin delete promoter_commissions" ON public.promoter_commissions FOR DELETE TO authenticated USING ((SELECT private.is_admin()));

DROP POLICY IF EXISTS "Promoters read own upi payouts only" ON public.upi_payout_logs;
CREATE POLICY "Promoters read own upi payouts only" ON public.upi_payout_logs FOR SELECT TO authenticated
  USING (
    promoter_id IN (
      SELECT id FROM public.promoters
      WHERE user_id = (SELECT auth.uid())
         OR (user_id IS NULL AND LOWER(email) = LOWER(COALESCE((SELECT auth.jwt() ->> 'email'), '')))
    )
    OR (SELECT private.is_admin())
  );
DROP POLICY IF EXISTS "Admin insert upi_payout_logs" ON public.upi_payout_logs;
CREATE POLICY "Admin insert upi_payout_logs" ON public.upi_payout_logs FOR INSERT TO authenticated WITH CHECK ((SELECT private.is_admin()));
DROP POLICY IF EXISTS "Admin update upi_payout_logs" ON public.upi_payout_logs;
CREATE POLICY "Admin update upi_payout_logs" ON public.upi_payout_logs FOR UPDATE TO authenticated USING ((SELECT private.is_admin())) WITH CHECK ((SELECT private.is_admin()));
DROP POLICY IF EXISTS "Admin delete upi_payout_logs" ON public.upi_payout_logs;
CREATE POLICY "Admin delete upi_payout_logs" ON public.upi_payout_logs FOR DELETE TO authenticated USING ((SELECT private.is_admin()));

DROP POLICY IF EXISTS "Admin read gate logs" ON public.gate_verification_logs;
CREATE POLICY "Admin read gate logs" ON public.gate_verification_logs FOR SELECT TO authenticated USING ((SELECT private.is_admin()));
DROP POLICY IF EXISTS "Admin read anti scalping" ON public.anti_scalping_events;
CREATE POLICY "Admin read anti scalping" ON public.anti_scalping_events FOR SELECT TO authenticated USING ((SELECT private.is_admin()));
DROP POLICY IF EXISTS "Admin read cookie consent" ON public.cookie_consent_records;
CREATE POLICY "Admin read cookie consent" ON public.cookie_consent_records FOR SELECT TO authenticated USING ((SELECT private.is_admin()));

-- 5. Convert parameterized query RPCs to SECURITY INVOKER (RLS enforces row ownership natively)
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
SECURITY INVOKER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_calling_user_id UUID := auth.uid();
    v_calling_email TEXT := LOWER(TRIM(auth.jwt() ->> 'email'));
    v_is_admin BOOLEAN := private.is_admin();
BEGIN
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
        p.id, p.user_id, p.full_name, p.email, p.whatsapp_number, p.city,
        p.upi_id, p.referral_code, p.tier_id, pt.tier_name, pt.commission_rate,
        p.kyc_status, p.total_passes_sold, p.total_earnings
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

REVOKE ALL ON FUNCTION public.get_promoter_profile_parameterized(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_promoter_profile_parameterized(UUID, TEXT) TO authenticated, service_role;

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
SECURITY INVOKER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_calling_user_id UUID := auth.uid();
    v_calling_email TEXT := LOWER(TRIM(COALESCE(auth.jwt() ->> 'email', '')));
    v_is_admin BOOLEAN := private.is_admin();
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
        o.id, o.order_number, o.event_id, e.title AS event_title, e.event_date,
        o.ticket_tier_id, tt.name AS tier_name, tt.price AS tier_price,
        o.quantity, o.total_amount, o.delivery_status, o.created_at
    FROM public.orders o
    JOIN public.events e ON o.event_id = e.id
    JOIN public.ticket_tiers tt ON o.ticket_tier_id = tt.id
    WHERE (p_promoter_id IS NULL OR o.promoter_id = p_promoter_id)
    ORDER BY o.created_at DESC
    LIMIT LEAST(GREATEST(p_limit, 1), 100)
    OFFSET GREATEST(p_offset, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.get_orders_parameterized(INT, INT, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_orders_parameterized(INT, INT, INT) TO authenticated, service_role;

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
SECURITY INVOKER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_calling_user_id UUID := auth.uid();
    v_calling_email TEXT := LOWER(TRIM(COALESCE(auth.jwt() ->> 'email', '')));
    v_is_admin BOOLEAN := private.is_admin();
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
        pc.id, pc.order_id, pc.ticket_price, pc.pass_quantity,
        pc.commission_rate, pc.commission_amount, pc.payout_status, pc.created_at
    FROM public.promoter_commissions pc
    WHERE pc.promoter_id = p_promoter_id
    ORDER BY pc.created_at DESC
    LIMIT LEAST(GREATEST(p_limit, 1), 100)
    OFFSET GREATEST(p_offset, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.get_commissions_parameterized(INT, INT, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_commissions_parameterized(INT, INT, INT) TO authenticated, service_role;

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
SECURITY INVOKER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_calling_user_id UUID := auth.uid();
    v_calling_email TEXT := LOWER(TRIM(COALESCE(auth.jwt() ->> 'email', '')));
    v_is_admin BOOLEAN := private.is_admin();
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
        upl.id, upl.commission_id, upl.upi_id, upl.amount,
        upl.status, upl.bank_rrn, upl.created_at
    FROM public.upi_payout_logs upl
    WHERE upl.promoter_id = p_promoter_id
    ORDER BY upl.created_at DESC
    LIMIT LEAST(GREATEST(p_limit, 1), 100)
    OFFSET GREATEST(p_offset, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.get_payouts_parameterized(INT, INT, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_payouts_parameterized(INT, INT, INT) TO authenticated, service_role;

-- 6. Lock down service_role-only SECURITY DEFINER RPCs from PUBLIC, anon, AND authenticated
REVOKE ALL ON FUNCTION public.create_password_reset_token(TEXT, TEXT, TEXT, TEXT, INT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.consume_password_reset_token(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_password_reset_token(TEXT, TEXT, TEXT, TEXT, INT) TO service_role;
GRANT EXECUTE ON FUNCTION public.consume_password_reset_token(TEXT, TEXT) TO service_role;

DO $$
BEGIN
    IF to_regprocedure('public.assign_admin_role(uuid)') IS NOT NULL THEN
        REVOKE ALL ON FUNCTION public.assign_admin_role(UUID) FROM PUBLIC, anon, authenticated;
        GRANT EXECUTE ON FUNCTION public.assign_admin_role(UUID) TO service_role;
    END IF;
    IF to_regprocedure('public.create_secure_admin(text, text)') IS NOT NULL THEN
        REVOKE ALL ON FUNCTION public.create_secure_admin(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
        GRANT EXECUTE ON FUNCTION public.create_secure_admin(TEXT, TEXT) TO service_role;
    END IF;
END $$;

-- 7. Remove legacy public SECURITY DEFINER functions (including unused verify_referral_code)
DROP FUNCTION IF EXISTS public.verify_referral_code(TEXT);
DROP FUNCTION IF EXISTS public.trg_fn_protect_promoter_privileged_cols();
DROP FUNCTION IF EXISTS public.trg_fn_update_promoter_tier();
DROP FUNCTION IF EXISTS public.handle_new_auth_user();
DROP FUNCTION IF EXISTS public.is_admin();

-- 8. Verify zero SECURITY DEFINER functions in public remain executable by anon or authenticated
DO $$
DECLARE
    v_remaining INT;
BEGIN
    SELECT COUNT(*) INTO v_remaining
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = TRUE
      AND (
        has_function_privilege('anon', p.oid, 'EXECUTE')
        OR has_function_privilege('authenticated', p.oid, 'EXECUTE')
      );
    IF v_remaining > 0 THEN
        RAISE EXCEPTION 'Security Advisor verification failed: % SECURITY DEFINER function(s) in public are still executable by anon or authenticated.', v_remaining;
    END IF;
    RAISE NOTICE 'OK: 0 SECURITY DEFINER functions in public are executable by anon or authenticated.';
END $$;

COMMIT;

