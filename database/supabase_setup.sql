-- ============================================================================
-- CryptoTrace Intelligence Platform — Supabase Production Setup Script
-- CLASSIFICATION: LAW ENFORCEMENT SENSITIVE // OFFICIAL USE ONLY
-- INSTRUCTIONS: Run this complete script in your Supabase SQL Editor.
-- ============================================================================

-- 1. Enable Required Cryptographic Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 2. CORE SCHEMAS & TABLES
-- ============================================================================

-- A. USERS TABLE
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL DEFAULT 'SUPABASE_MANAGED_AUTH',
    badge_number VARCHAR(64) NOT NULL UNIQUE,
    role VARCHAR(32) NOT NULL CHECK (role IN ('L1 Analyst', 'L2 Analyst', 'L3 Analyst', 'Lead Investigator', 'Admin')) DEFAULT 'L3 Analyst',
    agency VARCHAR(255) NOT NULL DEFAULT 'Financial Crimes Cyber Enforcement (SIH)',
    avatar_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- B. CASES TABLE
CREATE TABLE IF NOT EXISTS public.cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id VARCHAR(64) NOT NULL UNIQUE, -- e.g. "INV-2023-0842"
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(32) NOT NULL CHECK (status IN ('active', 'in_review', 'escalated', 'closed')) DEFAULT 'active',
    priority VARCHAR(32) NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')) DEFAULT 'high',
    fraud_type VARCHAR(64) NOT NULL DEFAULT 'pig_butchering',
    reported_amount_usd NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    target_address VARCHAR(255),
    network VARCHAR(32) NOT NULL CHECK (network IN ('ETH', 'BTC', 'SOL', 'BSC', 'POLYGON', 'TRON', 'AVAX')) DEFAULT 'ETH',
    victim_ref VARCHAR(255),
    notes TEXT,
    assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- C. EVIDENCE TABLE
CREATE TABLE IF NOT EXISTS public.evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evidence_number VARCHAR(64) NOT NULL UNIQUE,
    case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    evidence_type VARCHAR(64) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size_bytes BIGINT NOT NULL DEFAULT 0,
    sha256_hash VARCHAR(64) NOT NULL,
    hmac_signature VARCHAR(64),
    chain_of_custody_status VARCHAR(32) NOT NULL DEFAULT 'SEALED',
    subpoena_hold_active BOOLEAN NOT NULL DEFAULT TRUE,
    collected_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    verified_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    collected_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- D. AUDIT LOGS TABLE (Append-Only Forensic Journal)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action VARCHAR(64) NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    user_badge_number VARCHAR(64) NOT NULL,
    user_ip_address VARCHAR(45),
    user_agent TEXT,
    case_id VARCHAR(64),
    wallet_address VARCHAR(255),
    tx_hash VARCHAR(128),
    details JSONB DEFAULT '{}'::jsonb,
    artifact_hash VARCHAR(64),
    prev_log_hash VARCHAR(64),
    tamper_status VARCHAR(16) NOT NULL DEFAULT 'VERIFIED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 3. SUPABASE AUTH TRIGGER: Sync auth.users -> public.users
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
DECLARE
    user_role VARCHAR(32);
    user_name VARCHAR(255);
    badge VARCHAR(64);
    agency VARCHAR(255);
BEGIN
    user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'L3 Analyst');
    user_name := COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));
    badge := COALESCE(NEW.raw_user_meta_data->>'badge_number', 'LEA-' || floor(random() * 9000 + 1000)::text);
    agency := COALESCE(NEW.raw_user_meta_data->>'agency', 'Financial Crimes Cyber Enforcement (SIH)');

    INSERT INTO public.users (id, email, name, badge_number, role, agency, password_hash, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        user_name,
        badge,
        user_role,
        agency,
        'SUPABASE_MANAGED_AUTH',
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', NULL)
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        name = EXCLUDED.name,
        updated_at = CURRENT_TIMESTAMP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if already exists then recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- ============================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on core tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- A. USERS POLICIES
DROP POLICY IF EXISTS "Users can read all investigator profiles" ON public.users;
CREATE POLICY "Users can read all investigator profiles"
    ON public.users FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
CREATE POLICY "Users can update their own profile"
    ON public.users FOR UPDATE
    TO authenticated
    USING (auth.uid() = id);

-- B. CASES POLICIES
DROP POLICY IF EXISTS "Investigators can view all active cases" ON public.cases;
CREATE POLICY "Investigators can view all active cases"
    ON public.cases FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Authorized analysts can create cases" ON public.cases;
CREATE POLICY "Authorized analysts can create cases"
    ON public.cases FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
              AND users.role IN ('L3 Analyst', 'Lead Investigator', 'Admin')
        )
    );

DROP POLICY IF EXISTS "Supervisors can update or close cases" ON public.cases;
CREATE POLICY "Supervisors can update or close cases"
    ON public.cases FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
              AND users.role IN ('Lead Investigator', 'Admin')
        )
    );

-- C. EVIDENCE POLICIES
DROP POLICY IF EXISTS "Investigators can view evidence" ON public.evidence;
CREATE POLICY "Investigators can view evidence"
    ON public.evidence FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Authorized investigators can seal evidence" ON public.evidence;
CREATE POLICY "Authorized investigators can seal evidence"
    ON public.evidence FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
              AND users.role IN ('L3 Analyst', 'Lead Investigator', 'Admin')
        )
    );

-- D. AUDIT LOGS: Append-Only Immutable Forensic Ledger
DROP POLICY IF EXISTS "Authenticated users can read audit trail" ON public.audit_logs;
CREATE POLICY "Authenticated users can read audit trail"
    ON public.audit_logs FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "System can append audit logs" ON public.audit_logs;
CREATE POLICY "System can append audit logs"
    ON public.audit_logs FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Explicitly disallow UPDATE and DELETE on audit logs (No policies = denied)
-- Under Postgres RLS, absence of UPDATE/DELETE policies guarantees immutable append-only storage.

-- ============================================================================
-- 5. INITIAL CASE SEED DATA
-- ============================================================================
INSERT INTO public.cases (case_id, title, description, status, priority, fraud_type, reported_amount_usd, target_address, network)
VALUES 
('INV-2023-0842', 'Operation Velvet Vault — Industrial Pig Butchering Syndicate', 'Multi-jurisdictional syndicate laundering stolen retail USDT through decentralized bridges.', 'active', 'critical', 'pig_butchering', 4250000.00, '0x71C7656EC7ab88b098defB751B7401B5f6d8976F', 'ETH'),
('INV-2024-0119', 'Lazarus Heist Split-Hop Exfiltration', 'State-sponsored APT laundering funds originating from decentralized lending pool exploit.', 'escalated', 'critical', 'hacks', 18900000.00, '0x9c4f196720e17639bb409d57a6279f0411fa12e9', 'ETH')
ON CONFLICT (case_id) DO NOTHING;
