-- MIGRATION: Adiciona colunas necessárias para o agente de IA
-- Rode este SQL se as tabelas já existem

-- ============================================
-- ADD COLUMNS TO OPPORTUNITIES
-- ============================================
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'opportunities' AND column_name = 'ghl_id') THEN
    ALTER TABLE opportunities ADD COLUMN ghl_id TEXT UNIQUE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'opportunities' AND column_name = 'last_synced_at') THEN
    ALTER TABLE opportunities ADD COLUMN last_synced_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- ============================================
-- ADD COLUMNS TO CONTACTS
-- ============================================
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contacts' AND column_name = 'ghl_id') THEN
    ALTER TABLE contacts ADD COLUMN ghl_id TEXT UNIQUE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contacts' AND column_name = 'situacao_comercial') THEN
    ALTER TABLE contacts ADD COLUMN situacao_comercial TEXT DEFAULT '';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contacts' AND column_name = 'resultado_ultimo_contato') THEN
    ALTER TABLE contacts ADD COLUMN resultado_ultimo_contato TEXT DEFAULT '';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contacts' AND column_name = 'data_ultimo_contato') THEN
    ALTER TABLE contacts ADD COLUMN data_ultimo_contato TIMESTAMPTZ;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contacts' AND column_name = 'lead_prioridade') THEN
    ALTER TABLE contacts ADD COLUMN lead_prioridade TEXT DEFAULT 'media';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contacts' AND column_name = 'segmento_cliente') THEN
    ALTER TABLE contacts ADD COLUMN segmento_cliente TEXT DEFAULT '';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contacts' AND column_name = 'temperatura') THEN
    ALTER TABLE contacts ADD COLUMN temperatura TEXT DEFAULT 'morno';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contacts' AND column_name = 'proxima_acao') THEN
    ALTER TABLE contacts ADD COLUMN proxima_acao TEXT DEFAULT '';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contacts' AND column_name = 'last_synced_at') THEN
    ALTER TABLE contacts ADD COLUMN last_synced_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- ============================================
-- ADD COLUMNS TO CONVERSATIONS
-- ============================================
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'ghl_id') THEN
    ALTER TABLE conversations ADD COLUMN ghl_id TEXT UNIQUE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'last_message_direction') THEN
    ALTER TABLE conversations ADD COLUMN last_message_direction TEXT DEFAULT '';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'last_message_date') THEN
    -- Se já existe como BIGINT, converter
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'last_message_date' AND data_type = 'bigint') THEN
      ALTER TABLE conversations ALTER COLUMN last_message_date TYPE TIMESTAMPTZ USING to_timestamp(last_message_date::double precision / 1000);
    ELSE
      ALTER TABLE conversations ADD COLUMN last_message_date TIMESTAMPTZ;
    END IF;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'last_synced_at') THEN
    ALTER TABLE conversations ADD COLUMN last_synced_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- ============================================
-- CREATE CLASSIFICATION_LOGS TABLE
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
-- CREATE SYNC_LOGS TABLE (if not exists)
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
-- ADD INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_contacts_temperatura ON contacts(temperatura);
CREATE INDEX IF NOT EXISTS idx_contacts_prioridade ON contacts(lead_prioridade);
CREATE INDEX IF NOT EXISTS idx_contacts_resultado ON contacts(resultado_ultimo_contato);
CREATE INDEX IF NOT EXISTS idx_conversations_contact ON conversations(contact_id);
CREATE INDEX IF NOT EXISTS idx_conversations_direction ON conversations(last_message_direction);
CREATE INDEX IF NOT EXISTS idx_classification_contact ON classification_logs(contact_id);
