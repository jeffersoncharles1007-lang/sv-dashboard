#!/usr/bin/env python3
"""
SV Dashboard Sync - GHL → Supabase
Uso: python3 sv-dashboard-sync.py

Dados sincronizados:
- Oportunidades: todas do GHL
- Contatos: todos do GHL  
- Conversas: ~300 mais recentes
"""
import json
import time
import urllib.request
from datetime import datetime, timezone

# Ler credenciais do .env.local
ghl_key = None
env_file = '/root/agentes-memoria/clientes/sv-eletrica/dashboard/.env.local'
with open(env_file) as f:
    for line in f:
        if line.startswith('GHL_API_KEY='):
            ghl_key = line.split('=')[1].strip()
            break

SUPABASE_URL = 'https://nbaztyaazzdmbqulxmaw.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5iYXp0eWFhenpkbWJxdWx4bWF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzOTc4OTgsImV4cCI6MjA4OTk3Mzg5OH0.mdXxi3CFP4y1xMWtsyARNSq9dpga6QC_mLWDFY8HcXw'
LOCATION_ID = 'IBE8l3u7AtR6JuNOOagY'
API_BASE = 'https://services.leadconnectorhq.com'

GHL_HEADERS = {
    'Authorization': f'Bearer {ghl_key}',
    'Version': '2021-07-28',
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
}

SB_HEADERS = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'resolution=merge-duplicates'
}

def ghl_post(url, body):
    req = urllib.request.Request(url, data=json.dumps(body).encode(), headers=GHL_HEADERS, method='POST')
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.loads(resp.read())

def ghl_get(url):
    req = urllib.request.Request(url, headers=GHL_HEADERS)
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.loads(resp.read())

def supabase_upsert(table, records):
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    req = urllib.request.Request(url, data=json.dumps(records).encode(), headers=SB_HEADERS, method='POST')
    with urllib.request.urlopen(req, timeout=120) as resp:
        return {'success': True, 'status': resp.status}

def sync_opportunities():
    print("\n📥 Sincronizando Oportunidades...")
    url = f"{API_BASE}/opportunities/search"
    all_opps = []
    page = 1
    
    while True:
        data = ghl_post(url, {"locationId": LOCATION_ID, "limit": 500, "page": page})
        opps = data.get('opportunities', []) or []
        all_opps.extend(opps)
        print(f"  Página {page}: {len(opps)} opps")
        if len(opps) < 500:
            break
        page += 1
        time.sleep(0.3)
    
    mapped = [{'id': o.get('id'), 'name': o.get('name'), 'status': o.get('status'),
        'pipeline_id': o.get('pipelineId'), 'pipeline_stage_id': o.get('pipelineStageId'),
        'monetary_value': float(o.get('monetaryValue') or 0), 'contact_id': o.get('contactId'),
        'assigned_to': o.get('assignedTo'), 'source': o.get('source'),
        'created_at': o.get('createdAt'), 'updated_at': o.get('updatedAt'), 'last_synced': 'now()'} for o in all_opps]
    
    for i in range(0, len(mapped), 500):
        supabase_upsert('sv_opportunities', mapped[i:i+500])
    print(f"✅ {len(mapped)} oportunidades sincronizadas")

def sync_contacts():
    print("\n📥 Sincronizando Contatos...")
    all_contacts = []
    page = 1
    
    while page <= 100:
        data = ghl_get(f"{API_BASE}/contacts/?locationId={LOCATION_ID}&limit=100&page={page}")
        contacts = data.get('contacts', []) or []
        if not contacts or len(contacts) < 100:
            all_contacts.extend(contacts)
            break
        all_contacts.extend(contacts)
        page += 1
        time.sleep(0.2)
    
    mapped = [{'id': c.get('id'), 'first_name': c.get('firstName'), 'last_name': c.get('lastName'),
        'email': c.get('email'), 'phone': c.get('phone'), 'tags': c.get('tags', []),
        'assigned_to': c.get('assignedTo'), 'source': c.get('source'),
        'created_at': c.get('dateAdded') or c.get('createdAt'), 'last_synced': 'now()'} for c in all_contacts]
    
    for i in range(0, len(mapped), 500):
        supabase_upsert('sv_contacts', mapped[i:i+500])
    print(f"✅ {len(mapped)} contatos sincronizados")

def sync_conversations():
    print("\n📥 Sincronizando Conversas...")
    slices = ["sort=desc", "sort=asc", "status=read", "status=unread"]
    all_convs = {}
    
    for q in slices:
        data = ghl_get(f"{API_BASE}/conversations/search?locationId={LOCATION_ID}&limit=100&{q}")
        for c in (data.get('conversations', []) or []):
            if c.get('id') not in all_convs:
                all_convs[c.get('id')] = c
        time.sleep(0.3)
    
    mapped = [{'id': conv.get('id'), 'contact_id': conv.get('contactId'),
        'contact_name': conv.get('contactName') or conv.get('fullName'),
        'assigned_to': conv.get('assignedTo'), 'last_message': conv.get('lastMessageBody'),
        'last_message_date': conv.get('lastMessageDate'),
        'last_message_direction': conv.get('lastMessageDirection'),
        'unread_count': conv.get('unreadCount', 0), 'last_synced': 'now()'} for conv in all_convs.values()]
    
    for i in range(0, len(mapped), 500):
        supabase_upsert('sv_conversations', mapped[i:i+500])
    print(f"✅ {len(mapped)} conversas sincronizadas")

if __name__ == '__main__':
    print("=" * 50)
    print("SV Dashboard Sync - GHL → Supabase")
    print("=" * 50)
    sync_opportunities()
    sync_contacts()
    sync_conversations()
    print("\n🎉 Sync completo!")
