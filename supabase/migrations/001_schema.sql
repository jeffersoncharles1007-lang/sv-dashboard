-- SV Elétrica Dashboard - Supabase Schema
-- Run this in Supabase SQL Editor

-- Opportunities table
CREATE TABLE IF NOT EXISTS opportunities (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL,
  pipeline_id TEXT NOT NULL,
  pipeline_stage_id TEXT NOT NULL,
  monetary_value NUMERIC DEFAULT 0,
  contact_id TEXT,
  assigned_to TEXT,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  data_orcamento TIMESTAMPTZ,
  dias_parado INTEGER DEFAULT 0,
  desconto_pct NUMERIC DEFAULT 0,
  margem_pct NUMERIC DEFAULT 0,
  id_orcamento TEXT,
  filial TEXT,
  last_synced TIMESTAMPTZ DEFAULT NOW()
);

-- Contacts table
CREATE TABLE IF NOT EXISTS contacts (
  id TEXT PRIMARY KEY,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  tags TEXT[] DEFAULT '{}',
  assigned_to TEXT,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  last_synced TIMESTAMPTZ DEFAULT NOW()
);

-- Conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  contact_id TEXT,
  contact_name TEXT,
  assigned_to TEXT,
  last_message TEXT,
  last_message_date BIGINT,
  unread_count INTEGER DEFAULT 0,
  last_synced TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_opportunities_pipeline ON opportunities(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_stage ON opportunities(pipeline_stage_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_status ON opportunities(status);
CREATE INDEX IF NOT EXISTS idx_opportunities_assigned ON opportunities(assigned_to);
CREATE INDEX IF NOT EXISTS idx_opportunities_created ON opportunities(created_at);
CREATE INDEX IF NOT EXISTS idx_opportunities_updated ON opportunities(updated_at);

CREATE INDEX IF NOT EXISTS idx_contacts_created ON contacts(created_at);
CREATE INDEX IF NOT EXISTS idx_contacts_assigned ON contacts(assigned_to);

CREATE INDEX IF NOT EXISTS idx_conversations_date ON conversations(last_message_date);

-- Enable Row Level Security (RLS) - disable for simplicity
ALTER TABLE opportunities DISABLE ROW LEVEL SECURITY;
ALTER TABLE contacts DISABLE ROW LEVEL SECURITY;
ALTER TABLE conversations DISABLE ROW LEVEL SECURITY;

-- Grant permissions for anon key
GRANT ALL ON opportunities TO anon;
GRANT ALL ON contacts TO anon;
GRANT ALL ON conversations TO anon;
