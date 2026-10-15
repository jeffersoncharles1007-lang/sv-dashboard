import postgres, { type Row } from 'postgres';

const connectionString = process.env.POSTGRES_URL;

if (!connectionString) {
  throw new Error('POSTGRES_URL environment variable is not set');
}

export const sql = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

// Types
export interface DbOpportunity {
  id: string;
  ghl_id: string;
  name: string;
  status: string;
  pipeline_id?: string;
  pipeline_stage_id: string;
  monetary_value: number;
  contact_id: string;
  assigned_to?: string;
  source?: string;
  created_at?: string;
  updated_at?: string;
  last_synced_at: string;
}

export interface DbContact {
  id: string;
  ghl_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  tags: string[];
  assigned_to?: string;
  source?: string;
  created_at?: string;
  situacao_comercial: string;
  resultado_ultimo_contato: string;
  lead_prioridade: string;
  segmento_cliente: string;
  last_synced_at: string;
}

// Helper functions
export async function upsertContact(contact: Partial<DbContact>): Promise<void> {
  const id = contact.id || '';
  const ghl_id = contact.ghl_id || '';
  const first_name = contact.first_name || '';
  const last_name = contact.last_name || '';
  const email = contact.email || '';
  const phone = contact.phone || '';
  const situacao_comercial = contact.situacao_comercial || '';
  const resultado_ultimo_contato = contact.resultado_ultimo_contato || '';
  const lead_prioridade = contact.lead_prioridade || '';
  const segmento_cliente = contact.segmento_cliente || '';
  const tags = contact.tags || [];
  
  await sql`INSERT INTO contacts (
    id, ghl_id, first_name, last_name, email, phone,
    situacao_comercial, resultado_ultimo_contato, lead_prioridade,
    segmento_cliente, tags, last_synced_at
  ) VALUES (
    ${id}, ${ghl_id}, ${first_name}, ${last_name}, ${email}, ${phone},
    ${situacao_comercial}, ${resultado_ultimo_contato}, ${lead_prioridade},
    ${segmento_cliente}, ${tags}, NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    situacao_comercial = EXCLUDED.situacao_comercial,
    resultado_ultimo_contato = EXCLUDED.resultado_ultimo_contato,
    lead_prioridade = EXCLUDED.lead_prioridade,
    segmento_cliente = EXCLUDED.segmento_cliente,
    tags = EXCLUDED.tags,
    last_synced_at = NOW()`;
}

export async function upsertOpportunity(opp: Partial<DbOpportunity>): Promise<void> {
  const id = opp.id || '';
  const ghl_id = opp.ghl_id || '';
  const name = opp.name || '';
  const monetary_value = opp.monetary_value || 0;
  const pipeline_stage_id = opp.pipeline_stage_id || '';
  const status = opp.status || 'open';
  const contact_id = opp.contact_id || '';
  
  await sql`INSERT INTO opportunities (
    id, ghl_id, name, monetary_value, pipeline_stage_id,
    status, contact_id, last_synced_at
  ) VALUES (
    ${id}, ${ghl_id}, ${name}, ${monetary_value}, ${pipeline_stage_id},
    ${status}, ${contact_id}, NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    monetary_value = EXCLUDED.monetary_value,
    pipeline_stage_id = EXCLUDED.pipeline_stage_id,
    status = EXCLUDED.status,
    last_synced_at = NOW()`;
}

export async function getContacts(filters?: { situacao_comercial?: string }): Promise<Row[]> {
  if (filters?.situacao_comercial) {
    return sql`SELECT * FROM contacts WHERE situacao_comercial = ${filters.situacao_comercial}`;
  }
  return sql`SELECT * FROM contacts`;
}

export async function getOpportunities(): Promise<Row[]> {
  return sql`SELECT * FROM opportunities`;
}

export async function createSyncLog(syncType: string): Promise<number> {
  const [result] = await sql`INSERT INTO sync_logs (sync_type, started_at, status) VALUES (${syncType}, NOW(), 'running') RETURNING id`;
  return result.id;
}

export async function finishSyncLog(id: number, recordsCount: number, status: string, error?: string): Promise<void> {
  await sql`UPDATE sync_logs SET finished_at = NOW(), status = ${status}, records_synced = ${recordsCount}, error_message = ${error || null} WHERE id = ${id}`;
}
