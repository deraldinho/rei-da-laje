> **STATUS: HISTÓRICO / CHECKPOINT.** Este arquivo registra uma etapa real do desenvolvimento, mas não define sozinho a regra vigente. Em caso de conflito sobre vento, comentários, alvos, presentes, manobras, contato ou corte, prevalecem `00_arquitetura_vigente.md` e `superpowers/specs/2026-10-02-hybrid-live-kite-combat-design.md`.

# Checkpoint 24 — recuperação da geometria da linha e reescala da arena

Data: 24/09/2026 (~21:36, horário do x99). Live em andamento, não recarregar OBS nem reiniciar Node da porta 3000.

## Auditoria e correção
- Após o deploy do checkpoint 23, `/api/competition/health` da produção mostrou `combat.authorityActive=false`, FPS nulo e `playerStates={}`. A tela atualmente carregada ainda não assumiu o executor novo; os recursos visuais novos e o estado físico persistido não podem ser considerados ativados nessa fonte até ela carregar novo JS.
- Detectada lacuna na recuperação: HP e posição eram preservados, mas a âncora `baseX`, o destino `targetX/targetY` e dimensões originais não eram restaurados. Isso sorteava nova geometria de linha ao recarregar, podendo mudar o confronto.
- `frontend/src/engine/ArenaCheckpoint.js`: serialização única do iterador de pipas (evita consumo acidental), registro das dimensões de origem, âncora e destino de voo; restauração proporcional à resolução atual e limitação aos limites da arena. `backend/arenaLiveState.js`: adicionadas dimensões do checkpoint e geometria validada por ID ativo e limites da arena; preserva HP e proteção já existentes.
- Testes em `tests/arena-checkpoint.test.cjs`, `tests/arena-live-state.test.cjs` e `tests/browser-smoke.mjs` verificam HP 37, geometria e reescala 1440×2560→1080×1920, persistência e restauração de 40 pipas no navegador após reload **somente na instância de teste**.

## Validação
- `npm test`: 45/45 aprovados.
- `vite build frontend --outDir dist-preview --emptyOutDir`: aprovado. Avisos não bloqueantes anteriores: bundle >500 kB, API CJS depreciada do Vite.
- Edge headless em servidor isolado, sem conectar ao TikTok real: teste passou com 40 pipas, HP e âncora/destino iguais após reload, presentes, manobras, modo vertical e combate sem exceções. ~30 FPS foi medido no renderizador de software do teste, não no OBS em produção.

## Deploy
- Alterações somente nos arquivos-fonte e em `frontend/dist-preview` durante este checkpoint. `frontend/dist` continua na versão publicada no checkpoint 23. Não houve reinício do servidor principal, atualização de fonte OBS ou conexão de teste ao perfil TikTok real.
- Para ativar a geometria persistida na Live, é necessário publicar a nova versão e carregar seu JS na fonte com estratégia de transição; a tela antiga não envia `baseX` nem reivindica autoridade. Não declarar esta funcionalidade ativa na tela atual sem evidência operacional.
