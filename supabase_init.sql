-- 1. Create Tips Table
CREATE TABLE tips (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  username TEXT NOT NULL,
  amount_sol DOUBLE PRECISION NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  tweet_url TEXT,
  tipper_wallet TEXT,
  tx_sig TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  claimed_at TIMESTAMPTZ
);

-- 2. Create Creators Table
CREATE TABLE creators (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  username TEXT NOT NULL UNIQUE,
  wallet_address TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Create Claim Attempts Table
CREATE TABLE claim_attempts (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  username TEXT NOT NULL,
  verification_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  wallet_address TEXT
);

-- 4. Create Indexes for faster queries
CREATE INDEX idx_tips_username_status ON tips(username, status);
CREATE INDEX idx_claims_username_status ON claim_attempts(username, status);
