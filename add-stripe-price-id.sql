-- Add stripe_price_id column to services table
ALTER TABLE services 
ADD COLUMN stripe_price_id TEXT,
ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create a trigger to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_services_updated_at
    BEFORE UPDATE ON services
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comment to explain the column
COMMENT ON COLUMN services.stripe_price_id IS 'The Stripe Price ID associated with this service';

-- Create an index to improve query performance when looking up by stripe_price_id
CREATE INDEX idx_services_stripe_price_id ON services(stripe_price_id);
