#!/usr/bin/env python3
"""
AUDITORIA DE ATENDIMENTO - SV ELÉTRICA (versão heurística)
Analisa conversas pelos 6 passos sem precisar de IA:
1. Acolhimento - foi cordial
2. Sondagem - perguntou para entender
3. Identificou necessidade - entendeu o problema
4. CVB - Característica + Vantagem + Benefício
5. Gatilho de fechamento - puxou para fechar
6. Encerrou com pergunta - manteve aberto
"""
import os, psycopg2, requests, re, time
from datetime import datetime, date

GHL_API_KEY = os.environ.get('GHL_API_KEY', 'pit-89a4b3d1-851e-4c7d-9f58-4d8d63e0ef92')
GHL_BASE = 'https://services.leadconnectorhq.com'
LOCATION_ID = 'IBE8l3u7AtR6JuNOOagY'

HEADERS = {'Authorization': f'Bearer {GHL_API_KEY}', 'Version': '2021-07-28', 'Content-Type': 'application/json'}

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

# Padrões heurísticos
PADROES = {
    'acolhimento': [
        r'\b(ol[aá]|oi|boa|tudo bem|bom dia|boa tarde|boa noite)\b',
        r'\bseja bem|seja bem-vind|mais uma vez\b',
        r'\bcomo posso|em que posso|em que posso ajudar\b'
    ],
    'sondagem': [
        r'\b(e )?[vv]ocê precisa?\b',
        r'\bque.*(tipo|modelo|marca)\b',
        r'\bqual.*(tamanho|capacidade|medida)\b',
        r'\b([mt]em|precisa).*\?\b',
        r'\b([mq]e conta|me diz|converse)\b',
        r'\bsolicitaç',
        r'\bprojeto\b'
    ],
    'necessidade': [
        r'\b(quadro|disjuntor|cabo|fio|canaleta|conector)\b',
        r'\b(trifásico|bifásico|monofásico)\b',
        r'\b([0-9]+)\s*(amperes?|a|disjuntores?)\b',
        r'\b(industrial|residencial|comercial)\b',
        r'\b(kva|kw|watts?)\b'
    ],
    'cvb': [
        r'\b(nossa marca|trabalhamos|oferecemos)\b',
        r'\b(garantia|qualidade|certificad)\b',
        r'\b(material|preço|condição|promoção|desconto)\b',
        r'\b(entrega|troc|devoluç)\b',
        r'\bcaracter[íi]stica|benefício|vantagem\b',
        r'\b(especializad|experi[êe]ncia)\b'
    ],
    'fechamento': [
        r'\b([vv]ocê.*[qQ]uer|[qQ]uer.*or[çc]amento)\b',
        r'\b([pP]ara.*[cc]omprar|[cc]omprar.*a[íi])\b',
        r'\b([eE]nviar|emitir)[^\.]*[oó]rçamento\b',
        r'\b([Ff]ech|concreti[sz])\b',
        r'\b([Aa]gora|j[áa]|hoje)\b.*\b([Cc]omprar|[Ff]echar)\b',
        r'\b([Pp]odemos|[Tt]eclando)\b'
    ],
    'encerramento': [
        r'\bqualquer.*(dúvida|pergunta)\b',
        r'\b[ée] a[íi]|caso|[sS]e.*(precisar|dúvida)\b',
        r'\b[áa] disposição\b',
        r'\b(obrigad|atenciosamente)\b',
        r'\bmais alguma|\?'  # pergunta no final
    ]
}

def score_conversation(messages):
    """Calcula score baseado em padrões heurísticos"""
    text = ' '.join([m.get('body', '').lower() for m in messages])
    
    scores = {}
    for step, patterns in PADROES.items():
        scores[step] = 0
        for pattern in patterns:
            if re.search(pattern, text, re.IGNORECASE):
                scores[step] = 1
                break
    
    # Ajustes específicos
    # Se tem CVB mas não sondagem, provavelmente copiou texto
    if scores['cvb'] == 1 and scores['sondagem'] == 0:
        scores['cvb'] = 0
    
    # Se tem fechamento, provavelmente teve proposta
    if scores['fechamento'] == 1:
        scores['encerramento'] = 1  # geralmente encerra após fechar
    
    return scores

def get_messages(conv_id):
    """Busca mensagens da conversa"""
    try:
        resp = requests.get(f"{GHL_BASE}/conversations/{conv_id}/messages", headers=HEADERS, timeout=30)
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
    nota = sum(analysis.values())
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
            analysis['fechamento'], analysis['encerramento'], nota,
            f"Nota {nota}/6 baseada em análise heurística",
            "Revisar conversas com nota baixa"
        ))
        conn.commit()
        return True
    except Exception as e:
        print(f"  DB error: {e}")
        conn.rollback()
        return False
    finally:
        cur.close()

def main():
    print("=" * 60)
    print("AUDITORIA DE ATENDIMENTO - SV ELÉTRICA (Heurística)")
    print("=" * 60)
    
    # Buscar conversas
    conversations = get_conversations_with_vendedor()
    print(f"\nEncontradas {len(conversations)} conversas com vendedor")
    
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
        
        # Analisar com heurística
        analysis = score_conversation(messages)
        
        # Salvar
        if save_audit(conn, conv, analysis):
            nota = sum(analysis.values())
            vendedor_nome = VENDEDORES.get(conv['assigned_to'], conv['assigned_to'] or 'Desconhecido')
            print(f"[{audited+1}/{len(conversations)}] {vendedor_nome[:15]:15} | Nota: {nota}/6 | {conv['contact_name'][:20]}")
            audited += 1
        
        time.sleep(0.3)  # Rate limit leve
        
        if audited % 20 == 0 and audited > 0:
            print(f"\n  >>> Progresso: {audited}/{len(conversations)} <<<\n")
    
    conn.close()
    
    print(f"\n{'='*60}")
    print(f"AUDITADO: {audited}")
    print(f"IGNORADO: {skipped}")
    print(f"{'='*60}")
    
    # Mostrar resumo
    print("\nRESUMO POR VENDEDOR:")
    conn2 = psycopg2.connect(host='localhost', database='sv_dashboard', user='sv_user', password='sv_pass_2026')
    cur = conn2.cursor()
    cur.execute("""
        SELECT vendedor_nome, COUNT(*) as total, AVG(nota_total)::numeric(3,1) as nota
        FROM atendimento_audit WHERE data = CURRENT_DATE
        GROUP BY vendedor_nome ORDER BY nota DESC
    """)
    for row in cur.fetchall():
        print(f"  {row[0]:20} | {row[1]:3} atend | Nota: {row[2]}")
    cur.close()
    conn2.close()

if __name__ == '__main__':
    main()
