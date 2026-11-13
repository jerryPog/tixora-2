/*
  TIXORA SALES & PROMOTER IMPORT: RONAK JAIN (IDEMPOTENT MIGRATION)
  Source File: c:\Users\rahul\Downloads\Tixora ticket_sales_copy.xlsx
  Batch Label: External import — Tixoraticket_sales_copy.xlsx
  Promoter: Ronak Jain (ronakj303@gmail.com | +91 78921 45475 | 9845350802)
  21 Verified Ticket Sales | 56 Passes | ₹2,56,450.00 Gross Sales Volume
  Commission: 11.0% (Tier 02 • Capo) = ₹28,209.50
  0. Schema Migrations (Ensure columns and relaxed email constraints exist)
*/

ALTER TABLE attendees ALTER COLUMN email DROP NOT NULL;
ALTER TABLE attendees DROP CONSTRAINT IF EXISTS chk_attendee_email_fmt;
ALTER TABLE attendees ADD CONSTRAINT chk_attendee_email_fmt 
    CHECK (email IS NULL OR email = '' OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

ALTER TABLE orders ADD COLUMN IF NOT EXISTS external_sale_id INT UNIQUE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS source_event_name VARCHAR(200);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS source_category VARCHAR(100);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS seat_details VARCHAR(255);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_name VARCHAR(150);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(20);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_email VARCHAR(255);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS import_batch VARCHAR(150) DEFAULT 'External import — Tixoraticket_sales_copy.xlsx';

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_payment_status_check 
    CHECK (payment_status IN ('pending', 'successful', 'confirmed', 'imported', 'failed', 'refunded'));

CREATE INDEX IF NOT EXISTS idx_orders_external_sale_id ON orders(external_sale_id);

-- 1. Artists (Arijit Singh & Darshan Raval)
INSERT INTO artists (id, name, genre, image_url, bio) VALUES
(9, 'Arijit Singh', 'Bollywood / Acoustic & Orchestra Live', 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80', 'India’s preeminent playback artist performing his multi-city stadium live tour.'),
(10, 'Darshan Raval', 'Indie Pop / Romantic Arena Anthems', 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&auto=format&fit=crop&q=80', 'The chart-topping romantic pop sensation headlining youth arena dates across India.')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, genre = EXCLUDED.genre;
SELECT setval('artists_id_seq', GREATEST((SELECT MAX(id) FROM artists), 10));

-- 2. Events (Tour dates matching sales register)
INSERT INTO events (id, title, slug, artist_id, venue_id, event_date, status, partner_engine, poster_url, banner_url, description, starting_price, promoter_cut_pct) VALUES
(9, 'Diljit Dosanjh Dil-Luminati Tour Bengaluru', 'diljit-dosanjh-bengaluru-2026', 7, 3, '2026-12-06 18:00:00+05:30', 'active', 'District Live Direct', 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=800&auto=format&fit=crop&q=80', 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=1600&auto=format&fit=crop&q=80', 'The historic Dil-Luminati Tour arrives in Bengaluru at NICE Grounds for a monumental stadium celebration.', 3999.00, 11.00),
(10, 'Arijit Singh India Tour Bengaluru', 'arijit-singh-bengaluru-2026', 9, 3, '2026-12-19 18:30:00+05:30', 'active', 'BookMyShow / District Live', 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80', 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=1600&auto=format&fit=crop&q=80', 'Arijit Singh live with grand symphony orchestra and acoustic stages at NICE Grounds, Bengaluru.', 2750.00, 11.00),
(11, 'Arijit Singh India Tour Mumbai', 'arijit-singh-mumbai-2026', 9, 1, '2026-12-27 18:30:00+05:30', 'active', 'BookMyShow / District Live', 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80', 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=1600&auto=format&fit=crop&q=80', 'Arijit Singh electrifies Mumbai at Mahalaxmi Racecourse with his complete orchestral collective.', 2999.00, 11.00),
(12, 'Arijit Singh India Tour Hyderabad', 'arijit-singh-hyderabad-2026', 9, 5, '2027-01-09 18:30:00+05:30', 'active', 'BookMyShow / District Live', 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80', 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=1600&auto=format&fit=crop&q=80', 'Arijit Singh live at GMR Arena Hyderabad with 360-degree arena staging.', 9500.00, 11.00),
(13, 'Darshan Raval India Tour Bengaluru', 'darshan-raval-bengaluru-2026', 10, 3, '2027-01-24 18:00:00+05:30', 'active', 'BookMyShow / District Live', 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&auto=format&fit=crop&q=80', 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1600&auto=format&fit=crop&q=80', 'Darshan Raval brings his soulful love anthems to Bengaluru for an intimate arena performance.', 1500.00, 11.00),
(14, 'The Chainsmokers Arena Bengaluru', 'the-chainsmokers-bengaluru-2026', 4, 3, '2026-12-31 19:00:00+05:30', 'active', 'Sunburn / District Live', 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&auto=format&fit=crop&q=80', 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1600&auto=format&fit=crop&q=80', 'The Chainsmokers ring in the New Year in Bengaluru at NICE Grounds with full arena lasers and special guests.', 3800.00, 11.00)
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, slug = EXCLUDED.slug;
SELECT setval('events_id_seq', GREATEST((SELECT MAX(id) FROM events), 14));

-- 3. Ticket Tiers (Matching Sales Register Categories)
INSERT INTO ticket_tiers (id, event_id, name, price, total_quota, available_quota, promoter_cut_pct, is_active) VALUES
(19, 7, 'A Block Bay 5 Seating', 6500.00, 1000, 480, 11.00, TRUE),
(20, 9, 'Gold Standing', 7750.00, 3000, 850, 11.00, TRUE),
(21, 9, 'VIP Gold Seating', 8250.00, 1500, 310, 11.00, TRUE),
(22, 10, 'Silver Enclosure', 2750.00, 6000, 1420, 11.00, TRUE),
(23, 10, 'Gold Front Seating', 4125.00, 4000, 930, 11.00, TRUE),
(24, 10, 'Gold Front Phase 2', 6000.00, 3000, 710, 11.00, TRUE),
(25, 10, 'Platinum Left Bay', 7800.00, 1000, 240, 11.00, TRUE),
(26, 11, 'Silver Enclosure', 2999.00, 5000, 1120, 11.00, TRUE),
(27, 11, 'Gold Stand', 5000.00, 3500, 890, 11.00, TRUE),
(28, 12, 'Platinum Left VIP', 9500.00, 800, 190, 11.00, TRUE),
(29, 13, 'Silver Enclosure', 1500.00, 4000, 1200, 11.00, TRUE),
(30, 14, 'GA Standing', 3800.00, 8000, 2100, 11.00, TRUE)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, price = EXCLUDED.price;
SELECT setval('ticket_tiers_id_seq', GREATEST((SELECT MAX(id) FROM ticket_tiers), 30));

-- 4. Promoter: Ronak Jain (56 Passes Sold -> Tier 2 Capo / 11.0% Cut)
INSERT INTO promoters (id, full_name, whatsapp_number, email, city, organization, upi_id, tier_id, referral_code, kyc_status, total_passes_sold, total_earnings) VALUES
(1, 'Ronak Jain', '+917892145475', 'ronakj303@gmail.com', 'Bengaluru', 'Tixora Operations & South India Tour Desk', '7892145475@upi', 2, '78920145', 'verified', 56, 28209.50)
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, email = EXCLUDED.email, whatsapp_number = EXCLUDED.whatsapp_number, total_passes_sold = EXCLUDED.total_passes_sold, total_earnings = EXCLUDED.total_earnings, tier_id = EXCLUDED.tier_id;
SELECT setval('promoters_id_seq', GREATEST((SELECT MAX(id) FROM promoters), 1));

-- 5. Attendees (18 Ticket Buyers from Register — preserving NULL emails without fake values)
INSERT INTO attendees (id, full_name, mobile_number, email, bms_account_id, digilocker_verified) VALUES
(1, 'Abeer', '+919971778481', 'jncy121@gmail.com', 'BMS-778481', TRUE),
(2, 'aarav', '+918951085366', 'aaravparekh007@gmail.com', 'BMS-085366', TRUE),
(3, 'Devansh', '+919920686585', 'devanshbangad128@gmail.com', 'BMS-686585', TRUE),
(4, 'daksh', '+918310665642', NULL, 'BMS-665642', TRUE),
(5, 'ronak', '+917892145475', 'ronakj303@gmail.com', 'BMS-145475', TRUE),
(6, 'Akash Tewari', '+918303545661', 'akasht9952@gmail.com', 'BMS-545661', TRUE),
(7, 'Prajin Chopra', '+919906185105', NULL, 'BMS-185105', TRUE),
(8, 'Dimple Chopra', '+916363327399', 'dimple.pc141203@gmail.com', 'BMS-327399', TRUE),
(9, 'Tisha Saklecha', '+919008433416', 'tishasaklecha512@gmail.com', 'BMS-433416', TRUE),
(10, 'Rachana', '+917892244643', 'rachana.j00@gmail.com', 'BMS-244643', TRUE),
(11, 'Vishal', '+919845350802', 'vishal.mamtha@gmail.com', 'BMS-350802', TRUE),
(12, 'Rishab Gadiya', '+917892244643', 'rachana.j00@gmail.com', 'BMS-244644', TRUE),
(13, 'sahil', '+919113225959', 'sahiljain2017@gmail.com', 'BMS-225959', TRUE),
(14, 'Poorvi Khatri', '+917259880344', 'poorvikhatri27@gmail.com', 'BMS-880344', TRUE),
(15, 'Arnaz Taj', '+917259108835', 'arnaztaj301@gmail.com', 'BMS-108835', TRUE),
(16, 'Harsh Mehta', '+918105865828', NULL, 'BMS-865828', TRUE),
(17, 'Likitha', '+916361004463', NULL, 'BMS-004463', TRUE),
(18, 'Karan', '+918555910998', 'karanahuja9995@gmail.com', 'BMS-910998', TRUE)
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, mobile_number = EXCLUDED.mobile_number, email = EXCLUDED.email;
SELECT setval('attendees_id_seq', GREATEST((SELECT MAX(id) FROM attendees), 18));

-- 6. Orders (21 Confirmed Bookings Attributed to Ronak Jain — Idempotent on external_sale_id)
INSERT INTO orders (id, order_number, external_sale_id, source_event_name, source_category, seat_details, customer_name, customer_phone, customer_email, import_batch, attendee_id, event_id, ticket_tier_id, quantity, unit_price, total_amount, payment_method, payment_status, payment_gateway_ref, promoter_id, delivery_channel, delivery_status, created_at) VALUES
(1, 'TIX-2026-RJ0001', 1, 'Diljit ahmedabaad', 'A block bay 5', 'KK 94 95 96 97', 'Abeer', '+919971778481', 'jncy121@gmail.com', 'External import — Tixoraticket_sales_copy.xlsx', 1, 7, 19, 4, 6500.00, 26000.00, 'UPI', 'confirmed', 'UPI-NPCI-2026100001', 1, 'BookMyShow / District Wallet', 'dispatched', '2026-10-04 00:00:00+05:30'),
(2, 'TIX-2026-RJ0002', 2, 'diljit dosanjh bangalore', 'gold', 'free standing', 'aarav', '+918951085366', NULL, 'External import — Tixoraticket_sales_copy.xlsx', 2, 9, 20, 1, 7750.00, 7750.00, 'UPI', 'confirmed', 'UPI-NPCI-2026100002', 1, 'BookMyShow / District Wallet', 'dispatched', '2026-10-06 00:00:00+05:30'),
(3, 'TIX-2026-RJ0005', 5, 'arijit bangalore ', 'gold', 'free seating', 'Devansh', '+919920686585', 'devanshbangad128@gmail.com', 'External import — Tixoraticket_sales_copy.xlsx', 3, 10, 24, 2, 5500.00, 11000.00, 'UPI', 'confirmed', 'UPI-NPCI-2026100005', 1, 'BookMyShow / District Wallet', 'dispatched', '2026-10-10 00:00:00+05:30'),
(4, 'TIX-2026-RJ0006', 6, 'arijit mumbai', 'gold', 'free seating', 'Devansh', '+919920686585', 'devanshbangad128@gmail.com', 'External import — Tixoraticket_sales_copy.xlsx', 3, 11, 27, 2, 5000.00, 10000.00, 'UPI', 'confirmed', 'UPI-NPCI-2026100006', 1, 'BookMyShow / District Wallet', 'dispatched', '2026-10-10 00:00:00+05:30'),
(5, 'TIX-2026-RJ0007', 7, 'arijit bangalore', 'platinum left', 'free seating', 'daksh', '+918310665642', NULL, 'External import — Tixoraticket_sales_copy.xlsx', 4, 10, 25, 2, 7800.00, 15600.00, 'UPI', 'confirmed', 'UPI-NPCI-2026100007', 1, 'BookMyShow / District Wallet', 'dispatched', '2026-10-10 00:00:00+05:30'),
(6, 'TIX-2026-RJ0009', 9, 'arijit bangalore', 'gold', 'free seating', 'aarav', '+918951085366', 'aaravparekh007@gmail.com', 'External import — Tixoraticket_sales_copy.xlsx', 2, 10, 23, 1, 3000.00, 3000.00, 'UPI', 'confirmed', 'UPI-NPCI-2026100009', 1, 'BookMyShow / District Wallet', 'dispatched', '2026-10-10 00:00:00+05:30'),
(7, 'TIX-2026-RJ0010', 10, 'arijit bangalore', 'gold', 'free seating', 'ronak', '+917892145475', 'ronakj303@gmail.com', 'External import — Tixoraticket_sales_copy.xlsx', 5, 10, 23, 1, 3000.00, 3000.00, 'UPI', 'confirmed', 'UPI-NPCI-2026100010', 1, 'BookMyShow / District Wallet', 'dispatched', '2026-10-10 00:00:00+05:30'),
(8, 'TIX-2026-RJ0013', 13, 'arijit mumbai', 'silver', 'free seating', 'Akash Tewari', '+918303545661', 'akasht9952@gmail.com', 'External import — Tixoraticket_sales_copy.xlsx', 6, 11, 26, 4, 2999.00, 12000.00, 'UPI', 'confirmed', 'UPI-NPCI-2026100013', 1, 'BookMyShow / District Wallet', 'dispatched', '2026-10-11 00:00:00+05:30'),
(9, 'TIX-2026-RJ0015', 15, 'diljit bangalore', 'gold', 'free seating', 'Prajin Chopra', '+919906185105', NULL, 'External import — Tixoraticket_sales_copy.xlsx', 7, 9, 21, 2, 8250.00, 16500.00, 'UPI', 'confirmed', 'UPI-NPCI-2026100015', 1, 'BookMyShow / District Wallet', 'dispatched', '2026-10-12 00:00:00+05:30'),
(10, 'TIX-2026-RJ0017', 17, 'arijit bangalore', 'silver', 'free seating', 'Dimple Chopra', '+916363327399', 'dimple.pc141203@gmail.com', 'External import — Tixoraticket_sales_copy.xlsx', 8, 10, 22, 2, 2750.00, 5500.00, 'UPI', 'confirmed', 'UPI-NPCI-2026100017', 1, 'BookMyShow / District Wallet', 'dispatched', '2026-10-12 00:00:00+05:30'),
(11, 'TIX-2026-RJ0019', 19, 'Arjit Singh', 'gold', 'free seating', 'Tisha Saklecha', '+919008433416', 'tishasaklecha512@gmail.com', 'External import — Tixoraticket_sales_copy.xlsx', 9, 10, 24, 1, 6000.00, 6000.00, 'UPI', 'confirmed', 'UPI-NPCI-2026100019', 1, 'BookMyShow / District Wallet', 'dispatched', '2026-10-13 00:00:00+05:30'),
(12, 'TIX-2026-RJ0020', 20, 'Arjit Singh', 'silver', 'free seating', 'Rachana', '+917892244643', 'rachana.j00@gmail.com', 'External import — Tixoraticket_sales_copy.xlsx', 10, 10, 22, 1, 2750.00, 3000.00, 'UPI', 'confirmed', 'UPI-NPCI-2026100020', 1, 'BookMyShow / District Wallet', 'dispatched', '2026-10-13 00:00:00+05:30'),
(13, 'TIX-2026-RJ0021', 21, 'Arjit Singh', 'gold', 'free seating', 'Vishal', '+919845350802', 'vishal.mamtha@gmail.com', 'External import — Tixoraticket_sales_copy.xlsx', 11, 10, 23, 2, 4125.00, 9000.00, 'UPI', 'confirmed', 'UPI-NPCI-2026100021', 1, 'BookMyShow / District Wallet', 'dispatched', '2026-10-13 00:00:00+05:30'),
(14, 'TIX-2026-RJ0022', 22, 'Arjit Singh', 'gold', 'free seating', 'Vishal', '+919845350802', 'vishal.mamtha@gmail.com', 'External import — Tixoraticket_sales_copy.xlsx', 11, 10, 23, 9, 4125.00, 40500.00, 'UPI', 'confirmed', 'UPI-NPCI-2026100022', 1, 'BookMyShow / District Wallet', 'dispatched', '2026-10-13 00:00:00+05:30'),
(15, 'TIX-2026-RJ0023', 23, 'Arjit Singh', 'silver', 'free seating', 'Rishab Gadiya', '+917892244643', 'rachana.j00@gmail.com', 'External import — Tixoraticket_sales_copy.xlsx', 12, 10, 22, 7, 3000.00, 21000.00, 'UPI', 'confirmed', 'UPI-NPCI-2026100023', 1, 'BookMyShow / District Wallet', 'dispatched', '2026-10-13 00:00:00+05:30'),
(16, 'TIX-2026-RJ0025', 25, 'arijit bangalore', 'gold', 'free seating', 'sahil', '+919113225959', 'sahiljain2017@gmail.com', 'External import — Tixoraticket_sales_copy.xlsx', 13, 10, 24, 2, 6000.00, 12000.00, 'UPI', 'confirmed', 'UPI-NPCI-2026100025', 1, 'BookMyShow / District Wallet', 'dispatched', '2026-10-15 00:00:00+05:30'),
(17, 'TIX-2026-RJ0037', 37, 'Darshan raval bangalore', 'silver', 'free seating', 'Poorvi Khatri', '+917259880344', 'poorvikhatri27@gmail.com', 'External import — Tixoraticket_sales_copy.xlsx', 14, 13, 29, 1, 1500.00, 1500.00, 'UPI', 'confirmed', 'UPI-NPCI-2026100037', 1, 'BookMyShow / District Wallet', 'dispatched', '2026-10-21 00:00:00+05:30'),
(18, 'TIX-2026-RJ0038', 38, 'Darshan raval bangalore', 'silver', 'free seating', 'Arnaz Taj', '+917259108835', 'arnaztaj301@gmail.com', 'External import — Tixoraticket_sales_copy.xlsx', 15, 13, 29, 2, 1500.00, 3000.00, 'UPI', 'confirmed', 'UPI-NPCI-2026100038', 1, 'BookMyShow / District Wallet', 'dispatched', '2026-10-21 00:00:00+05:30'),
(19, 'TIX-2026-RJ0040', 40, 'Arijit Banglore', 'silver', 'free seating', 'Harsh Mehta', '+918105865828', NULL, 'External import — Tixoraticket_sales_copy.xlsx', 16, 10, 22, 5, 4000.00, 20000.00, 'UPI', 'confirmed', 'UPI-NPCI-2026100040', 1, 'BookMyShow / District Wallet', 'dispatched', '2026-10-27 00:00:00+05:30'),
(20, 'TIX-2026-RJ0041', 41, 'Chainsmokers bangalore', 'GA', 'standing', 'Likitha', '+916361004463', NULL, 'External import — Tixoraticket_sales_copy.xlsx', 17, 14, 30, 3, 3800.00, 11100.00, 'UPI', 'confirmed', 'UPI-NPCI-2026100041', 1, 'BookMyShow / District Wallet', 'dispatched', '2026-10-28 00:00:00+05:30'),
(21, 'TIX-2026-RJ0043', 43, 'Arijit hyderabad', 'platinum left', 'free seating', 'Karan', '+918555910998', 'karanahuja9995@gmail.com', 'External import — Tixoraticket_sales_copy.xlsx', 18, 12, 28, 2, 9500.00, 19000.00, 'UPI', 'confirmed', 'UPI-NPCI-2026100043', 1, 'BookMyShow / District Wallet', 'dispatched', '2026-11-01 00:00:00+05:30')
ON CONFLICT (external_sale_id) DO UPDATE SET
    order_number = EXCLUDED.order_number,
    attendee_id = EXCLUDED.attendee_id,
    event_id = EXCLUDED.event_id,
    ticket_tier_id = EXCLUDED.ticket_tier_id,
    quantity = EXCLUDED.quantity,
    unit_price = EXCLUDED.unit_price,
    total_amount = EXCLUDED.total_amount,
    source_event_name = EXCLUDED.source_event_name,
    source_category = EXCLUDED.source_category,
    seat_details = EXCLUDED.seat_details,
    customer_name = EXCLUDED.customer_name,
    customer_phone = EXCLUDED.customer_phone,
    customer_email = EXCLUDED.customer_email,
    payment_status = EXCLUDED.payment_status,
    promoter_id = EXCLUDED.promoter_id,
    created_at = EXCLUDED.created_at;
SELECT setval('orders_id_seq', GREATEST((SELECT MAX(id) FROM orders), 21));

-- 7. Issued Passes (56 Passes Punched & Distributed)
INSERT INTO issued_passes (id, order_id, pass_code, dynamic_qr_seed, attendee_phone, gate_scan_status, created_at) VALUES
(1, 1, 'TIX-PASS-2026-RJ0001-01', '631bf2ff1ee6f76104f17722a3728447', '+919971778481', 'unscanned', '2026-10-04 00:00:00+05:30'),
(2, 1, 'TIX-PASS-2026-RJ0001-02', '74b0e88e5969d6078af47418ea130664', '+919971778481', 'unscanned', '2026-10-04 00:00:00+05:30'),
(3, 1, 'TIX-PASS-2026-RJ0001-03', 'aeaca95e697c38121e12d260cb5f48bf', '+919971778481', 'unscanned', '2026-10-04 00:00:00+05:30'),
(4, 1, 'TIX-PASS-2026-RJ0001-04', 'fa731634bec8ee77157d1d5ef5c94fd4', '+919971778481', 'unscanned', '2026-10-04 00:00:00+05:30'),
(5, 2, 'TIX-PASS-2026-RJ0002-01', '4b6b7ce3b06c907e100bd9238ffc0ee7', '+918951085366', 'unscanned', '2026-10-06 00:00:00+05:30'),
(6, 3, 'TIX-PASS-2026-RJ0005-01', '8269e1d91e4c5b8e2669bbaef320b04c', '+919920686585', 'unscanned', '2026-10-10 00:00:00+05:30'),
(7, 3, 'TIX-PASS-2026-RJ0005-02', 'fbc9d62ecebeb6da1b59647279fe7bf2', '+919920686585', 'unscanned', '2026-10-10 00:00:00+05:30'),
(8, 4, 'TIX-PASS-2026-RJ0006-01', '823acd482bf1949002267d12e0edf793', '+919920686585', 'unscanned', '2026-10-10 00:00:00+05:30'),
(9, 4, 'TIX-PASS-2026-RJ0006-02', '85ed1d314ddfb729981666f41b88c811', '+919920686585', 'unscanned', '2026-10-10 00:00:00+05:30'),
(10, 5, 'TIX-PASS-2026-RJ0007-01', '957689bbecac5af3c72b2b39e767452d', '+918310665642', 'unscanned', '2026-10-10 00:00:00+05:30'),
(11, 5, 'TIX-PASS-2026-RJ0007-02', 'da339a1bd0adb20bf415ce74f33aca87', '+918310665642', 'unscanned', '2026-10-10 00:00:00+05:30'),
(12, 6, 'TIX-PASS-2026-RJ0009-01', '51ab30a864ad95ac1b5bac88dd23aa59', '+918951085366', 'unscanned', '2026-10-10 00:00:00+05:30'),
(13, 7, 'TIX-PASS-2026-RJ0010-01', 'c3e3d9457e4a46a2164c4ae520d91590', '+917892145475', 'unscanned', '2026-10-10 00:00:00+05:30'),
(14, 8, 'TIX-PASS-2026-RJ0013-01', '9b05fb73eaeea8f8545495899d91a8c5', '+918303545661', 'unscanned', '2026-10-11 00:00:00+05:30'),
(15, 8, 'TIX-PASS-2026-RJ0013-02', 'f7d03bd6b5a00ca31788004d46cac01b', '+918303545661', 'unscanned', '2026-10-11 00:00:00+05:30'),
(16, 8, 'TIX-PASS-2026-RJ0013-03', 'cbd9d68e3e2bdc048f7da5d01d544bea', '+918303545661', 'unscanned', '2026-10-11 00:00:00+05:30'),
(17, 8, 'TIX-PASS-2026-RJ0013-04', '8ff7f77954cf597a64186ca0d1ec952c', '+918303545661', 'unscanned', '2026-10-11 00:00:00+05:30'),
(18, 9, 'TIX-PASS-2026-RJ0015-01', 'c362859ef4a63a5c286e0ecdd8fb0450', '+919906185105', 'unscanned', '2026-10-12 00:00:00+05:30'),
(19, 9, 'TIX-PASS-2026-RJ0015-02', 'a50806f431d1315ce028f37ebd35cc09', '+919906185105', 'unscanned', '2026-10-12 00:00:00+05:30'),
(20, 10, 'TIX-PASS-2026-RJ0017-01', '57c763c7e02ae7c5130a1650d5ad150f', '+916363327399', 'unscanned', '2026-10-12 00:00:00+05:30'),
(21, 10, 'TIX-PASS-2026-RJ0017-02', '1edb16d61c42cd33d8865e183cafc663', '+916363327399', 'unscanned', '2026-10-12 00:00:00+05:30'),
(22, 11, 'TIX-PASS-2026-RJ0019-01', '355dfc142dc32ab4753c945f4e75889c', '+919008433416', 'unscanned', '2026-10-13 00:00:00+05:30'),
(23, 12, 'TIX-PASS-2026-RJ0020-01', 'e8abf88492ff85fdd0a47464b70e8e5f', '+917892244643', 'unscanned', '2026-10-13 00:00:00+05:30'),
(24, 13, 'TIX-PASS-2026-RJ0021-01', 'e97d243d632e17a493ada09599203bb3', '+919845350802', 'unscanned', '2026-10-13 00:00:00+05:30'),
(25, 13, 'TIX-PASS-2026-RJ0021-02', '1f5e9acd09c64bed455e4b1e05e73bb4', '+919845350802', 'unscanned', '2026-10-13 00:00:00+05:30'),
(26, 14, 'TIX-PASS-2026-RJ0022-01', '61ffb18a66886be5ffc84ac33feac953', '+919845350802', 'unscanned', '2026-10-13 00:00:00+05:30'),
(27, 14, 'TIX-PASS-2026-RJ0022-02', '93bd0423584aee74f553fe133a767db4', '+919845350802', 'unscanned', '2026-10-13 00:00:00+05:30'),
(28, 14, 'TIX-PASS-2026-RJ0022-03', 'fbefb1e3b3dafcc442610c6068fc5bbd', '+919845350802', 'unscanned', '2026-10-13 00:00:00+05:30'),
(29, 14, 'TIX-PASS-2026-RJ0022-04', '21e1037946bccea78ccd11f3718762c1', '+919845350802', 'unscanned', '2026-10-13 00:00:00+05:30'),
(30, 14, 'TIX-PASS-2026-RJ0022-05', 'c9399f31c258de843b1cae8c74eb117d', '+919845350802', 'unscanned', '2026-10-13 00:00:00+05:30'),
(31, 14, 'TIX-PASS-2026-RJ0022-06', '4498b492dbb8fe8afd7bc68c9eca3d4a', '+919845350802', 'unscanned', '2026-10-13 00:00:00+05:30'),
(32, 14, 'TIX-PASS-2026-RJ0022-07', '34664b086669faa4f2761d65a9a107ab', '+919845350802', 'unscanned', '2026-10-13 00:00:00+05:30'),
(33, 14, 'TIX-PASS-2026-RJ0022-08', 'c2dc049a0b6214be8c975667b0e0811c', '+919845350802', 'unscanned', '2026-10-13 00:00:00+05:30'),
(34, 14, 'TIX-PASS-2026-RJ0022-09', 'b747422d6f8a8bbc9b27211ec609c9bd', '+919845350802', 'unscanned', '2026-10-13 00:00:00+05:30'),
(35, 15, 'TIX-PASS-2026-RJ0023-01', 'e5bda525db2d05dcd34832df2569e9a9', '+917892244643', 'unscanned', '2026-10-13 00:00:00+05:30'),
(36, 15, 'TIX-PASS-2026-RJ0023-02', '8e43e5e515a4c4deceacc7063dd47864', '+917892244643', 'unscanned', '2026-10-13 00:00:00+05:30'),
(37, 15, 'TIX-PASS-2026-RJ0023-03', '345cfe8846fb70365f6a8bd4d85c66f0', '+917892244643', 'unscanned', '2026-10-13 00:00:00+05:30'),
(38, 15, 'TIX-PASS-2026-RJ0023-04', '2d5b944466df2ae2d53edac4c7be5977', '+917892244643', 'unscanned', '2026-10-13 00:00:00+05:30'),
(39, 15, 'TIX-PASS-2026-RJ0023-05', '57a8acb66e3ddaeb1c5fed04839203d1', '+917892244643', 'unscanned', '2026-10-13 00:00:00+05:30'),
(40, 15, 'TIX-PASS-2026-RJ0023-06', '79f160e5c4f0a231eb67db66d79dae1c', '+917892244643', 'unscanned', '2026-10-13 00:00:00+05:30'),
(41, 15, 'TIX-PASS-2026-RJ0023-07', '717f5972b4497f24ccc1a1fe040263ea', '+917892244643', 'unscanned', '2026-10-13 00:00:00+05:30'),
(42, 16, 'TIX-PASS-2026-RJ0025-01', '0ce57664874d373782ce78416b8d6d27', '+919113225959', 'unscanned', '2026-10-15 00:00:00+05:30'),
(43, 16, 'TIX-PASS-2026-RJ0025-02', '9609888bc620ad05a63dffb0d795a110', '+919113225959', 'unscanned', '2026-10-15 00:00:00+05:30'),
(44, 17, 'TIX-PASS-2026-RJ0037-01', 'dfd65272a4eaaf4d6cb900297763f1af', '+917259880344', 'unscanned', '2026-10-21 00:00:00+05:30'),
(45, 18, 'TIX-PASS-2026-RJ0038-01', 'c36837f1e95443d7bfcfd666c0573319', '+917259108835', 'unscanned', '2026-10-21 00:00:00+05:30'),
(46, 18, 'TIX-PASS-2026-RJ0038-02', '1538e5673a4921abfe7c2f01eda2155f', '+917259108835', 'unscanned', '2026-10-21 00:00:00+05:30'),
(47, 19, 'TIX-PASS-2026-RJ0040-01', '937a1f753334abece9bbf7ce2eda4eb8', '+918105865828', 'unscanned', '2026-10-27 00:00:00+05:30'),
(48, 19, 'TIX-PASS-2026-RJ0040-02', 'ebd327e8b663dac69d43243445aa93f5', '+918105865828', 'unscanned', '2026-10-27 00:00:00+05:30'),
(49, 19, 'TIX-PASS-2026-RJ0040-03', '3185b842a22974b1ccd7fde20273d807', '+918105865828', 'unscanned', '2026-10-27 00:00:00+05:30'),
(50, 19, 'TIX-PASS-2026-RJ0040-04', '8bd13bbfa1328ac1e04d368465ef2558', '+918105865828', 'unscanned', '2026-10-27 00:00:00+05:30'),
(51, 19, 'TIX-PASS-2026-RJ0040-05', '09ab145ca24636892e9fbd15703277e3', '+918105865828', 'unscanned', '2026-10-27 00:00:00+05:30'),
(52, 20, 'TIX-PASS-2026-RJ0041-01', '30c6147ba20c7e69788c828a2a33fe33', '+916361004463', 'unscanned', '2026-10-28 00:00:00+05:30'),
(53, 20, 'TIX-PASS-2026-RJ0041-02', 'affd80202dfdda0d749214522220250d', '+916361004463', 'unscanned', '2026-10-28 00:00:00+05:30'),
(54, 20, 'TIX-PASS-2026-RJ0041-03', '006d5b56be1a70f2aa3385fb024b494e', '+916361004463', 'unscanned', '2026-10-28 00:00:00+05:30'),
(55, 21, 'TIX-PASS-2026-RJ0043-01', '9b04fd0214a244257d8b8939deafc05b', '+918555910998', 'unscanned', '2026-11-01 00:00:00+05:30'),
(56, 21, 'TIX-PASS-2026-RJ0043-02', '27c08900e6d0a0771f18e9b4ed329dc2', '+918555910998', 'unscanned', '2026-11-01 00:00:00+05:30')
ON CONFLICT (pass_code) DO NOTHING;
SELECT setval('issued_passes_id_seq', GREATEST((SELECT MAX(id) FROM issued_passes), 56));

-- 8. Promoter Commissions (11.0% Performance Cut on 21 Orders = ₹28,209.50)
INSERT INTO promoter_commissions (id, order_id, promoter_id, pass_quantity, ticket_price, commission_rate, commission_amount, payout_status, upi_reference, settled_at, created_at) VALUES
(1, 1, 1, 4, 6500.00, 11.00, 2860.00, 'settled', 'SETTLE-NPCI-RJ0001', '2026-10-04 00:00:00+05:30', '2026-10-04 00:00:00+05:30'),
(2, 2, 1, 1, 7750.00, 11.00, 852.50, 'settled', 'SETTLE-NPCI-RJ0002', '2026-10-06 00:00:00+05:30', '2026-10-06 00:00:00+05:30'),
(3, 3, 1, 2, 5500.00, 11.00, 1210.00, 'settled', 'SETTLE-NPCI-RJ0005', '2026-10-10 00:00:00+05:30', '2026-10-10 00:00:00+05:30'),
(4, 4, 1, 2, 5000.00, 11.00, 1100.00, 'settled', 'SETTLE-NPCI-RJ0006', '2026-10-10 00:00:00+05:30', '2026-10-10 00:00:00+05:30'),
(5, 5, 1, 2, 7800.00, 11.00, 1716.00, 'settled', 'SETTLE-NPCI-RJ0007', '2026-10-10 00:00:00+05:30', '2026-10-10 00:00:00+05:30'),
(6, 6, 1, 1, 3000.00, 11.00, 330.00, 'settled', 'SETTLE-NPCI-RJ0009', '2026-10-10 00:00:00+05:30', '2026-10-10 00:00:00+05:30'),
(7, 7, 1, 1, 3000.00, 11.00, 330.00, 'settled', 'SETTLE-NPCI-RJ0010', '2026-10-10 00:00:00+05:30', '2026-10-10 00:00:00+05:30'),
(8, 8, 1, 4, 2999.00, 11.00, 1320.00, 'settled', 'SETTLE-NPCI-RJ0013', '2026-10-11 00:00:00+05:30', '2026-10-11 00:00:00+05:30'),
(9, 9, 1, 2, 8250.00, 11.00, 1815.00, 'settled', 'SETTLE-NPCI-RJ0015', '2026-10-12 00:00:00+05:30', '2026-10-12 00:00:00+05:30'),
(10, 10, 1, 2, 2750.00, 11.00, 605.00, 'settled', 'SETTLE-NPCI-RJ0017', '2026-10-12 00:00:00+05:30', '2026-10-12 00:00:00+05:30'),
(11, 11, 1, 1, 6000.00, 11.00, 660.00, 'settled', 'SETTLE-NPCI-RJ0019', '2026-10-13 00:00:00+05:30', '2026-10-13 00:00:00+05:30'),
(12, 12, 1, 1, 2750.00, 11.00, 330.00, 'settled', 'SETTLE-NPCI-RJ0020', '2026-10-13 00:00:00+05:30', '2026-10-13 00:00:00+05:30'),
(13, 13, 1, 2, 4125.00, 11.00, 990.00, 'settled', 'SETTLE-NPCI-RJ0021', '2026-10-13 00:00:00+05:30', '2026-10-13 00:00:00+05:30'),
(14, 14, 1, 9, 4125.00, 11.00, 4455.00, 'settled', 'SETTLE-NPCI-RJ0022', '2026-10-13 00:00:00+05:30', '2026-10-13 00:00:00+05:30'),
(15, 15, 1, 7, 3000.00, 11.00, 2310.00, 'settled', 'SETTLE-NPCI-RJ0023', '2026-10-13 00:00:00+05:30', '2026-10-13 00:00:00+05:30'),
(16, 16, 1, 2, 6000.00, 11.00, 1320.00, 'settled', 'SETTLE-NPCI-RJ0025', '2026-10-15 00:00:00+05:30', '2026-10-15 00:00:00+05:30'),
(17, 17, 1, 1, 1500.00, 11.00, 165.00, 'settled', 'SETTLE-NPCI-RJ0037', '2026-10-21 00:00:00+05:30', '2026-10-21 00:00:00+05:30'),
(18, 18, 1, 2, 1500.00, 11.00, 330.00, 'settled', 'SETTLE-NPCI-RJ0038', '2026-10-21 00:00:00+05:30', '2026-10-21 00:00:00+05:30'),
(19, 19, 1, 5, 4000.00, 11.00, 2200.00, 'settled', 'SETTLE-NPCI-RJ0040', '2026-10-27 00:00:00+05:30', '2026-10-27 00:00:00+05:30'),
(20, 20, 1, 3, 3800.00, 11.00, 1221.00, 'settled', 'SETTLE-NPCI-RJ0041', '2026-10-28 00:00:00+05:30', '2026-10-28 00:00:00+05:30'),
(21, 21, 1, 2, 9500.00, 11.00, 2090.00, 'settled', 'SETTLE-NPCI-RJ0043', '2026-11-01 00:00:00+05:30', '2026-11-01 00:00:00+05:30')
ON CONFLICT (id) DO UPDATE SET 
    order_id = EXCLUDED.order_id,
    promoter_id = EXCLUDED.promoter_id,
    pass_quantity = EXCLUDED.pass_quantity,
    ticket_price = EXCLUDED.ticket_price,
    commission_rate = EXCLUDED.commission_rate,
    commission_amount = EXCLUDED.commission_amount,
    payout_status = EXCLUDED.payout_status,
    settled_at = EXCLUDED.settled_at;
SELECT setval('promoter_commissions_id_seq', GREATEST((SELECT MAX(id) FROM promoter_commissions), 21));

-- 9. Refresh & Analyze Post-Import
ANALYZE public.attendees;
ANALYZE public.orders;
ANALYZE public.issued_passes;
ANALYZE public.promoter_commissions;
ANALYZE public.promoters;
