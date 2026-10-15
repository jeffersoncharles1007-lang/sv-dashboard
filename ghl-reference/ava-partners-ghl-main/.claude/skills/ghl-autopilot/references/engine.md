# Usar o motor (`engine/`)

O motor implementa a automação via API. Tudo Python puro (stdlib). Rode da **raiz do
repo** pra o pacote `engine` importar. Carregue o `.env` (os exemplos têm um `load_env()`).

## Autenticação (comum a tudo que é API interna)
```python
from engine.ghl_internal_client import TokenManager, InternalGHLClient
tm = TokenManager()                 # usa GHL_FIREBASE_REFRESH_TOKEN do .env, renova sozinho
client = InternalGHLClient(tm, LOC) # LOC = GHL_LOCATION_ID
```

## 1. Estrutura — `StructureBuilder` (`engine/ghl_structure.py`)
Pipelines (API interna) + custom fields/values/calendários (API oficial, precisa do PIT).
```python
from engine.ghl_structure import StructureBuilder
sb = StructureBuilder(LOC, pit=PIT, token_mgr=tm)

pipe = sb.create_pipeline("Funil de Vendas", ["Lead Novo", "Em Atendimento", "Qualificado"])
stage = {s["name"]: s["id"] for s in pipe["stages"]}     # nome -> id do estágio
sb.create_custom_field("Origem do Lead", "SINGLE_OPTIONS", "contact",
                       options=["Instagram", "WhatsApp", "Site"])
sb.create_custom_value("Nome da Empresa", "Minha Imobiliária")
sb.create_calendar("Visitas", slot_minutes=40, days=(2,3,4,5,6), open_hour=9, close_hour=19)
```
`create_pipeline(reuse=True)` devolve um existente de mesmo nome (idempotente). Guarde os
**IDs de estágio** — workflows e dashboards precisam deles.

## 2. Workflow — DSL + deploy (`engine/wf_nodes.py`, `engine/wf_deploy.py`)
Monte uma lista de passos; nós multipath (if/else, wait-reply, find/create/update
opportunity) recebem sub-listas. O compilador vira o grafo real do GHL (ramos conectados).
```python
from engine import wf_nodes as N, wf_deploy as D

fluxo = N.compile_workflow([
    N.create_opportunity(pid, stage["Lead Novo"]),
    N.sms("Oi {{contact.first_name}}! Recebi seu contato 👋"),
    N.wait_reply(
        on_reply=[N.add_tag(["respondeu"]),
                  N.update_opportunity(pid, stage["Em Atendimento"]),
                  N.sms("Show! Você procura comprar ou alugar?")],
        on_timeout=[N.sms("Passando pra saber se posso ajudar 🙂")],
        timeout_value=1, timeout_unit="hour",
    ),
])
res = D.deploy(client, LOC, folder="Boas-vindas", wf_name="WF-01 Boas-vindas",
               templates=fluxo, trigger=D.tag_trigger("novo-lead"))
print(res["url"])   # abre em rascunho
```
Nós folha úteis: `sms, wait_time, wait_appointment, add_tag, remove_tag, update_field,
add_note, task, internal_notification, facebook_capi, create_opportunity,
update_opportunity, set_opp_field, goto, label`.
Multipath: `switch(branches, otherwise), if_has_tag, find_opportunity, wait_reply`.
Gatilhos: `tag_trigger, appointment_trigger, birthday_trigger, customer_reply_trigger,
channel_reply_trigger, pipeline_stage_trigger`.
Regra: **sempre `draft`** (o `deploy` já cria como rascunho). Revisão humana antes de ativar.

### Botões no SMS (menu clicável)
Não existe um nó `button()` dedicado — um botão é um **SMS com um formato especial no
corpo**, e você ramifica na resposta com `switch` + `reply_contains`. Formato do corpo:
`#bt|linha1|linha2|rodapé|Label1*id1/Label2*id2` (labels ≤20 caracteres). O `id` é o que a
resposta carrega — é nele que você casa. Padrão completo (menu com loop de volta):
```python
N.compile_workflow([
    N.label("menu"),                                  # alvo do goto (marca o próximo nó)
    N.sms("#bt|Como posso te ajudar?||Escolha:|Comprar*comprar/Alugar*alugar", name="Menu"),
    N.wait_reply(
        on_reply=[
            N.switch([
                N.branch("Comprar", [N.reply_contains("comprar")],
                         [N.add_tag(["interesse-venda"]), N.sms("Boa! Opções de compra a caminho.")]),
                N.branch("Alugar",  [N.reply_contains("alugar")],
                         [N.add_tag(["interesse-locacao"]), N.sms("Perfeito! Opções de locação a caminho.")]),
            ], otherwise=[N.sms("Não entendi 🙈"), N.goto("menu")]),   # nenhuma opção -> volta pro menu
        ],
        on_timeout=[N.sms("Quando puder, é só tocar numa opção 🙂")],
    ),
])
```

## 3. Dashboard — `DashboardBuilder` (`engine/ghl_dashboard.py`)
Cria um "Painel de controle" com seções (barras) + cards de KPI, layout automático.
```python
from engine.ghl_dashboard import DashboardBuilder
db = DashboardBuilder(LOC, tm)
db.create("📊 Painel de KPIs")
db.section("🎯 Oportunidades", cols=4)
db.card("Leads Totais", "opp", "count", "id")
db.card("Ganhos",       "opp", "count", "id", where=("status", "won"))
db.card("Perdidos",     "opp", "count", "id", where=("status", ["lost", "abandoned"]))
db.section("📲 Origem", cols=3)
db.card("WhatsApp", "contact", "count", "id", where=("tags", "canal-whatsapp"))
db.publish()   # salva todos os widgets
```
`kind`: `opp` (crm-opportunities), `appt` (agendamentos), `contact` (contatos).
`operator`: `count` ou `sum` (ex.: `sum` de `monetary_value`). `where=(campo, valor)` ou
`(campo, [v1, v2])` pra "OU". Filtros úteis: `status` (open/won/lost/abandoned),
`appointmentStatus` (confirmed/showed/noshow), `tags`.

## Dica de execução
Prefira **adaptar os exemplos** (`examples/funil_boas_vindas.py`,
`examples/dashboard_kpis.py`) — eles já têm o `load_env()`, os imports e o padrão certo.
Copie, ajuste ao spec, rode com `python examples/…`. Se der erro de schema/versão numa
parte avançada, veja `references/api-interna.md`.
