-- Add payment status to bookings table
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS payment_status text,
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text,
ADD COLUMN IF NOT EXISTS stripe_transfer_id text;

-- Add Stripe status columns to professionals table
ALTER TABLE professionals
ADD COLUMN IF NOT EXISTS stripe_account_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS stripe_details_submitted boolean DEFAULT false;

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  professional_id uuid REFERENCES professionals(id) ON DELETE SET NULL,
  client_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  amount integer NOT NULL,
  commission_amount integer NOT NULL,
  net_amount integer NOT NULL,
  stripe_payment_intent_id text,
  stripe_transfer_id text,
  status text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_transactions_booking_id ON transactions(booking_id);
CREATE INDEX IF NOT EXISTS idx_transactions_professional_id ON transactions(professional_id);
CREATE INDEX IF NOT EXISTS idx_transactions_client_id ON transactions(client_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);

-- Add RLS policies for transactions
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Professionals can view their own transactions
CREATE POLICY "Professionals can view their own transactions"
  ON transactions FOR SELECT
  USING (professional_id IN (
    SELECT id FROM professionals WHERE profile_id = auth.uid()
  ));

-- Clients can view their own transactions
CREATE POLICY "Clients can view their own transactions"
  ON transactions FOR SELECT
  USING (client_id = auth.uid());

-- Only service role can insert/update transactions
CREATE POLICY "Service role can manage transactions"
  ON transactions FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role'); 