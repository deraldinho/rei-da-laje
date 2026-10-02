> **ARQUIVADO / HISTÓRICO.** Este documento registra uma etapa anterior e não define a regra vigente. Consulte [`docs/README.md`](../../README.md) e [`00_arquitetura_vigente.md`](../../00_arquitetura_vigente.md).

# 50 · Diagnóstico e Correção da Sincronização Geral: Arena, Frontend, Painel Admin e TikTok Live

**Data**: 29/09/2026  
**Status**: Concluído, Auditado e 100% Validado (**165/165 testes aprovados**)  
**Módulos Alterados**:
- `frontend/src/engine/App.js`
- `frontend/src/ui/ThreeSkyScene.js`
- `frontend/src/ui/HUD.js`
- `backend/views/admin.html`
- `backend/tiktokFetchGuard.js`
- `tests/synchronization-integrity.test.cjs`

---

## 1. Diagnóstico das Causas de Falha de Sincronização

Durante a auditoria completa de fluxo (TikTok Live ➔ Backend ➔ OBS/Frontend ➔ Painel Admin), foram identificados **6 pontos críticos** que impediam a sincronização contínua de todo o sistema:

### 1.1 `ReferenceError` Fatal no Frontend ao Registrar Corte (`handleCutSuccess`)
- Em `frontend/src/engine/App.js`, no método `handleCutSuccess(winner, loser, cutX, cutY)`, a chamada:
  ```javascript
  this.audio.announceCut(winner.nickname, loserNick);
  ```
  tentava ler a variável `loserNick` **antes** da sua declaração `const loserNick = loser.nickname;` que estava 15 linhas abaixo.
- Em JavaScript strict/ES module, isso disparava um erro em tempo de execução (`Cannot access 'loserNick' before initialization`).
- **Consequência direta**: O loop do jogo falhava no momento exato do corte. A emissão do socket `this.socket.emit('relinho:cut', ...)` **nunca era enviada ao backend**, impedindo que o perdedor fosse removido, que o placar/líder fossem atualizados e que novos jogadores da fila subissem para o céu.

### 1.2 Painel Admin (`admin.html`) Dessincronizado da Arena
- O painel em `http://localhost:3000/admin` mantinha `activePlayers = []` e só adicionava participantes que disparassem um novo evento `player:spawn`.
- Ao abrir o Admin com pipas já ativas na arena ou restauradas do banco em disco, a lista de jogadores ficava vazia (`Nenhuma pipa no ar ainda`), impossibilitando o streamer de interagir com as pipas em voo.
- **Correção**: Implementada a função `syncAdminWithArena()` que consulta `/api/competition/arena` no carregamento, ao reconectar o socket, periodicamente a cada 3s e nos eventos de corte/spawn/reset.

### 1.3 Ausência de Timer de Autocura Periódica no Frontend (`syncArena`)
- O método `syncArena()` só era invocado no carregamento inicial da página e na reconexão do socket.
- Se qualquer pacote WebSocket (`player:spawn`, `player:buff_applied`, etc.) fosse perdido por oscilação momentânea de rede, o estado do jogo local derivava e nunca mais se recuperava.
- **Correção**: Adicionado `this.arenaSyncTimer = setInterval(() => this.syncArena(), 6000)` com limpeza correta em `destroy()`.

### 1.4 Incompatibilidade de Tipos de Chave no Three.js (`ThreeSkyScene.js`)
- Em `ThreeSkyScene.js`, o mapa `kites3D` utilizava strings `uidStr` como chave, enquanto o conjunto `activeUserIds` adicionava o `userId` bruto (que podia ser número em payloads de simulação ou IDs puros).
- Na verificação de descarte `if (!activeUserIds.has(userId))`, entidades eram marcadas indevidamente como inativas, disparando ciclos desnecessários de `dispose` e recriação a cada quadro.
- **Correção**: `activeUserIds` normalizado para conter exclusivamente strings `String(userId)`.

### 1.5 Perda do Cookie `ttwid` entre Subprocessos do Conector TikTok
- O guard `tiktokFetchGuard.js` mantinha o cookie `ttwid` apenas em memória volátil. Toda vez que um worker era reiniciado ou recriado, o cache iniciava vazio, forçando requisições anônimas que resultavam em `ttwid: no ttwid cookie in response (status 200)`.
- **Correção**: Implementada persistência atômica em disco (`backend/data/ttwid-cache.json`) com TTL de 30 minutos, sobrevivendo ao ciclo de vida de múltiplos workers.

### 1.6 Bundle de Produção do Frontend Desatualizado (`frontend/dist`)
- O servidor Express em `server.js` entrega os arquivos estáticos de `frontend/dist/`.
- Os arquivos estavam congelados com data de 27/09/2026, enquanto todas as melhorias e correções recentes residiam em `frontend/src/`.
- **Correção**: Executado `npm run build` gerando um novo bundle sincronizado e otimizado.

---

## 2. Validação e Testes

- Criação da suíte `tests/synchronization-integrity.test.cjs` com 6 testes específicos de integridade.
- Execução de `npm test`: **165 de 165 testes aprovados (100% de sucesso)**.
- Geração de novo build de produção com Vite em `frontend/dist`.
