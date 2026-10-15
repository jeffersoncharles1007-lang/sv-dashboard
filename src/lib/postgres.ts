/* eslint-disable @typescript-eslint/no-explicit-any */
import postgres from 'postgres';

let _sql: any = null;

function getSql(): any {
  if (!_sql) {
    const connectionString = process.env.POSTGRES_URL;
    if (!connectionString) {
      throw new Error('POSTGRES_URL environment variable is not set');
    }
    _sql = postgres(connectionString, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
    });
  }
  return _sql;
}

// Tagged template function - lazy initialization
async function sqlTag(strings: TemplateStringsArray, ...values: unknown[]) {
  return getSql()(strings, ...values);
}

// Export as both the function and explicit name
export const sql = sqlTag;
export { sqlTag };

// Types for our data
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
  data_ultimo_contato?: string;
  lead_prioridade: string;
  segmento_cliente: string;
  temperatura: string;
  proxima_acao: string;
  last_synced_at: string;
}

export interface DbConversation {
  id: string;
  ghl_id: string;
  contact_id: string;
  contact_name: string;
  assigned_to: string;
  last_message: string;
  last_message_direction: string;
  last_message_date?: string;
  unread_count: number;
  last_synced_at: string;
}

export interface SyncLog {
  id: number;
  sync_type: string;
  records_synced: number;
  started_at: Date;
  finished_at?: Date;
  status: string;
  error_message?: string;
}

// Input types
export interface ContactInput {
  id: string;
  ghl_id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  tags?: string[];
  assigned_to?: string;
  source?: string;
  situacao_comercial?: string;
  resultado_ultimo_contato?: string;
  data_ultimo_contato?: Date | null;
  lead_prioridade?: string;
  segmento_cliente?: string;
  temperatura?: string;
  proxima_acao?: string;
}

export interface OpportunityInput {
  id: string;
  ghl_id: string;
  name?: string;
  status?: string;
  pipeline_id?: string;
  pipeline_stage_id?: string;
  monetary_value?: number;
  contact_id?: string;
  assigned_to?: string;
  source?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface ConversationInput {
  id: string;
  ghl_id: string;
  contact_id?: string;
  contact_name?: string;
  assigned_to?: string;
  last_message?: string;
  last_message_direction?: string;
  last_message_date?: Date | null;
  unread_count?: number;
}

// Database helper functions
export async function upsertContact(contact: ContactInput): Promise<void> {
  const firstName = contact.first_name ?? '';
  const lastName = contact.last_name ?? '';
  const email = contact.email ?? '';
  const phone = contact.phone ?? '';
  const tags = contact.tags ?? [];
  const assignedTo = contact.assigned_to ?? '';
  const source = contact.source ?? '';
  const situacao = contact.situacao_comercial ?? '';
  const resultado = contact.resultado_ultimo_contato ?? '';
  const prioridade = contact.lead_prioridade ?? 'media';
  const segmento = contact.segmento_cliente ?? '';
  const temperatura = contact.temperatura ?? 'morno';
  const proximaAcao = contact.proxima_acao ?? '';
  const dataUltimoContato = contact.data_ultimo_contato ?? null;

  await sqlTag`
    INSERT INTO contacts (
      id, ghl_id, first_name, last_name, email, phone,
      tags, assigned_to, source,
      situacao_comercial, resultado_ultimo_contato, data_ultimo_contato, lead_prioridade,
      segmento_cliente, temperatura, proxima_acao, last_synced_at
    ) VALUES (
      ${contact.id}, ${contact.ghl_id}, ${firstName}, ${lastName},
      ${email}, ${phone},
      ${tags}, ${assignedTo}, ${source},
      ${situacao}, ${resultado}, ${dataUltimoContato}, ${prioridade},
      ${segmento}, ${temperatura}, ${proximaAcao}, NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      email = EXCLUDED.email,
      phone = EXCLUDED.phone,
      tags = EXCLUDED.tags,
      assigned_to = EXCLUDED.assigned_to,
      source = EXCLUDED.source,
      situacao_comercial = EXCLUDED.situacao_comercial,
      resultado_ultimo_contato = EXCLUDED.resultado_ultimo_contato,
      data_ultimo_contato = EXCLUDED.data_ultimo_contato,
      lead_prioridade = EXCLUDED.lead_prioridade,
      segmento_cliente = EXCLUDED.segmento_cliente,
      temperatura = EXCLUDED.temperatura,
      proxima_acao = EXCLUDED.proxima_acao,
      last_synced_at = NOW()
  `;
}

export async function upsertOpportunity(opp: OpportunityInput): Promise<void> {
  const name = opp.name ?? '';
  const status = opp.status ?? 'open';
  const pipelineId = opp.pipeline_id ?? '';
  const pipelineStageId = opp.pipeline_stage_id ?? '';
  const monetaryValue = opp.monetary_value ?? 0;
  const contactId = opp.contact_id ?? '';
  const assignedTo = opp.assigned_to ?? '';
  const source = opp.source ?? '';
  const createdAt = opp.created_at ?? new Date();
  const updatedAt = opp.updated_at ?? new Date();

  await sqlTag`
    INSERT INTO opportunities (
      id, ghl_id, name, status, pipeline_id, pipeline_stage_id,
      monetary_value, contact_id, assigned_to, source,
      created_at, updated_at, last_synced_at
    ) VALUES (
      ${opp.id}, ${opp.ghl_id}, ${name}, ${status}, ${pipelineId}, ${pipelineStageId},
      ${monetaryValue}, ${contactId}, ${assignedTo}, ${source},
      ${createdAt}, ${updatedAt}, NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      status = EXCLUDED.status,
      pipeline_id = EXCLUDED.pipeline_id,
      pipeline_stage_id = EXCLUDED.pipeline_stage_id,
      monetary_value = EXCLUDED.monetary_value,
      contact_id = EXCLUDED.contact_id,
      assigned_to = EXCLUDED.assigned_to,
      source = EXCLUDED.source,
      updated_at = EXCLUDED.updated_at,
      last_synced_at = NOW()
  `;
}

export async function upsertConversation(conv: ConversationInput): Promise<void> {
  const contactId = conv.contact_id ?? '';
  const contactName = conv.contact_name ?? '';
  const assignedTo = conv.assigned_to ?? '';
  const lastMessage = conv.last_message ?? '';
  const direction = conv.last_message_direction ?? '';
  const lastMessageDate = conv.last_message_date ?? null;
  const unreadCount = conv.unread_count ?? 0;

  await sqlTag`
    INSERT INTO conversations (
      id, ghl_id, contact_id, contact_name, assigned_to,
      last_message, last_message_direction, last_message_date,
      unread_count, last_synced_at
    ) VALUES (
      ${conv.id}, ${conv.ghl_id}, ${contactId}, ${contactName}, ${assignedTo},
      ${lastMessage}, ${direction}, ${lastMessageDate},
      ${unreadCount}, NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      contact_id = EXCLUDED.contact_id,
      contact_name = EXCLUDED.contact_name,
      assigned_to = EXCLUDED.assigned_to,
      last_message = EXCLUDED.last_message,
      last_message_direction = EXCLUDED.last_message_direction,
      last_message_date = EXCLUDED.last_message_date,
      unread_count = EXCLUDED.unread_count,
      last_synced_at = NOW()
  `;
}

export async function getContacts(): Promise<any[]> {
  return sqlTag`SELECT * FROM contacts`;
}

export async function getOpportunities(): Promise<any[]> {
  return sqlTag`SELECT * FROM opportunities`;
}

export async function getConversations(): Promise<any[]> {
  return sqlTag`SELECT * FROM conversations ORDER BY last_message_date DESC`;
}

export async function createSyncLog(syncType: string): Promise<number> {
  const result = await sqlTag`
    INSERT INTO sync_logs (sync_type, started_at, status)
    VALUES (${syncType}, NOW(), 'running')
    RETURNING id
  `;
  return result[0].id;
}

export async function finishSyncLog(id: number, recordsSynced: number, status: string, errorMessage?: string): Promise<void> {
  const errorMsg = errorMessage ?? null;
  await sqlTag`
    UPDATE sync_logs SET
      finished_at = NOW(),
      records_synced = ${recordsSynced},
      status = ${status},
      error_message = ${errorMsg}
    WHERE id = ${id}
  `;
}

export async function logClassification(
  contactId: string,
  conversationId: string | null,
  classificacao: string,
  temperatura: string,
  prioridade: string,
  mensagemOriginal: string | null
): Promise<void> {
  await sqlTag`
    INSERT INTO classification_logs (
      contact_id, conversation_id, classificacao, temperatura, prioridade, mensagem_original
    ) VALUES (
      ${contactId}, ${conversationId}, ${classificacao}, ${temperatura}, ${prioridade}, ${mensagemOriginal}
    )
  `;
}
