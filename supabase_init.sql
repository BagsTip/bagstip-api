-- Supabase Schema for BagsTip

-- 1. Tipper Profiles
CREATE TABLE tipper_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_pubkey text UNIQUE NOT NULL,
  x_handle text UNIQUE NOT NULL,
  verified boolean DEFAULT false,
  verification_code text,
  code_expires_at timestamptz,
  verified_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- 2. Creator Profiles
CREATE TABLE creator_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_pubkey text UNIQUE NOT NULL,
  x_handle text UNIQUE NOT NULL,
  verified boolean DEFAULT false,
  verification_code text,
  code_expires_at timestamptz,
  verified_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- 3. Tips
CREATE TABLE tips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipper_wallet text,
  tipper_x_handle text NOT NULL,
  creator_x_handle text NOT NULL,
  creator_wallet text,
  amount_sol numeric NOT NULL,
  amount_usd numeric,
  source text NOT NULL, -- 'web' or 'bot'
  status text NOT NULL, -- 'pending' | 'released' | 'failed'
  tx_sig_inbound text,
  tx_sig_release text,
  created_at timestamptz DEFAULT now(),
  released_at timestamptz
);

-- Indexes for performance
CREATE INDEX idx_tipper_profiles_x_handle ON tipper_profiles(x_handle);
CREATE INDEX idx_creator_profiles_x_handle ON creator_profiles(x_handle);
CREATE INDEX idx_tips_creator_x_handle_status ON tips(creator_x_handle, status);
CREATE INDEX idx_tips_tipper_x_handle ON tips(tipper_x_handle);
