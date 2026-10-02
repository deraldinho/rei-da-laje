> **ARQUIVADO / HISTÓRICO.** Este documento registra uma etapa anterior e não define a regra vigente. Consulte [`docs/README.md`](../../README.md) e [`00_arquitetura_vigente.md`](../../00_arquitetura_vigente.md).

# Checkpoint 32 — Auditoria Geral do Projeto e Painel de Reset da Arena

Data: 26/09/2026 — Projeto Rei da Laje (TikTok Live).

---

## 1. Auditoria Geral do Projeto

### A. Diagnóstico da Inicialização e Conexão TikTok
- **Evidência do log do usuário**:
  `[TikTok Live] Transporte interrompido (TRANSPORT_WARNING); aguardando reconexão.`
  `[TikTok Live] Falha ao conectar a @deraldinho73: erro de conexão (detalhes omitidos)`
- **Causa**: Quando o perfil configurado (`@deraldinho73`) não está transmitindo ao vivo no momento da inicialização, o conector independente (`piratetok-live-js` via `tiktokWorkerSupervisor.js`) recebe recusa de conexão ou sala não encontrada.
- **Comportamento atual**: O supervisor e o backend tratam essa condição corretamente, mantendo o servidor Express e o motor Socket.io vivos sem crash (`retrying: true`, com tentativas espaçadas entre 10s e 60s). O jogo permanece 100% operacional no modo simulação/local mesmo sem live ativa.

### B. Diagnóstico de Persistência e Falta de Reset (Causa Raiz Identificada)
- O estado da arena é persistido atomicamente em `backend/data/arena-state.json`.
- Ao iniciar o servidor com `npm start`, o método `ArenaStateStore.restore()` recarrega os participantes salvos (como evidenciado no log: `[Arena] Partida restaurada`).
- **Problema**: Até este checkpoint, não existia nenhuma API ou botão no painel administrativo `/admin` para limpar ou resetar a arena. Caso pipas ficassem travadas, houvesse testes antigos acumulados ou o streamer quisesse iniciar uma nova partida limpa com sua audiência, o estado persistido continuava sendo recarregado indefinidamente.

---

## 2. Implementação do Painel de Reset

Foi adicionado um sistema de reset completo com 3 níveis de granularidade:

### 1. Níveis de Reset Disponíveis
1. **🧹 Limpar Pipas (Nova Rodada — `scope: 'kites'`)**:
   - Esvazia todas as pipas ativas na arena e a fila de espera.
   - Reseta o líder da rodada e o rei atual.
   - **Preserva**: O ranking histórico acumulado da Live (cortes, recorde de cortes, maiores sequências, Hall da Fama).
   - Ideal para quando uma rodada termina ou o streamer quer chamar todos para comentarem novamente.

2. **🏆 Zerar Placar & Ranking (Nova Temporada — `scope: 'stats'`)**:
   - Zera todos os cortes acumulados, sequências, coroas e diamantes reportados na sessão.
   - Reseta pontuações e sequências das pipas que já estão voando para 0.
   - Ideal para zerar o placar da live entre blocos de transmissão.

3. **⚠️ Reset Completo de Fábrica (Full Wipe — `scope: 'all'`)**:
   - Limpa todas as pipas e esvazia a fila.
   - Cancela e esvazia todos os timers de buffs (Cerol, Chile, Kevlar) e poderes especiais (Tornado, Mestre do Céu).
   - Zera todo o histórico de estatísticas e ranking.
   - Gera um novo `arenaSessionId` exclusivo (invalidando snapshots antigos em memória).
   - Salva imediatamente o estado zerado em `backend/data/arena-state.json`.
   - Opção de desconectar e apagar o `@username` salvo em `backend/data/live-profile.json`.

### 2. Sincronização em Tempo Real (Zero Reload no OBS)
- O backend emite o evento WebSocket `arena:reset` com payload `{ scope, sessionId, at }`.
- O cliente PixiJS (`App.js`) recebe o evento e reage instantaneamente:
  - Destrói os sprites das pipas e bonecos palito da laje (`RooftopPlayer`).
  - Limpa os contêineres gráficos Pixi (`linesContainer`, `fallingContainer`, `kitesContainer`, `rooftopPlayers`).
  - Esvazia a fila de pipas caindo (`fallingKites`) e contatos de relinho.
  - Limpa o checkpoint do `localStorage` (`pipa-live-arena-v1`).
  - Limpa os alertas e killfeed no HUD (`HUD.js`).
  - Exibe banner de aviso em tela ("ARENA REINICIADA COM SUCESSO!").

### 3. Painel Administrativo `/admin`
- Adicionado o card **🔄 Painel de Reset da Arena** no Dev Simulator (`backend/views/admin.html`).
- **Modal de Confirmação**: Exibe diálogo visual de segurança antes de disparar o reset, evitando que o streamer clique por engano no meio da live.
- Checkbox opcional para desconectar e limpar o perfil do TikTok salvo.
- Feedback visual de status e log automático no terminal do admin.

---

## 3. Endpoints e Contratos

### `POST /api/competition/reset`
- **Autenticação / Proteção**: `requireLocalControl` (acessível exclusivamente por loopback `127.0.0.1` ou `::1`).
- **Payload**:
  ```json
  {
    "scope": "kites | stats | all",
    "clearProfile": false
  }
  ```
- **Resposta**:
  ```json
  {
    "success": true,
    "scope": "all",
    "sessionId": "a03c2613-0f27-4ec9-8bfb-18044f81ae14",
    "activePlayers": 0,
    "queue": 0,
    "savedUsername": "deraldinho73"
  }
  ```

---

## 4. Validação e Testes
- **Testes Unitários**: Criado `tests/arena-reset.test.cjs` validando:
  - Limpeza de pipas ativas e fila com preservação de estatísticas.
  - Zeragem de placar e estatísticas de sessão.
  - Reset total gerando novo `sessionId` e gravando arquivo limpo no disco.
  - Cancelamento de timers e esvaziamento em `BuffManager.clearAll()`.
  - Remoção de perfil salvo em `savedLiveProfile.clearSavedUsername()`.
- **Suíte Completa**: **129/129 testes aprovados** (`npm test`).
- **Build de Produção**: `npm run build` aprovado sem erros.
- **Teste em Execução**: Validado via requisições HTTP locais no servidor em execução na porta 3000.
