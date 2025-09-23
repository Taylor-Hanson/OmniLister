-- Enable RLS
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- Create tables
CREATE TABLE IF NOT EXISTS items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  sku TEXT,
  title TEXT NOT NULL,
  brand TEXT,
  category TEXT,
  acquired_at BIGINT NOT NULL, -- epoch ms
  acquired_from TEXT,
  purchase_price_cents INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at BIGINT NOT NULL DEFAULT extract(epoch from now()) * 1000,
  updated_at BIGINT NOT NULL DEFAULT extract(epoch from now()) * 1000
);

CREATE TABLE IF NOT EXISTS item_extra_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  incurred_at BIGINT NOT NULL,
  note TEXT
);

CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  marketplace TEXT NOT NULL,
  marketplace_order_id TEXT,
  item_id UUID REFERENCES items(id),
  sold_at BIGINT NOT NULL,
  sale_price_cents INTEGER NOT NULL DEFAULT 0,
  shipping_charged_cents INTEGER NOT NULL DEFAULT 0,
  shipping_cost_cents INTEGER NOT NULL DEFAULT 0,
  platform_fees_cents INTEGER NOT NULL DEFAULT 0,
  discounts_cents INTEGER NOT NULL DEFAULT 0,
  refunds_cents INTEGER NOT NULL DEFAULT 0,
  chargebacks_cents INTEGER NOT NULL DEFAULT 0,
  tax_collected_cents INTEGER NOT NULL DEFAULT 0,
  tax_remitted_by_marketplace BOOLEAN NOT NULL DEFAULT true,
  payout_at BIGINT,
  payout_amount_cents INTEGER DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  raw_payload JSONB,
  locked_cogs_cents INTEGER NOT NULL DEFAULT 0,
  buyer_state TEXT,
  row_hash TEXT -- for idempotent imports
);

CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  occurred_at BIGINT NOT NULL,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  category TEXT NOT NULL,
  vendor TEXT,
  method TEXT,
  note TEXT,
  receipt_key TEXT,
  mileage_miles NUMERIC,
  vehicle_rate NUMERIC,
  row_hash TEXT -- for idempotent imports
);

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  number TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  issued_at BIGINT NOT NULL,
  due_at BIGINT,
  subtotal_cents INTEGER NOT NULL DEFAULT 0,
  tax_cents INTEGER NOT NULL DEFAULT 0,
  total_cents INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  pdf_key TEXT,
  notes TEXT,
  created_at BIGINT NOT NULL DEFAULT extract(epoch from now()) * 1000,
  updated_at BIGINT NOT NULL DEFAULT extract(epoch from now()) * 1000
);

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  method TEXT NOT NULL,
  received_at BIGINT NOT NULL,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  reference TEXT,
  created_at BIGINT NOT NULL DEFAULT extract(epoch from now()) * 1000,
  updated_at BIGINT NOT NULL DEFAULT extract(epoch from now()) * 1000
);

CREATE TABLE IF NOT EXISTS account_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  provider TEXT NOT NULL,
  account_type TEXT NOT NULL,
  external_account_id TEXT NOT NULL,
  name TEXT,
  meta JSONB
);

CREATE TABLE IF NOT EXISTS journal_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  provider TEXT NOT NULL,
  period_start BIGINT NOT NULL,
  period_end BIGINT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  preview JSONB,
  payload JSONB,
  created_at BIGINT NOT NULL DEFAULT extract(epoch from now()) * 1000,
  created_by UUID
);

CREATE TABLE IF NOT EXISTS integration_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  provider TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  realm_id TEXT,
  company_id TEXT,
  company_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  actor_id UUID NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  action TEXT NOT NULL,
  before JSONB,
  after JSONB,
  at BIGINT NOT NULL DEFAULT extract(epoch from now()) * 1000
);

-- OAuth state storage
CREATE TABLE IF NOT EXISTS oauth_states (
  state TEXT PRIMARY KEY,
  org_id UUID NOT NULL,
  provider TEXT NOT NULL DEFAULT 'quickbooks',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- External accounts cache
CREATE TABLE IF NOT EXISTS external_accounts_cache (
  org_id UUID NOT NULL,
  provider TEXT NOT NULL,
  external_id TEXT NOT NULL,
  name TEXT,
  acct_type TEXT,
  acct_subtype TEXT,
  active BOOLEAN,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (org_id, provider, external_id)
);

-- Account mapping usage tracking
CREATE TABLE IF NOT EXISTS account_mapping_usage (
  org_id UUID NOT NULL,
  provider TEXT NOT NULL DEFAULT 'quickbooks',
  bucket TEXT NOT NULL,
  external_account_id TEXT NOT NULL,
  used_at TIMESTAMPTZ DEFAULT NOW(),
  use_count INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (org_id, provider, bucket, external_account_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_items_org_id ON items(org_id);
CREATE INDEX IF NOT EXISTS idx_items_status ON items(status);
CREATE INDEX IF NOT EXISTS idx_item_extra_costs_org_id ON item_extra_costs(org_id);
CREATE INDEX IF NOT EXISTS idx_item_extra_costs_item_id ON item_extra_costs(item_id);
CREATE INDEX IF NOT EXISTS idx_sales_org_id ON sales(org_id);
CREATE INDEX IF NOT EXISTS idx_sales_sold_at ON sales(sold_at);
CREATE INDEX IF NOT EXISTS idx_sales_marketplace ON sales(marketplace);
CREATE INDEX IF NOT EXISTS idx_sales_row_hash ON sales(row_hash);
CREATE INDEX IF NOT EXISTS idx_expenses_org_id ON expenses(org_id);
CREATE INDEX IF NOT EXISTS idx_expenses_occurred_at ON expenses(occurred_at);
CREATE INDEX IF NOT EXISTS idx_expenses_row_hash ON expenses(row_hash);
CREATE INDEX IF NOT EXISTS idx_invoices_org_id ON invoices(org_id);
CREATE INDEX IF NOT EXISTS idx_payments_org_id ON payments(org_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_account_mappings_org_id ON account_mappings(org_id);
CREATE INDEX IF NOT EXISTS idx_journal_exports_org_id ON journal_exports(org_id);
CREATE INDEX IF NOT EXISTS idx_integration_tokens_org_id ON integration_tokens(org_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_id ON audit_logs(org_id);
CREATE INDEX IF NOT EXISTS idx_oauth_states_org_id ON oauth_states(org_id);
CREATE INDEX IF NOT EXISTS idx_external_accounts_cache_org_id ON external_accounts_cache(org_id);
CREATE INDEX IF NOT EXISTS idx_account_mapping_usage_org_id ON account_mapping_usage(org_id);

-- Unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_org_marketplace_order ON sales(org_id, marketplace, marketplace_order_id) WHERE marketplace_order_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_expenses_org_row_hash ON expenses(org_id, row_hash) WHERE row_hash IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_org_row_hash ON sales(org_id, row_hash) WHERE row_hash IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_integration_tokens_org_provider ON integration_tokens(org_id, provider);
CREATE UNIQUE INDEX IF NOT EXISTS idx_account_mappings_org_provider_type ON account_mappings(org_id, provider, account_type);

-- RLS Policies
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_extra_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_accounts_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_mapping_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagnostics_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE pirateship_config ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (assuming org_id is in JWT claims)
CREATE POLICY "Users can view their org data" ON items FOR SELECT USING (org_id = (auth.jwt() ->> 'org_id')::uuid);
CREATE POLICY "Users can insert their org data" ON items FOR INSERT WITH CHECK (org_id = (auth.jwt() ->> 'org_id')::uuid);
CREATE POLICY "Users can update their org data" ON items FOR UPDATE USING (org_id = (auth.jwt() ->> 'org_id')::uuid);
CREATE POLICY "Users can delete their org data" ON items FOR DELETE USING (org_id = (auth.jwt() ->> 'org_id')::uuid);

CREATE POLICY "Users can view their org data" ON item_extra_costs FOR SELECT USING (org_id = (auth.jwt() ->> 'org_id')::uuid);
CREATE POLICY "Users can insert their org data" ON item_extra_costs FOR INSERT WITH CHECK (org_id = (auth.jwt() ->> 'org_id')::uuid);
CREATE POLICY "Users can update their org data" ON item_extra_costs FOR UPDATE USING (org_id = (auth.jwt() ->> 'org_id')::uuid);
CREATE POLICY "Users can delete their org data" ON item_extra_costs FOR DELETE USING (org_id = (auth.jwt() ->> 'org_id')::uuid);

CREATE POLICY "Users can view their org data" ON sales FOR SELECT USING (org_id = (auth.jwt() ->> 'org_id')::uuid);
CREATE POLICY "Users can insert their org data" ON sales FOR INSERT WITH CHECK (org_id = (auth.jwt() ->> 'org_id')::uuid);
CREATE POLICY "Users can update their org data" ON sales FOR UPDATE USING (org_id = (auth.jwt() ->> 'org_id')::uuid);
CREATE POLICY "Users can delete their org data" ON sales FOR DELETE USING (org_id = (auth.jwt() ->> 'org_id')::uuid);

CREATE POLICY "Users can view their org data" ON expenses FOR SELECT USING (org_id = (auth.jwt() ->> 'org_id')::uuid);
CREATE POLICY "Users can insert their org data" ON expenses FOR INSERT WITH CHECK (org_id = (auth.jwt() ->> 'org_id')::uuid);
CREATE POLICY "Users can update their org data" ON expenses FOR UPDATE USING (org_id = (auth.jwt() ->> 'org_id')::uuid);
CREATE POLICY "Users can delete their org data" ON expenses FOR DELETE USING (org_id = (auth.jwt() ->> 'org_id')::uuid);

CREATE POLICY "Users can view their org data" ON invoices FOR SELECT USING (org_id = (auth.jwt() ->> 'org_id')::uuid);
CREATE POLICY "Users can insert their org data" ON invoices FOR INSERT WITH CHECK (org_id = (auth.jwt() ->> 'org_id')::uuid);
CREATE POLICY "Users can update their org data" ON invoices FOR UPDATE USING (org_id = (auth.jwt() ->> 'org_id')::uuid);
CREATE POLICY "Users can delete their org data" ON invoices FOR DELETE USING (org_id = (auth.jwt() ->> 'org_id')::uuid);

CREATE POLICY "Users can view their org data" ON payments FOR SELECT USING (org_id = (auth.jwt() ->> 'org_id')::uuid);
CREATE POLICY "Users can insert their org data" ON payments FOR INSERT WITH CHECK (org_id = (auth.jwt() ->> 'org_id')::uuid);
CREATE POLICY "Users can update their org data" ON payments FOR UPDATE USING (org_id = (auth.jwt() ->> 'org_id')::uuid);
CREATE POLICY "Users can delete their org data" ON payments FOR DELETE USING (org_id = (auth.jwt() ->> 'org_id')::uuid);

CREATE POLICY "Users can view their org data" ON account_mappings FOR SELECT USING (org_id = (auth.jwt() ->> 'org_id')::uuid);
CREATE POLICY "Users can insert their org data" ON account_mappings FOR INSERT WITH CHECK (org_id = (auth.jwt() ->> 'org_id')::uuid);
CREATE POLICY "Users can update their org data" ON account_mappings FOR UPDATE USING (org_id = (auth.jwt() ->> 'org_id')::uuid);
CREATE POLICY "Users can delete their org data" ON account_mappings FOR DELETE USING (org_id = (auth.jwt() ->> 'org_id')::uuid);

CREATE POLICY "Users can view their org data" ON journal_exports FOR SELECT USING (org_id = (auth.jwt() ->> 'org_id')::uuid);
CREATE POLICY "Users can insert their org data" ON journal_exports FOR INSERT WITH CHECK (org_id = (auth.jwt() ->> 'org_id')::uuid);
CREATE POLICY "Users can update their org data" ON journal_exports FOR UPDATE USING (org_id = (auth.jwt() ->> 'org_id')::uuid);
CREATE POLICY "Users can delete their org data" ON journal_exports FOR DELETE USING (org_id = (auth.jwt() ->> 'org_id')::uuid);

CREATE POLICY "Users can view their org data" ON integration_tokens FOR SELECT USING (org_id = (auth.jwt() ->> 'org_id')::uuid);
CREATE POLICY "Users can insert their org data" ON integration_tokens FOR INSERT WITH CHECK (org_id = (auth.jwt() ->> 'org_id')::uuid);
CREATE POLICY "Users can update their org data" ON integration_tokens FOR UPDATE USING (org_id = (auth.jwt() ->> 'org_id')::uuid);
CREATE POLICY "Users can delete their org data" ON integration_tokens FOR DELETE USING (org_id = (auth.jwt() ->> 'org_id')::uuid);

CREATE POLICY "Users can view their org data" ON audit_logs FOR SELECT USING (org_id = (auth.jwt() ->> 'org_id')::uuid);
CREATE POLICY "Users can insert their org data" ON audit_logs FOR INSERT WITH CHECK (org_id = (auth.jwt() ->> 'org_id')::uuid);
CREATE POLICY "Users can update their org data" ON audit_logs FOR UPDATE USING (org_id = (auth.jwt() ->> 'org_id')::uuid);
CREATE POLICY "Users can delete their org data" ON audit_logs FOR DELETE USING (org_id = (auth.jwt() ->> 'org_id')::uuid);

CREATE POLICY "Users can view their org data" ON oauth_states FOR SELECT USING (org_id = (auth.jwt() ->> 'org_id')::uuid);
CREATE POLICY "Users can insert their org data" ON oauth_states FOR INSERT WITH CHECK (org_id = (auth.jwt() ->> 'org_id')::uuid);
CREATE POLICY "Users can update their org data" ON oauth_states FOR UPDATE USING (org_id = (auth.jwt() ->> 'org_id')::uuid);
CREATE POLICY "Users can delete their org data" ON oauth_states FOR DELETE USING (org_id = (auth.jwt() ->> 'org_id')::uuid);

CREATE POLICY "Users can view their org data" ON external_accounts_cache FOR SELECT USING (org_id = (auth.jwt() ->> 'org_id')::uuid);
CREATE POLICY "Users can insert their org data" ON external_accounts_cache FOR INSERT WITH CHECK (org_id = (auth.jwt() ->> 'org_id')::uuid);
CREATE POLICY "Users can update their org data" ON external_accounts_cache FOR UPDATE USING (org_id = (auth.jwt() ->> 'org_id')::uuid);
CREATE POLICY "Users can delete their org data" ON external_accounts_cache FOR DELETE USING (org_id = (auth.jwt() ->> 'org_id')::uuid);

CREATE POLICY "Users can view their org data" ON account_mapping_usage FOR SELECT USING (org_id = (auth.jwt() ->> 'org_id')::uuid);
CREATE POLICY "Users can insert their org data" ON account_mapping_usage FOR INSERT WITH CHECK (org_id = (auth.jwt() ->> 'org_id')::uuid);
CREATE POLICY "Users can update their org data" ON account_mapping_usage FOR UPDATE USING (org_id = (auth.jwt() ->> 'org_id')::uuid);
CREATE POLICY "Users can delete their org data" ON account_mapping_usage FOR DELETE USING (org_id = (auth.jwt() ->> 'org_id')::uuid);

CREATE POLICY "Users can view their org data" ON diagnostics_status FOR SELECT USING (org_id = (auth.jwt() ->> 'org_id')::uuid);
CREATE POLICY "Users can insert their org data" ON diagnostics_status FOR INSERT WITH CHECK (org_id = (auth.jwt() ->> 'org_id')::uuid);
CREATE POLICY "Users can update their org data" ON diagnostics_status FOR UPDATE USING (org_id = (auth.jwt() ->> 'org_id')::uuid);
CREATE POLICY "Users can delete their org data" ON diagnostics_status FOR DELETE USING (org_id = (auth.jwt() ->> 'org_id')::uuid);

CREATE POLICY "Users can view their org data" ON org_contacts FOR SELECT USING (org_id = (auth.jwt() ->> 'org_id')::uuid);
CREATE POLICY "Users can insert their org data" ON org_contacts FOR INSERT WITH CHECK (org_id = (auth.jwt() ->> 'org_id')::uuid);
CREATE POLICY "Users can update their org data" ON org_contacts FOR UPDATE USING (org_id = (auth.jwt() ->> 'org_id')::uuid);
CREATE POLICY "Users can delete their org data" ON org_contacts FOR DELETE USING (org_id = (auth.jwt() ->> 'org_id')::uuid);

CREATE POLICY "Users can view their org data" ON alert_events FOR SELECT USING (org_id = (auth.jwt() ->> 'org_id')::uuid);
CREATE POLICY "Users can insert their org data" ON alert_events FOR INSERT WITH CHECK (org_id = (auth.jwt() ->> 'org_id')::uuid);
CREATE POLICY "Users can update their org data" ON alert_events FOR UPDATE USING (org_id = (auth.jwt() ->> 'org_id')::uuid);
CREATE POLICY "Users can delete their org data" ON alert_events FOR DELETE USING (org_id = (auth.jwt() ->> 'org_id')::uuid);

CREATE POLICY "Users can view their org data" ON shipping_addresses FOR SELECT USING (org_id = (auth.jwt() ->> 'org_id')::uuid);
CREATE POLICY "Users can insert their org data" ON shipping_addresses FOR INSERT WITH CHECK (org_id = (auth.jwt() ->> 'org_id')::uuid);
CREATE POLICY "Users can update their org data" ON shipping_addresses FOR UPDATE USING (org_id = (auth.jwt() ->> 'org_id')::uuid);
CREATE POLICY "Users can delete their org data" ON shipping_addresses FOR DELETE USING (org_id = (auth.jwt() ->> 'org_id')::uuid);

CREATE POLICY "Users can view their org data" ON shipments FOR SELECT USING (org_id = (auth.jwt() ->> 'org_id')::uuid);
CREATE POLICY "Users can insert their org data" ON shipments FOR INSERT WITH CHECK (org_id = (auth.jwt() ->> 'org_id')::uuid);
CREATE POLICY "Users can update their org data" ON shipments FOR UPDATE USING (org_id = (auth.jwt() ->> 'org_id')::uuid);
CREATE POLICY "Users can delete their org data" ON shipments FOR DELETE USING (org_id = (auth.jwt() ->> 'org_id')::uuid);

CREATE POLICY "Users can view their org data" ON shipping_rates FOR SELECT USING (shipment_id IN (SELECT id FROM shipments WHERE org_id = (auth.jwt() ->> 'org_id')::uuid));
CREATE POLICY "Users can insert their org data" ON shipping_rates FOR INSERT WITH CHECK (shipment_id IN (SELECT id FROM shipments WHERE org_id = (auth.jwt() ->> 'org_id')::uuid));
CREATE POLICY "Users can update their org data" ON shipping_rates FOR UPDATE USING (shipment_id IN (SELECT id FROM shipments WHERE org_id = (auth.jwt() ->> 'org_id')::uuid));
CREATE POLICY "Users can delete their org data" ON shipping_rates FOR DELETE USING (shipment_id IN (SELECT id FROM shipments WHERE org_id = (auth.jwt() ->> 'org_id')::uuid));

CREATE POLICY "Users can view their org data" ON pirateship_config FOR SELECT USING (org_id = (auth.jwt() ->> 'org_id')::uuid);
CREATE POLICY "Users can insert their org data" ON pirateship_config FOR INSERT WITH CHECK (org_id = (auth.jwt() ->> 'org_id')::uuid);
CREATE POLICY "Users can update their org data" ON pirateship_config FOR UPDATE USING (org_id = (auth.jwt() ->> 'org_id')::uuid);
CREATE POLICY "Users can delete their org data" ON pirateship_config FOR DELETE USING (org_id = (auth.jwt() ->> 'org_id')::uuid);

-- Helper function for mapping usage
CREATE OR REPLACE FUNCTION upsert_mapping_usage(p_org_id uuid, p_bucket text, p_ext_id text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO account_mapping_usage (org_id, provider, bucket, external_account_id, used_at, use_count)
  VALUES (p_org_id, 'quickbooks', p_bucket, p_ext_id, NOW(), 1)
  ON CONFLICT (org_id, provider, bucket, external_account_id)
  DO UPDATE SET used_at = NOW(), use_count = account_mapping_usage.use_count + 1;
END;
$$;

-- Seed default contact for testing
INSERT INTO org_contacts (org_id, email, notify, role)
VALUES ('00000000-0000-0000-0000-000000000000','finance@yourco.com', true, 'finance')
ON CONFLICT DO NOTHING;

-- Shipping integration tables
CREATE TABLE IF NOT EXISTS shipping_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  name VARCHAR(100) NOT NULL,
  company VARCHAR(100),
  street1 VARCHAR(200) NOT NULL,
  street2 VARCHAR(200),
  city VARCHAR(100) NOT NULL,
  state VARCHAR(50) NOT NULL,
  zip VARCHAR(20) NOT NULL,
  country VARCHAR(2) DEFAULT 'US',
  phone VARCHAR(20),
  email VARCHAR(255),
  is_default BOOLEAN DEFAULT FALSE,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  listing_id UUID,
  marketplace_order_id VARCHAR(100),
  pirateship_shipment_id VARCHAR(100),
  tracking_number VARCHAR(100),
  carrier VARCHAR(50),
  service_level VARCHAR(100),
  to_address JSONB NOT NULL,
  from_address JSONB NOT NULL,
  package_details JSONB NOT NULL,
  cost_cents INTEGER,
  label_url VARCHAR(500),
  status VARCHAR(50) DEFAULT 'created',
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shipping_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID REFERENCES shipments(id) ON DELETE CASCADE,
  carrier VARCHAR(50) NOT NULL,
  service_level VARCHAR(100) NOT NULL,
  rate_cents INTEGER NOT NULL,
  estimated_days INTEGER,
  rate_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pirateship_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL UNIQUE,
  api_key VARCHAR(255) NOT NULL,
  sandbox BOOLEAN DEFAULT TRUE,
  webhook_url VARCHAR(500),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for shipping tables
CREATE INDEX IF NOT EXISTS idx_shipping_addresses_org_id ON shipping_addresses(org_id);
CREATE INDEX IF NOT EXISTS idx_shipping_addresses_is_default ON shipping_addresses(org_id, is_default);
CREATE INDEX IF NOT EXISTS idx_shipments_org_id ON shipments(org_id);
CREATE INDEX IF NOT EXISTS idx_shipments_tracking_number ON shipments(tracking_number);
CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(status);
CREATE INDEX IF NOT EXISTS idx_shipments_created_at ON shipments(created_at);
CREATE INDEX IF NOT EXISTS idx_shipping_rates_shipment_id ON shipping_rates(shipment_id);
CREATE INDEX IF NOT EXISTS idx_pirateship_config_org_id ON pirateship_config(org_id);

-- Diagnostics status table
CREATE TABLE IF NOT EXISTS diagnostics_status (
  org_id UUID PRIMARY KEY,
  overall TEXT NOT NULL CHECK (overall IN ('green','yellow','red')),
  connected BOOLEAN NOT NULL DEFAULT FALSE,
  mappings_complete BOOLEAN NOT NULL DEFAULT FALSE,
  warnings_count INTEGER NOT NULL DEFAULT 0,
  last_test_forward_id TEXT,
  last_test_reverse_id TEXT,
  last_verified_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for diagnostics
CREATE INDEX IF NOT EXISTS idx_diagnostics_status_org_id ON diagnostics_status(org_id);
CREATE INDEX IF NOT EXISTS idx_diagnostics_status_overall ON diagnostics_status(overall);
CREATE INDEX IF NOT EXISTS idx_diagnostics_status_updated_at ON diagnostics_status(updated_at);

-- Org contacts for notifications
CREATE TABLE IF NOT EXISTS org_contacts (
  org_id UUID NOT NULL,
  email TEXT,
  slack_webhook_url TEXT,
  notify BOOLEAN NOT NULL DEFAULT TRUE,
  role TEXT,                                  -- 'owner'/'finance' etc.
  PRIMARY KEY (org_id, email)
);

-- Alert events audit log
CREATE TABLE IF NOT EXISTS alert_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  org_id UUID NOT NULL,
  prev_status TEXT,
  next_status TEXT,
  kind TEXT NOT NULL,             -- 'degraded' | 'recovered'
  recipients TEXT[],
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for contacts and alerts
CREATE INDEX IF NOT EXISTS idx_org_contacts_org_id ON org_contacts(org_id);
CREATE INDEX IF NOT EXISTS idx_org_contacts_notify ON org_contacts(notify);
CREATE INDEX IF NOT EXISTS idx_alert_events_org_id ON alert_events(org_id);
CREATE INDEX IF NOT EXISTS idx_alert_events_sent_at ON alert_events(sent_at);
