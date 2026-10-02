> **ARQUIVADO / HISTÓRICO.** Este documento registra uma etapa anterior e não define a regra vigente. Consulte [`docs/README.md`](../../README.md) e [`00_arquitetura_vigente.md`](../../00_arquitetura_vigente.md).

# Checkpoint 28 — nenhum benefício de presente dura menos de um minuto

Data do checkpoint: 24/09/2026, projeto x99. Pedido do usuário: `não menos de 1 minuto` para os benefícios dos presentes.

## Implementação

- `backend/rules/giftConfig.js`: Rosa 60s, Donut 120s, Capivara 180s, Perfume (tornado) alterado de 3s para 60s e Leão (proteção/invulnerabilidade) alterado de 30s para 60s. Descrições atualizadas. Flor herda Rosa. Presentes desconhecidos seguem somente com animação; não recebem benefício arbitrário.
- `backend/rules/buffManager.js`: proteção adicional na aplicação de buffs de linha e efeitos especiais: cada concessão usa pelo menos 60s, mesmo se um futuro presente tiver configuração inferior. Preservadas soma de duração de combos, timers independentes e expiração máxima de 24h.
- `frontend/src/engine/Maneuvers.js`: retão, despicar, perseguir e duas aparadas agora têm pelo menos 60s de duração; sequência de presentes acrescenta até 120s no máximo. Alcance, velocidade, dano e defesa permanecem limitados. Animação de celebração do presente continua curta (segundos); o **benefício** é que dura pelo menos um minuto.
- `backend/arenaLiveState.js` e `frontend/src/engine/ArenaCheckpoint.js`: limites de checkpoint das manobras ampliados de 8s para 120s, sem redefinir o prazo após reinício: preservado `expiresAt` absoluto e ignorada manobra que já venceu. Contadores de benefícios na pipa continuam sincronizados com o servidor.
- `tests/gift-benefit-timers.test.cjs`, `tests/arena-live-state.test.cjs`, `tests/competition-mechanics.test.cjs`, `tests/browser-smoke.mjs`: regressões ajustadas à nova duração e testes adicionais para mínimo de 60s e restauração de prazo sem extensão indevida. RED reproduzido antes da implementação (Perfume 3s, manobra retão 2,4s), depois todos verdes.

## Verificações

- `npm test`: 55/55 aprovados; `node --check backend/server.js`: aprovado; build Vite `frontend/dist-preview` aprovado (JS `index-hh3WhBKp.js`, CSS `index-Cfhll_NJ.css`). Aviso preexistente de bundle JS >500 KB.
- Navegador isolado Edge, porta 3107 com TikTok autoconnect desabilitado: smoke passou, incluindo presentear, 40 pipas, contador de vantagens, manobras e persistência da arena, sem exceções.

## Ativação

- Somente fontes e `frontend/dist-preview` alterados neste checkpoint. Não publicar `frontend/dist` isoladamente: novos tempos de tornado e Leão precisam do backend novo e da mesma versão do frontend para manter contagem coerente. Não reiniciar a porta 3000 nem recarregar OBS sem autorização explícita do usuário.
