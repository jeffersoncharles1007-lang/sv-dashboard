#!/bin/bash
# Agente Vendedor - Execução Diária
# Roda todo dia às 8h para processar conversas do dia anterior

LOG_FILE="/root/sv-dashboard/logs/agente_diario.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

echo "[$DATE] === INICIANDO AGENTE DIÁRIO ===" >> $LOG_FILE

# Exportar variáveis
export GHL_API_KEY='pit-89a4b3d1-851e-4c7d-9f58-4d8d63e0ef92'
export PATH="/usr/local/bin:/usr/bin:/bin:$HOME/.local/bin"

cd /root/sv-dashboard

# 1. Sync conversas do dia (buscar novas conversas)
echo "[$DATE] Sincronizando conversas..." >> $LOG_FILE
python3 scripts/sync_ghl.py >> $LOG_FILE 2>&1

# 2. Rodar agente classificador
echo "[$DATE] Classificando conversas..." >> $LOG_FILE
python3 scripts/agente_v2.py >> $LOG_FILE 2>&1

# 3. Verificar resultado
RESULT=$(PGPASSWORD='sv_pass_2026' psql -h localhost -U sv_user -d sv_dashboard -t -c "SELECT COUNT(*) FROM classification_logs WHERE created_at > CURRENT_DATE;" 2>/dev/null | tr -d ' ')

echo "[$DATE] Classificadas hoje: $RESULT" >> $LOG_FILE
echo "[$DATE] === FIM AGENTE DIÁRIO ===" >> $LOG_FILE
