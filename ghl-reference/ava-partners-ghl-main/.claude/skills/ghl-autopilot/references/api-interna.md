# Cheatsheet da API interna do GHL (engenharia reversa)

Consulte quando montar algo avançado ou quando um endpoint der erro estranho. O motor já
aplica quase tudo isto — use como mapa quando precisar sair do motor ou depurar.

## Perfis de header (o detalhe que mais quebra)
Todo request na API interna precisa de `token-id` + `channel: APP` + `source: WEB_USER` +
um **User-Agent de navegador** (senão o Cloudflare bloqueia). Além disso, o header de
**versão muda por serviço**:

| Serviço | Header de versão |
|---|---|
| Oficial (`services…`, Bearer PIT) | `Version: 2021-07-28` |
| Interna geral (pipelines, workflows, custom fields) | `Version: 2021-07-28` |
| **Reporting (dashboards)** — CRUD | `version: 2021-04-15` **+ `x-reporting-api-version: 3`** |
| **Reporting (dashboards)** — query de DADOS do card | `Version: 2021-07-28` (sem x-reporting) |

Sem o `x-reporting-api-version: 3` no CRUD de dashboard, QUALQUER PUT dá 409
`dashboard_version_error` (enganoso — não é a versão do doc).

## Workflow — modelo de grafo
- Ramos são **nós reais**. `if_else`: nó pai tem as condições; cada ramo é um nó
  `type:if_else` `nodeType:branch-yes`(`{if:false}`) / `branch-no`(`{else:true}`) com
  `sibling[]` e `parent`=`parentKey`=id do pai. `wait_reply`/`find_opportunity`: ramos são
  `type:transition`.
- A 1ª ação de um ramo tem `parent`=`parentKey`=id da âncora. Sem `parent`, o ramo fica solto.
- Precisa de `meta.advanceCanvasMeta.enabled=true` no PUT (modo avançado) senão os ramos
  renderizam desconectados.
- **Wait até responder:** `wait` com `attributes.type:"reply"`, `reply:[id do SMS]`,
  transitions `[wait, timeout]`.
- **Escrever custom field da OPORTUNIDADE:** ação `internal_update_opportunity` com
  `__customInputFields__:[{filterField:<fieldId>, value, dataType, valueFieldType}]` (sem
  pipelineId/stageId = só grava o campo).
- **Botão SMS:** `#bt|linha1|linha2|rodapé|Label*id/Label*id` (label ≤20 chars); a resposta
  casa por `contact_reply / message.body / contain / <id do botão>`.

## Gatilhos (campo `type`)
`contact_tag` · `appointment` (cond `calendar.id` + `appointment.status=confirmed`) ·
`birthday_reminder` · `customer_reply` (cond `contact.tags index-of-false` p/ "sem tag";
cond `message.type ==` p/ CANAL: **Instagram=18, Facebook=11, WhatsApp=2, SMS=1**) ·
`pipeline_stage_updated` (cond `opportunity.pipelineId` + `pipelineStageId`).

## Pipeline
`POST/GET/DELETE backend /opportunities/pipelines?locationId={loc}` (Version 2021-07-28).
Body: `{name, locationId, showInFunnel, showInPieChart, stages:[{name,position,color,
stageWinProbability,…}]}`.

## Pastas de custom field
- LISTAR: `GET /locations/{loc}/customFields/search?documentType=folder&model={contact|
  opportunity}&includeStandards=true` → resposta na chave **`customFieldFolders`**.
- Campos: mesmo endpoint com `documentType=field` (chave `customFields`).
- CRIAR pasta: `POST /locations/{loc}/customFields {documentType:"folder",model,name}` →
  resposta em `customFieldFolder`.
- MOVER campo pra pasta: `PUT /locations/{loc}/customFields/{fieldId}
  {name,dataType,model,parentId:<folderId>[,options]}`.
- DELETAR pasta: `DELETE /locations/{loc}/customFields/{folderId}`. Pastas com
  `standard:true` são do sistema — não deletar. Rename via PUT dá 400.

## Dashboard ("Painel de controle") — backend, headers de reporting
- LISTAR: `GET /reporting/dashboards?locationId={loc}` → `data.{defaultDashboardId,
  dashboard[], sharedDashboards[]}`.
- DETALHE: `GET /reporting/dashboards/{id}?locationId={loc}` → `data.{widgets[](def),
  dashboardWidgets[](join+layout), dashboard}`. `layout.id == dashboardWidget._id`.
  Versão atual do doc em `data.dashboard.__v`.
- CRIAR: `POST /reporting/dashboards?locationId={loc}
  {locationId,title,type:"custom",isPrivate:false,isDefault:false}` (locationId NO body).
- DELETAR: `DELETE /reporting/dashboards/{id}?locationId={loc} {locationId,version:<__v>}`.
- SALVAR widgets: `PUT /reporting/dashboards/{id}?locationId={loc}` body
  `{title, activityBuffer:{create:[{<novoWidgetId>:{…def, dashboardId, dashboardWidgetId,
  version:0, deleted:false}}]}, layout:[TODOS os widgets, {x,y,w,h,minW,minH,noResize,id,
  cellHeight:"54px"}], themeConfig, version:<__v atual>}`. O `layout` precisa conter TODOS
  os widgets (some quem faltar).
- Setar como default via API não funciona (`PUT /reporting/dashboards/default` dá 422) —
  peça ao humano pra fazer na UI (menu ⋮ → Tornar padrão).

### Catálogo de widgets
- **Cabeçalho de seção** (barra): `{chartType:"objectWidget", module:"object-widget",
  group:"object-widgets", identifier:"object-title", title, apiConfig:null, options:null}`.
- **Card numérico:** `{chartType:"numeric", module, group, identifier, apiConfig:{path,
  method:"POST"}, options:{aggregations:[{operator,field}], dateProperty, filters}}`.
  - Oportunidades: module `crm-opportunities`, group `crm-opportunities-count`, identifier
    `crm-opportunities-open-counts`, path `/dashboards/crm/opportunities`, dateProperty `date_added`.
  - Agendamentos: module `automation-appointments`, group `automation-appointments-count`,
    identifier `automation-appointments-counts`, path `/dashboards/automations/appointments`,
    dateProperty **`dateAdded`** (camelCase!).
  - Contatos: module `crm-contacts`, group `crm-contacts-count`, identifier
    `crm-contacts-counts`, path `/dashboards/crm/contacts`, dateProperty `date_added`.
- Outros chartTypes vistos: `donut` (com `groupBy`).

### Schema de filtro (`options.filters`) — sempre 1 OR contendo grupos AND
```json
[{"group":"OR","filters":[
   {"group":"AND","filters":[{"field":"status","operator":"eq","value":"won","uiMeta":{}}]}
]}]
```
Sem filtro = `[{"group":"OR","filters":[]}]`. Vários grupos AND dentro do OR = "OU"
(ex.: perdidos = `status=lost` OU `status=abandoned`). O mesmo filtro vai TAMBÉM no corpo
da query `POST /reporting/dashboards/crm/…` (o `apiConfig.path` é relativo a `/reporting`).
Campos: `status` (open/won/lost/abandoned), `appointmentStatus` (confirmed/showed/noshow),
`tags`.

## Quando nada disto bater
Se um recurso novo não tiver endpoint documentado aqui: caçe um pouco (liste, tente GETs
óbvios) e, se travar, **peça ao humano a captura da aba Network** (URL + headers + corpo)
reproduzindo a ação no CRM — ou o **modo desenvolvedor** da extensão. Foi assim que tudo
isto foi descoberto. Depois, **anote o novo aprendizado aqui**.
