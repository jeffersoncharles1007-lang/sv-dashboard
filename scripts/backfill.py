#!/usr/bin/env python3
"""Backfill: Classifica conversas via IA com GPT-5.5"""
import os, json, psycopg2, requests
from datetime import datetime

OPENROUTER_API_KEY = 'sk-kpa-05e4a8413c78de7308568ec219b86e3820038e9c2f8e5c9db3bc8ca4ef2742c7'
GHL_API_KEY = os.environ.get('GHL_API_KEY', '')

HEADERS_GHL = {'Authorization': f'Bearer {GHL_API_KEY}', 'Version': '2021-07-28', 'Content-Type': 'application/json'}
HEADERS_AI = {'Authorization': f'Bearer {OPENROUTER_API_KEY}', 'Content-Type': 'application/json'}

def classify_ai(messages, name):
    msg_list = '\n'.join([f"[{i+1}] {'CLIENTE' if m['direction']=='inbound' else 'VENDEDOR'}: {m.get('body','')}" for i,m in enumerate(messages[-5:])])
    prompt = f"Classifique a conversa:\nCliente: {name}\n{msg_list}\nResponda JSON: {{\"resultado\": \"pergunta|reclamacao|intencao_compra|encerramento|silencio\", \"temperatura\": \"quente|morno|frio\", \"prioridade\": \"alta|media|baixa\"}}"
    try:
        resp = requests.post('https://api.kpalabz.com/v1/chat/completions', headers=HEADERS_AI, 
            json={'model': 'gpt-5.5', 'messages': [{'role': 'user', 'content': prompt}], 'max_tokens': 100}, timeout=60)
        data = resp.json()
        if 'choices' in data:
            result = json.loads(data['choices'][0]['message']['content'])
            return result
        print(f'API error: {data}')
    except Exception as e:
        print(f'Error: {e}')
    return {'resultado': 'silencio', 'temperatura': 'morno', 'prioridade': 'media'}

def get_messages(conv_id):
    try:
        resp = requests.get(f'https://services.leadconnectorhq.com/conversations/{conv_id}/messages', headers=HEADERS_GHL, timeout=30)
        msgs = resp.json().get('messages', {}).get('messages', [])
        return [{'direction': m.get('direction',''), 'body': m.get('body','')} for m in msgs if m.get('body') and 'AD MESSAGE' not in m.get('body','')]
    except:
        return []

conn = psycopg2.connect(host='localhost', database='sv_dashboard', user='sv_user', password='sv_pass_2026')
cur = conn.cursor()

start = datetime(2026, 10, 1)
end = datetime(2026, 10, 16, 23, 59, 59)

cur.execute('SELECT id, ghl_id, contact_id, contact_name FROM conversations WHERE last_message_date BETWEEN %s AND %s ORDER BY last_message_date DESC LIMIT 50', (start, end))
convs = cur.fetchall()
print(f'Found {len(convs)} conversations')

classified = 0
for conv_id, ghl_id, contact_id, name in convs:
    cur.execute('SELECT id FROM classification_logs WHERE contact_id = %s LIMIT 1', (contact_id or conv_id,))
    if cur.fetchone():
        continue
    
    messages = get_messages(ghl_id or conv_id)
    if not messages:
        continue
    
    result = classify_ai(messages, name or 'Cliente')
    msg_orig = messages[-1].get('body','')[:500] if messages else ''
    
    cur.execute('INSERT INTO classification_logs (contact_id, conversation_id, classificacao, temperatura, prioridade, mensagem_original) VALUES (%s, %s, %s, %s, %s, %s)', 
        (contact_id or conv_id, conv_id, result['resultado'], result['temperatura'], result['prioridade'], msg_orig))
    conn.commit()
    classified += 1
    print(f'[{classified}] {name}: {result["resultado"]} ({result["temperatura"]})')

cur.close()
conn.close()
print(f'Done! Classified: {classified}')
