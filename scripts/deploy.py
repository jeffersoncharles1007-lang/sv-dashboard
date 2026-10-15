#!/usr/bin/env python3
"""
Deploy script para Vercel via API
Uso: python3 deploy.py
"""
import urllib.request
import json
import os
import hashlib

TOKEN = "YOUR_VERCEL_TOKEN"
TEAM_ID = "team_uapGeEev6uLJmOp9woBTe674"
PROJECT_ID = "prj_ksrzxPbM7KG0CWxlfTGmLH7orwso"

def deploy(project_dir, target="production"):
    # Coletar arquivos
    files = []
    skip_dirs = {'.git', 'node_modules', '.next', '.next-cache', '__pycache__'}
    
    for root, dirs, filenames in os.walk(project_dir):
        dirs[:] = [d for d in dirs if d not in skip_dirs]
        for file in filenames:
            if file.endswith(('.pyc', '.log', '.png', '.jpg')):
                continue
            filepath = os.path.join(root, file)
            arcname = os.path.relpath(filepath, project_dir)
            try:
                with open(filepath, 'rb') as f:
                    content = f.read()
                files.append({
                    'file': arcname,
                    'data': content.decode('utf-8', errors='replace')
                })
            except:
                pass
    
    print(f"📦 {len(files)} arquivos coletados")
    
    # Criar deployment
    url = "https://api.vercel.com/v13/deployments"
    headers = {
        'Authorization': f'Bearer {TOKEN}',
        'Content-Type': 'application/json',
        'x-now-team-id': TEAM_ID
    }
    
    body = {
        "name": "dashboard",
        "project": PROJECT_ID,
        "target": target,
        "files": [{"file": f['file'], "data": f['data']} for f in files]
    }
    
    print(f"🚀 Fazendo deploy para {target}...")
    req = urllib.request.Request(url, data=json.dumps(body).encode(), headers=headers, method='POST')
    
    with urllib.request.urlopen(req, timeout=120) as resp:
        data = json.loads(resp.read())
        return data.get('url'), data.get('id')

if __name__ == '__main__':
    import sys
    project_dir = sys.argv[1] if len(sys.argv) > 1 else '.'
    url, deploy_id = deploy(project_dir)
    print(f"✅ Deploy: {url}")
