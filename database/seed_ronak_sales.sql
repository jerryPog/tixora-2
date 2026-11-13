-- ============================================================================
-- TIXORA SALES & PROMOTER SEED: RONAK JAIN
-- 21 Verified Ticket Sales, 56 Passes, Rs. 2,56,450.00 Gross Sales Volume
-- ============================================================================

-- 1. Artists (Arijit Singh & Darshan Raval)
INSERT INTO artists (id, name, genre, image_url, bio) VALUES
(9, 'Arijit Singh', 'Bollywood / Acoustic & Orchestra Live', 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80', 'India’s preeminent playback artist performing his multi-city stadium live tour.'),
(10, 'Darshan Raval', 'Indie Pop / Romantic Arena Anthems', 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&auto=format&fit=crop&q=80', 'The chart-topping romantic pop sensation headlining youth arena dates across India.')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, genre = EXCLUDED.genre;
SELECT setval('artists_id_seq', GREATEST((SELECT MAX(id) FROM artists), 10));

-- 2. Events (Diljit Bengaluru, Arijit Tours, Darshan Raval, Chainsmokers Bengaluru)
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

-- 4. Promoter: Ronak Jain (56 Passes Sold -> Tier 2 Capo / Silver)
INSERT INTO promoters (id, full_name, whatsapp_number, email, city, organization, upi_id, tier_id, referral_code, kyc_status, total_passes_sold, total_earnings) VALUES
(1, 'Ronak Jain', '+917892145475', 'ronakj303@gmail.com', 'Bengaluru', 'Tixora Operations & South India Tour Desk', '7892145475@upi', 2, 'TIX-RONAK-BLR', 'verified', 56, 28209.50)
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, email = EXCLUDED.email, whatsapp_number = EXCLUDED.whatsapp_number, total_passes_sold = EXCLUDED.total_passes_sold, total_earnings = EXCLUDED.total_earnings, tier_id = EXCLUDED.tier_id;
SELECT setval('promoters_id_seq', GREATEST((SELECT MAX(id) FROM promoters), 1));

-- 5. Attendees (18 Ticket Buyers from Register)
INSERT INTO attendees (id, full_name, mobile_number, email, bms_account_id, digilocker_verified) VALUES
(1, 'Abeer', '+919971778481', 'jncy121@gmail.com', 'BMS-778481', TRUE),
(2, 'aarav', '+918951085366', 'aarav.5366@passes.tixora.live', 'BMS-085366', TRUE),
(3, 'Devansh', '+919920686585', 'devanshbangad128@gmail.com', 'BMS-686585', TRUE),
(4, 'daksh', '+918310665642', 'daksh.5642@passes.tixora.live', 'BMS-665642', TRUE),
(5, 'ronak', '+917892145475', 'ronakj303@gmail.com', 'BMS-145475', TRUE),
(6, 'Akash Tewari', '+918303545661', 'akasht9952@gmail.com', 'BMS-545661', TRUE),
(7, 'Prajin Chopra', '+919906185105', 'prajinchopra.5105@passes.tixora.live', 'BMS-185105', TRUE),
(8, 'Dimple Chopra', '+916363327399', 'dimple.pc141203@gmail.com', 'BMS-327399', TRUE),
(9, 'Tisha Saklecha', '+919008433416', 'tishasaklecha512@gmail.com', 'BMS-433416', TRUE),
(10, 'Rachana', '+917892244643', 'rachana.j00@gmail.com', 'BMS-244643', TRUE),
(11, 'Vishal', '+919845350802', 'vishal.mamtha@gmail.com', 'BMS-350802', TRUE),
(12, 'Rishab Gadiya', '+917892244644', 'rachana.j00@gmail.com', 'BMS-244644', TRUE),
(13, 'sahil', '+919113225959', 'sahiljain2017@gmail.com', 'BMS-225959', TRUE),
(14, 'Poorvi Khatri', '+917259880344', 'poorvikhatri27@gmail.com', 'BMS-880344', TRUE),
(15, 'Arnaz Taj', '+917259108835', 'arnaztaj301@gmail.com', 'BMS-108835', TRUE),
(16, 'Harsh Mehta', '+918105865828', 'harshmehta.5828@passes.tixora.live', 'BMS-865828', TRUE),
(17, 'Likitha', '+916361004463', 'likitha.4463@passes.tixora.live', 'BMS-004463', TRUE),
(18, 'Karan', '+918555910998', 'karanahuja9995@gmail.com', 'BMS-910998', TRUE)
ON CONFLICT (mobile_number) DO UPDATE SET full_name = EXCLUDED.full_name, email = EXCLUDED.email;
SELECT setval('attendees_id_seq', GREATEST((SELECT MAX(id) FROM attendees), 18));

-- 6. Orders (21 Confirmed Bookings Attributed to Ronak Jain)
INSERT INTO orders (id, order_number, attendee_id, event_id, ticket_tier_id, quantity, unit_price, total_amount, payment_method, payment_status, payment_gateway_ref, promoter_id, delivery_channel, delivery_status, created_at) VALUES
(1, 'TIX-2026-RJ0001', 1, 7, 19, 4, 6500.00, 26000.00, 'UPI', 'successful', 'UPI-NPCI-2026100001', 1, 'BookMyShow / District Wallet', 'delivered', '2026-10-04 00:00:00+05:30'),
(2, 'TIX-2026-RJ0002', 2, 9, 20, 1, 7750.00, 7750.00, 'UPI', 'successful', 'UPI-NPCI-2026100002', 1, 'BookMyShow / District Wallet', 'delivered', '2026-10-06 00:00:00+05:30'),
(3, 'TIX-2026-RJ0005', 3, 10, 24, 2, 5500.00, 11000.00, 'UPI', 'successful', 'UPI-NPCI-2026100005', 1, 'BookMyShow / District Wallet', 'delivered', '2026-10-10 00:00:00+05:30'),
(4, 'TIX-2026-RJ0006', 3, 11, 27, 2, 5000.00, 10000.00, 'UPI', 'successful', 'UPI-NPCI-2026100006', 1, 'BookMyShow / District Wallet', 'delivered', '2026-10-10 00:00:00+05:30'),
(5, 'TIX-2026-RJ0007', 4, 10, 25, 2, 7800.00, 15600.00, 'UPI', 'successful', 'UPI-NPCI-2026100007', 1, 'BookMyShow / District Wallet', 'delivered', '2026-10-10 00:00:00+05:30'),
(6, 'TIX-2026-RJ0009', 2, 10, 23, 1, 3000.00, 3000.00, 'UPI', 'successful', 'UPI-NPCI-2026100009', 1, 'BookMyShow / District Wallet', 'delivered', '2026-10-10 00:00:00+05:30'),
(7, 'TIX-2026-RJ0010', 5, 10, 23, 1, 3000.00, 3000.00, 'UPI', 'successful', 'UPI-NPCI-2026100010', 1, 'BookMyShow / District Wallet', 'delivered', '2026-10-10 00:00:00+05:30'),
(8, 'TIX-2026-RJ0013', 6, 11, 26, 4, 2999.00, 12000.00, 'UPI', 'successful', 'UPI-NPCI-2026100013', 1, 'BookMyShow / District Wallet', 'delivered', '2026-10-11 00:00:00+05:30'),
(9, 'TIX-2026-RJ0015', 7, 9, 21, 2, 8250.00, 16500.00, 'UPI', 'successful', 'UPI-NPCI-2026100015', 1, 'BookMyShow / District Wallet', 'delivered', '2026-10-12 00:00:00+05:30'),
(10, 'TIX-2026-RJ0017', 8, 10, 22, 2, 2750.00, 5500.00, 'UPI', 'successful', 'UPI-NPCI-2026100017', 1, 'BookMyShow / District Wallet', 'delivered', '2026-10-12 00:00:00+05:30'),
(11, 'TIX-2026-RJ0019', 9, 10, 24, 1, 6000.00, 6000.00, 'UPI', 'successful', 'UPI-NPCI-2026100019', 1, 'BookMyShow / District Wallet', 'delivered', '2026-10-13 00:00:00+05:30'),
(12, 'TIX-2026-RJ0020', 10, 10, 22, 1, 2750.00, 3000.00, 'UPI', 'successful', 'UPI-NPCI-2026100020', 1, 'BookMyShow / District Wallet', 'delivered', '2026-10-13 00:00:00+05:30'),
(13, 'TIX-2026-RJ0021', 11, 10, 23, 2, 4125.00, 9000.00, 'UPI', 'successful', 'UPI-NPCI-2026100021', 1, 'BookMyShow / District Wallet', 'delivered', '2026-10-13 00:00:00+05:30'),
(14, 'TIX-2026-RJ0022', 11, 10, 23, 9, 4125.00, 40500.00, 'UPI', 'successful', 'UPI-NPCI-2026100022', 1, 'BookMyShow / District Wallet', 'delivered', '2026-10-13 00:00:00+05:30'),
(15, 'TIX-2026-RJ0023', 12, 10, 22, 7, 3000.00, 21000.00, 'UPI', 'successful', 'UPI-NPCI-2026100023', 1, 'BookMyShow / District Wallet', 'delivered', '2026-10-13 00:00:00+05:30'),
(16, 'TIX-2026-RJ0025', 13, 10, 24, 2, 6000.00, 12000.00, 'UPI', 'successful', 'UPI-NPCI-2026100025', 1, 'BookMyShow / District Wallet', 'delivered', '2026-10-15 00:00:00+05:30'),
(17, 'TIX-2026-RJ0037', 14, 13, 29, 1, 1500.00, 1500.00, 'UPI', 'successful', 'UPI-NPCI-2026100037', 1, 'BookMyShow / District Wallet', 'delivered', '2026-10-21 00:00:00+05:30'),
(18, 'TIX-2026-RJ0038', 15, 13, 29, 2, 1500.00, 3000.00, 'UPI', 'successful', 'UPI-NPCI-2026100038', 1, 'BookMyShow / District Wallet', 'delivered', '2026-10-21 00:00:00+05:30'),
(19, 'TIX-2026-RJ0040', 16, 10, 22, 5, 4000.00, 20000.00, 'UPI', 'successful', 'UPI-NPCI-2026100040', 1, 'BookMyShow / District Wallet', 'delivered', '2026-10-27 00:00:00+05:30'),
(20, 'TIX-2026-RJ0041', 17, 14, 30, 3, 3800.00, 11100.00, 'UPI', 'successful', 'UPI-NPCI-2026100041', 1, 'BookMyShow / District Wallet', 'delivered', '2026-10-28 00:00:00+05:30'),
(21, 'TIX-2026-RJ0043', 18, 12, 28, 2, 9500.00, 19000.00, 'UPI', 'successful', 'UPI-NPCI-2026100043', 1, 'BookMyShow / District Wallet', 'delivered', '2026-11-01 00:00:00+05:30')
ON CONFLICT (order_number) DO UPDATE SET total_amount = EXCLUDED.total_amount, promoter_id = EXCLUDED.promoter_id;
SELECT setval('orders_id_seq', GREATEST((SELECT MAX(id) FROM orders), 21));

-- 7. Issued Passes (56 Passes Punched & Distributed)
INSERT INTO issued_passes (id, order_id, pass_code, dynamic_qr_seed, attendee_phone, gate_scan_status, created_at) VALUES
(1, 1, 'TIX-PASS-2026-RJ0001-01', 'd7bcaa3dbe0d9cda1b93ba3cfcbdd4b2', '+919971778481', 'unscanned', '2026-10-04 00:00:00+05:30'),
(2, 1, 'TIX-PASS-2026-RJ0001-02', 'e0467924e47fe5e6e5c179dc8d83a497', '+919971778481', 'unscanned', '2026-10-04 00:00:00+05:30'),
(3, 1, 'TIX-PASS-2026-RJ0001-03', 'da1376181a2f3b006cd662ac89683535', '+919971778481', 'unscanned', '2026-10-04 00:00:00+05:30'),
(4, 1, 'TIX-PASS-2026-RJ0001-04', '91c3e904acb0ce1aba88380cc6076ed8', '+919971778481', 'unscanned', '2026-10-04 00:00:00+05:30'),
(5, 2, 'TIX-PASS-2026-RJ0002-01', 'ca05ab72491c40d964ef6256c050a913', '+918951085366', 'unscanned', '2026-10-06 00:00:00+05:30'),
(6, 3, 'TIX-PASS-2026-RJ0005-01', 'c8b9ffcfbbefa87bb0e9feab220fc509', '+919920686585', 'unscanned', '2026-10-10 00:00:00+05:30'),
(7, 3, 'TIX-PASS-2026-RJ0005-02', '8eb1656e67c877c0215714cae2c6a0c9', '+919920686585', 'unscanned', '2026-10-10 00:00:00+05:30'),
(8, 4, 'TIX-PASS-2026-RJ0006-01', '4e949d006d50baa9b865023b976df091', '+919920686585', 'unscanned', '2026-10-10 00:00:00+05:30'),
(9, 4, 'TIX-PASS-2026-RJ0006-02', '537945182a9e69563860a151bd9b8454', '+919920686585', 'unscanned', '2026-10-10 00:00:00+05:30'),
(10, 5, 'TIX-PASS-2026-RJ0007-01', 'd64aa4ea98621af6b8fa834599f82dd9', '+918310665642', 'unscanned', '2026-10-10 00:00:00+05:30'),
(11, 5, 'TIX-PASS-2026-RJ0007-02', '3e307b6c99fe41974bc3824e494a038b', '+918310665642', 'unscanned', '2026-10-10 00:00:00+05:30'),
(12, 6, 'TIX-PASS-2026-RJ0009-01', '39ecddbf2fdc841c87d363d3d0199d2e', '+918951085366', 'unscanned', '2026-10-10 00:00:00+05:30'),
(13, 7, 'TIX-PASS-2026-RJ0010-01', '7508f69cf349ef7f2b1ca6ab117db049', '+917892145475', 'unscanned', '2026-10-10 00:00:00+05:30'),
(14, 8, 'TIX-PASS-2026-RJ0013-01', 'cc9b132d55ef9a0750358a35e79800a9', '+918303545661', 'unscanned', '2026-10-11 00:00:00+05:30'),
(15, 8, 'TIX-PASS-2026-RJ0013-02', 'fefa0cc0ebbc8f7dce119607fc9d5d7d', '+918303545661', 'unscanned', '2026-10-11 00:00:00+05:30'),
(16, 8, 'TIX-PASS-2026-RJ0013-03', 'fc7153784230fba740d8d06b35f4e4fb', '+918303545661', 'unscanned', '2026-10-11 00:00:00+05:30'),
(17, 8, 'TIX-PASS-2026-RJ0013-04', '62e7998e26700d042fcbcf38ace30627', '+918303545661', 'unscanned', '2026-10-11 00:00:00+05:30'),
(18, 9, 'TIX-PASS-2026-RJ0015-01', '3ad8ce5050b991a89971417180dd452e', '+919906185105', 'unscanned', '2026-10-12 00:00:00+05:30'),
(19, 9, 'TIX-PASS-2026-RJ0015-02', '1087a3aa37c687aea882735dd0a4cc76', '+919906185105', 'unscanned', '2026-10-12 00:00:00+05:30'),
(20, 10, 'TIX-PASS-2026-RJ0017-01', 'ab40cde32a8b4eac8eae55a02301d2f2', '+916363327399', 'unscanned', '2026-10-12 00:00:00+05:30'),
(21, 10, 'TIX-PASS-2026-RJ0017-02', '4c400061a8ad52c04f7e2e337fa8f55d', '+916363327399', 'unscanned', '2026-10-12 00:00:00+05:30'),
(22, 11, 'TIX-PASS-2026-RJ0019-01', '93940021204f9ed28ae87367137a17ff', '+919008433416', 'unscanned', '2026-10-13 00:00:00+05:30'),
(23, 12, 'TIX-PASS-2026-RJ0020-01', '29b0d1fa5b329950caf10454f33baadc', '+917892244643', 'unscanned', '2026-10-13 00:00:00+05:30'),
(24, 13, 'TIX-PASS-2026-RJ0021-01', '24c03a43bece9b6becebc3fd98abd65d', '+919845350802', 'unscanned', '2026-10-13 00:00:00+05:30'),
(25, 13, 'TIX-PASS-2026-RJ0021-02', '439ac7cd1785f3b00c81ddf1dae46e0e', '+919845350802', 'unscanned', '2026-10-13 00:00:00+05:30'),
(26, 14, 'TIX-PASS-2026-RJ0022-01', 'ebe36ad0f5629b2adda8e4f857999b21', '+919845350802', 'unscanned', '2026-10-13 00:00:00+05:30'),
(27, 14, 'TIX-PASS-2026-RJ0022-02', 'e0fbcae185d193e0c875f9a2b6611760', '+919845350802', 'unscanned', '2026-10-13 00:00:00+05:30'),
(28, 14, 'TIX-PASS-2026-RJ0022-03', '301db579238ef6598ea52bd3391e5efb', '+919845350802', 'unscanned', '2026-10-13 00:00:00+05:30'),
(29, 14, 'TIX-PASS-2026-RJ0022-04', '41b9da4a28263031794e298faf497451', '+919845350802', 'unscanned', '2026-10-13 00:00:00+05:30'),
(30, 14, 'TIX-PASS-2026-RJ0022-05', '570622fd8c9824050048c3bb212837f5', '+919845350802', 'unscanned', '2026-10-13 00:00:00+05:30'),
(31, 14, 'TIX-PASS-2026-RJ0022-06', 'cd7303cedb550c038f56d79299e43ce5', '+919845350802', 'unscanned', '2026-10-13 00:00:00+05:30'),
(32, 14, 'TIX-PASS-2026-RJ0022-07', 'aea71fff3847cd1d700370e3752e0eb4', '+919845350802', 'unscanned', '2026-10-13 00:00:00+05:30'),
(33, 14, 'TIX-PASS-2026-RJ0022-08', '33f64ed0c91feb41f10f7fb1e963aa24', '+919845350802', 'unscanned', '2026-10-13 00:00:00+05:30'),
(34, 14, 'TIX-PASS-2026-RJ0022-09', 'd2401e81c344ab4d2f1a86eddcbfa1fb', '+919845350802', 'unscanned', '2026-10-13 00:00:00+05:30'),
(35, 15, 'TIX-PASS-2026-RJ0023-01', '37317d93681a9bb1b99193aee863e3a9', '+917892244644', 'unscanned', '2026-10-13 00:00:00+05:30'),
(36, 15, 'TIX-PASS-2026-RJ0023-02', 'b221eee920a7ef4911ad0d44304e92fc', '+917892244644', 'unscanned', '2026-10-13 00:00:00+05:30'),
(37, 15, 'TIX-PASS-2026-RJ0023-03', '5f3186ddc54821a3a7c7d6c40d8479fe', '+917892244644', 'unscanned', '2026-10-13 00:00:00+05:30'),
(38, 15, 'TIX-PASS-2026-RJ0023-04', '5b5490d8fbc2777e7c563f63cc8014b2', '+917892244644', 'unscanned', '2026-10-13 00:00:00+05:30'),
(39, 15, 'TIX-PASS-2026-RJ0023-05', '82f785a6f11753f7d34679e1390c9bba', '+917892244644', 'unscanned', '2026-10-13 00:00:00+05:30'),
(40, 15, 'TIX-PASS-2026-RJ0023-06', 'c98404d586d6d8f515a65041d3526664', '+917892244644', 'unscanned', '2026-10-13 00:00:00+05:30'),
(41, 15, 'TIX-PASS-2026-RJ0023-07', 'e7d0da16033f00071fd28684d56f8bae', '+917892244644', 'unscanned', '2026-10-13 00:00:00+05:30'),
(42, 16, 'TIX-PASS-2026-RJ0025-01', '9eb04026143e4e6f04b41ca98e9e5573', '+919113225959', 'unscanned', '2026-10-15 00:00:00+05:30'),
(43, 16, 'TIX-PASS-2026-RJ0025-02', 'bd6c82476b68d59774f4806b32cda202', '+919113225959', 'unscanned', '2026-10-15 00:00:00+05:30'),
(44, 17, 'TIX-PASS-2026-RJ0037-01', 'c7b817ab374f42202b21e3bb931057f4', '+917259880344', 'unscanned', '2026-10-21 00:00:00+05:30'),
(45, 18, 'TIX-PASS-2026-RJ0038-01', '344ef0446de76dfc28afaa05bcc4de0e', '+917259108835', 'unscanned', '2026-10-21 00:00:00+05:30'),
(46, 18, 'TIX-PASS-2026-RJ0038-02', '1dc80e216e276150468c15f235db8329', '+917259108835', 'unscanned', '2026-10-21 00:00:00+05:30'),
(47, 19, 'TIX-PASS-2026-RJ0040-01', '5b7a6eaf6f04b96a1676cce86fa0e4a2', '+918105865828', 'unscanned', '2026-10-27 00:00:00+05:30'),
(48, 19, 'TIX-PASS-2026-RJ0040-02', 'ef118df1443c113bf2e72222193e7ab8', '+918105865828', 'unscanned', '2026-10-27 00:00:00+05:30'),
(49, 19, 'TIX-PASS-2026-RJ0040-03', 'f6678d882d813653a16eb420d56ebb65', '+918105865828', 'unscanned', '2026-10-27 00:00:00+05:30'),
(50, 19, 'TIX-PASS-2026-RJ0040-04', '96cdfcdad92eedd68854228bf29330b2', '+918105865828', 'unscanned', '2026-10-27 00:00:00+05:30'),
(51, 19, 'TIX-PASS-2026-RJ0040-05', '134de318ed115e2730a0a7644666b044', '+918105865828', 'unscanned', '2026-10-27 00:00:00+05:30'),
(52, 20, 'TIX-PASS-2026-RJ0041-01', '37880ba2077af318b8e7eb83e654585a', '+916361004463', 'unscanned', '2026-10-28 00:00:00+05:30'),
(53, 20, 'TIX-PASS-2026-RJ0041-02', '23bbe8bccf6d0354b4895734b71952d6', '+916361004463', 'unscanned', '2026-10-28 00:00:00+05:30'),
(54, 20, 'TIX-PASS-2026-RJ0041-03', 'bd6f924663007bed09ae70311e053936', '+916361004463', 'unscanned', '2026-10-28 00:00:00+05:30'),
(55, 21, 'TIX-PASS-2026-RJ0043-01', '9c616e1a8eefbdfdc115df3725a5034b', '+918555910998', 'unscanned', '2026-11-01 00:00:00+05:30'),
(56, 21, 'TIX-PASS-2026-RJ0043-02', '36bba693404984a96276ed98d7223322', '+918555910998', 'unscanned', '2026-11-01 00:00:00+05:30')
ON CONFLICT (pass_code) DO NOTHING;
SELECT setval('issued_passes_id_seq', GREATEST((SELECT MAX(id) FROM issued_passes), 56));

-- 8. Promoter Commissions (11.0% Performance Cut on 21 Orders)
INSERT INTO promoter_commissions (id, order_id, promoter_id, pass_quantity, ticket_price, commission_rate, commission_amount, payout_status, upi_reference, settled_at) VALUES
(1, 1, 1, 4, 6500.00, 11.00, 2860.00, 'settled', 'SETTLE-NPCI-RJ0001', '2026-10-04 00:00:00+05:30'),
(2, 2, 1, 1, 7750.00, 11.00, 852.50, 'settled', 'SETTLE-NPCI-RJ0002', '2026-10-06 00:00:00+05:30'),
(3, 3, 1, 2, 5500.00, 11.00, 1210.00, 'settled', 'SETTLE-NPCI-RJ0005', '2026-10-10 00:00:00+05:30'),
(4, 4, 1, 2, 5000.00, 11.00, 1100.00, 'settled', 'SETTLE-NPCI-RJ0006', '2026-10-10 00:00:00+05:30'),
(5, 5, 1, 2, 7800.00, 11.00, 1716.00, 'settled', 'SETTLE-NPCI-RJ0007', '2026-10-10 00:00:00+05:30'),
(6, 6, 1, 1, 3000.00, 11.00, 330.00, 'settled', 'SETTLE-NPCI-RJ0009', '2026-10-10 00:00:00+05:30'),
(7, 7, 1, 1, 3000.00, 11.00, 330.00, 'settled', 'SETTLE-NPCI-RJ0010', '2026-10-10 00:00:00+05:30'),
(8, 8, 1, 4, 2999.00, 11.00, 1320.00, 'settled', 'SETTLE-NPCI-RJ0013', '2026-10-11 00:00:00+05:30'),
(9, 9, 1, 2, 8250.00, 11.00, 1815.00, 'settled', 'SETTLE-NPCI-RJ0015', '2026-10-12 00:00:00+05:30'),
(10, 10, 1, 2, 2750.00, 11.00, 605.00, 'settled', 'SETTLE-NPCI-RJ0017', '2026-10-12 00:00:00+05:30'),
(11, 11, 1, 1, 6000.00, 11.00, 660.00, 'settled', 'SETTLE-NPCI-RJ0019', '2026-10-13 00:00:00+05:30'),
(12, 12, 1, 1, 2750.00, 11.00, 330.00, 'settled', 'SETTLE-NPCI-RJ0020', '2026-10-13 00:00:00+05:30'),
(13, 13, 1, 2, 4125.00, 11.00, 990.00, 'settled', 'SETTLE-NPCI-RJ0021', '2026-10-13 00:00:00+05:30'),
(14, 14, 1, 9, 4125.00, 11.00, 4455.00, 'settled', 'SETTLE-NPCI-RJ0022', '2026-10-13 00:00:00+05:30'),
(15, 15, 1, 7, 3000.00, 11.00, 2310.00, 'settled', 'SETTLE-NPCI-RJ0023', '2026-10-13 00:00:00+05:30'),
(16, 16, 1, 2, 6000.00, 11.00, 1320.00, 'settled', 'SETTLE-NPCI-RJ0025', '2026-10-15 00:00:00+05:30'),
(17, 17, 1, 1, 1500.00, 11.00, 165.00, 'settled', 'SETTLE-NPCI-RJ0037', '2026-10-21 00:00:00+05:30'),
(18, 18, 1, 2, 1500.00, 11.00, 330.00, 'settled', 'SETTLE-NPCI-RJ0038', '2026-10-21 00:00:00+05:30'),
(19, 19, 1, 5, 4000.00, 11.00, 2200.00, 'settled', 'SETTLE-NPCI-RJ0040', '2026-10-27 00:00:00+05:30'),
(20, 20, 1, 3, 3800.00, 11.00, 1221.00, 'settled', 'SETTLE-NPCI-RJ0041', '2026-10-28 00:00:00+05:30'),
(21, 21, 1, 2, 9500.00, 11.00, 2090.00, 'settled', 'SETTLE-NPCI-RJ0043', '2026-11-01 00:00:00+05:30')
ON CONFLICT (id) DO UPDATE SET commission_amount = EXCLUDED.commission_amount, payout_status = EXCLUDED.payout_status;
SELECT setval('promoter_commissions_id_seq', GREATEST((SELECT MAX(id) FROM promoter_commissions), 21));
