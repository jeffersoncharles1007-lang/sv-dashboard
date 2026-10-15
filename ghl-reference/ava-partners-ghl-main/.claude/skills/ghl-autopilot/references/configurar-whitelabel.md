# Configurar o white-label (quando a extensão não pega o token)

A extensão pega o **refresh token** de dois jeitos:
- **`background.js`** — observa as chamadas do Firebase (`securetoken.googleapis.com`). É
  **universal**: funciona em qualquer conta, inclusive white-label, mas só dispara quando o
  Firebase **renova** o token (por isso: **recarregue a página do GHL**).
- **`inject.js`** — lê o refresh token direto do IndexedDB do Firebase, **na hora**. Mas só
  roda nos domínios listados no `manifest.json` (por padrão, `gohighlevel.com`).

Se a pessoa acessa o GHL por um **domínio white-label próprio** (ex.: `app.suaagencia.com`),
o `inject.js` não roda lá até você adicionar o domínio. Sintoma: o popup fica em **"—"**
mesmo depois de recarregar a página.

## Como ajudar a pessoa (passo a passo)

1. **Descubra o domínio white-label dela.** Pergunte a URL que ela usa pra abrir o GHL
   (ex.: `https://app.suaagencia.com/v2/location/...`). O domínio é o `suaagencia.com`.

2. **Edite o `extension/manifest.json`** adicionando `https://*.<dominio>/*` em **3 lugares**:
   - em `host_permissions`
   - em `content_scripts[0].matches` (o do `bridge.js`)
   - em `content_scripts[1].matches` (o do `inject.js`)

   Exemplo (domínio `suaagencia.com`):
   ```json
   "host_permissions": [
     "https://securetoken.googleapis.com/*",
     "https://*.gohighlevel.com/*",
     "https://*.suaagencia.com/*",          // ← adicionado
     "http://localhost:8765/*",
     "http://127.0.0.1:8765/*"
   ],
   ...
   "matches": ["https://*.gohighlevel.com/*", "https://*.suaagencia.com/*"]  // nos DOIS content_scripts
   ```

3. **Recarregue a extensão** em `chrome://extensions` (botão ↻) e **recarregue a página do
   GHL**. O refresh token aparece no popup.

## Antes de mexer no manifest, tente isto (costuma resolver)
A extensão (v2.1+) roda em **todos os frames** (`all_frames`) e varre o IndexedDB/localStorage
de cada um. Muitos white-labels servem o app dentro de um **iframe do gohighlevel** — então
só **recarregar a página do GHL** já faz a extensão pegar o token, **sem** adicionar domínio.
O `background.js` também pega via `securetoken` quando o Firebase renova. Adicionar o
domínio (passos acima) é pra garantir/deixar instantâneo quando o app é servido direto no
domínio próprio (sem iframe).

## Plano B infalível: console (F12)
Se nada pegar, use o snippet de console em **`docs/get-firebase-token.md`** — ele imprime o
refresh token direto (com `await`, sem "Promise pendente"). É o caminho manual que sempre
funciona, inclusive em white-label (dá pra trocar o frame no dropdown do Console).

## Você (Claude) pode fazer isso pela pessoa
Se você tem acesso ao `manifest.json` no projeto dela, faça a edição dos 3 pontos você
mesmo (peça só a URL/domínio dela e confirme antes de salvar). Depois oriente a recarregar
a extensão e a página. É exatamente esse o fluxo que o vídeo demonstra.
