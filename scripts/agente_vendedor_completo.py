#!/usr/bin/env python3
"""
AGENTE VENDEDOR COMPLETO - SV ELÉTRICA
Faz TUDO que o agente IA faz:
1. Busca conversas de outubro
2. Classifica via IA (GPT-5.5)
3. Atualiza custom fields no GHL
4. Atualiza tags de temperatura no GHL
5. Registra log no banco
"""
import os, json, psycopg2, requests, re, time
from datetime import datetime, timedelta

# Config
OPENROUTER_API_KEY = 'sk-kpa-05e4a8413c78de7308568ec219b86e3820038e9c2f8e5c9db3bc8ca4ef2742c7'
GHL_API_KEY = os.environ.get('GHL_API_KEY', 'pit-89a4b3d1-851e-4c7d-9f58-4d8d63e0ef92')
GHL_BASE = 'https://services.leadconnectorhq.com'
LOCATION_ID = 'IBE8l3u7AtR6JuNOOagY'

# Custom Fields IDs
CF_RESULTADO = 'Kc4ENLzVzFPLEPfouWBp'  # Resultado Ultimo Contato
CF_PRIORIDADE = 'viaIw2ZnxFhTimCocmyL'  # Lead Prioridade

# Tags de temperatura
TAG_QUENTE = 'qfLbiw7S900MmqmmsLJX'
TAG_MORNO = 'aCI120fxP59pepdClL9s'
TAG_FRIO = '5DvqBjxDfTQi6m8dNM4w'

HEADERS_GHL = {
    'Authorization': f'Bearer {GHL_API_KEY}',
    'Version': '2021-07-28',
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0'
}
HEADERS_AI = {
    'Authorization': f'Bearer {OPENROUTER_API_KEY}',
    'Content-Type': 'application/json'
}

def ghl_update_contact_fields(contact_id, fields):
    """Atualiza custom fields do contato no GHL"""
    url = f"{GHL_BASE}/contacts/{contact_id}"
    data = {'customFields': []}
    for cf_id, value in fields.items():
        data['customFields'].append({'id': cf_id, 'fieldValue': value})
    try:
        resp = requests.put(url, headers=HEADERS_GHL, json=data, timeout=30)
        if resp.status_code not in (200, 201):
            print(f"  GHL update error: {resp.status_code} - {resp.text[:100]}")
            return False
        return True
    except Exception as e:
        print(f"  GHL update error: {e}")
        return False

def ghl_update_tags(contact_id, temperatura):
    """Atualiza tags de temperatura no GHL"""
    tag_id = {'quente': TAG_QUENTE, 'morno': TAG_MORNO, 'frio': TAG_FRIO}.get(temperatura, TAG_MORNO)
    
    # Remover todas as tags de temperatura
    for t in [TAG_QUENTE, TAG_MORNO, TAG_FRIO]:
        try:
            requests.delete(f"{GHL_BASE}/contacts/{contact_id}/tags/{t}", headers=HEADERS_GHL, timeout=10)
        except:
            pass
    
    # Adicionar nova tag
    try:
        url = f"{GHL_BASE}/contacts/{contact_id}/tags"
        resp = requests.post(url, headers=HEADERS_GHL, json={'tags': [tag_id]}, timeout=10)
        return resp.status_code in (200, 201)
    except Exception as e:
        print(f"  Tag error: {e}")
        return False

def get_messages(conv_id):
    """Busca mensagens da conversa"""
    try:
        resp = requests.get(f"{GHL_BASE}/conversations/{conv_id}/messages", headers=HEADERS_GHL, timeout=30)
        if resp.status_code != 200:
            return []
        
        data = resp.json()
        msgs = data.get('messages', {}).get('messages', [])
        
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
        return []

def classify_ai(messages, name):
    """Classifica via GPT-5.5"""
    if not messages:
        return {'resultado': 'silencio', 'temperatura': 'frio', 'prioridade': 'baixa', 
                'observacao': 'Sem mensagens', 'proximoPasso': 'Aguardar contato'}
    
    msg_list = '\n'.join([
        f"[{i+1}] {'CLIENTE' if m['direction']=='inbound' else 'VENDEDOR'}: {m['body'][:200]}"
        for i, m in enumerate(messages[-10:])
    ])
    
    prompt = f"""Você é um assistente de análise de conversas comerciais para a SV Elétrica (distribuidora de material elétrico em Fortaleza/CE).

Analise a conversa e classifique:

CLIENTE: {name}

CONVERSA:
{msg_list}

Responda APENAS com JSON válido (sem markdown):
{{"resultado": "pergunta|reclamacao|intencao_compra|encerramento|silencio", "temperatura": "quente|morno|frio", "prioridade": "alta|media|baixa", "observacao": "...", "proximoPasso": "..."}}

REGRAS:
- pergunta: cliente fez pergunta, quer saber algo
- reclamacao: cliente reclamou de algo (atraso, erro, problema)
- intencao_compra: cliente demonstrou intenção de comprar ("vou buscar", "manda orçamento", "fechado")
- encerramento: conversa terminou sem intenção clara (ok, obrigado)
- silencio: vendedor mandou mensagem mas cliente não respondeu

- quente: urgência, obra em andamento, pedido recorrente
- morno: interesse moderado, sem pressa
- frio: sem interesse aparente, apenas pesquisando

- alta: obra em andamento, cliente recorrente, pedido urgente
- media: interesse normal
- baixa: apenas pesquisando, sem urgência"""

    try:
        resp = requests.post(
            'https://api.kpalabz.com/v1/chat/completions',
            headers=HEADERS_AI,
            json={'model': 'gpt-6-astra', 'messages': [{'role': 'user', 'content': prompt}], 
                  'max_tokens': 250, 'temperature': 0.3},
            timeout=60
        )
        data = resp.json()
        
        if 'choices' in data:
            content = data['choices'][0]['message']['content'].strip()
            # Limpar markdown se houver
            content = content.strip('```json').strip('```').strip()
            result = json.loads(content)
            return {
                'resultado': result.get('resultado', 'silencio'),
                'temperatura': result.get('temperatura', 'morno'),
                'prioridade': result.get('prioridade', 'media'),
                'observacao': result.get('observacao', '')[:200],
                'proximoPasso': result.get('proximoPasso', '')[:100]
            }
        
        print(f"  API error: {data}")
    except Exception as e:
        print(f"  AI error: {e}")
    
    return classify_keywords(messages)

def classify_keywords(messages):
    """Fallback: classificação por keywords"""
    if not messages:
        return {'resultado': 'silencio', 'temperatura': 'frio', 'prioridade': 'baixa',
                'observacao': 'Sem mensagens', 'proximoPasso': 'Aguardar'}
    
    last_client = ''
    for m in reversed(messages):
        if m['direction'] == 'inbound':
            last_client = m['body'].lower()
            break
    
    if re.search(r'\b(quanto|preço|tem|posso|preciso|queria|como|qual|onde|pode)\b', last_client):
        resultado = 'pergunta'
    elif re.search(r'\b(vou|fechado|aprovado|orçamento|pix|buscar|retirar|conta)\b', last_client):
        resultado = 'intencao_compra'
    elif re.search(r'\b(demora|errado|atraso|não recebi|problema|reclam)\b', last_client):
        resultado = 'reclamacao'
    elif re.search(r'\b(ok|obrigado|valeu|flw|até|tchau)\b', last_client):
        resultado = 'encerramento'
    else:
        resultado = 'silencio'
    
    temp = 'quente' if re.search(r'(urgente|hoje|imediato|obra)', last_client) else 'morno'
    prio = 'alta' if resultado in ('intencao_compra', 'reclamacao') else 'media'
    
    return {'resultado': resultado, 'temperatura': temp, 'prioridade': prio,
            'observacao': f'Classificado por keywords: {resultado}', 'proximoPasso': 'Aguardar contato'}

def log_classification(conn, contact_id, conv_id, result, msg_orig):
    """Registra classificação no banco"""
    try:
        cur = conn.cursor()
        cur.execute("""INSERT INTO classification_logs 
            (contact_id, conversation_id, classificacao, temperatura, prioridade, mensagem_original)
            VALUES (%s, %s, %s, %s, %s, %s)""",
            (contact_id, conv_id, result['resultado'], result['temperatura'], 
             result['prioridade'], msg_orig[:500]))
        conn.commit()
        cur.close()
        return True
    except Exception as e:
        print(f"  Log error: {e}")
        conn.rollback()
        return False

def get_all_conversations_october():
    """Busca TODAS conversas de outubro (paginado)"""
    conversations = {}
    all_ids = set()
    
    queries = [
        'sort=desc&limit=100',
        'sort=asc&limit=100',
        'status=read&limit=100',
        'status=unread&limit=100'
    ]
    
    print("Buscando conversas de outubro...")
    
    for query in queries:
        page = 1
        while True:
            url = f"{GHL_BASE}/conversations/search?locationId={LOCATION_ID}&{query}&page={page}"
            try:
                resp = requests.get(url, headers=HEADERS_GHL, timeout=30)
                if resp.status_code != 200:
                    break
                
                data = resp.json()
                convs = data.get('conversations', [])
                
                if not convs:
                    break
                
                oct_count = 0
                for c in convs:
                    msg_date = c.get('lastMessageDate', 0)
                    if msg_date:
                        dt = datetime.fromtimestamp(msg_date / 1000)
                        if dt.year == 2026 and dt.month == 10:
                            if c['id'] not in all_ids:
                                all_ids.add(c['id'])
                                conversations[c['id']] = c
                                oct_count += 1
                
                print(f"  {query} page {page}: +{oct_count} outubro (total: {len(conversations)})")
                
                if not oct_count:
                    break
                    
                page += 1
                if page > 100:
                    break
                    
            except Exception as e:
                print(f"  Error page {page}: {e}")
                break
    
    print(f"Total conversas outubro: {len(conversations)}")
    return list(conversations.values())

def main():
    conn = psycopg2.connect(host='localhost', database='sv_dashboard', user='sv_user', password='sv_pass_2026')
    
    # Buscar TODAS conversas de outubro
    conversations = get_all_conversations_october()
    
    if not conversations:
        print("Nenhuma conversa encontrada!")
        return
    
    classified = 0
    errors = 0
    skipped = 0
    
    print(f"\nProcessando {len(conversations)} conversas...\n")
    
    for conv in conversations:
        conv_id = conv['id']
        contact_id = conv.get('contactId', '')
        name = conv.get('contactName', 'Cliente')
        
        # Verificar se já processado
        check_id = contact_id or conv_id
        cur = conn.cursor()
        cur.execute('SELECT id FROM classification_logs WHERE contact_id = %s LIMIT 1', (check_id,))
        if cur.fetchone():
            skipped += 1
            cur.close()
            continue
        cur.close()
        
        # 1. Buscar mensagens
        messages = get_messages(conv_id)
        
        if not messages:
            skipped += 1
            continue
        
        # 2. Classificar via IA
        result = classify_ai(messages, name)
        
        # 3. Atualizar GHL se tiver contact_id
        if contact_id:
            # Custom fields
            ghl_update_contact_fields(contact_id, {
                CF_RESULTADO: result['resultado'],
                CF_PRIORIDADE: result['prioridade']
            })
            # Tags
            ghl_update_tags(contact_id, result['temperatura'])
        
        # 4. Registrar log
        msg_orig = messages[-1]['body'][:500] if messages else ''
        log_classification(conn, check_id, conv_id, result, msg_orig)
        
        classified += 1
        print(f"[{classified}/{len(conversations)}] {name[:35]:35} | {result['resultado']:15} | {result['temperatura']:7} | {result['prioridade']}")
        
        # Rate limit suave
        time.sleep(0.5)
        
        # Progresso a cada 50
        if classified % 50 == 0:
            print(f"\n  >>> Progresso: {classified}/{len(conversations)} <<<\n")
    
    conn.close()
    
    print(f"\n{'='*60}")
    print(f"CLASSIFICADO: {classified}")
    print(f"IGNORADO: {skipped}")
    print(f"ERROS: {errors}")
    print(f"{'='*60}")

if __name__ == '__main__':
    main()
