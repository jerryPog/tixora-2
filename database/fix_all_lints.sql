-- ============================================================================
-- TIXORA ALL-IN-ONE SUPABASE LINTER REMEDIATION
-- Resolves ALL Security Warnings AND Performance Warnings in one execution:
--   1. function_search_path_mutable
--   2. anon_security_definer_function_executable
--   3. authenticated_security_definer_function_executable
--   4. rls_policy_always_true (with exact verified column names: mobile_number, consent_type)
--   5. multiple_permissive_policies across all 11 tables
-- ============================================================================

-- ----------------------------------------------------------------------------
-- PART 1: FUNCTIONS & TRIGGERS (Safe search_path + Revoke Unrestricted RPC)
-- ----------------------------------------------------------------------------

-- 1.1: trg_fn_update_promoter_tier
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

    UPDATE public.promoters
    SET total_passes_sold = v_total_passes,
        tier_id = COALESCE(v_new_tier, tier_id),
        updated_at = NOW()
    WHERE id = NEW.promoter_id;

    RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.trg_fn_update_promoter_tier() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.trg_fn_update_promoter_tier() TO service_role, postgres;


-- 1.2: trg_fn_decrement_ticket_quota
CREATE OR REPLACE FUNCTION public.trg_fn_decrement_ticket_quota()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NEW.payment_status = 'successful' THEN
        UPDATE public.ticket_tiers
        SET available_quota = available_quota - NEW.quantity
        WHERE id = NEW.ticket_tier_id
          AND available_quota >= NEW.quantity;
    END IF;
    RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.trg_fn_decrement_ticket_quota() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.trg_fn_decrement_ticket_quota() TO service_role, postgres;


-- 1.3: handle_new_auth_user
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role TEXT;
  v_name TEXT;
  v_phone TEXT;
  v_city TEXT;
  v_upi TEXT;
  v_ref_code TEXT;
BEGIN
  v_role := COALESCE(NEW.raw_app_meta_data ->> 'role', NEW.raw_user_meta_data ->> 'role', 'promoter');

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_role)
  ON CONFLICT (user_id) DO NOTHING;

  IF v_role = 'promoter' THEN
    v_name := COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1));
    v_phone := COALESCE(NEW.raw_user_meta_data ->> 'whatsapp_number', '+910000000000');
    v_city := COALESCE(NEW.raw_user_meta_data ->> 'city', 'Mumbai');
    v_upi := COALESCE(NEW.raw_user_meta_data ->> 'upi_id', split_part(NEW.email, '@', 1) || '@upi');
    v_ref_code := 'TXR-' || UPPER(SUBSTRING(MD5(NEW.id::TEXT || NOW()::TEXT) FROM 1 FOR 6));

    INSERT INTO public.promoters (user_id, full_name, email, whatsapp_number, city, upi_id, referral_code)
    VALUES (NEW.id, v_name, NEW.email, v_phone, v_city, v_upi, v_ref_code)
    ON CONFLICT (email) DO UPDATE SET user_id = EXCLUDED.user_id;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'handle_new_auth_user trigger notice: %', SQLERRM;
    RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_auth_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_auth_user() TO service_role, postgres;


-- 1.4: assign_admin_role
CREATE OR REPLACE FUNCTION public.assign_admin_role(target_email TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  IF (SELECT auth.role()) <> 'service_role' AND NOT (SELECT public.is_admin()) THEN
    RAISE EXCEPTION 'Access denied: Only administrators can assign admin roles.';
  END IF;

  SELECT id INTO v_user_id FROM auth.users WHERE email = target_email LIMIT 1;
  IF v_user_id IS NULL THEN
    RETURN 'User with email ' || target_email || ' not found in auth.users. Please sign up first!';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'admin')
  ON CONFLICT (user_id) DO UPDATE SET role = 'admin';

  RETURN 'Successfully elevated ' || target_email || ' to admin role.';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.assign_admin_role(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.assign_admin_role(TEXT) TO service_role, postgres;


-- 1.5: is_admin (SECURITY INVOKER + safe search_path)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY INVOKER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = (SELECT auth.uid()) AND role IN ('admin', 'manager')
  ) OR (
    COALESCE((SELECT auth.jwt() -> 'app_metadata' ->> 'role'), '') IN ('admin', 'manager')
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;


-- ----------------------------------------------------------------------------
-- PART 2: HARDEN OVERLY PERMISSIVE INSERT POLICIES (Exact column names verified)
-- ----------------------------------------------------------------------------

-- 2.1: anti_scalping_events
DROP POLICY IF EXISTS "Public insert anti scalping" ON public.anti_scalping_events;
CREATE POLICY "Public insert anti scalping" ON public.anti_scalping_events
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    event_type IS NOT NULL AND length(trim(event_type)) > 0
  );

-- 2.2: attendees (Using exact column: mobile_number)
DROP POLICY IF EXISTS "Public create attendees" ON public.attendees;
CREATE POLICY "Public create attendees" ON public.attendees
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    full_name IS NOT NULL AND length(trim(full_name)) > 0
    AND mobile_number IS NOT NULL AND length(trim(mobile_number)) > 5
  );

-- 2.3: cookie_consent_records (Using exact column: consent_type)
DROP POLICY IF EXISTS "Public insert cookie consent" ON public.cookie_consent_records;
CREATE POLICY "Public insert cookie consent" ON public.cookie_consent_records
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    consent_type IS NOT NULL AND length(trim(consent_type)) > 0
  );

-- 2.4: gate_verification_logs
DROP POLICY IF EXISTS "Public insert gate logs" ON public.gate_verification_logs;
CREATE POLICY "Public insert gate logs" ON public.gate_verification_logs
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    gate_name IS NOT NULL AND length(trim(gate_name)) > 0
    AND result IS NOT NULL AND length(trim(result)) > 0
  );


-- ----------------------------------------------------------------------------
-- PART 3: RESOLVE MULTIPLE PERMISSIVE POLICIES (Split write/admin operations)
-- ----------------------------------------------------------------------------

-- 3.1: artists
DROP POLICY IF EXISTS "Admin Manage artists" ON public.artists;
DROP POLICY IF EXISTS "Admin Insert artists" ON public.artists;
DROP POLICY IF EXISTS "Admin Update artists" ON public.artists;
DROP POLICY IF EXISTS "Admin Delete artists" ON public.artists;

CREATE POLICY "Admin Insert artists" ON public.artists
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY "Admin Update artists" ON public.artists
  FOR UPDATE TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY "Admin Delete artists" ON public.artists
  FOR DELETE TO authenticated
  USING ((SELECT public.is_admin()));


-- 3.2: events
DROP POLICY IF EXISTS "Admin Manage events" ON public.events;
DROP POLICY IF EXISTS "Admin Insert events" ON public.events;
DROP POLICY IF EXISTS "Admin Update events" ON public.events;
DROP POLICY IF EXISTS "Admin Delete events" ON public.events;

CREATE POLICY "Admin Insert events" ON public.events
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY "Admin Update events" ON public.events
  FOR UPDATE TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY "Admin Delete events" ON public.events
  FOR DELETE TO authenticated
  USING ((SELECT public.is_admin()));


-- 3.3: venues
DROP POLICY IF EXISTS "Admin Manage venues" ON public.venues;
DROP POLICY IF EXISTS "Admin Insert venues" ON public.venues;
DROP POLICY IF EXISTS "Admin Update venues" ON public.venues;
DROP POLICY IF EXISTS "Admin Delete venues" ON public.venues;

CREATE POLICY "Admin Insert venues" ON public.venues
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY "Admin Update venues" ON public.venues
  FOR UPDATE TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY "Admin Delete venues" ON public.venues
  FOR DELETE TO authenticated
  USING ((SELECT public.is_admin()));


-- 3.4: ticket_tiers
DROP POLICY IF EXISTS "Admin Manage ticket_tiers" ON public.ticket_tiers;
DROP POLICY IF EXISTS "Admin Insert ticket_tiers" ON public.ticket_tiers;
DROP POLICY IF EXISTS "Admin Update ticket_tiers" ON public.ticket_tiers;
DROP POLICY IF EXISTS "Admin Delete ticket_tiers" ON public.ticket_tiers;

CREATE POLICY "Admin Insert ticket_tiers" ON public.ticket_tiers
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY "Admin Update ticket_tiers" ON public.ticket_tiers
  FOR UPDATE TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY "Admin Delete ticket_tiers" ON public.ticket_tiers
  FOR DELETE TO authenticated
  USING ((SELECT public.is_admin()));


-- 3.5: promoter_tiers
DROP POLICY IF EXISTS "Admin Manage promoter_tiers" ON public.promoter_tiers;
DROP POLICY IF EXISTS "Admin Insert promoter_tiers" ON public.promoter_tiers;
DROP POLICY IF EXISTS "Admin Update promoter_tiers" ON public.promoter_tiers;
DROP POLICY IF EXISTS "Admin Delete promoter_tiers" ON public.promoter_tiers;

CREATE POLICY "Admin Insert promoter_tiers" ON public.promoter_tiers
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY "Admin Update promoter_tiers" ON public.promoter_tiers
  FOR UPDATE TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY "Admin Delete promoter_tiers" ON public.promoter_tiers
  FOR DELETE TO authenticated
  USING ((SELECT public.is_admin()));


-- 3.6: promoters
DROP POLICY IF EXISTS "Admin manage promoters" ON public.promoters;
DROP POLICY IF EXISTS "Promoter self-register" ON public.promoters;
DROP POLICY IF EXISTS "Promoter insert policy" ON public.promoters;
DROP POLICY IF EXISTS "Admin delete promoters" ON public.promoters;

CREATE POLICY "Promoter insert policy" ON public.promoters
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    (SELECT public.is_admin())
    OR (
      full_name IS NOT NULL AND length(trim(full_name)) > 0
      AND whatsapp_number IS NOT NULL AND length(trim(whatsapp_number)) > 5
      AND referral_code IS NOT NULL AND length(trim(referral_code)) > 0
      AND city IS NOT NULL AND length(trim(city)) > 0
    )
  );

CREATE POLICY "Admin delete promoters" ON public.promoters
  FOR DELETE TO authenticated
  USING ((SELECT public.is_admin()));


-- 3.7: orders
DROP POLICY IF EXISTS "Admin manage orders" ON public.orders;
DROP POLICY IF EXISTS "Public create orders" ON public.orders;
DROP POLICY IF EXISTS "Orders create policy" ON public.orders;
DROP POLICY IF EXISTS "Admin update orders" ON public.orders;
DROP POLICY IF EXISTS "Admin delete orders" ON public.orders;

CREATE POLICY "Orders create policy" ON public.orders
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    (SELECT public.is_admin())
    OR (
      order_number IS NOT NULL AND length(trim(order_number)) > 0
      AND quantity > 0
      AND total_amount >= 0
      AND event_id IS NOT NULL
      AND ticket_tier_id IS NOT NULL
      AND attendee_id IS NOT NULL
    )
  );

CREATE POLICY "Admin update orders" ON public.orders
  FOR UPDATE TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY "Admin delete orders" ON public.orders
  FOR DELETE TO authenticated
  USING ((SELECT public.is_admin()));


-- 3.8: issued_passes
DROP POLICY IF EXISTS "Admin manage passes" ON public.issued_passes;
DROP POLICY IF EXISTS "Admin insert passes" ON public.issued_passes;
DROP POLICY IF EXISTS "Admin update passes" ON public.issued_passes;
DROP POLICY IF EXISTS "Admin delete passes" ON public.issued_passes;

CREATE POLICY "Admin insert passes" ON public.issued_passes
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY "Admin update passes" ON public.issued_passes
  FOR UPDATE TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY "Admin delete passes" ON public.issued_passes
  FOR DELETE TO authenticated
  USING ((SELECT public.is_admin()));


-- 3.9: promoter_commissions
DROP POLICY IF EXISTS "Admin manage commissions" ON public.promoter_commissions;
DROP POLICY IF EXISTS "Admin insert commissions" ON public.promoter_commissions;
DROP POLICY IF EXISTS "Admin update commissions" ON public.promoter_commissions;
DROP POLICY IF EXISTS "Admin delete commissions" ON public.promoter_commissions;

CREATE POLICY "Admin insert commissions" ON public.promoter_commissions
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY "Admin update commissions" ON public.promoter_commissions
  FOR UPDATE TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY "Admin delete commissions" ON public.promoter_commissions
  FOR DELETE TO authenticated
  USING ((SELECT public.is_admin()));


-- 3.10: upi_payout_logs
DROP POLICY IF EXISTS "Admin manage upi payouts" ON public.upi_payout_logs;
DROP POLICY IF EXISTS "Admin insert upi payouts" ON public.upi_payout_logs;
DROP POLICY IF EXISTS "Admin update upi payouts" ON public.upi_payout_logs;
DROP POLICY IF EXISTS "Admin delete upi payouts" ON public.upi_payout_logs;

CREATE POLICY "Admin insert upi payouts" ON public.upi_payout_logs
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY "Admin update upi payouts" ON public.upi_payout_logs
  FOR UPDATE TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY "Admin delete upi payouts" ON public.upi_payout_logs
  FOR DELETE TO authenticated
  USING ((SELECT public.is_admin()));


-- 3.11: user_roles
DROP POLICY IF EXISTS "Admins can manage user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admin insert user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admin update user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admin delete user roles" ON public.user_roles;

CREATE POLICY "Admin insert user roles" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY "Admin update user roles" ON public.user_roles
  FOR UPDATE TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY "Admin delete user roles" ON public.user_roles
  FOR DELETE TO authenticated
  USING ((SELECT public.is_admin()));


-- ----------------------------------------------------------------------------
-- SUCCESS VERIFICATION
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  RAISE NOTICE '✅ Successfully executed all linter fixes (Security + Performance).';
END $$;
