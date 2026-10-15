import { LOCATION_ID, API_BASE, USER_MAP } from './constants';

const headers = {
  'Authorization': `Bearer ${process.env.GHL_API_KEY}`,
  'Version': '2021-07-28',
  'Content-Type': 'application/json',
  'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json',
};

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

export async function fetchOpportunities(): Promise<Opportunity[]> {
  const allOpps: Opportunity[] = [];
  let page = 1;
  
  while (true) {
    const res = await fetch(`${API_BASE}/opportunities/search`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        location_id: LOCATION_ID,
        limit: 500,
        page,
      }),
    });
    
    if (!res.ok) throw new Error(`GHL API error: ${res.status}`);
    const data = await res.json();
    const opps = data.opportunities || [];
    allOpps.push(...opps);
    if (opps.length < 500 || !data.total || page >= Math.ceil(data.total / 500)) break;
    page++;
  }
  
  return allOpps;
}

export async function fetchContacts(): Promise<Contact[]> {
  const allContacts: Contact[] = [];
  let page = 1;
  
  while (true) {
    const res = await fetch(`${API_BASE}/contacts/?locationId=${LOCATION_ID}&limit=100&page=${page}`, {
      headers,
    });
    
    if (!res.ok) throw new Error(`GHL API error: ${res.status}`);
    const data = await res.json();
    const contacts = data.contacts || [];
    allContacts.push(...contacts);
    if (contacts.length < 100) break;
    page++;
  }
  
  return allContacts;
}

export async function fetchConversations(): Promise<Conversation[]> {
  const allConvs: Record<string, Conversation> = {};
  
  // Fetch with different queries to maximize results (up to ~300)
  const queries = ['sort=desc', 'sort=asc', 'status=read', 'status=unread'];
  
  for (const query of queries) {
    const res = await fetch(
      `${API_BASE}/conversations/search?locationId=${LOCATION_ID}&${query}&limit=100`,
      { headers }
    );
    
    if (!res.ok) continue;
    const data = await res.json();
    const convs: Conversation[] = data.conversations || [];
    
    for (const conv of convs) {
      if (!allConvs[conv.id]) {
        allConvs[conv.id] = conv;
      }
    }
  }
  
  return Object.values(allConvs);
}

export async function fetchUsers() {
  const res = await fetch(`${API_BASE}/users/?locationId=${LOCATION_ID}`, { headers });
  if (!res.ok) return USER_MAP;
  const data = await res.json();
  return data.users?.reduce((acc: Record<string, string>, u: any) => {
    acc[u.id] = `${u.firstName} ${u.lastName}`;
    return acc;
  }, { ...USER_MAP }) || USER_MAP;
}

export function getUserName(userId: string): string {
  return USER_MAP[userId] || userId;
}
