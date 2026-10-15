# 🔒 Segurança & Uso Responsável

Leia antes de usar. Este projeto mexe em **contas reais** de GoHighLevel.

## 1. O token do Firebase é o seu login inteiro
O `token-id` / `refresh token` capturado pela extensão **é a sua sessão completa
do GHL** — quem tiver ele entra na sua conta como você. Portanto:

- **NUNCA** commite o `.env` (já está no `.gitignore`).
- **NUNCA** cole o token em issue, print, vídeo ou chat público.
- Use **apenas na SUA conta de agência** — nunca na conta de um cliente.
- Se vazar, **saia de todas as sessões** no GHL (isso invalida o refresh token).

## 2. Duas APIs — saiba a diferença
| API | Endpoint | Auth | Status |
|---|---|---|---|
| **Oficial** | `services.leadconnectorhq.com` | PIT (`pit-...`) | ✅ Suportada pelo GHL |
| **Interna** | `backend.leadconnectorhq.com` | Firebase `token-id` | ⚠️ **NÃO-oficial** |

A API **interna** (workflows, dashboards, pastas) é engenharia reversa. **Não
tem SLA, pode quebrar sem aviso** e usá-la pode ferir os Termos do GHL. Prefira
a **oficial** sempre que possível.

## 3. Regras de ouro ao automatizar
- **Sempre crie workflows em rascunho (`draft`)** e revise antes de ativar.
- **Nunca dispare mensagens/e-mails em massa** sem revisar texto e lista.
- **Não delete/sobrescreva** dados sem backup e sem ter certeza.
- Comece em **modo leitura** (mapear a conta) antes de escrever.
- Teste em uma **subconta descartável**, não em produção/cliente.

## 4. Reportar um problema de segurança
Achou uma vulnerabilidade? **Não abra issue pública.** Use o **GitHub Security Advisory**
privado deste repositório (aba *Security → Report a vulnerability*) ou escreva para o
canal de contato do AVA Partners Program. Resposta esperada em até ~5 dias úteis.
> Ajuste este contato para o seu e-mail/canal real antes de publicar.

## 5. Isenção
Software fornecido "no estado em que se encontra", sem garantias (ver `LICENSE`).
Você é responsável pelo uso na sua conta. GoHighLevel® é marca da HighLevel, Inc.;
este projeto não é afiliado nem endossado pela HighLevel.
