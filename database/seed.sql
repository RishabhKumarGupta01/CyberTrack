-- ============================================================================
-- CryptoTrace Intelligence Platform — Database Seed Data
-- Realistic Law Enforcement & Forensics Dataset
-- ============================================================================

-- 1. USERS
-- (Note: password_hash uses bcrypt-compatible standard mock hashes, never plaintext)
INSERT INTO users (id, name, email, password_hash, badge_number, role, agency, avatar_url) VALUES
('a1000000-0000-0000-0000-000000000001', 'I. Kerman', 'i.kerman@cryptotrace.gov', '$2b$12$e8xL2.yG1Wv8vJqJ0X0PveP64GzC0p3XnJzN4T7P2Q6R5U9Y8A1b2', 'LEA-4892', 'L3 Analyst', 'Financial Crimes Cyber Enforcement (SIH)', 'https://lh3.googleusercontent.com/aida-public/AB6AXuBUEplg9nVh4fxaQNnrgUdLQd9r5Sn_d92v-XZOoqT7kHBIJFJRJgetacqctCMv3xC12A2Nw3QS9v-1XGaCQxq6j0fPx0cd4f1VLpO_McpunBBBejohj48wtwNT9glzDjeHcozpOfsFVM6HyRIlQcI2Rp5kQ1j8SNVYsKHYFWSE2RP3LzC-HiwNHdYDBtAgQCW51sdJfoJZ6YDp2pnlokZKnAhlle7yH5CxdvDtubgLf96yy9i26eOc'),
('a1000000-0000-0000-0000-000000000002', 'S. Connor', 'sarah.connor@fbi.gov', '$2b$12$k9yM3.zH2Xw9wKrK1Y1QwfQ75HaD1q4YoK0O5U8Q3R7S6V0Z9B2c3', 'FBI-CYBER-09', 'Lead Investigator', 'Federal Bureau of Investigation — Cyber Task Force', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'),
('a1000000-0000-0000-0000-000000000003', 'M. Vance', 'm.vance@usss.treas.gov', '$2b$12$m0zN4.aI3Yx0xLsL2Z2RxgR86IbE2r5ZpL1P6V9R4S8T7W1A0C3d4', 'USSS-DATF-77', 'Lead Investigator', 'US Secret Service — Digital Assets Task Force', 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80')
ON CONFLICT (email) DO NOTHING;

-- 2. CASES
INSERT INTO cases (id, case_id, title, description, status, priority, fraud_type, reported_amount_usd, target_address, network, victim_ref, notes, assigned_to, created_by) VALUES
('c2000000-0000-0000-0000-000000000001', 'INV-2023-0842', 'Operation Velvet Vault — Industrial Pig Butchering Syndicate', 'Multi-jurisdictional syndicate laundering stolen retail USDT through decentralized bridges and nested OTC desks in Southeast Asia.', 'active', 'critical', 'pig_butchering', 4250000.00, '0x71C7656EC7ab88b098defB751B7401B5f6d8976F', 'ETH', 'VIC-TX-2023-991', 'Urgent freeze requested via INTERPOL Red Notice protocol.', 'a1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000002'),
('c2000000-0000-0000-0000-000000000002', 'INV-2024-0119', 'Lazarus Heist Split-Hop Exfiltration', 'State-sponsored APT laundering funds originating from decentralized lending pool exploit across mixers.', 'escalated', 'critical', 'hacks', 18900000.00, '0x9c4f196720e17639bb409d57a6279f0411fa12e9', 'ETH', 'DEF-DAO-HACK-01', 'Funds split across 12 hops before Tornado Cash router.', 'a1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000002'),
('c2000000-0000-0000-0000-000000000003', 'INV-2024-0402', 'Dark Basin Ransomware Exfiltration', 'LockBit affiliate ransomware extortion payout traced across Bitcoin peeling chains.', 'in_review', 'high', 'ransomware', 850000.00, 'bc1q9d84z5w2r0k3y6t1u8v7x4e9m2p5q8s1a3c7e9', 'BTC', 'VIC-HOSPITAL-NC', 'Co-spending heuristic matches known affiliate cluster.', 'a1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000003')
ON CONFLICT (case_id) DO NOTHING;

-- 3. ENTITIES
INSERT INTO entities (id, entity_id, name, entity_type, category, jurisdiction, kyc_level, attribution_confidence, behavioral_risk_score, is_sanctioned, probable_vasp, subpoena_contact_email, notes) VALUES
('e3000000-0000-0000-0000-000000000001', 'ENT-BINANCE-GLOBAL', 'Binance Global', 'Centralized Exchange', 'Tier-1 CEX', 'Cayman Islands / Global', 'Full', 98, 35, FALSE, TRUE, 'lawenforcement@binance.com', 'Cooperative with mutual legal assistance requests (MLAT).'),
('e3000000-0000-0000-0000-000000000002', 'ENT-TORNADO-CASH', 'Tornado Cash Mixer', 'Mixer', 'Decentralized Mixer', 'Decentralized / Non-custodial', 'None', 100, 99, TRUE, FALSE, NULL, 'OFAC SDN List designated entity since August 2022.'),
('e3000000-0000-0000-0000-000000000003', 'ENT-KRAKEN-EXCHANGE', 'Kraken Payward Inc.', 'Centralized Exchange', 'US Regulated CEX', 'United States (FinCEN MSB)', 'Full', 99, 15, FALSE, TRUE, 'subpoenas@kraken.com', 'US registered MSB with 24h LEA portal response time.'),
('e3000000-0000-0000-0000-000000000004', 'ENT-UNISWAP-ROUTER', 'Uniswap Protocol V3', 'DEX', 'Decentralized Exchange', 'Decentralized (Ethereum)', 'None', 100, 20, FALSE, FALSE, NULL, 'Public smart contracts; high liquidity automated market maker.')
ON CONFLICT (entity_id) DO NOTHING;

-- 4. WALLET CLUSTERS
INSERT INTO wallet_clusters (id, cluster_id, cluster_name, blockchain, clustering_algorithm, confidence_score, total_addresses, total_volume_usd, risk_score, suspected_entity_id) VALUES
('c4000000-0000-0000-0000-000000000001', 'CLUST-ETH-SYNDICATE-01', 'Southeast Asia Pig Butchering Consolidation', 'Ethereum', 'Deposit Sweep Pattern', 92, 14, 12850000.00, 94, 'e3000000-0000-0000-0000-000000000001'),
('c4000000-0000-0000-0000-000000000002', 'CLUST-BTC-LOCKBIT-44', 'Affiliate Extortion Sweep Pool', 'Bitcoin', 'Multi-Input Common Ownership', 88, 26, 4200000.00, 98, NULL)
ON CONFLICT (cluster_id) DO NOTHING;

-- 5. WALLETS
INSERT INTO wallets (id, address, blockchain, balance, balance_usd, total_txs, unique_peers, risk_score, risk_level, first_active_at, last_active_at, ens_domain, is_monitored, cluster_id, tags) VALUES
('w5000000-0000-0000-0000-000000000001', '0x71C7656EC7ab88b098defB751B7401B5f6d8976F', 'Ethereum', 142.85, 485690.00, 89, 42, 88, 'CRITICAL', '2023-04-12 11:00:00Z', '2026-08-31 14:15:00Z', 'shadowsyndicate.eth', TRUE, 'c4000000-0000-0000-0000-000000000001', '["Suspect", "Pig Butchering", "Layering Hub"]'::jsonb),
('w5000000-0000-0000-0000-000000000002', '0x9c4f196720e17639bb409d57a6279f0411fa12e9', 'Ethereum', 310.50, 1055700.00, 124, 76, 99, 'CRITICAL', '2022-08-10 09:30:00Z', '2026-08-30 22:01:00Z', NULL, TRUE, NULL, '["OFAC Proximity", "Mixer Outlet", "High-Risk"]'::jsonb),
('w5000000-0000-0000-0000-000000000003', 'bc1q9d84z5w2r0k3y6t1u8v7x4e9m2p5q8s1a3c7e9', 'Bitcoin', 18.44, 1161720.00, 312, 119, 95, 'CRITICAL', '2021-11-04 14:22:00Z', '2026-08-31 16:45:00Z', NULL, TRUE, 'c4000000-0000-0000-0000-000000000002', '["Ransomware", "LockBit", "Peeling Chain"]'::jsonb),
('w5000000-0000-0000-0000-000000000004', '0xdf81d11b0e27a925439a897b6a65529f33a01102', 'Ethereum', 18240.10, 62016340.00, 184500, 9400, 12, 'LOW', '2019-03-01 00:00:00Z', '2026-09-04 10:30:00Z', NULL, FALSE, NULL, '["Binance", "Hot Wallet", "VASP"]'::jsonb)
ON CONFLICT (address, blockchain) DO NOTHING;

-- 6. ENTITY ADDRESSES
INSERT INTO entity_addresses (id, entity_id, address, blockchain, tag, is_verified, confidence_score, first_seen_at) VALUES
('a6000000-0000-0000-0000-000000000001', 'e3000000-0000-0000-0000-000000000001', '0xdf81d11b0e27a925439a897b6a65529f33a01102', 'Ethereum', 'Binance Hot Wallet 14', TRUE, 99, '2019-03-01 00:00:00Z'),
('a6000000-0000-0000-0000-000000000002', 'e3000000-0000-0000-0000-000000000002', '0xd90e2f925da726b50c4ed8d0fb90ad053324f31b', 'Ethereum', 'Tornado Cash: 100 ETH Pool', TRUE, 100, '2020-05-18 00:00:00Z'),
('a6000000-0000-0000-0000-000000000003', 'e3000000-0000-0000-0000-000000000003', '0x267be1c1d684f78cb4f6a176c4911b741e4ffdc0', 'Ethereum', 'Kraken Deposit Clearing', TRUE, 99, '2018-09-12 00:00:00Z')
ON CONFLICT (entity_id, address, blockchain) DO NOTHING;

-- 7. WALLET ENTITY LINKS
INSERT INTO wallet_entity_links (id, wallet_id, wallet_address, entity_id, association_type, confidence_score, attribution_source, is_confirmed, notes) VALUES
('l7000000-0000-0000-0000-000000000001', 'w5000000-0000-0000-0000-000000000001', '0x71C7656EC7ab88b098defB751B7401B5f6d8976F', 'e3000000-0000-0000-0000-000000000001', 'DEPOSIT_PROXY', 94, 'VASP Subpoena Response & Deposit Reuse', TRUE, 'Corroborated by sub-account deposit tag match.'),
('l7000000-0000-0000-0000-000000000002', 'w5000000-0000-0000-0000-000000000002', '0x9c4f196720e17639bb409d57a6279f0411fa12e9', 'e3000000-0000-0000-0000-000000000002', 'MIXER_PARTICIPANT', 99, 'Direct Smart Contract Calls to Mixer Pool', TRUE, 'Deposited 400 ETH within 3 blocks of exfiltration.')
ON CONFLICT (wallet_id, entity_id, association_type) DO NOTHING;

-- 8. TRANSACTIONS
INSERT INTO transactions (id, tx_hash, blockchain, block_number, block_timestamp, from_address, to_address, amount, amount_usd, asset_symbol, tx_fee, tx_fee_usd, status, is_suspicious, risk_flag, hop_count, case_id) VALUES
('t8000000-0000-0000-0000-000000000001', '0x8f2d911a7834bcde1902847a9812450147cb9820f789123049182390481239f1', 'Ethereum', 18451290, '2026-08-31 13:45:21Z', '0x71C7656EC7ab88b098defB751B7401B5f6d8976F', '0xdf81d11b0e27a925439a897b6a65529f33a01102', 120.00, 408000.00, 'ETH', 0.0042, 14.28, 'confirmed', TRUE, 'RAPID_FORWARD', 3, 'c2000000-0000-0000-0000-000000000001'),
('t8000000-0000-0000-0000-000000000002', '0x4a1b899c3721098234abcf1902847a9812450147cb9820f78912304918770e', 'Ethereum', 18451100, '2026-08-31 13:10:04Z', '0x9c4f196720e17639bb409d57a6279f0411fa12e9', '0xd90e2f925da726b50c4ed8d0fb90ad053324f31b', 100.00, 340000.00, 'ETH', 0.0120, 40.80, 'confirmed', TRUE, 'MIXER_DEPOSIT', 1, 'c2000000-0000-0000-0000-000000000002'),
('t8000000-0000-0000-0000-000000000003', '7b4e1902847a9812450147cb9820f789123049182390481239f18f2d911a7834', 'Bitcoin', 861420, '2026-08-31 16:30:15Z', 'bc1q9d84z5w2r0k3y6t1u8v7x4e9m2p5q8s1a3c7e9', 'bc1qpeelchain88192039120391203912039120391203', 4.50, 283500.00, 'BTC', 0.00015, 9.45, 'confirmed', TRUE, 'PEELING_CHAIN', 2, 'c2000000-0000-0000-0000-000000000003')
ON CONFLICT (tx_hash, blockchain) DO NOTHING;

-- 9. RISK ASSESSMENTS
INSERT INTO risk_assessments (id, wallet_id, wallet_address, blockchain, case_id, assessed_by, overall_risk_score, risk_level, sanctions_exposure_score, mixer_exposure_score, darknet_exposure_score, counterparty_risk_score, velocity_score, signals, summary_notes) VALUES
('r9000000-0000-0000-0000-000000000001', 'w5000000-0000-0000-0000-000000000001', '0x71C7656EC7ab88b098defB751B7401B5f6d8976F', 'Ethereum', 'c2000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 88, 'CRITICAL', 45, 92, 10, 85, 90, '[{"flag": "MIXER_2_HOPS", "confidence": 98}, {"flag": "RAPID_CONSOLIDATION", "confidence": 85}]'::jsonb, 'Subject wallet exhibited automated structuring and transfer to high-volume offshore exchange within 15 minutes of victim wire conversion.'),
('r9000000-0000-0000-0000-000000000002', 'w5000000-0000-0000-0000-000000000002', '0x9c4f196720e17639bb409d57a6279f0411fa12e9', 'Ethereum', 'c2000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000002', 99, 'CRITICAL', 95, 100, 60, 99, 95, '[{"flag": "OFAC_SANCTIONED_DIRECT", "confidence": 100}]'::jsonb, 'Direct interaction with Tornado Cash smart contract.')
ON CONFLICT (id) DO NOTHING;

-- 10. ALERTS
INSERT INTO alerts (id, alert_type, severity, title, description, wallet_address, blockchain, tx_hash, case_id, entity_id, amount_usd, is_read, is_acknowledged) VALUES
('a1000000-0000-0000-0001-000000000001', 'EXCHANGE_DEPOSIT', 'critical', 'Significant CEX Inflow: $408,000 to Binance', 'Subject 0x71C7...76F dispatched 120 ETH to Binance Hot Wallet 14.', '0x71C7656EC7ab88b098defB751B7401B5f6d8976F', 'Ethereum', '0x8f2d911a7834bcde1902847a9812450147cb9820f789123049182390481239f1', 'c2000000-0000-0000-0000-000000000001', 'e3000000-0000-0000-0000-000000000001', 408000.00, FALSE, FALSE),
('a1000000-0000-0000-0001-000000000002', 'MIXER_EXPOSURE', 'critical', 'OFAC Designated Contract Interaction: Tornado Cash', 'Wallet 0x9c4f...2e9 routed 100 ETH into Tornado Cash 100 ETH mixer pool.', '0x9c4f196720e17639bb409d57a6279f0411fa12e9', 'Ethereum', '0x4a1b899c3721098234abcf1902847a9812450147cb9820f78912304918770e', 'c2000000-0000-0000-0000-000000000002', 'e3000000-0000-0000-0000-000000000002', 340000.00, FALSE, FALSE),
('a1000000-0000-0000-0001-000000000003', 'PEELING_CHAIN_DETECTED', 'high', 'Bitcoin Peeling Chain Activity: LockBit Cluster', 'Suspect UTXO split 4.5 BTC with 0.15 BTC change address peel.', 'bc1q9d84z5w2r0k3y6t1u8v7x4e9m2p5q8s1a3c7e9', 'Bitcoin', '7b4e1902847a9812450147cb9820f789123049182390481239f18f2d911a7834', 'c2000000-0000-0000-0000-000000000003', NULL, 283500.00, TRUE, TRUE)
ON CONFLICT (id) DO NOTHING;

-- 11. WATCHLISTS
INSERT INTO watchlists (id, name, description, wallet_address, blockchain, case_id, entity_id, created_by, target_type, is_active, alert_threshold_usd) VALUES
('w1100000-0000-0000-0000-000000000001', 'Operation Velvet Vault Primary Target', 'Continuous on-chain monitoring of main laundering hub address.', '0x71C7656EC7ab88b098defB751B7401B5f6d8976F', 'Ethereum', 'c2000000-0000-0000-0000-000000000001', 'e3000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'SUSPECT_WALLET', TRUE, 10000.00),
('w1100000-0000-0000-0000-000000000002', 'Lazarus Exfiltration Relay', 'Monitoring known North Korean state-actor intermediary wallet.', '0x9c4f196720e17639bb409d57a6279f0411fa12e9', 'Ethereum', 'c2000000-0000-0000-0000-000000000002', 'e3000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000002', 'MIXER_OUTLET', TRUE, 5000.00)
ON CONFLICT (id) DO NOTHING;

-- 12. EVIDENCE
INSERT INTO evidence (id, evidence_number, case_id, title, description, evidence_type, file_name, file_size_bytes, file_mime_type, storage_path, sha256_hash, chain_of_custody_status, subpoena_hold_active, subpoena_target_entity_id, collected_by, verified_by) VALUES
('e1200000-0000-0000-0000-000000000001', 'EVD-2023-0842-01', 'c2000000-0000-0000-0000-000000000001', 'Forensic On-Chain Graph Extraction', 'Complete 5-hop fund flow visualization and UTXO ledger snapshot.', 'TRANSACTION_TRACE', 'inv_2023_0842_graph_snapshot.json', 4512080, 'application/json', 's3://evidence-vault-secure/INV-2023-0842/EVD-01.json', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', 'SEALED', TRUE, 'e3000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000002'),
('e1200000-0000-0000-0000-000000000002', 'EVD-2023-0842-02', 'c2000000-0000-0000-0000-000000000001', 'Binance 18 U.S.C. § 2703(f) Preservation Response', 'KYC records, IP login logs, and sub-account transaction receipts.', 'VASP_SUBPOENA_PACKET', 'binance_preservation_packet_sealed.pdf', 12409820, 'application/pdf', 's3://evidence-vault-secure/INV-2023-0842/EVD-02.pdf', '8f2d911a7834bcde1902847a9812450147cb9820f789123049182390481239f1', 'COURT_SUBMITTED', TRUE, 'e3000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000002')
ON CONFLICT (evidence_number) DO NOTHING;

-- 13. INVESTIGATION REPORTS
INSERT INTO investigation_reports (id, report_number, case_id, title, author_id, classification, status, summary, methodology, findings, attributed_entity_id, seizure_warrant_requested, export_pdf_hash, digital_signature) VALUES
('r1300000-0000-0000-0000-000000000001', 'REP-INV-2023-0842-FINAL', 'c2000000-0000-0000-0000-000000000001', 'Comprehensive Cryptocurrency Fund-Flow Forensic Assessment', 'a1000000-0000-0000-0000-000000000001', 'LAW ENFORCEMENT SENSITIVE // REL TO LEA ONLY', 'APPROVED', 'Forensic examination confirms $4.25M in fraudulent proceeds were laundered through address 0x71C7...76F, with $408,000 successfully frozen at Binance under emergency seizure warrant.', 'Deterministic transaction graph reconstruction and VASP deposit clustering heuristics.', '[{"finding": "Direct fund flow to Binance Deposit Pool", "amount_usd": 408000, "confidence": "98%"}, {"finding": "Layering through decentralized bridges", "amount_usd": 1250000, "confidence": "91%"}]'::jsonb, 'e3000000-0000-0000-0000-000000000001', TRUE, 'a4f912c40182bbac192837490182384759102834719283471928347192834710', 'SIGNATURE_ECDSA_SHA256:0x718a2910ba2819cd...')
ON CONFLICT (report_number) DO NOTHING;

-- 14. AUDIT LOGS
INSERT INTO audit_logs (id, action, user_id, user_badge_number, user_ip_address, case_id, case_reference, entity_id, wallet_address, tx_hash, details, artifact_hash, prev_log_hash, tamper_status) VALUES
('l1400000-0000-0000-0000-000000000001', 'CASE_INITIALIZATION', 'a1000000-0000-0000-0000-000000000001', 'LEA-4892', '10.240.12.18', 'c2000000-0000-0000-0000-000000000001', 'INV-2023-0842', NULL, '0x71C7656EC7ab88b098defB751B7401B5f6d8976F', NULL, '{"source": "IC3 Referral", "initial_loss": 4250000}'::jsonb, '19c8f2207b4e1902847a9812450147cb9820f789123049182390481239882a01', '0000000000000000000000000000000000000000000000000000000000000000', 'VERIFIED'),
('l1400000-0000-0000-0000-000000000002', 'GRAPH_NODE_EXPAND_HOPS', 'a1000000-0000-0000-0000-000000000002', 'FBI-CYBER-09', '10.240.12.99', 'c2000000-0000-0000-0000-000000000002', 'INV-2024-0119', 'e3000000-0000-0000-0000-000000000002', '0x9c4f196720e17639bb409d57a6279f0411fa12e9', '0x4a1b899c3721098234abcf1902847a9812450147cb9820f78912304918770e', '{"hops": 4, "clusters_discovered": 3}'::jsonb, '4a1b899c3721098234abcf1902847a9812450147cb9820f78912304918770e12', '19c8f2207b4e1902847a9812450147cb9820f789123049182390481239882a01', 'VERIFIED'),
('l1400000-0000-0000-0000-000000000003', 'VASP_SUBPOENA_PACKET_GEN', 'a1000000-0000-0000-0000-000000000001', 'LEA-4892', '10.240.12.18', 'c2000000-0000-0000-0000-000000000001', 'INV-2023-0842', 'e3000000-0000-0000-0000-000000000001', '0x71C7656EC7ab88b098defB751B7401B5f6d8976F', '0x8f2d911a7834bcde1902847a9812450147cb9820f789123049182390481239f1', '{"target_vasp": "Binance", "statutory_authority": "18 USC 2703(d)"}'::jsonb, '8f2d911a7834bcde1902847a9812450147cb9820f789123049182390481239f10', '4a1b899c3721098234abcf1902847a9812450147cb9820f78912304918770e12', 'VERIFIED'),
('l1400000-0000-0000-0000-000000000004', 'REPORT_EXPORT_PDF', 'a1000000-0000-0000-0000-000000000001', 'LEA-4892', '10.240.12.18', 'c2000000-0000-0000-0000-000000000001', 'INV-2023-0842', NULL, NULL, NULL, '{"format": "PDF/A-1b", "classified": true}'::jsonb, 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b8550', '8f2d911a7834bcde1902847a9812450147cb9820f789123049182390481239f10', 'VERIFIED')
ON CONFLICT (id) DO NOTHING;
