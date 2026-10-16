#!/usr/bin/env python3
"""
AGENTE VENDEDOR - SV ELÉTRICA
Versão melhorada com retry e parsing robusto
"""
import os, json, psycopg2, requests, re, time
from datetime import datetime

OPENROUTER_API_KEY = 'sk-kpa-05e4a8413c78de7308568ec219b86e3820038e9c2f8e5c9db3bc8ca4ef2742c7'
GHL_API_KEY = os.environ.get('GHL_API_KEY', 'pit-89a4b3d1-851e-4c7d-9f58-4d8d63e0ef92')
GHL_BASE = 'https://services.leadconnectorhq.com'
LOCATION_ID = 'IBE8l3u7AtR6JuNOOagY'

HEADERS_GHL = {'Authorization': f'Bearer {GHL_API_KEY}', 'Version': '2021-07-28', 'Content-Type': 'application/json'}
HEADERS_AI = {'Authorization': f'Bearer {OPENROUTER_API_KEY}', 'Content-Type': 'application/json'}

def get_messages(conv_id):
    try:
        resp = requests.get(f"{GHL_BASE}/conversations/{conv_id}/messages", headers=HEADERS_GHL, timeout=30)
        if resp.status_code != 200:
            return []
        msgs = resp.json().get('messages', {}).get('messages', [])
        return [{'direction': m.get('direction', ''), 'body': m.get('body', '')} 
                for m in msgs if m.get('body') and 'AD MESSAGE' not in m.get('body', '')]
    except:
        return []

def extract_json(text):
    """Extrai JSON robusto de texto"""
    text = text.strip()
    # Remover markdown
    text = re.sub(r'```json\s*', '', text)
    text = re.sub(r'```\s*', '', text)
    text = text.strip()
    
    # Tentar parse direto
    try:
        return json.loads(text)
    except:
        pass
    
    # Procurar primeiro { e último }
    start = text.find('{')
    end = text.rfind('}') + 1
    if start >= 0 and end > start:
        try:
            return json.loads(text[start:end])
        except:
            pass
    
    return None

def classify_ai(messages, name):
    if not messages:
        return classify_kw([], '')
    
    # Prompt simples
    msgs = '\n'.join([f"{'C' if m['direction']=='inbound' else 'V'}: {m['body'][:120]}" for m in messages[-6:]])
    prompt = f"""Classifique esta conversa da SV Elétrica (material elétrico):

Cliente: {name}

{msgs}

Responda apenas JSON: {{"r":"p|r|i|e|s","t":"q|m|f","p":"a|m|b"}}
r=pergunta/reclamacao/intencao_compra/encerramento/silencio
t=quente/morno/frio
p=alta/media/baixa"""

    for attempt in range(3):
        try:
            resp = requests.post(
                'https://api.kpalabz.com/v1/chat/completions',
                headers=HEADERS_AI,
                json={'model': 'gpt-6-astra', 'messages': [{'role': 'user', 'content': prompt}],
                      'max_tokens': 100, 'temperature': 0.2},
                timeout=45
            )
            
            if resp.status_code != 200:
                time.sleep(2)
                continue
            
            data = resp.json()
            if 'choices' not in data:
                continue
                
            content = data['choices'][0]['message']['content']
            result = extract_json(content)
            
            if result:
                r_map = {'p': 'pergunta', 'r': 'reclamacao', 'i': 'intencao_compra', 'e': 'encerramento', 's': 'silencio'}
                t_map = {'q': 'quente', 'm': 'morno', 'f': 'frio'}
                p_map = {'a': 'alta', 'm': 'media', 'b': 'baixa'}
                
                return {
                    'resultado': r_map.get(str(result.get('r', '')), 'silencio'),
                    'temperatura': t_map.get(str(result.get('t', '')), 'morno'),
                    'prioridade': p_map.get(str(result.get('p', '')), 'media')
                }
                
        except Exception as e:
            print(f"  Retry {attempt+1}: {e}")
            time.sleep(2)
    
    return classify_kw(messages, name)

def classify_kw(messages, name):
    if not messages:
        return {'resultado': 'silencio', 'temperatura': 'frio', 'prioridade': 'baixa'}
    
    last = ''
    for m in reversed(messages):
        if m['direction'] == 'inbound':
            last = m['body'].lower()
            break
    
    if re.search(r'\b(quanto|preço|tem|posso|preciso|queria|como|qual)\b', last):
        r = 'pergunta'
    elif re.search(r'\b(vou|fechado|aprovado|orçamento|pix|buscar|retirar)\b', last):
        r = 'intencao_compra'
    elif re.search(r'\b(demora|errado|atraso|problema|reclam)\b', last):
        r = 'reclamacao'
    elif re.search(r'\b(ok|obrigado|valeu|flw)\b', last):
        r = 'encerramento'
    else:
        r = 'silencio'
    
    t = 'quente' if re.search(r'(urgente|hoje|imediato|obra)', last) else 'morno'
    p = 'alta' if r in ('intencao_compra', 'reclamacao') else 'media'
    
    return {'resultado': r, 'temperatura': t, 'prioridade': p}

def update_ghl(contact_id, result):
    if not contact_id:
        return
    
    try:
        requests.put(f"{GHL_BASE}/contacts/{contact_id}",
            headers=HEADERS_GHL,
            json={'customFields': [
                {'id': 'Kc4ENLzVzFPLEPfouWBp', 'fieldValue': result['resultado']},
                {'id': 'viaIw2ZnxFhTimCocmyL', 'fieldValue': result['prioridade']}
            ]}, timeout=20)
    except:
        pass
    
    tag = {'quente': 'qfLbiw7S900MmqmmsLJX', 'morno': 'aCI120fxP59pepdClL9s', 'frio': '5DvqBjxDfTQi6m8dNM4w'}
    for t in list(tag.values()):
        try:
            requests.delete(f"{GHL_BASE}/contacts/{contact_id}/tags/{t}", headers=HEADERS_GHL, timeout=5)
        except:
            pass
    try:
        requests.post(f"{GHL_BASE}/contacts/{contact_id}/tags", headers=HEADERS_GHL,
            json={'tags': [tag.get(result['temperatura'], tag['morno'])]}, timeout=10)
    except:
        pass

def log_db(conn, contact_id, conv_id, result, msg):
    try:
        cur = conn.cursor()
        cur.execute("""INSERT INTO classification_logs 
            (contact_id, conversation_id, classificacao, temperatura, prioridade, mensagem_original)
            VALUES (%s, %s, %s, %s, %s, %s)""",
            (contact_id, conv_id, result['resultado'], result['temperatura'], result['prioridade'], msg[:500]))
        conn.commit()
        cur.close()
        return True
    except Exception as e:
        print(f"  Log error: {e}")
        conn.rollback()
        return False

def get_all_conversations():
    """Busca TODAS conversas de outubro"""
    convs = {}
    
    for query in ['sort=desc', 'sort=asc', 'status=read', 'status=unread']:
        page = 1
        while page <= 20:
            try:
                resp = requests.get(f"{GHL_BASE}/conversations/search?locationId={LOCATION_ID}&{query}&limit=100&page={page}",
                    headers=HEADERS_GHL, timeout=30)
                if resp.status_code != 200:
                    break
                
                items = resp.json().get('conversations', [])
                if not items:
                    break
                
                count = 0
                for c in items:
                    dt = datetime.fromtimestamp(c.get('lastMessageDate', 0) / 1000)
                    if dt.year == 2026 and dt.month == 10:
                        if c['id'] not in convs:
                            convs[c['id']] = c
                            count += 1
                
                if not count:
                    break
                page += 1
            except:
                break
    
    return list(convs.values())

def main():
    conn = psycopg2.connect(host='localhost', database='sv_dashboard', user='sv_user', password='sv_pass_2026')
    
    print("Buscando conversas de outubro...")
    conversations = get_all_conversations()
    print(f"Encontradas: {len(conversations)}")
    
    if not conversations:
        return
    
    classified = skipped = 0
    
    for conv in conversations:
        check_id = conv.get('contactId', '') or conv['id']
        
        cur = conn.cursor()
        cur.execute('SELECT id FROM classification_logs WHERE contact_id = %s LIMIT 1', (check_id,))
        if cur.fetchone():
            skipped += 1
            cur.close()
            continue
        cur.close()
        
        messages = get_messages(conv['id'])
        if not messages:
            skipped += 1
            continue
        
        result = classify_ai(messages, conv.get('contactName', 'Cliente'))
        
        if conv.get('contactId'):
            update_ghl(conv['contactId'], result)
        
        log_db(conn, check_id, conv['id'], result, messages[-1]['body'])
        
        classified += 1
        print(f"[{classified}] {conv.get('contactName', '')[:30]:30} | {result['resultado']:15} | {result['temperatura']} | {result['prioridade']}")
        
        time.sleep(0.5)
        
        if classified % 50 == 0:
            print(f"\n  >>> Progresso: {classified}/{len(conversations)} <<<\n")
    
    conn.close()
    print(f"\nFeito! Classificadas: {classified}, Ignoradas: {skipped}")

if __name__ == '__main__':
    main()
