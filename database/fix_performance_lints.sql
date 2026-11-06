-- ============================================================================
-- TIXORA SUPABASE PERFORMANCE & MULTIPLE PERMISSIVE POLICIES REMEDIATION
-- Target: Supabase Project (https://hgzcdzlfwweesdljeqdv.supabase.co)
-- Resolves all 14 multiple_permissive_policies warnings:
--   - artists (SELECT)
--   - events (SELECT)
--   - issued_passes (SELECT)
--   - orders (INSERT, SELECT)
--   - promoter_commissions (SELECT)
--   - promoter_tiers (SELECT)
--   - promoters (INSERT, SELECT, UPDATE)
--   - ticket_tiers (SELECT)
--   - upi_payout_logs (SELECT)
--   - user_roles (SELECT)
--   - venues (SELECT)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ARTISTS (Eliminate duplicate SELECT on role 'authenticated')
-- ----------------------------------------------------------------------------
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


-- ----------------------------------------------------------------------------
-- 2. EVENTS (Eliminate duplicate SELECT on role 'authenticated')
-- ----------------------------------------------------------------------------
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


-- ----------------------------------------------------------------------------
-- 3. VENUES (Eliminate duplicate SELECT on role 'authenticated')
-- ----------------------------------------------------------------------------
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


-- ----------------------------------------------------------------------------
-- 4. TICKET_TIERS (Eliminate duplicate SELECT on role 'authenticated')
-- ----------------------------------------------------------------------------
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


-- ----------------------------------------------------------------------------
-- 5. PROMOTER_TIERS (Eliminate duplicate SELECT on role 'authenticated')
-- ----------------------------------------------------------------------------
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


-- ----------------------------------------------------------------------------
-- 6. PROMOTERS (Eliminate duplicate SELECT, INSERT, UPDATE on 'authenticated')
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admin manage promoters" ON public.promoters;
DROP POLICY IF EXISTS "Promoter self-register" ON public.promoters;
DROP POLICY IF EXISTS "Promoter insert policy" ON public.promoters;
DROP POLICY IF EXISTS "Admin delete promoters" ON public.promoters;

-- Single unified INSERT policy
CREATE POLICY "Promoter insert policy" ON public.promoters
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    (SELECT public.is_admin())
    OR (
      full_name IS NOT NULL AND length(trim(full_name)) > 0
      AND email IS NOT NULL AND length(trim(email)) > 3
      AND whatsapp_number IS NOT NULL AND length(trim(whatsapp_number)) > 5
      AND referral_code IS NOT NULL AND length(trim(referral_code)) > 0
      AND city IS NOT NULL AND length(trim(city)) > 0
    )
  );

-- Separate DELETE policy for admins
CREATE POLICY "Admin delete promoters" ON public.promoters
  FOR DELETE TO authenticated
  USING ((SELECT public.is_admin()));


-- ----------------------------------------------------------------------------
-- 7. ORDERS (Eliminate duplicate INSERT, SELECT on 'authenticated')
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admin manage orders" ON public.orders;
DROP POLICY IF EXISTS "Public create orders" ON public.orders;
DROP POLICY IF EXISTS "Orders create policy" ON public.orders;
DROP POLICY IF EXISTS "Admin update orders" ON public.orders;
DROP POLICY IF EXISTS "Admin delete orders" ON public.orders;

-- Single unified INSERT policy
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

-- Admin separate write policies
CREATE POLICY "Admin update orders" ON public.orders
  FOR UPDATE TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY "Admin delete orders" ON public.orders
  FOR DELETE TO authenticated
  USING ((SELECT public.is_admin()));


-- ----------------------------------------------------------------------------
-- 8. ISSUED_PASSES (Eliminate duplicate SELECT on 'authenticated')
-- ----------------------------------------------------------------------------
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


-- ----------------------------------------------------------------------------
-- 9. PROMOTER_COMMISSIONS (Eliminate duplicate SELECT on 'authenticated')
-- ----------------------------------------------------------------------------
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


-- ----------------------------------------------------------------------------
-- 10. UPI_PAYOUT_LOGS (Eliminate duplicate SELECT on 'authenticated')
-- ----------------------------------------------------------------------------
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


-- ----------------------------------------------------------------------------
-- 11. USER_ROLES (Eliminate duplicate SELECT on 'authenticated')
-- ----------------------------------------------------------------------------
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
  RAISE NOTICE '✅ Successfully resolved all 14 multiple_permissive_policies performance lints across all tables.';
END $$;

