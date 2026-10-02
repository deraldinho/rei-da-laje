> **STATUS: HISTÓRICO / CHECKPOINT.** Este arquivo registra uma etapa real do desenvolvimento, mas não define sozinho a regra vigente. Em caso de conflito sobre vento, comentários, alvos, presentes, manobras, contato ou corte, prevalecem `00_arquitetura_vigente.md` e `superpowers/specs/2026-10-02-hybrid-live-kite-combat-design.md`.

# 72. Remediação da Auditoria Física P5: Sincronização de Timestep, XPBD Correto e Integridade de Corda

**Data:** 30/09/2026  
**Status:** Implementado, Integrado e 100% Validado (**225/225 testes aprovados**)  
**Validação de Sintaxe:** `node --check` em 73 arquivos de `frontend/src` → **0 erros**  
**Build Vite:** Compilado com sucesso (`dist/assets/index-CT0wjST6.js`)

---

## 1. Visão Geral dos 6 Problemas Remediados

A auditoria especializada identificou 6 inconsistências críticas e de alta gravidade na dinâmica contínua de corda física e no loop de jogo:

| Item | Gravidade | Descrição do Problema | Remediação Aplicada |
|---|---|---|---|
| **1** | **CRÍTICO** | `PhysicsClock` acionado por pipa no loop em vez de uma vez por frame, gerando assimetria física em 120/144 Hz (`[0, 12, 0, 12]`). | Chamada do relógio físico unificada em `App.js`: o `_physicsClock.update()` roda uma vez por frame e itera todas as pipas no mesmo callback. |
| **2** | **CRÍTICO** | XPBD matematicamente invertido: complacência $\alpha = (1 / \text{stiffness}) / dt^2$ explodia para $\sim 3779$ com stiffness 0.95, agindo como gelatina em vez de corpo rígido. | Formulação física verdadeira: compliance elástica física $\alpha \propto (1.0 - \text{stiffness})$. Para 1.0 (inextensível) $\alpha = 0$; para 0.95 a restrição é corrigida em $\sim 98\%$. |
| **3** | **CRÍTICO** | Velocidade da âncora da pipa virava 0 em todos os frames devido a `nEnd.prevX = kX` (nova posição da pipa atribuída antes da física). | `prevX`/`prevY` preservam a posição do passo anterior (`nEnd.x`), permitindo cálculo de velocidade real $\approx 600\text{ px/s}$ para $10\text{ px/frame}$ a 60 Hz sem drift. |
| **4** | **CRÍTICO** | Fallback de reta mão→pipa ativando relinho indevido quando cordas físicas estavam separadas por $> 9\text{ px}$. | `RopeCollision` é autoridade absoluta e mutuamente exclusiva quando ambas as pipas possuem `rope`. A reta antiga não é mais consultada. |
| **5** | **CRÍTICO** | Escudo restaurava HP para 100 mas mantinha `segmentWear` crítico ($\le 0.05$), rompendo no contato seguinte com velocidade zero. Inconsistência de `regenHP()` sanada. | Ao acionar escudo em `finalizeCut` e `triggerShieldAbsorb`, `segmentWear` é zerado (integridade 100%). Em `regenHP()`, o desgaste é curado proporcionalmente ao ganho de HP. |
| **6** | **ALTO** | Checkpoint restaurava geometria de corda e `spoolLength`, mas deixava `isInitialized = false`, disparando `resetPositions()` no 1º frame e destruindo a curvatura. | `isInitialized = true` é atribuído no checkpoint; nós e `spoolLength` são escalados por `sx/sy` ao mudar a resolução de tela. |

---

## 2. Detalhes de Implementação

### 2.1 Passo 1: Unificação do Fixed Timestep no `App.js`
No `gameLoop`:
```javascript
// 1º Manobras e chat definem nova posição de cada pipa
this.kites.forEach((kite) => {
  kite.rooftopPlayer?.update(delta);
  this.syncLineToPlayerHand(kite);
  applyManeuverMovement(kite, [...this.kites.values()], delta, currentWind);
  applyChatAction(kite, delta, currentWind);
});

// 2º Física da corda com PhysicsClock (60 Hz fixos, delta-independente)
// Acionado UMA ÚNICA VEZ por frame: todas as pipas avançam juntas nos mesmos substeps
const deltaSeconds = (delta / 60);
this._physicsClock.update(deltaSeconds, (fixedDt) => {
  for (const kite of this.kites.values()) {
    kite.update(fixedDt * 60, currentWind, this.kites.size);
  }
});

// 3º Render da linha com nós físicos atualizados
this.kites.forEach((kite) => {
  kite.line.update(kite.x, kite.y, kite.visualScale, kite.rope?.getNodes());
  kite.tail.update(kite.x, kite.y + 30, 0, currentWind.x);
});
```

### 2.2 Passo 2: Complacência Física do XPBD (`RopeConstraintSolver.js`)
```javascript
const s = Math.max(0.01, Math.min(1.0, Number(stiffness) || 0.9));
const compliance = (1.0 - s) * 1e-4;
const alpha = compliance / (safeDt * safeDt);
```
- Se `stiffness = 1.0` $\implies \text{compliance} = 0, \alpha = 0$ (perfeitamente rígido, PBD inextensível).
- Se `stiffness = 0.95` $\implies \text{compliance} = 5 \times 10^{-6}$, corrigindo a deformação em direção ao repouso.

### 2.3 Passo 3: Velocidade Real dos Nós Âncora (`RopePhysics.js`)
```javascript
const n0   = this.nodes[0];
const nEnd = this.nodes[this.nodeCount - 1];
n0.prevX   = n0.x; n0.prevY   = n0.y; n0.prevZ   = n0.z || 0;
nEnd.prevX = nEnd.x; nEnd.prevY = nEnd.y; nEnd.prevZ = nEnd.z || 0;
```
Após `pinNode(hX/kX)` e o solver, a velocidade calculada `(n.x - n.prevX) / dt` resulta exatamente no deslocamento real do frame.

### 2.4 Passo 5: Restauração de Integridade Mecânica pelo Escudo (`Physics.js` & `Kite.js`)
```javascript
if (loser && loser.shieldCount > 0) {
  loser.shieldCount--;
  loser.lineHP = loser.maxLineHP;
  if (loser.rope && loser.rope.segmentWear) {
    loser.rope.segmentWear.fill(0);
    if (Array.isArray(loser.rope.nodes)) {
      for (let i = 0; i < loser.rope.nodes.length; i++) loser.rope.nodes[i].wear = 0;
    }
  }
  loser.updateHPBar?.();
  loser.triggerShieldAbsorb();
}
```

### 2.5 Passo 6: Preservação de Curvatura em Checkpoints e Redimensionamento (`ArenaCheckpoint.js` & `Kite.js`)
```javascript
if (kite.rope && Array.isArray(state.ropeNodes) && state.ropeNodes.length > 0) {
  const maxNodes = Math.min(kite.rope.nodes.length, state.ropeNodes.length);
  for (let i = 0; i < maxNodes; i++) {
    const saved = state.ropeNodes[i];
    if (!saved || !Number.isFinite(saved.x) || !Number.isFinite(saved.y)) continue;
    const n = kite.rope.nodes[i];
    n.x = saved.x * sx; n.prevX = saved.x * sx;
    n.y = saved.y * sy; n.prevY = saved.y * sy;
    n.vx = 0; n.vy = 0;
  }
  kite.rope.isInitialized = true;
  kite.rope.updateAABB();
}
```

---

## 3. Cobertura de Testes Automatizados

Criada a suíte `tests/audit-physics-p5-remediation.test.cjs` com 6 testes específicos para os 6 pontos:
1. `1. PhysicsClock`: Sincronização exata de 6 substeps para 4 pipas em 12 frames a 120 FPS (`[6, 6, 6, 6]`).
2. `2. XPBD`: Restauração da distância em nó deformado ($y=60 \to y<15$) com `stiffness=0.95`.
3. `3. Velocidade da âncora`: $10\text{ px/frame}$ a 60 Hz resulta estritamente em $600\text{ px/s}$ sem drift e sem zero.
4. `4. RopeCollision autoritativo`: Rejeição estrita de toque quando separação em Z é $15\text{ px}$ mesmo com retas cruzando.
5. `5. Escudo e regeneração`: Escudo zera `segmentWear` e `regenHP` recupera a integridade física proporcionalmente.
6. `6. Checkpoint`: Curvatura ($x=650$) e $spoolLength$ ($900$) mantidos intactos no 1º `rope.step()`.

**Resultado Geral:** **225/225 testes passando, 0 falhas**.
