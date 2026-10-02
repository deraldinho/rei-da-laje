> **ARQUIVADO / HISTÓRICO.** Este plano/spec registra trabalho anterior. Consulte [`docs/README.md`](../../../README.md) e a spec vigente em [`2026-10-02-hybrid-live-kite-combat-design.md`](../../specs/2026-10-02-hybrid-live-kite-combat-design.md).

# P15–P18 Stabilization Design

**Data:** 2026-10-01
**Status:** Implementado e validado em 2026-10-01. Gates P15.3–P18 GREEN, com evidências reproduzíveis registradas no checkpoint 87.

## Objetivo
Estabilizar o projeto Rei da Laje de ponta a ponta, preservando tudo que já está funcional e concluindo P15.3, P16, P17 e P18 em uma única linha de trabalho.

## Restrições globais
- Preservar todas as features já verdes: entrada por comentário, presentes, manobras, vento, relinho, TOP 5, Rei da Laje, persistência e corte canônico P15.2.
- Não criar branch paralela, segunda arquitetura ou segundo loop de física.
- Toda alteração deve seguir TDD quando houver comportamento verificável.
- Cada checkpoint deve manter a suíte existente verde antes de avançar.
- O trabalho permanece em uma única linha no repositório Git existente (`main`), sem branch paralela ou segundo worktree; o estado anterior à inicialização do Git fica registrado apenas como histórico do planejamento.
- A pipa só pode ser eliminada por combate real de relinho validado de forma canônica.
- Observadores nunca devem aplicar efeitos irreversíveis de combate localmente.

## Arquitetura escolhida
A estabilização será incremental e compatível com a arquitetura atual. O runtime existente permanece como fonte principal; novos módulos serão extraídos apenas quando reduzirem responsabilidade concreta de `App.js` ou `server.js` sem alterar seus contratos públicos.
## P15.3 — Performance, física e OBS
- Medir 40 pipas reais mantendo 40 participantes ativos durante a janela de benchmark.
- Coletar frame time médio, p95 e p99, além de tempo de física, colisão, Pixi, Three.js, HUD e serialização.
- Testar cenários com 0, 2, 3 e muitos relinhos simultâneos.
- Remover o caminho órfão de ruptura por tensão (`isTensionBroken` / `handleTensionBreak`) se confirmado sem produtor válido, preservando a regra de corte apenas por relinho.
- Garantir que clientes sem autoridade não apliquem dano canônico nem mutação irreversível de combate.
- Implementar orçamento visual adaptativo apenas para partículas/FX; física e regras continuam processando integralmente.
- Criar soak de renderer para texturas, geometrias, partículas, `FallingKite`, `BrokenHandRope`, heap e contextos WebGL.
- Validar 1080×1920 e 1440×2560 em GPU normal e modo overlay/OBS.

## P16 — Resiliência TikTok Live
- Classificar falhas em `LIVE_NOT_FOUND`, `TRANSPORT_FAILURE`, `WORKER_FAILURE` e `LIVE_ENDED`.
- Falha de transporte após uma sala já localizada usa recuperação rápida com backoff limitado.
- `LIVE_NOT_FOUND` usa retentativa lenta de 2–5 minutos com jitter, sem hammering do TikTok.
- Reiniciar somente o worker/conector quando possível; não reiniciar GameServer por falha de upstream.
- Preservar arena, fila, placar, buffs, presentes e Rei da Laje durante reconnect.
- Após reconnect, comentário, like, follow e gift devem voltar sem duplicação.
- `LIVE_ENDED` deve manter o jogo estável e aguardar nova Live pública sem iniciar transmissão automaticamente.
## P17 — Lifecycle e responsabilidades
- Reduzir responsabilidade de `App.js` por extração dirigida por comportamento, preservando a API pública de `GameApp`.
- Priorizar módulos de socket/eventos, arena/checkpoint, combate/relinho e lifecycle quando os testes mostrarem benefício claro.
- Remover listeners anônimos não desmontáveis (`resize`, `pointerdown`) e garantir teardown simétrico de listeners, timers, sockets, áudio e renderer.
- Permitir criar/destruir a aplicação repetidamente sem crescimento de listeners, timers, WebGL contexts ou AudioContexts.
- `ThreeSkyScene` e módulos XPBD existentes permanecem; não haverá reescrita do motor gráfico/físico.
- Reduzir handlers concentrados em `server.js` somente quando uma extração mantiver contratos Socket.IO e testes existentes.
- Adicionar higiene de artefatos com `.gitignore`, sem alterar dependências operacionais instaladas.

## P18 — Gates de produção
- Adicionar scripts `test:unit`, `test:browser`, `test:perf`, `test:soak` e `verify`.
- `verify` deve falhar se testes, benchmark obrigatório ou build falharem.
- O browser smoke deve cobrir 40 pipas, corte canônico, presentes, manobras, aparos, reload e reconnect.
- O benchmark deve gerar saída determinística e legível por máquina para comparação futura.
- O soak deve detectar crescimento contínuo de heap/listeners/recursos e registrar FPS/frame time.
- O warning de bundle só será tratado com code-splitting se medição demonstrar benefício material.
- Documentar cada checkpoint e uma auditoria final com evidências reproduzíveis.

## Fluxo canônico de combate
Somente a autoridade de combate executa mutações de dano/corte. O frontend pode representar contato visual em observadores, mas remoção de pipa, score, ruptura física, áudio de corte e efeitos irreversíveis só acontecem após o evento canônico do backend.
## Fluxo de reconexão TikTok
O backend mantém o estado do jogo independente do worker TikTok. Quedas do upstream alteram apenas o estado de transporte. Recuperação rápida é usada para sessões previamente localizadas; Live ausente/encerrada migra para polling lento com jitter. A retomada precisa ser idempotente para evitar gift duplicado e listener duplicado.

## Observabilidade de performance
A instrumentação será desligável e de baixo overhead. Métricas devem ser agregadas por janela, não logadas a cada frame. Benchmarks não usarão SwiftShader para conclusão de FPS real; SwiftShader pode permanecer apenas como smoke funcional.

## Tratamento de erro
- Erro de upstream TikTok nunca deve derrubar a arena.
- Falha de benchmark/soak bloqueia `verify`, mas não altera estado persistente do jogo.
- Claims de corte rejeitados reconciliam a arena canônica.
- Falha de renderer deve ser registrada sem deixar timers/listeners órfãos durante teardown.

## Critérios de aceite
1. `npm test` permanece 100% GREEN após cada checkpoint.
2. Build Vite de produção finaliza sem erro.
3. 40 pipas são exercitadas em GPU normal sem freeze de colisão.
4. Múltiplos relinhos simultâneos não provocam tremor coletivo nem frame stall severo.
5. Nenhum corte ocorre fora do fluxo canônico de relinho.
6. Reconnect TikTok preserva o estado da arena e restaura eventos sem duplicação.
7. Recriar/destruir o frontend não multiplica listeners, timers ou recursos gráficos.
8. `verify` reproduz os principais gates de qualidade com um único comando.
9. Auditoria final registra métricas, testes, limitações restantes e caminhos de reprodução.
