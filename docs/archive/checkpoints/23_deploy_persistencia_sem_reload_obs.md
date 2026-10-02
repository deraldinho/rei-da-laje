> **ARQUIVADO / HISTÓRICO.** Este documento registra uma etapa anterior e não define a regra vigente. Consulte [`docs/README.md`](../../README.md) e [`00_arquitetura_vigente.md`](../../00_arquitetura_vigente.md).

# Checkpoint 23 — deploy do frontend de continuidade sem reload OBS

Data local x99: 24/09/2026 ~21:31 (-03). Autorização: deploy; manter fonte OBS sem atualização manual.

- Porta principal 3000 já estava executando backend novo antes desta publicação: `GET /api/competition/arena`, `/api/competition/health` e `/api/tiktok/status` com contadores de eventos responderam. Arquivo `backend/data/arena-state.json` existia, continha um participante ativo e correspondia ao id de sessão `2a075445-bc5f-4f7c-8a10-b4cb6602861f`. Não houve reinício explícito do backend pela operação de publicação.
- Backup da versão anterior em `backups/frontend-dist-before-checkpoint-deploy-20260924-213121`.
- `frontend/dist-preview` publicado em `frontend/dist`, arquivos de assets primeiro (preservando os arquivos antigos para clientes já abertos), `index.html` por último. Hash do index de origem e destino idêntico. A porta 3000 serviu o bundle novo `assets/index-Db9MDH_7.js` com HTTP 200.
- Verificação posterior: servidor principal respondeu; sessão `2a075445-bc5f-4f7c-8a10-b4cb6602861f` preservada com um participante; endpoint de checkpoint sem erro de gravação; TikTok indicou `connected=true`, `eventsActive=true` e chat real registrado. Essas leituras são instantâneas, não comprovam estabilidade do transporte por toda a transmissão.
- O PID da porta 3000 mudou entre verificações (54632, depois 55604) **sem comando nosso de restart**; existe mecanismo externo ou processo concorrente a investigar. Não afirmar tempo de atividade ininterrupto apenas com base neste deploy.
- Nenhuma atualização manual/refresh da fonte OBS realizada. Navegador já aberto continua executando o JavaScript anterior até reload automático/manual; `authorityActive=false` e FPS nulo indicam que a versão atual da tela ainda não reivindicou o novo executor. Os recursos de checkpoint físico via WebSocket dependem da nova versão ser carregada pela tela; a persistência dos dados básicos da partida no backend já funciona. Não prometer atualização visual imediata no OBS.
