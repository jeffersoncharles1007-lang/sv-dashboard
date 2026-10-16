#!/usr/bin/env python3
import requests, json

headers_ai = {"Authorization": "Bearer sk-kpa-05e4a8413c78de7308568ec219b86e3820038e9c2f8e5c9db3bc8ca4ef2742c7", "Content-Type": "application/json"}
headers_ghl = {"Authorization": "Bearer pit-89a4b3d1-851e-4c7d-9f58-4d8d63e0ef92", "Version": "2021-07-28", "Content-Type": "application/json"}

# Pegar uma conversa
resp = requests.get("https://services.leadconnectorhq.com/conversations?locationId=IBE8l3u7AtR6JuNOOagY&limit=1", headers=headers_ghl)
convs = resp.json().get("conversations", [])
if not convs:
    print("Sem conversas")
    exit()
    
conv_id = convs[0]["id"]
contact_name = convs[0].get("contactName", "Cliente")

# Pegar mensagens
resp = requests.get(f"https://services.leadconnectorhq.com/conversations/{conv_id}/messages", headers=headers_ghl)
msgs = resp.json().get("messages", {}).get("messages", [])[:6]

conversa = "\n".join([f"{'IN' if m['direction']=='inbound' else 'OUT'}: {m['body'][:80]}" for m in msgs])
print(f"CONVERSA ({contact_name}):\n{conversa}\n")

prompt = f"""Analise este atendimento de venda e responda APENAS com JSON válido:
{{"acolhimento":1,"sondagem":1,"necessidade":0,"cvb":0,"fechamento":0,"encerramento":1}}

{conversa}
"""

resp = requests.post("https://api.kpalabz.com/v1/chat/completions", 
    headers=headers_ai, 
    json={"model": "gpt-6-astra", "messages": [{"role": "user", "content": prompt}], "max_tokens": 100})

result = resp.json()
content = result.get("choices", [{}])[0].get("message", {}).get("content", "")
print("RESPOSTA:", content)

# Tentar parsear
try:
    data = json.loads(content)
    print("JSON VALIDO:", data)
except:
    print("JSON INVALIDO - tentando extrair...")
    import re
    match = re.search(r'\{[^}]+\}', content)
    if match:
        print("EXTRAIDO:", match.group())
