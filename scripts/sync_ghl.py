#!/usr/bin/env python3
"""
Sync GHL → PostgreSQL
Roda na VPS para sincronizar dados do GHL para o banco local
"""

import os
import sys
import json
import time
import psycopg2
from psycopg2.extras import Json
from datetime import datetime, timedelta
import requests

# Config
GHL_API_KEY = os.environ.get('GHL_API_KEY', '')
GHL_LOCATION_ID = os.environ.get('GHL_LOCATION_ID', 'IBE8l3u7AtR6JuNOOagY')
POSTGRES_URL = os.environ.get('POSTGRES_URL', '')

API_BASE = 'https://services.leadconnectorhq.com'
HEADERS = {
    'Authorization': f'Bearer {GHL_API_KEY}',
    'Version': '2021-07-28',
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json',
}

def get_db_connection():
    """Conecta ao banco PostgreSQL local"""
    return psycopg2.connect(
        host='localhost',
        database='sv_dashboard',
        user='sv_user',
        password='sv_pass_2026'
    )

def fetch_all(url, params=None):
    """Fetch com retry"""
    for attempt in range(3):
        try:
            resp = requests.get(url, headers=HEADERS, params=params, timeout=30)
            if resp.status_code == 200:
                return resp.json()
            print(f"Attempt {attempt+1} failed: {resp.status_code}")
        except Exception as e:
            print(f"Attempt {attempt+1} error: {e}")
        time.sleep(2)
    return None

def fetch_contacts():
    """Busca todos os contacts"""
    contacts = []
    page = 1
    
    while True:
        url = f"{API_BASE}/contacts/"
        params = {'locationId': GHL_LOCATION_ID, 'limit': 100, 'page': page}
        data = fetch_all(url, params)
        
        if not data or 'contacts' not in data:
            break
        
        items = data['contacts']
        contacts.extend(items)
        print(f"  Contacts page {page}: {len(items)} items (total: {len(contacts)})")
        
        if len(items) < 100:
            break
        page += 1
    
    return contacts

def fetch_opportunities():
    """Busca todas as opportunities"""
    opportunities = []
    page = 1
    
    while True:
        url = f"{API_BASE}/opportunities/search"
        # POST request para opportunities
        for attempt in range(3):
            try:
                resp = requests.post(url, headers=HEADERS, json={
                    'locationId': GHL_LOCATION_ID,
                    'limit': 500,
                    'page': page
                }, timeout=30)
                if resp.status_code == 200:
                    data = resp.json()
                    break
                print(f"Attempt {attempt+1} failed: {resp.status_code}")
            except Exception as e:
                print(f"Attempt {attempt+1} error: {e}")
            time.sleep(2)
        else:
            break
        
        if not data or 'opportunities' not in data:
            break
        
        items = data['opportunities']
        opportunities.extend(items)
        print(f"  Opps page {page}: {len(items)} items (total: {len(opportunities)})")
        
        if len(items) < 500:
            break
        page += 1
    
    return opportunities

def fetch_conversations():
    """Busca conversas (4 fatias para maximizar)"""
    conversations = {}
    queries = ['sort=desc', 'sort=asc', 'status=read', 'status=unread']
    
    for query in queries:
        url = f"{API_BASE}/conversations/search?locationId={GHL_LOCATION_ID}&{query}&limit=100"
        data = fetch_all(url)
        
        if not data or 'conversations' not in data:
            continue
        
        for conv in data['conversations']:
            if conv['id'] not in conversations:
                conversations[conv['id']] = conv
        
        print(f"  Convs {query}: {len(data['conversations'])} items")
    
    return list(conversations.values())

def sync_contacts(conn, contacts):
    """Sincroniza contacts"""
    cursor = conn.cursor()
    count = 0
    
    for contact in contacts:
        cid = contact.get('id', '')
        if not cid:
            continue
        
        # Extrair custom fields
        custom_fields = {}
        for cf in contact.get('customFields', []):
            if cf.get('fieldValue'):
                custom_fields[cf['id']] = cf['fieldValue']
        
        # Preparar tags como array Python
        tags_list = contact.get('tags', []) or []
        
        try:
            cursor.execute("""
                INSERT INTO contacts (
                    id, ghl_id, first_name, last_name, email, phone,
                    tags, situacao_comercial, resultado_ultimo_contato, lead_prioridade,
                    segmento_cliente, last_synced_at
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW()
                )
                ON CONFLICT (id) DO UPDATE SET
                    first_name = EXCLUDED.first_name,
                    last_name = EXCLUDED.last_name,
                    email = EXCLUDED.email,
                    phone = EXCLUDED.phone,
                    tags = EXCLUDED.tags,
                    situacao_comercial = COALESCE(NULLIF(EXCLUDED.situacao_comercial, ''), contacts.situacao_comercial),
                    resultado_ultimo_contato = COALESCE(NULLIF(EXCLUDED.resultado_ultimo_contato, ''), contacts.resultado_ultimo_contato),
                    last_synced_at = NOW()
            """, (
                cid, cid,
                contact.get('firstName', ''),
                contact.get('lastName', ''),
                contact.get('email', ''),
                contact.get('phone', ''),
                tags_list,
                custom_fields.get('xkTH0u3d6OujXX9JnIbV', ''),
                custom_fields.get('Kc4ENLzVzFPLEPfouWBp', ''),
                custom_fields.get('viaIw2ZnxFhTimCocmyL', ''),
                custom_fields.get('jYnC5s730WJdWlKCBp7o', ''),
            ))
            count += 1
        except Exception as e:
            print(f"  Error contact {cid}: {e}")
            conn.rollback()
    
    conn.commit()
    cursor.close()
    return count

def sync_opportunities(conn, opportunities):
    """Sincroniza opportunities"""
    cursor = conn.cursor()
    count = 0
    
    for opp in opportunities:
        oid = opp.get('id', '')
        if not oid:
            continue
        
        try:
            cursor.execute("""
                INSERT INTO opportunities (
                    id, ghl_id, name, status, pipeline_id, pipeline_stage_id,
                    monetary_value, contact_id, assigned_to, source,
                    created_at, updated_at, last_synced_at
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW()
                )
                ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    status = EXCLUDED.status,
                    pipeline_id = EXCLUDED.pipeline_id,
                    pipeline_stage_id = EXCLUDED.pipeline_stage_id,
                    monetary_value = EXCLUDED.monetary_value,
                    assigned_to = EXCLUDED.assigned_to,
                    updated_at = EXCLUDED.updated_at,
                    last_synced_at = NOW()
            """, (
                oid, oid,
                opp.get('name', ''),
                opp.get('status', 'open'),
                opp.get('pipelineId', ''),
                opp.get('pipelineStageId', ''),
                opp.get('monetaryValue', 0),
                opp.get('contactId', ''),
                opp.get('assignedTo', ''),
                opp.get('source', ''),
                opp.get('createdAt'),
                opp.get('updatedAt'),
            ))
            count += 1
        except Exception as e:
            print(f"  Error opp {oid}: {e}")
    
    conn.commit()
    cursor.close()
    return count

def sync_conversations(conn, conversations):
    """Sincroniza conversations"""
    cursor = conn.cursor()
    count = 0
    
    for conv in conversations:
        cid = conv.get('id', '')
        if not cid:
            continue
        
        try:
            cursor.execute("""
                INSERT INTO conversations (
                    id, ghl_id, contact_id, contact_name, assigned_to,
                    last_message, last_message_direction, last_message_date,
                    unread_count, last_synced_at
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW()
                )
                ON CONFLICT (id) DO UPDATE SET
                    contact_id = EXCLUDED.contact_id,
                    contact_name = EXCLUDED.contact_name,
                    assigned_to = EXCLUDED.assigned_to,
                    last_message = EXCLUDED.last_message,
                    unread_count = EXCLUDED.unread_count,
                    last_synced_at = NOW()
            """, (
                cid, cid,
                conv.get('contactId', ''),
                conv.get('contactName', ''),
                conv.get('assignedTo', ''),
                (conv.get('lastMessage') or '')[:500],
                'inbound' if conv.get('lastMessageDate', 0) > 0 else 'outbound',
                datetime.fromtimestamp(conv.get('lastMessageDate', 0) / 1000) if conv.get('lastMessageDate') else None,
                conv.get('unreadCount', 0),
            ))
            count += 1
        except Exception as e:
            print(f"  Error conv {cid}: {e}")
    
    conn.commit()
    cursor.close()
    return count

def main():
    print(f"[{datetime.now()}] Starting GHL sync...")
    
    if not GHL_API_KEY:
        print("ERROR: GHL_API_KEY not set")
        sys.exit(1)
    
    conn = get_db_connection()
    
    try:
        # 1. Sync Contacts
        print("\n[1/3] Syncing contacts...")
        contacts = fetch_contacts()
        print(f"  Fetched {len(contacts)} contacts")
        if contacts:
            synced = sync_contacts(conn, contacts)
            print(f"  Synced {synced} contacts")
        
        # 2. Sync Opportunities
        print("\n[2/3] Syncing opportunities...")
        opportunities = fetch_opportunities()
        print(f"  Fetched {len(opportunities)} opportunities")
        if opportunities:
            synced = sync_opportunities(conn, opportunities)
            print(f"  Synced {synced} opportunities")
        
        # 3. Sync Conversations
        print("\n[3/3] Syncing conversations...")
        conversations = fetch_conversations()
        print(f"  Fetched {len(conversations)} conversations")
        if conversations:
            synced = sync_conversations(conn, conversations)
            print(f"  Synced {synced} conversations")
        
        print(f"\n[{datetime.now()}] Sync complete!")
        
    finally:
        conn.close()

if __name__ == '__main__':
    main()
