> **ARQUIVADO / HISTÓRICO.** Este documento registra uma etapa anterior e não define a regra vigente. Consulte [`docs/README.md`](../../README.md) e [`00_arquitetura_vigente.md`](../../00_arquitetura_vigente.md).

# 87 · Estabilização P15.3–P18 — Autoridade, Aparo Canônico, Render Budget e Gates

**Data:** 2026-10-01  
**Status:** GREEN — implementação e validação concluídas na branch `main`.

## Escopo concluído
- P15.3: autoridade de combate fail-closed, profiling ampliado e benchmark real de 40 pipas.
- P16: recovery TikTok classificado, backoff lento 2–5 min para Live ausente e recovery rápido para transporte/worker.
- P17: lifecycle simétrico, teardown idempotente e redução de responsabilidades do runtime.
- P18: gates unit/browser/perf/soak/build consolidados em `npm run verify`.
- Aparo: convertido de mutação otimista local para protocolo canônico validado pelo backend.
- UI live: TOP 5 compacto durante relinho e expansão temporária após eventos importantes.

## Autoridade e fluxo canônico
`CombatAuthorityGate` impede observadores de executar o resolvedor autoritativo de dano. O corte continua sendo aplicado de forma irreversível somente após `game:cut_occurred`.

O aparo agora segue o mesmo princípio:
`AparoController` detecta contato -> `catch:claim` -> `CatchClaimRegistry` valida/consome a voada -> `GameRules.recordCatch()` pontua -> `game:catch_occurred` aplica efeitos visuais.

O bônus de aparo é +2 pontos de arena e não inventa corte, streak ou eliminação. Claims duplicados da mesma voada são rejeitados.

## Arquitetura
- `AparoController.js`: detecção física e emissão de claim, sem pontuação ou efeito irreversível.
- `socketCatchHandler.js`: protocolo Socket.IO canônico do aparo fora de `server.js`.
- `LifecycleBag` / `SocketSubscriptionBag`: ownership explícito de timers/listeners e teardown idempotente.
- `RuntimeProfiler`: physics, collision, render3d, render2d, HUD, serialization e gauges WebGL.

## Renderização e legibilidade
`RenderBudget` degrada somente custo visual conforme qualidade/população: pixel ratio interno, sombras, frequência de animação ambiental e opacidade das linhas ociosas. A física XPBD, detecção de colisão e regras de combate continuam integrais.

Linhas sem combate ficam menos dominantes em arena lotada; relinhos ativos preservam destaque. Em portrait, o TOP 5 esconde extras e posições 4–5 durante contato e volta a expandir após corte, aparo ou troca de liderança.

## Benchmark final — GPU real
Comando: `PIPA_PERF_MS=6400 npm run test:perf`.
Hardware detectado pelo Edge/ANGLE: AMD Radeon RX 5500 XT / Direct3D 11.

| Cenário | FPS médio | p95 frame | Máx. contatos |
|---|---:|---:|---:|
| zero | 58,07 | 16,8 ms | 0 |
| two | 56,83 | 33,2 ms | 16 |
| three | 59,33 | 16,8 ms | 13 |
| many | 59,32 | 16,8 ms | 35 |

No cenário `many`: `render3d` 13,04 ms médio, `collision` 1,19 ms, `physics` 1,85 ms; 40 pipas permaneceram ativas e `errors=[]`.

A telemetria registra ~1.391 draw calls no pior cenário medido. Instancing total foi deliberadamente deixado fora deste checkpoint: o alvo de estabilidade/FPS foi atingido e uma conversão ampla de meshes teria risco arquitetural desproporcional neste fechamento.

## Gates de produção
- `npm test`: **299/299 GREEN**.
- `npm run build`: Vite production build GREEN.
- `npm run test:browser`: 40 pipas, reload, corte, presentes/manobras, overlay, reconnect Socket.IO e 3 ciclos destroy/reload; `errors=[]`.
- `npm run verify`: **VERIFY GREEN**.

## Soak final de 60 segundos
Comando: `$env:PIPA_SOAK_MS='60000'; npm run test:soak`.

Resultado:
- 61 amostras; 40 pipas do início ao fim.
- Heap: 37.942.445 -> 26.035.866 bytes (**-11.906.579 bytes**).
- Texturas: 102 -> 102.
- Geometrias: 128 -> 129.
- Partículas máximas: 0.
- FPS final do profiler: 47,15.
- `errors=[]`.

O soak standalone mantém default longo de 30 minutos; o `verify` usa uma janela curta para CI/local gate. A janela explícita de 60 s acima foi executada como validação final adicional.

## Reprodução
```powershell
npm test
npm run build
npm run test:browser
$env:PIPA_PERF_MS='6400'; npm run test:perf
$env:PIPA_SOAK_MS='60000'; npm run test:soak
npm run verify
```

## Limitação residual monitorada
O custo dominante restante é o número de draw calls do Three.js, não a colisão XPBD. Uma futura fase pode avaliar `InstancedMesh`/batching por família de mesh, sempre sob benchmark A/B e sem alterar o loop físico ou a autoridade canônica.
