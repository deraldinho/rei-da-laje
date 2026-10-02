> **ARQUIVADO / HISTÓRICO.** Este documento registra uma etapa anterior e não define a regra vigente. Consulte [`docs/README.md`](../../README.md) e [`00_arquitetura_vigente.md`](../../00_arquitetura_vigente.md).

# Checkpoint 25 — TOP 5 competitivo e animações visuais de manobras

Data: 24/09/2026. Implementação em `C:\Users\deral\Rei da Laje`, sem recarregar OBS nem reiniciar intencionalmente o backend principal (porta 3000). Prévia isolada em `frontend/dist-preview`.

## TOP ranking / Hall da Fama

- `backend/rules/gameRules.js`: mantém os cortes acumulados da Live e melhor sequência; registra coroações ao alcançar cinco cortes consecutivos, vezes que o líder isolado foi cortado, quantidade de presentes reconhecidos e diamantes reportados; registra foto do perfil quando fornecida pelo evento de comentário. Não inventa vencedor ou líder em empate; ranking determinístico apenas para apresentação.
- `backend/tiktokService.js`: credita presentes reconhecidos ao participante que já entrou na competição e persiste estatísticas pela callback existente.
- `backend/server.js`: `/api/competition/stats` fornece `top`, `highlights`, `currentLeader` e `activeTop` além de fila e participantes, sem cache.
- `frontend/src/ui/HUD.js`, `frontend/index.html`, `frontend/src/ui/game.css`: TOP 5 oficial por cortes acumulados da Live, sequência, avatar, líder atual, maior sequência, reis derrubados, mais presentes e recorde de cortes, com transição de ranking e banner de subida. Nomes tratados com textContent, foto somente via img.src em HTTPS. Coroa e brilho do líder atual pulsantes; anúncios de streak 2/3/5/10 com textos diferentes. Revalidação pelo servidor a cada 5 s e após eventos de corte/liderança.

## Animações em pipas

- Novo `frontend/src/engine/ManeuverVisuals.js`: poses visuais parametrizadas por nome/duração, com entrada/saída suave, inclinação, escala, brilho e rastro. `frontend/src/entities/Kite.js`: corpo e avatar inclinam sem girar a linha, aura e trilhas no render PixiJS, rótulo da manobra acima da pipa, vibração da linha nas aparadas, coroa flutuante e brilho de streak. Manobra expirou: gráficos, inclinação e escala retornam ao estado normal. Pipas sem manobra não redesenham Graphics inúteis por frame.
- `frontend/src/engine/Maneuvers.js`: as duas aparadas ganharam microdesvios físicos limitados sem teleporte nem restauração de HP; retão, despicar e perseguir preservam o movimento próprio e seus limites já existentes. Não muda prioridades de corte nem força resultado.
- `frontend/src/ui/HUD.js`, `frontend/index.html` e CSS: toast exclusivo para manobra não sobrepõe o anúncio principal de novo líder.

## Testes/validação

- `npm test`: 48/48 aprovados; `node --check backend/server.js`: aprovado; `vite build frontend --outDir dist-preview --emptyOutDir`: aprovado, assets `index-D2kMQKjI.js`, `index-DEEp1MOT.css`. Aviso preexistente de bundle JS >500 KB/Vite CJS; não impede build.
- `tests/ranking-maneuver-visuals.test.cjs`: ranking sem líder em empate, estatística de presentes/reis derrubados, cinco poses distintas e reversão do efeito, aparadas com movimento pequeno.
- `tests/browser-smoke.mjs`: instância separada, TikTok auto-connect desligado, Edge headless; verificou 40 pipas, ranking oficial após corte validado (incluindo nome hostil sem injeção), recorde, atual rei/líder, hall da fama, 5 poses no PixiJS, respawn, presentes, recuperação de HP/linha e modo portrait. Nenhuma exceção no navegador. FPS de Edge em software não é medida do OBS real.

## Situação de produção

- Apenas código-fonte e `frontend/dist-preview` foram modificados nesta etapa; o build `frontend/dist` da Live ainda está na publicação anterior. Não houve refresh da fonte OBS; novas animações/ranking não devem ser anunciados como ativos na tela aberta. O backend novo de estatísticas também depende de reiniciar a instância produtiva se ela não for reiniciada externamente. Checkpoint prévio apontava `combat.authorityActive=false` para OBS antigo; validar em atualização controlada antes de alegar restabelecimento de cortes oficiais.
