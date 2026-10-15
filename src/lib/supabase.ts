import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types for our data
export interface DbOpportunity {
  id: string;
  name: string;
  status: string;
  pipeline_id: string;
  pipeline_stage_id: string;
  monetary_value: number;
  contact_id: string;
  assigned_to: string;
  source: string;
  created_at: string;
  updated_at: string;
  data_orcamento: string | null;
  dias_parado: number | null;
  desconto_pct: number | null;
  margem_pct: number | null;
  id_orcamento: string | null;
  filial: string | null;
  last_synced: string;
}

export interface DbContact {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  tags: string[];
  assigned_to: string;
  source: string;
  created_at: string;
  last_synced: string;
}

export interface DbConversation {
  id: string;
  contact_id: string;
  contact_name: string;
  assigned_to: string;
  last_message: string;
  last_message_date: number;
  unread_count: number;
  last_synced: string;
}

export interface DailyMetrics {
  date: string;
  contacts_created: number;
  conversations: number;
  interested: number;
  budgets_created: number;
  won: number;
  lost: number;
}
