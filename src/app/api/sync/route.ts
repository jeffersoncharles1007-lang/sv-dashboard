import { NextResponse } from 'next/server';
import { fetchOpportunities, fetchContacts } from '@/lib/ghl';
import { sql, createSyncLog, finishSyncLog, upsertContact, upsertOpportunity } from '@/lib/postgres';

export const maxDuration = 300; // 5 minutes

// Custom Fields mapping para contacts
const CUSTOM_FIELDS_MAP: Record<string, string> = {
  'contactsituacao_comercial': 'situacao_comercial',
  'contactresultado_ultimo_contato': 'resultado_ultimo_contato',
  'contactlead_prioridade': 'lead_prioridade',
  'contactsegmento_do_cliente': 'segmento_cliente',
};

export async function POST() {
  const syncLogId = await createSyncLog('full_sync');
  let totalSynced = 0;

  try {
    // Fetch all data from GHL
    const [opportunities, contacts] = await Promise.all([
      fetchOpportunities(),
      fetchContacts(),
    ]);

    // Sync opportunities
    for (const opp of opportunities) {
      await upsertOpportunity({
        id: opp.id,
        ghl_id: opp.id,
        name: opp.name,
        status: opp.status,
        pipeline_stage_id: opp.pipelineStageId,
        monetary_value: opp.monetaryValue || 0,
        contact_id: opp.contactId,
      });
    }
    totalSynced += opportunities.length;

    // Sync contacts com custom fields
    for (const c of contacts) {
      const customFields: Record<string, string> = {};
      for (const [cfId, colName] of Object.entries(CUSTOM_FIELDS_MAP)) {
        const field = c.customFields?.find((f: { id: string; fieldValue: string }) => 
          f.id.toLowerCase().includes(cfId.toLowerCase()) ||
          f.id.endsWith(cfId)
        );
        customFields[colName] = field?.fieldValue || '';
      }

      await upsertContact({
        id: c.id,
        ghl_id: c.id,
        first_name: c.firstName,
        last_name: c.lastName,
        email: c.email,
        phone: c.phone,
        situacao_comercial: customFields.situacao_comercial || '',
        resultado_ultimo_contato: customFields.resultado_ultimo_contato || '',
        lead_prioridade: customFields.lead_prioridade || '',
        segmento_cliente: customFields.segmento_cliente || '',
        tags: c.tags || [],
      });
    }
    totalSynced += contacts.length;

    await finishSyncLog(syncLogId, totalSynced, 'success');

    return NextResponse.json({
      success: true,
      synced: {
        opportunities: opportunities.length,
        contacts: contacts.length,
        total: totalSynced,
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Sync error:', error);
    await finishSyncLog(syncLogId, totalSynced, 'error', error instanceof Error ? error.message : 'Unknown error');
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
