-- Supabase SQL: run this in the Supabase SQL Editor to create the orders table

CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  retailcrm_id TEXT UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  status TEXT DEFAULT 'new',
  city TEXT,
  address TEXT,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  utm_source TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access" ON orders
  FOR SELECT USING (true);

CREATE POLICY "Allow service role full access" ON orders
  FOR ALL USING (auth.role() = 'service_role');

CREATE INDEX idx_orders_city ON orders(city);
CREATE INDEX idx_orders_utm ON orders(utm_source);
CREATE INDEX idx_orders_created ON orders(created_at);
CREATE INDEX idx_orders_total ON orders(total_amount);
