#!/usr/bin/env python3
"""
Full Backfill: Todas as conversas de outubro via IA
- Busca conversas paginado (100/vez)
- Busca mensagens de cada conversa
- Classifica via IA
"""
import os, json, psycopg2, requests, re
from datetime import datetime, timedelta

OPENROUTER_API_KEY = 'sk-kpa-05e4a8413c78de7308568ec219b86e3820038e9c2f8e5c9db3bc8ca4ef2742c7'
GHL_API_KEY = os.environ.get('GHL_API_KEY', '')
GHL_BASE = 'https://services.leadconnectorhq.com'

HEADERS_GHL = {
    'Authorization': f'Bearer {GHL_API_KEY}',
    'Version': '2021-07-28',
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json'
}
HEADERS_AI = {
    'Authorization': f'Bearer {OPENROUTER_API_KEY}',
    'Content-Type': 'application/json'
}

def fetch_all_conversations_october():
    """Busca TODAS as conversas de outubro (paginado)"""
    conversations = {}
    all_ids = set()
    
    # 4 queries para maximizar cobertura
    queries = [
        'sort=desc&limit=100',
        'sort=asc&limit=100', 
        'status=read&limit=100',
        'status=unread&limit=100'
    ]
    
    print("Buscando conversas de outubro (paginado)...")
    
    for query in queries:
        page = 1
        while True:
            url = f"{GHL_BASE}/conversations/search?locationId=IBE8l3u7AtR6JuNOOagY&{query}&page={page}"
            try:
                resp = requests.get(url, headers=HEADERS_GHL, timeout=30)
                if resp.status_code != 200:
                    break
                
                data = resp.json()
                convs = data.get('conversations', [])
                
                if not convs:
                    break
                
                # Filtrar apenas outubro
                oct_convs = []
                for c in convs:
                    msg_date = c.get('lastMessageDate', 0)
                    if msg_date:
                        dt = datetime.fromtimestamp(msg_date / 1000)
                        if dt.year == 2026 and dt.month == 10:
                            if c['id'] not in all_ids:
                                all_ids.add(c['id'])
                                conversations[c['id']] = c
                                oct_convs.append(c['id'])
                
                print(f"  Query {query} page {page}: {len(oct_convs)} de outubro (total: {len(conversations)})")
                
                # Se não encontrou de outubro nesta página, parar
                if not oct_convs:
                    break
                    
                page += 1
                if page > 50:  # Limite de segurança
                    break
                    
            except Exception as e:
                print(f"  Error page {page}: {e}")
                break
    
    print(f"Total de conversas de outubro: {len(conversations)}")
    return list(conversations.values())

def get_messages(conv_id):
    """Busca mensagens da conversa"""
    try:
        resp = requests.get(f"{GHL_BASE}/conversations/{conv_id}/messages", headers=HEADERS_GHL, timeout=30)
        if resp.status_code != 200:
            return []
        
        data = resp.json()
        msgs = data.get('messages', {}).get('messages', [])
        
        # Filtrar mensagens reais
        result = []
        for m in msgs:
            body = m.get('body', '')
            if body and 'AD MESSAGE' not in body and 'Mensagem apagada' not in body:
                result.append({
                    'direction': m.get('direction', ''),
                    'body': body
                })
        return result
    except Exception as e:
        print(f"  Error messages {conv_id}: {e}")
        return []

def classify_by_ai(messages, name):
    """Classifica via GPT-5.5"""
    if not messages:
        return {'resultado': 'silencio', 'temperatura': 'frio', 'prioridade': 'baixa'}
    
    msg_list = '\n'.join([
        f"[{i+1}] {'CLIENTE' if m['direction']=='inbound' else 'VENDEDOR'}: {m['body'][:200]}"
        for i, m in enumerate(messages[-8:])
    ])
    
    prompt = f"""Classifique esta conversa comercial:
Cliente: {name}

{msg_list}

Responda APENAS com JSON válido (sem markdown):
{{"resultado": "pergunta|reclamacao|intencao_compra|encerramento|silencio", "temperatura": "quente|morno|frio", "prioridade": "alta|media|baixa"}}

Regras:
- pergunta: cliente fez pergunta
- reclamacao: cliente reclamou
- intencao_compra: cliente quer comprar
- encerramento: conversa terminou normalmente
- silencio: vendedor falou mas cliente não respondeu
- quente: urgente, obra, pedido
- morno: interesse normal
- frio: sem urgência"""

    try:
        resp = requests.post(
            'https://api.kpalabz.com/v1/chat/completions',
            headers=HEADERS_AI,
            json={'model': 'gpt-5.5', 'messages': [{'role': 'user', 'content': prompt}], 'max_tokens': 150},
            timeout=45
        )
        data = resp.json()
        
        if 'choices' in data:
            content = data['choices'][0]['message']['content']
            # Limpar markdown se houver
            content = content.strip().strip('```json').strip('```').strip()
            return json.loads(content)
        
        print(f"  API error: {data}")
    except Exception as e:
        print(f"  AI error: {e}")
    
    return classify_by_keywords(messages)

def classify_by_keywords(messages):
    """Fallback: classificação por keywords"""
    if not messages:
        return {'resultado': 'silencio', 'temperatura': 'frio', 'prioridade': 'baixa'}
    
    all_text = ' '.join([m['body'].lower() for m in messages])
    last_client = ''
    for m in reversed(messages):
        if m['direction'] == 'inbound':
            last_client = m['body'].lower()
            break
    
    if re.search(r'\b(quanto|preço|tem|posso|preciso|queria|como|qual|onde|pode|manda|envia)\b', last_client):
        result = 'pergunta'
    elif re.search(r'\b(vou|fechado|aprovado|orçamento|pix|buscar|retirar|conta|transferência)\b', last_client):
        result = 'intencao_compra'
    elif re.search(r'\b(demora|errado|atraso|não recebi|problema|reclam)\b', last_client):
        result = 'reclamacao'
    elif re.search(r'\b(ok|obrigado|valeu|flw|até|tchau|confirmado)\b', last_client):
        result = 'encerramento'
    else:
        result = 'silencio'
    
    temp = 'quente' if re.search(r'(urgente|hoje|imediato|obra|grande)', last_client) else 'morno'
    
    return {'resultado': result, 'temperatura': temp, 'prioridade': 'media'}

def main():
    conn = psycopg2.connect(host='localhost', database='sv_dashboard', user='sv_user', password='sv_pass_2026')
    cur = conn.cursor()
    
    # Buscar TODAS conversas de outubro
    conversations = fetch_all_conversations_october()
    
    if not conversations:
        print("Nenhuma conversa encontrada!")
        return
    
    classified = 0
    skipped = 0
    errors = 0
    
    print(f"\nClassificando {len(conversations)} conversas...")
    
    for conv in conversations:
        conv_id = conv['id']
        contact_id = conv.get('contactId', '')
        name = conv.get('contactName', 'Cliente')
        
        # Verificar se já classificado
        check_id = contact_id or conv_id
        cur.execute('SELECT id FROM classification_logs WHERE contact_id = %s LIMIT 1', (check_id,))
        if cur.fetchone():
            skipped += 1
            continue
        
        # Buscar mensagens
        messages = get_messages(conv_id)
        
        # Classificar
        result = classify_by_ai(messages, name)
        
        # Registrar
        msg_orig = messages[-1]['body'][:500] if messages else ''
        cur.execute('''INSERT INTO classification_logs 
            (contact_id, conversation_id, classificacao, temperatura, prioridade, mensagem_original)
            VALUES (%s, %s, %s, %s, %s, %s)''',
            (check_id, conv_id, result['resultado'], result['temperatura'], result['prioridade'], msg_orig))
        conn.commit()
        
        classified += 1
        print(f"[{classified}/{len(conversations)}] {name[:30]}: {result['resultado']} ({result['temperatura']})")
        
        # Rate limit suave
        if classified % 10 == 0:
            print(f"  Progresso: {classified}/{len(conversations)}")
    
    cur.close()
    conn.close()
    
    print(f"\n=== RESULTADO ===")
    print(f"Classificadas: {classified}")
    print(f"Ignoradas: {skipped}")
    print(f"Erros: {errors}")

if __name__ == '__main__':
    main()
