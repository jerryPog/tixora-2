-- ============================================================================
-- TIXORA SUPABASE PERFORMANCE LINTER REMEDIATION: INDEX OPTIMIZATIONS
-- Resolves:
--   1. unindexed_foreign_keys (9 foreign key constraints lacking covering indexes)
--   2. unused_index (12 redundant or duplicate indexes on unique / low-card columns)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- PART 1: ADD COVERING INDEXES FOR ALL 9 UNINDEXED FOREIGN KEYS
-- Standardizes canonical names: idx_<table_name>_<foreign_key_column>
-- ----------------------------------------------------------------------------

-- 1. events -> artist_id (fkey: events_artist_id_fkey)
CREATE INDEX IF NOT EXISTS idx_events_artist_id ON public.events(artist_id);
DROP INDEX IF EXISTS public.idx_events_artist;

-- 2. events -> venue_id (fkey: events_venue_id_fkey)
CREATE INDEX IF NOT EXISTS idx_events_venue_id ON public.events(venue_id);
DROP INDEX IF EXISTS public.idx_events_venue;

-- 3. gate_verification_logs -> pass_id (fkey: gate_verification_logs_pass_id_fkey)
CREATE INDEX IF NOT EXISTS idx_gate_verification_logs_pass_id ON public.gate_verification_logs(pass_id);

-- 4. issued_passes -> order_id (fkey: issued_passes_order_id_fkey)
CREATE INDEX IF NOT EXISTS idx_issued_passes_order_id ON public.issued_passes(order_id);
DROP INDEX IF EXISTS public.idx_passes_order;

-- 5. orders -> attendee_id (fkey: orders_attendee_id_fkey)
CREATE INDEX IF NOT EXISTS idx_orders_attendee_id ON public.orders(attendee_id);
DROP INDEX IF EXISTS public.idx_orders_attendee;

-- 6. orders -> event_id (fkey: orders_event_id_fkey)
CREATE INDEX IF NOT EXISTS idx_orders_event_id ON public.orders(event_id);
DROP INDEX IF EXISTS public.idx_orders_event;

-- 7. orders -> ticket_tier_id (fkey: orders_ticket_tier_id_fkey)
CREATE INDEX IF NOT EXISTS idx_orders_ticket_tier_id ON public.orders(ticket_tier_id);
DROP INDEX IF EXISTS public.idx_orders_ticket_tier;

-- 8. promoter_commissions -> order_id (fkey: promoter_commissions_order_id_fkey)
CREATE INDEX IF NOT EXISTS idx_promoter_commissions_order_id ON public.promoter_commissions(order_id);
DROP INDEX IF EXISTS public.idx_comm_order;

-- 9. upi_payout_logs -> commission_id (fkey: upi_payout_logs_commission_id_fkey)
CREATE INDEX IF NOT EXISTS idx_upi_payout_logs_commission_id ON public.upi_payout_logs(commission_id);
DROP INDEX IF EXISTS public.idx_payouts_commission;


-- ----------------------------------------------------------------------------
-- PART 2: REMOVE UNUSED & REDUNDANT INDEXES (12 TOTAL)
-- Postgres UNIQUE constraints already auto-generate internal unique B-Tree indexes:
--   • promoters.referral_code        -> promoters_referral_code_key
--   • promoters.whatsapp_number     -> promoters_whatsapp_number_key
--   • events.slug                   -> events_slug_key
--   • attendees.mobile_number       -> attendees_mobile_number_key
--   • orders.order_number           -> orders_order_number_key
--   • issued_passes.pass_code       -> issued_passes_pass_code_key
--   • upi_payout_logs.bank_rrn      -> upi_payout_logs_bank_rrn_key
-- Redundant manual secondary indexes cause unneeded write/insert overhead.
-- ----------------------------------------------------------------------------

DROP INDEX IF EXISTS public.idx_user_roles_role;
DROP INDEX IF EXISTS public.idx_promoters_ref;
DROP INDEX IF EXISTS public.idx_promoters_phone;
DROP INDEX IF EXISTS public.idx_promoters_tier;
DROP INDEX IF EXISTS public.idx_venues_city;
DROP INDEX IF EXISTS public.idx_events_slug;
DROP INDEX IF EXISTS public.idx_events_date;
DROP INDEX IF EXISTS public.idx_attendees_mobile;
DROP INDEX IF EXISTS public.idx_orders_num;
DROP INDEX IF EXISTS public.idx_passes_code;
DROP INDEX IF EXISTS public.idx_passes_phone;
DROP INDEX IF EXISTS public.idx_payouts_rrn;


-- ----------------------------------------------------------------------------
-- PART 3: RE-ANALYZE OPTIMIZED TABLES
-- Updates PostgreSQL query planner statistics immediately for maximum throughput.
-- ----------------------------------------------------------------------------
ANALYZE public.user_roles;
ANALYZE public.promoters;
ANALYZE public.venues;
ANALYZE public.events;
ANALYZE public.attendees;
ANALYZE public.orders;
ANALYZE public.issued_passes;
ANALYZE public.gate_verification_logs;
ANALYZE public.promoter_commissions;
ANALYZE public.upi_payout_logs;

DO $$
BEGIN
  RAISE NOTICE '✅ Successfully configured 9 covering foreign key indexes, pruned 12 redundant indexes, and refreshed query planner statistics.';
END $$;
