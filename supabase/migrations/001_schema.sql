-- SV Elétrica Dashboard - Schema Completo
-- Execute este SQL no PostgreSQL (Supabase ou VPS)
-- Para atualizar tabelas existentes, rode o MIGRATION-002_add_columns.sql

-- ============================================
-- OPPORTUNITIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS opportunities (
  id TEXT PRIMARY KEY,
  ghl_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open',
  pipeline_id TEXT NOT NULL DEFAULT '',
  pipeline_stage_id TEXT NOT NULL DEFAULT '',
  monetary_value NUMERIC DEFAULT 0,
  contact_id TEXT,
  assigned_to TEXT,
  source TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CONTACTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS contacts (
  id TEXT PRIMARY KEY,
  ghl_id TEXT UNIQUE NOT NULL,
  first_name TEXT DEFAULT '',
  last_name TEXT DEFAULT '',
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  tags TEXT[] DEFAULT '{}',
  assigned_to TEXT DEFAULT '',
  source TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Campos preenchidos pelo agente de IA
  situacao_comercial TEXT DEFAULT '',
  resultado_ultimo_contato TEXT DEFAULT '',
  data_ultimo_contato TIMESTAMPTZ,
  lead_prioridade TEXT DEFAULT 'media',
  segmento_cliente TEXT DEFAULT '',
  temperatura TEXT DEFAULT 'morno',
  proxima_acao TEXT DEFAULT ''
);

-- ============================================
-- CONVERSATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  ghl_id TEXT UNIQUE NOT NULL,
  contact_id TEXT,
  contact_name TEXT DEFAULT '',
  assigned_to TEXT DEFAULT '',
  last_message TEXT DEFAULT '',
  last_message_direction TEXT DEFAULT '',
  last_message_date TIMESTAMPTZ,
  unread_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CLASSIFICATION LOG (histórico do agente)
-- ============================================
CREATE TABLE IF NOT EXISTS classification_logs (
  id SERIAL PRIMARY KEY,
  contact_id TEXT NOT NULL,
  conversation_id TEXT,
  classificacao TEXT NOT NULL,
  temperatura TEXT NOT NULL,
  prioridade TEXT NOT NULL,
  mensagem_original TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SYNC LOGS
-- ============================================
CREATE TABLE IF NOT EXISTS sync_logs (
  id SERIAL PRIMARY KEY,
  sync_type TEXT NOT NULL,
  records_synced INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  status TEXT DEFAULT 'running',
  error_message TEXT
);

-- ============================================
-- INDEXES
-- ============================================
-- Opportunities
CREATE INDEX IF NOT EXISTS idx_opportunities_pipeline ON opportunities(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_stage ON opportunities(pipeline_stage_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_status ON opportunities(status);
CREATE INDEX IF NOT EXISTS idx_opportunities_assigned ON opportunities(assigned_to);
CREATE INDEX IF NOT EXISTS idx_opportunities_created ON opportunities(created_at);
CREATE INDEX IF NOT EXISTS idx_opportunities_contact ON opportunities(contact_id);

-- Contacts
CREATE INDEX IF NOT EXISTS idx_contacts_created ON contacts(created_at);
CREATE INDEX IF NOT EXISTS idx_contacts_assigned ON contacts(assigned_to);
CREATE INDEX IF NOT EXISTS idx_contacts_temperatura ON contacts(temperatura);
CREATE INDEX IF NOT EXISTS idx_contacts_prioridade ON contacts(lead_prioridade);
CREATE INDEX IF NOT EXISTS idx_contacts_resultado ON contacts(resultado_ultimo_contato);

-- Conversations
CREATE INDEX IF NOT EXISTS idx_conversations_contact ON conversations(contact_id);
CREATE INDEX IF NOT EXISTS idx_conversations_date ON conversations(last_message_date);
CREATE INDEX IF NOT EXISTS idx_conversations_direction ON conversations(last_message_direction);

-- Classification logs
CREATE INDEX IF NOT EXISTS idx_classification_contact ON classification_logs(contact_id);
CREATE INDEX IF NOT EXISTS idx_classification_created ON classification_logs(created_at);

-- ============================================
-- PERMISSIONS
-- ============================================
ALTER TABLE opportunities DISABLE ROW LEVEL SECURITY;
ALTER TABLE contacts DISABLE ROW LEVEL SECURITY;
ALTER TABLE conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE classification_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs DISABLE ROW LEVEL SECURITY;

GRANT ALL ON opportunities TO PUBLIC;
GRANT ALL ON contacts TO PUBLIC;
GRANT ALL ON conversations TO PUBLIC;
GRANT ALL ON classification_logs TO PUBLIC;
GRANT ALL ON sync_logs TO PUBLIC;
GRANT ALL ON ALL SEQUENCES IN SCHEMA PUBLIC TO PUBLIC;
