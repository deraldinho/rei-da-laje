# Checkpoint 84 — P15.2 Corte Canônico e Benchmark 40 Pipas

Data: 2026-10-01

## Objetivo
Eliminar divergência entre autoridade, observadores e backend durante o corte de relinho, sem reintroduzir o tremor causado pelo coupling antigo.

## Causas encontradas
- `GameApp` iniciava `isCombatAuthority=true` antes da concessão do backend.
- `handleCutSuccess()` removia a pipa, rompia a linha, somava score e criava efeitos antes do ACK.
- `Physics.finalizeCut()` chamava `rope.breakAt()` ainda no claim local.
- `relinho:cut_rejected` não reconciliava a arena.
- O backend gravava o checkpoint anexado ao claim antes de validar o corte.
- O teste P7 ainda esperava atração entre nós, incompatível com a constraint atual de não-penetração.

## Implementação
- Autoridade passa a iniciar fail-closed (`false`).
- `_pendingCutLosers` bloqueia novos combates para uma pipa aguardando decisão canônica.
- `handleCutSuccess()` agora somente envia o claim físico ao backend.
- Som, faíscas, score visual, `breakAt()`, FallingKite, BrokenHandRope e remoção ocorrem em `game:cut_occurred`.
- Rejeição, perda de autoridade e desconexão limpam claims pendentes; rejeição/revogação forçam `syncArena()`.
- Coordenadas de corte iguais a zero são preservadas com `Number.isFinite()`.
- O backend valida `checkpointStates` numa cópia candidata e só persiste após `validateCutClaim` + `recordCut`.
- `Physics.finalizeCut()` retorna metadados determinísticos do ponto de corte sem mutar a RopePhysics.
- O P7 foi alinhado à constraint de não-penetração: ambos os fios respondem sem injetar velocidade Verlet artificial.

## Testes adicionados/atualizados
- `tests/p15-canonical-cut-authority.test.cjs`: 7 contratos P15.2.
- `tests/p15-cut-continuity-multi-relinho.test.cjs`: `t=0` sem ruptura pré-ACK.
- `tests/rope-collision-enhanced-p7.test.cjs`: coupling sem chatter/impulso artificial.
- Contratos antigos de auditoria e sincronização foram alinhados ao evento canônico do backend.

## Evidência de desempenho
Benchmark reproduzível: `node tests/benchmark-40-rope-collisions.mjs`.

Microbenchmark `RopeCollision`, 40 cordas / 780 pares por substep, 120 substeps:
- distribuídas, sem colisões: 0,066 ms/substep.
- pior caso artificial, todos os 780 pares cruzando: 2,725 ms/substep.

Browser smoke com 40 pipas:
- SwiftShader (GPU por software): ~0,46 FPS; não representa execução real.
- Edge headless com GPU normal: 59,52 FPS, zero exceções; 40 pipas carregadas e combate processado.

## Segurança/rollback
Backup pré-alteração: `backups/pre-p15-canonical-cut-20261001-1004/`.

## Arquivos de produção alterados
- `frontend/src/engine/App.js`
- `frontend/src/engine/Physics.js`
- `backend/server.js`
