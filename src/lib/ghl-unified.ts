/**
 * GHL Unified - Suporta API Key e CLI Mode
 * 
 * Modo API (padrão, para produção/Vercel):
 *   - Usa GHL_API_KEY direto
 * 
 * Modo CLI (para debugging local):
 *   - Exporta dados via CLI e processa localmente
 *   - Útil para debug ou quando API tem limitações
 * 
 * Para ativar CLI mode: GHL_CLI_MODE=true na env var
 */

import { LOCATION_ID, API_BASE, USER_MAP } from './constants';

// ============================================
// TYPES
// ============================================
export interface Opportunity {
  id: string;
  name: string;
  status: string;
  pipelineId: string;
  pipelineStageId: string;
  monetaryValue: number;
  contactId: string;
  assignedTo: string;
  source: string;
  createdAt: string;
  updatedAt: string;
  customFields: Array<{ id: string; fieldValue: string }>;
}

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  tags: string[];
  customFields?: Array<{ id: string; fieldValue: string }>;
  assignedTo: string;
  source: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  contactId: string;
  contactName: string;
  assignedTo: string;
  lastMessage: string;
  lastMessageDate: number;
  unreadCount: number;
}

// ============================================
// API MODE (padrão)
// ============================================
const apiHeaders = () => ({
  'Authorization': `Bearer ${process.env.GHL_API_KEY}`,
  'Version': '2021-07-28',
  'Content-Type': 'application/json',
  'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json',
});

async function apiFetch(url: string, options: RequestInit = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      ...apiHeaders(),
      ...options.headers,
    },
  });
  if (!res.ok) {
    throw new Error(`GHL API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

// ============================================
// CLI MODE (alternativo)
// ============================================
/**
 * Executa comandos da CLI do GHL localmente
 * Útil para debugging ou quando a API tem limitações
 */
async function cliExec(command: string, args: string[] = []): Promise<string> {
  const { execSync } = await import('child_process');
  
  const cliPath = process.env.GHL_CLI_PATH || '/root/.hermes/profiles/setup-crm/ghl.py';
  const account = process.env.GHL_CLI_ACCOUNT || 'sv_eletrica';
  
  const fullCommand = [
    'python3', cliPath,
    ...args,
    '-a', account,
    command
  ];
  
  try {
    const output = execSync(fullCommand.join(' '), {
      encoding: 'utf-8',
      maxBuffer: 50 * 1024 * 1024, // 50MB
    });
    return output;
  } catch (error: any) {
    throw new Error(`CLI error: ${error.message}`);
  }
}

// ============================================
// UNIFIED FUNCTIONS
// ============================================

/**
 * Detecta qual modo está ativo
 */
function isCliMode(): boolean {
  return process.env.GHL_CLI_MODE === 'true' && process.env.GHL_API_KEY === undefined;
}

/**
 * Fetch Opportunities - suporta API e CLI
 */
export async function fetchOpportunities(): Promise<Opportunity[]> {
  if (isCliMode()) {
    // CLI Mode - exportar via CLI
    const output = await cliExec('opportunities');
    return JSON.parse(output);
  }
  
  // API Mode
  const allOpps: Opportunity[] = [];
  let page = 1;

  while (true) {
    const data = await apiFetch(`${API_BASE}/opportunities/search`, {
      method: 'POST',
      body: JSON.stringify({
        locationId: LOCATION_ID,
        limit: 500,
        page,
      }),
    });
    
    const opps = data.opportunities || [];
    allOpps.push(...opps);
    
    if (opps.length < 500 || !data.total || page >= Math.ceil(data.total / 500)) {
      break;
    }
    page++;
  }

  return allOpps;
}

/**
 * Fetch Contacts - suporta API e CLI
 */
export async function fetchContacts(): Promise<Contact[]> {
  if (isCliMode()) {
    const output = await cliExec('contacts');
    return JSON.parse(output);
  }
  
  const allContacts: Contact[] = [];
  let page = 1;

  while (true) {
    const data = await apiFetch(
      `${API_BASE}/contacts/?locationId=${LOCATION_ID}&limit=100&page=${page}`
    );
    
    const contacts = data.contacts || [];
    allContacts.push(...contacts);
    
    if (contacts.length < 100) break;
    page++;
  }

  return allContacts;
}

/**
 * Fetch Conversations - suporta API e CLI
 * Nota: API retorna max ~300 conversas, CLI pode ajudar
 */
export async function fetchConversations(): Promise<Conversation[]> {
  if (isCliMode()) {
    const output = await cliExec('conversations');
    return JSON.parse(output);
  }
  
  // API Mode - usar 4 fatias para maximizar cobertura
  const allConvs: Record<string, Conversation> = {};
  const queries = ['sort=desc', 'sort=asc', 'status=read', 'status=unread'];

  for (const query of queries) {
    try {
      const data = await apiFetch(
        `${API_BASE}/conversations/search?locationId=${LOCATION_ID}&${query}&limit=100`
      );
      
      const convs: Conversation[] = data.conversations || [];
      
      for (const conv of convs) {
        if (!allConvs[conv.id]) {
          allConvs[conv.id] = conv;
        }
      }
    } catch (error) {
      console.error(`Error fetching conversations with ${query}:`, error);
    }
  }

  return Object.values(allConvs);
}

/**
 * Fetch Users
 */
export async function fetchUsers() {
  if (isCliMode()) {
    const output = await cliExec('users');
    const users = JSON.parse(output);
    return users.reduce((acc: Record<string, string>, u: any) => {
      acc[u.id] = `${u.firstName} ${u.lastName}`;
      return acc;
    }, { ...USER_MAP });
  }
  
  try {
    const data = await apiFetch(`${API_BASE}/users/?locationId=${LOCATION_ID}`);
    return data.users?.reduce((acc: Record<string, string>, u: any) => {
      acc[u.id] = `${u.firstName} ${u.lastName}`;
      return acc;
    }, { ...USER_MAP }) || USER_MAP;
  } catch {
    return USER_MAP;
  }
}

/**
 * Get User Name by ID
 */
export function getUserName(userId: string): string {
  return USER_MAP[userId] || userId;
}

/**
 * Get custom field value from contact
 */
export function getCustomField(contact: Contact, fieldId: string): string {
  const field = contact.customFields?.find(f => f.id === fieldId);
  return field?.fieldValue || '';
}

/**
 * Update contact custom fields via API
 */
export async function updateContactFields(
  contactId: string,
  fields: Array<{ id: string; field_value: string }>
): Promise<void> {
  if (isCliMode()) {
    throw new Error('CLI mode does not support writes');
  }
  
  await apiFetch(`${API_BASE}/contacts/${contactId}`, {
    method: 'PUT',
    body: JSON.stringify({
      customFields: fields,
    }),
  });
}

/**
 * Add tags to contact
 */
export async function addContactTags(
  contactId: string,
  tags: string[]
): Promise<void> {
  if (isCliMode()) {
    throw new Error('CLI mode does not support writes');
  }
  
  await apiFetch(`${API_BASE}/contacts/${contactId}/tags`, {
    method: 'POST',
    body: JSON.stringify({ tags }),
  });
}

/**
 * Remove tag from contact
 */
export async function removeContactTag(
  contactId: string,
  tag: string
): Promise<void> {
  if (isCliMode()) {
    throw new Error('CLI mode does not support writes');
  }
  
  await apiFetch(`${API_BASE}/contacts/${contactId}/tags`, {
    method: 'DELETE',
    body: JSON.stringify({ tags: [tag] }),
  });
}

// ============================================
// EXPORTS
// ============================================
export default {
  fetchOpportunities,
  fetchContacts,
  fetchConversations,
  fetchUsers,
  getUserName,
  getCustomField,
  updateContactFields,
  addContactTags,
  removeContactTag,
  isCliMode,
};
