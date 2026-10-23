CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(16) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS otp_challenges (
  phone VARCHAR(16) PRIMARY KEY,
  code_hash CHAR(64) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  friend_name VARCHAR(80) NOT NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  due_date DATE NOT NULL,
  status VARCHAR(10) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'REPAID')),
  receipt_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  repaid_at TIMESTAMPTZ
);

-- Backward compatibility for databases created by the earlier MiniLedger schema,
-- where receipt locations were stored in loans.receipt_url instead of receipt_path.
-- Rename when only the old column exists so existing loan records and values stay intact.
-- If both columns exist, preserve any old receipt values without overwriting receipt_path.
DO $miniledger_migration$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'loans' AND column_name = 'receipt_url'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'loans' AND column_name = 'receipt_path'
  ) THEN
    ALTER TABLE public.loans RENAME COLUMN receipt_url TO receipt_path;
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'loans' AND column_name = 'receipt_url'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'loans' AND column_name = 'receipt_path'
  ) THEN
    UPDATE public.loans
    SET receipt_path = COALESCE(receipt_path, receipt_url)
    WHERE receipt_path IS NULL AND receipt_url IS NOT NULL;
  END IF;
END
$miniledger_migration$;

CREATE INDEX IF NOT EXISTS idx_loans_user_created ON loans(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_loans_user_due_date ON loans(user_id, due_date) WHERE status = 'PENDING';
