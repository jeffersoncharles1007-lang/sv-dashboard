#!/usr/bin/env python3
"""
Sync Contacts + Custom Fields + Tags do GHL para Supabase
"""
import os
import requests
import json
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

# Mapeamento de Custom Fields do GHL
CUSTOM_FIELDS_MAP = {
    'contactsituacao_comercial': 'situacao_comercial',
    'contactresultado_ultimo_contato': 'resultado_ultimo_contato',
    'contactlead_prioridade': 'lead_prioridade',
    'contactsegmento_do_cliente': 'segmento_cliente',
}

def fetch_contacts():
    """Busca todos os contacts do GHL com Custom Fields"""
    all_contacts = []
    page = 1
    
    while True:
        url = f'{API_BASE}/contacts/'
        params = {
            'locationId': LOCATION_ID,
            'limit': 100,
            'page': page
        }
        
        resp = requests.get(url, headers=headers, params=params)
        if not resp.ok:
            print(f"Erro ao buscar contacts: {resp.status_code}")
            break
            
        data = resp.json()
        contacts = data.get('contacts', [])
        
        for contact in contacts:
            # Extrair custom fields
            custom_fields = {}
            for cf_id, col_name in CUSTOM_FIELDS_MAP.items():
                # Procura o custom field com id que contenha o nome
                for field in contact.get('customFields', []):
                    if cf_id.lower() in field.get('id', '').lower() or field.get('id', '').endswith(cf_id):
                        custom_fields[col_name] = field.get('field_value', '')
                        break
                else:
                    custom_fields[col_name] = ''
            
            processed = {
                'id': contact['id'],
                'ghl_id': contact['id'],
                'first_name': contact.get('firstName', ''),
                'last_name': contact.get('lastName', ''),
                'email': contact.get('email', ''),
                'phone': contact.get('phone', ''),
                'situacao_comercial': custom_fields.get('situacao_comercial', ''),
                'resultado_ultimo_contato': custom_fields.get('resultado_ultimo_contato', ''),
                'lead_prioridade': custom_fields.get('lead_prioridade', ''),
                'segmento_cliente': custom_fields.get('segmento_cliente', ''),
                'tags': contact.get('tags', []),
            }
            all_contacts.append(processed)
        
        if len(contacts) < 100:
            break
        page += 1
    
    return all_contacts

def sync_to_supabase(contacts):
    """Upsert contacts no Supabase"""
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("ERRO: SUPABASE_URL e SUPABASE_SERVICE_KEY são necessários")
        return 0
    
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    synced = 0
    for contact in contacts:
        result = supabase.table('contacts').upsert(
            contact,
            on_conflict='id'
        ).execute()
        
        if result.data:
            synced += 1
    
    return synced

def main():
    print("=== Sync Contacts GHL -> Supabase ===")
    
    contacts = fetch_contacts()
    print(f"Total de contacts encontrados: {len(contacts)}")
    
    if contacts:
        synced = sync_to_supabase(contacts)
        print(f"Contacts sincronizados: {synced}")
        
        # Mostrar sample dos custom fields
        sample = contacts[0]
        print(f"\nSample contact:")
        print(f"  Nome: {sample['first_name']} {sample['last_name']}")
        print(f"  Situação Comercial: {sample['situacao_comercial']}")
        print(f"  Resultado Último Contato: {sample['resultado_ultimo_contato']}")
        print(f"  Prioridade: {sample['lead_prioridade']}")
        print(f"  Segmento: {sample['segmento_cliente']}")
        print(f"  Tags: {sample['tags']}")

if __name__ == '__main__':
    main()
