# P15.3–P18 Stability Design

**Goal:** estabilizar o jogo para lives longas com até 40 pipas, múltiplos relinhos, reconexões TikTok e uso contínuo no OBS sem perda de estado.

## Constraints
- Preservar as mecânicas atuais: comentário entra, presentes/manobras, vento, ranking, Rei da Laje, aparo e corte canônico P15.2.
- Pipa só pode ser eliminada por corte real de relinho confirmado pelo backend.
- Não criar segundo loop físico, segunda autoridade ou arquitetura paralela.
- Física continua em fixed timestep; renderer pode degradar apenas efeitos visuais, nunca gameplay.
- Reconexão TikTok não pode reiniciar GameServer nem apagar arena.
- TDD obrigatório para código de produção; suíte completa deve permanecer verde.

## P15.3 — Runtime/Renderer
- Remover o caminho órfão de ruptura por tensão (`isTensionBroken`/`handleTensionBreak`).
- Adicionar perfil de frame com métricas de física, colisão e renderização.
- Aplicar orçamento adaptativo somente a FX visuais quando carga subir.
- Criar benchmark de 40 pipas mantendo 40 ativas durante a janela medida.
- Criar soak que observe FPS, heap, partículas, texturas e erros de console.
## P16 — TikTok resilience
- Classificar falhas em `LIVE_NOT_FOUND`, `TRANSPORT_FAILURE`, `WORKER_FAILURE` e `LIVE_ENDED`.
- Antes da primeira sala localizada, `LIVE_NOT_FOUND` entra em retry lento com jitter; não encerra o supervisor imediatamente.
- Depois de uma sala localizada, falhas de transporte usam recuperação rápida e reciclam apenas o worker/conector.
- O supervisor nunca inicia uma Live; só procura e reconecta ao perfil salvo/pedido.
- Estado da arena, buffs, fila, placar e autoridade de combate permanecem independentes do conector.

## P17 — Lifecycle/Architecture
- Introduzir bags de lifecycle e subscriptions para remover exatamente listeners/timers registrados.
- Eliminar callbacks anônimos impossíveis de remover em `resize` e `pointerdown`.
- `destroy()` não pode remover listeners de terceiros do mesmo Socket.IO.
- Repetir create/destroy não pode multiplicar timers, listeners, WebGL contexts ou AudioContexts.
- Reduzir responsabilidade operacional de `App.js` sem reescrever física, HUD ou Three.js.

## P18 — Production verification
- Scripts: `test:unit`, `test:browser`, `test:perf`, `test:soak`, `verify`.
- `verify` executa unit/integration, browser smoke, perf curto, soak curto e build.
- `test:soak` mantém execução longa por padrão e aceita duração configurável.
- Build deve gerar chunks separados para bibliotecas grandes somente se o contrato de build comprovar redução do chunk principal.
- Documentar métricas, decisões e qualquer limite residual.