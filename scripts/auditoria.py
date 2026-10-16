#!/usr/bin/env python3
"""
AUDITORIA DE ATENDIMENTO - SV ELÉTRICA
Analisa conversas e pontua os 6 passos de bom atendimento:
1. Acolhimento - foi cordial
2. Sondagem - perguntou para entender
3. Identificou necessidade - entendeu o problema
4. CVB - Característica + Vantagem + Benefício
5. Gatilho de fechamento - puxou para fechar
6. Encerrou com pergunta - manteve aberto
"""
import os, json, psycopg2, requests, re, time
from datetime import datetime, date

OPENROUTER_API_KEY = 'sk-kpa-05e4a8413c78de7308568ec219b86e3820038e9c2f8e5c9db3bc8ca4ef2742c7'
GHL_API_KEY = os.environ.get('GHL_API_KEY', 'pit-89a4b3d1-851e-4c7d-9f58-4d8d63e0ef92')
GHL_BASE = 'https://services.leadconnectorhq.com'
LOCATION_ID = 'IBE8l3u7AtR6JuNOOagY'

HEADERS_GHL = {'Authorization': f'Bearer {GHL_API_KEY}', 'Version': '2021-07-28', 'Content-Type': 'application/json'}
HEADERS_AI = {'Authorization': f'Bearer {OPENROUTER_API_KEY}', 'Content-Type': 'application/json'}

# Vendedores
VENDEDORES = {
    'AdjNLpTP9xlcDTUHUE3H': 'Eduardo Crisostomo',
    'NrrD7gUsTc2UPdPWrzrr': 'Katherine Camara',
    'MrrP8gVsUc3VQePWsqrr': 'Emily Viana',
    'PrsQ9hWtVd4WRfPXtss': 'Rafael Virginio',
    'QstR0iXuWe5XsfQYutt': 'Ângelo Carioca',
    'RtuS2kZwXg7ZUhASwwwv': 'Bonsucesso',
    'SuvT2kZwXg7ZUhASwwwx': 'Raiane',
}

def get_messages(conv_id):
    try:
        resp = requests.get(f"{GHL_BASE}/conversations/{conv_id}/messages", headers=HEADERS_GHL, timeout=30)
        if resp.status_code != 200:
            return []
        msgs = resp.json().get('messages', {}).get('messages', [])
        result = []
        for m in msgs:
            body = m.get('body', '')
            if body and 'AD MESSAGE' not in body:
                result.append({
                    'direction': m.get('direction', ''),
                    'body': body,
                    'date': m.get('createdAt', '')
                })
        return result
    except:
        return []

def extract_json(text):
    text = text.strip()
    text = re.sub(r'```json\s*', '', text)
    text = re.sub(r'```\s*', '', text)
    text = text.strip()
    try:
        return json.loads(text)
    except:
        start = text.find('{')
        end = text.rfind('}') + 1
        if start >= 0 and end > start:
            try:
                return json.loads(text[start:end])
            except:
                pass
    return None

def analisar_atendimento(messages, contact_name, vendedor_nome):
    """Usa IA para analisar os 6 passos do atendimento"""
    
    # Preparar conversa
    msg_list = []
    for i, m in enumerate(messages[:12]):
        dir_emoji = '👤' if m['direction'] == 'inbound' else '🏪'
        msg_list.append(f"{dir_emoji} {m['body'][:200]}")
    
    conversa = '\n'.join(msg_list)
    
    prompt = f"""Analise este atendimento de venda de material elétrico e pontue de 0 a 6:

Vendedor: {vendedor_nome}
Cliente: {contact_name}

{conversa}

Avalie cada passo (0=não fez, 1=fez):
1. ACOLHIMENTO - Recebeu bem, foi cordial
2. SONDAGEM - Perguntou para entender a necessidade
3. NECESSIDADE - Identificou corretamente peça/problema
4. CVB - Apresentou Característica + Vantagem + Benefício
5. FECHAMENTO - Usou gatilho para fechar
6. ENCERRAMENTO - Manteve conversa aberta com pergunta

Responda JSON:
{{"acolhimento":0-1," sondagem":0-1," necessidade":0-1,"cvb":0-1,"fechamento":0-1,"encerramento":0-1,"nota_total":0-6,"observacao":"breve","proximo_passo":"breve"}}"""

    for attempt in range(3):
        try:
            resp = requests.post(
                'https://api.kpalabz.com/v1/chat/completions',
                headers=HEADERS_AI,
                json={'model': 'gpt-6-astra', 'messages': [{'role': 'user', 'content': prompt}],
                      'max_tokens': 200, 'temperature': 0.3},
                timeout=60
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
                return {
                    'acolhimento': int(result.get('acolhimento', 0)),
                    'sondagem': int(result.get('sondagem', 0)),
                    'necessidade': int(result.get('necessidade', 0)),
                    'cvb': int(result.get('cvb', 0)),
                    'fechamento': int(result.get('fechamento', 0)),
                    'encerramento': int(result.get('encerramento', 0)),
                    'observacao': str(result.get('observacao', ''))[:500],
                    'proximo_passo': str(result.get('proximo_passo', ''))[:200]
                }
                
        except Exception as e:
            print(f"  Retry {attempt+1}: {e}")
            time.sleep(2)
    
    # Fallback
    return {
        'acolhimento': 1, 'sondagem': 0, 'necessidade': 0,
        'cvb': 0, 'fechamento': 0, 'encerramento': 1,
        'observacao': 'Análise automática', 'proximo_passo': 'Revisar脚本'
    }

def get_conversations_with_vendedor():
    """Busca conversas que têm vendedor atribuído"""
    conn = psycopg2.connect(host='localhost', database='sv_dashboard', user='sv_user', password='sv_pass_2026')
    cur = conn.cursor()
    
    cur.execute("""
        SELECT DISTINCT c.id, c.ghl_id, c.contact_id, c.contact_name, c.assigned_to
        FROM conversations c
        WHERE c.last_message_date > '2026-10-01'
        AND c.assigned_to IS NOT NULL
        AND c.assigned_to != ''
    """)
    
    results = cur.fetchall()
    cur.close()
    conn.close()
    
    return [{'id': r[0], 'ghl_id': r[1], 'contact_id': r[2], 'contact_name': r[3], 'assigned_to': r[4]} for r in results]

def save_audit(conn, conv, analysis):
    """Salva análise de auditoria"""
    nota = (analysis['acolhimento'] + analysis['sondagem'] + analysis['necessidade'] + 
            analysis['cvb'] + analysis['fechamento'] + analysis['encerramento'])
    
    vendedor_nome = VENDEDORES.get(conv['assigned_to'], conv['assigned_to'] or 'Desconhecido')
    
    cur = conn.cursor()
    try:
        cur.execute("""
            INSERT INTO atendimento_audit 
            (conversation_id, contact_id, contact_name, vendedor_id, vendedor_nome, data,
             passo_acolhimento, passo_sondagem, passo_necessidade, passo_cvb, 
             passo_fechamento, passo_encerramento, nota_total, observacao, proximo_passo)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            conv['id'], conv['contact_id'], conv['contact_name'], conv['assigned_to'], vendedor_nome, date.today(),
            analysis['acolhimento'], analysis['sondagem'], analysis['necessidade'], analysis['cvb'],
            analysis['fechamento'], analysis['encerramento'], nota, analysis['observacao'], analysis['proximo_passo']
        ))
        conn.commit()
        return True
    except Exception as e:
        print(f"  DB error: {e}")
        conn.rollback()
        return False
    finally:
        cur.close()

def calculate_coaching(conn):
    """Calcula estatísticas de coaching por vendedor"""
    cur = conn.cursor()
    
    cur.execute("""
        INSERT INTO coaching_stats 
        (vendedor_id, vendedor_nome, data, total_atendimentos,
         acolhimento_pct, sondagem_pct, necessidade_pct, cvb_pct, 
         fechamento_pct, encerramento_pct, nota_media)
        SELECT 
            vendedor_id,
            vendedor_nome,
            CURRENT_DATE,
            COUNT(*),
            ROUND(AVG(passo_acolhimento) * 100)::INTEGER,
            ROUND(AVG(passo_sondagem) * 100)::INTEGER,
            ROUND(AVG(passo_necessidade) * 100)::INTEGER,
            ROUND(AVG(passo_cvb) * 100)::INTEGER,
            ROUND(AVG(passo_fechamento) * 100)::INTEGER,
            ROUND(AVG(passo_encerramento) * 100)::INTEGER,
            ROUND(AVG(nota_total), 1)
        FROM atendimento_audit
        WHERE data = CURRENT_DATE
        GROUP BY vendedor_id, vendedor_nome
        ON CONFLICT (vendedor_id, data) DO UPDATE SET
            total_atendimentos = EXCLUDED.total_atendimentos,
            acolhimento_pct = EXCLUDED.acolhimento_pct,
            sondagem_pct = EXCLUDED.sondagem_pct,
            necessidade_pct = EXCLUDED.necessidade_pct,
            cvb_pct = EXCLUDED.cvb_pct,
            fechamento_pct = EXCLUDED.fechamento_pct,
            encerramento_pct = EXCLUDED.encerramento_pct,
            nota_media = EXCLUDED.nota_media
    """)
    conn.commit()
    cur.close()

def main():
    print("=" * 60)
    print("AUDITORIA DE ATENDIMENTO - SV ELÉTRICA")
    print("=" * 60)
    
    # Buscar conversas com vendedor
    conversations = get_conversations_with_vendedor()
    print(f"\nEncontradas {len(conversations)} conversas com vendedor atribuído")
    
    if not conversations:
        print("Nenhuma conversa para analisar")
        return
    
    conn = psycopg2.connect(host='localhost', database='sv_dashboard', user='sv_user', password='sv_pass_2026')
    
    audited = 0
    skipped = 0
    
    for conv in conversations:
        # Verificar se já auditou hoje
        cur = conn.cursor()
        cur.execute("SELECT id FROM atendimento_audit WHERE conversation_id = %s AND data = CURRENT_DATE", (conv['id'],))
        if cur.fetchone():
            skipped += 1
            cur.close()
            continue
        cur.close()
        
        # Buscar mensagens
        messages = get_messages(conv['id'])
        if not messages:
            skipped += 1
            continue
        
        # Analisar atendimento
        vendedor_nome = VENDEDORES.get(conv['assigned_to'], conv['assigned_to'] or 'Desconhecido')
        analysis = analisar_atendimento(messages, conv.get('contact_name', 'Cliente'), vendedor_nome)
        
        # Salvar
        if save_audit(conn, conv, analysis):
            nota = analysis['acolhimento'] + analysis['sondagem'] + analysis['necessidade'] + analysis['cvb'] + analysis['fechamento'] + analysis['encerramento']
            print(f"[{audited+1}/{len(conversations)}] {vendedor_nome[:15]:15} | Nota: {nota}/6 | {conv['contact_name'][:20]}")
            audited += 1
        
        time.sleep(1)  # Rate limit
        
        if audited % 20 == 0 and audited > 0:
            print(f"\n  >>> Progresso: {audited}/{len(conversations)} <<<\n")
    
    # Calcular coaching
    if audited > 0:
        print("\nCalculando estatísticas de coaching...")
        calculate_coaching(conn)
    
    conn.close()
    
    print(f"\n{'='*60}")
    print(f"AUDITADO: {audited}")
    print(f"IGNORADO: {skipped}")
    print(f"{'='*60}")

if __name__ == '__main__':
    main()
