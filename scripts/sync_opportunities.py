#!/usr/bin/env python3
"""
Sync Opportunities do GHL para Supabase
"""
import os
import requests
from supabase import create_client, Client

# Config
GHL_API_KEY = os.environ.get('GHL_API_KEY')
LOCATION_ID = os.environ.get('GHL_LOCATION_ID', 'IBE8l3u7AtR6JuNOOagY')
SUPABASE_URL = os.environ.get('SUPABASE_URL')
SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_KEY')

API_BASE = 'https://services.leadstage.com.br/v2'

headers = {
    'Authorization': f'Bearer {GHL_API_KEY}',
    'Version': '2021-07-28',
    'Content-Type': 'application/json',
}

def fetch_opportunities():
    """Busca todas as opportunities do GHL"""
    all_opps = []
    page = 1
    
    while True:
        url = f'{API_BASE}/opportunities/search'
        payload = {
            'location_id': LOCATION_ID,
            'limit': 500,
            'page': page,
        }
        
        resp = requests.post(url, headers=headers, json=payload)
        if not resp.ok:
            print(f"Erro ao buscar opportunities: {resp.status_code}")
            break
            
        data = resp.json()
        opps = data.get('opportunities', [])
        
        for opp in opps:
            processed = {
                'id': opp['id'],
                'ghl_id': opp['id'],
                'name': opp.get('name', ''),
                'monetary_value': opp.get('monetaryValue', 0) or 0,
                'pipeline_stage_id': opp.get('pipelineStageId', ''),
                'status': opp.get('status', 'open'),
                'contact_id': opp.get('contactId', ''),
            }
            all_opps.append(processed)
        
        total = data.get('total', 0)
        if len(opps) < 500 or page >= (total / 500 if total else 1):
            break
        page += 1
    
    return all_opps

def sync_to_supabase(opportunities):
    """Upsert opportunities no Supabase"""
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("ERRO: SUPABASE_URL e SUPABASE_SERVICE_KEY são necessários")
        return 0
    
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    synced = 0
    for opp in opportunities:
        result = supabase.table('opportunities').upsert(
            opp,
            on_conflict='id'
        ).execute()
        
        if result.data:
            synced += 1
    
    return synced

def main():
    print("=== Sync Opportunities GHL -> Supabase ===")
    
    opportunities = fetch_opportunities()
    print(f"Total de opportunities encontradas: {len(opportunities)}")
    
    if opportunities:
        # Estatísticas
        open_count = sum(1 for o in opportunities if o['status'] == 'open')
        won_count = sum(1 for o in opportunities if o['status'] == 'won')
        lost_count = sum(1 for o in opportunities if o['status'] == 'lost')
        total_value = sum(o['monetary_value'] for o in opportunities)
        open_value = sum(o['monetary_value'] for o in opportunities if o['status'] == 'open')
        
        print(f"\nEstatísticas:")
        print(f"  Abertas: {open_count} (R$ {open_value:,.2f})")
        print(f"  Ganhas: {won_count}")
        print(f"  Perdidas: {lost_count}")
        print(f"  Valor Total Pipeline: R$ {total_value:,.2f}")
        
        synced = sync_to_supabase(opportunities)
        print(f"\nOpportunities sincronizadas: {synced}")

if __name__ == '__main__':
    main()
