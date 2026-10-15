#!/usr/bin/env python3
"""
Parse Auditoria - Extrai métricas estruturadas do texto da IA de auditoria
Salva na tabela audit_metrics do Supabase
"""
import os
import json
import re
from datetime import date, timedelta
from supabase import create_client, Client

SUPABASE_URL = os.environ.get('SUPABASE_URL')
SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_KEY')

def parse_auditoria_text(text: str, vendedor: str, data: date):
    """Parseia texto de auditoria e extrai métricas"""
    metrics = {
        'data_analise': data.isoformat(),
        'vendedor': vendedor,
        'nota_total': 0,
        'acolhimento': 0,
        'sondagem': 0,
        'identificou': 0,
        'cvb': 0,
        'gatilho': 0,
        'encerrou': 0,
    }
    
    if not text:
        return metrics
    
    # Nota total (0-6)
    nota_match = re.search(r'nota[:\s]+([0-9.,]+)', text, re.IGNORECASE)
    if nota_match:
        nota = nota_match.group(1).replace(',', '.')
        metrics['nota_total'] = float(nota)
    
    # Passos (%)
    passos = {
        'acolhimento': ['acolhiment', 'recepção', 'welcome', 'abertura'],
        'sondagem': ['sondagem', 'pergunt', 'identific'],
        'identificou': ['identificou', 'necessidade', 'pain', 'problema'],
        'cvb': ['cvb', 'proposta', 'valor', 'preço', 'solução'],
        'gatilho': ['gatilho', 'urgência', 'escassez', 'tempo'],
        'encerrou': ['encerro', 'fechamento', 'próximo passo', 'compromisso'],
    }
    
    for passo, keywords in passos.items():
        for kw in keywords:
            match = re.search(rf'{kw}[:\s]+([0-9]+)', text, re.IGNORECASE)
            if match:
                metrics[passo] = int(match.group(1))
                break
    
    return metrics

def save_metrics(supabase: Client, metrics: dict):
    """Salva métricas no Supabase"""
    # Verifica se já existe registro para hoje
    existing = supabase.table('audit_metrics').select('id').eq('data_analise', metrics['data_analise']).eq('vendedor', metrics['vendedor']).execute()
    
    if existing.data:
        # Update
        supabase.table('audit_metrics').update(metrics).eq('id', existing.data[0]['id']).execute()
    else:
        # Insert
        supabase.table('audit_metrics').insert(metrics).execute()

def main():
    print("=== Parse Auditoria -> audit_metrics ===")
    
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("ERRO: SUPABASE_URL e SUPABASE_SERVICE_KEY são necessários")
        return
    
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    # Exemplo: processar auditorias dos últimos 7 dias
    hoje = date.today()
    
    # Buscar textos de auditoria (exemplo - substitua pela fonte real)
    auditoria_texts = [
        {
            'vendedor': 'emily',
            'data': hoje.isoformat(),
            'texto': 'Nota: 4.5. Acolhimento: 80%. Sondagem: 60%. Identificou: 70%. CVB: 50%. Gatilho: 40%. Encerrou: 30%.'
        },
        {
            'vendedor': 'katherine',
            'data': hoje.isoformat(),
            'texto': 'Nota: 5.0. Acolhimento: 90%. Sondagem: 85%. Identificou: 80%. CVB: 70%. Gatilho: 60%. Encerrou: 65%.'
        },
    ]
    
    for aud in auditoria_texts:
        metrics = parse_auditoria_text(
            aud['texto'], 
            aud['vendedor'], 
            date.fromisoformat(aud['data'])
        )
        save_metrics(supabase, metrics)
        print(f"Métricas salvas para {metrics['vendedor']}: nota={metrics['nota_total']}")
    
    print("\nConcluído!")

if __name__ == '__main__':
    main()
