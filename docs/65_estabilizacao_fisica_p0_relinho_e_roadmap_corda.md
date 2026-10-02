> **STATUS: HISTÓRICO / CHECKPOINT.** Este arquivo registra uma etapa real do desenvolvimento, mas não define sozinho a regra vigente. Em caso de conflito sobre vento, comentários, alvos, presentes, manobras, contato ou corte, prevalecem `00_arquitetura_vigente.md` e `superpowers/specs/2026-10-02-hybrid-live-kite-combat-design.md`.

# 65. Estabilização da Física Atual (Fase P0) e Roadmap da Física de Corda XPBD

**Data:** 30/09/2026  
**Status:** Auditado, Corrigido e 100% Validado (**193/193 testes aprovados**)  
**Skills Utilizadas:** `/systematic-debugging`, `/test-driven-development`, `/security-auditor`, `/antigravity-guide`, `/senior-fullstack`

---

## 1. Visão Geral e Diagnóstico da Cadeia Física

A análise detalhada do relinho revelou que, embora o sistema estivesse funcional e estável na camada de rede e renderização, a física de combate possuía discrepâncias conceituais entre o cálculo lógico e a percepção visual do jogador:
1. **Fricção dependente da taxa de quadros (FPS):** O acúmulo de fricção ocorria por chamada sem normalização temporal (`dt`).
2. **Velocidade relativa escalar vs. vetorial:** O cálculo usava a diferença escalar de velocidades, anulando o choque de duas pipas colidindo em sentidos opostos.
3. **Broad-phase com descarte falso-negativo:** O teste prévio descartava pares cuja distância entre pipas excedesse `maxDist` (~220px), ignorando cruzamentos de linha no centro da tela quando as pipas estivessem afastadas.
4. **Dupla ruptura com escudo (HP negativo):** Em desempate simultâneo com absorção por escudo pelo perdedor, o vencedor permanecia no jogo com HP negativo.
5. **Barra de HP 3D estática em 100%:** O render 3D tentava ler `kite.health` (inexistente), em vez de calcular `100 * kite.lineHP / kite.maxLineHP`.

---

## 2. Implementação das Correções P0 (Estabilização da Física Atual)

### 2.1 Independência Estrita de FPS em `RelinhoMechanics.js`
* **Antes:** A cada quadro, a fricção recebia um incremento fixo:
  $$\Delta friction = 0.018 + angle \times 0.012 + relative \times 0.0015 + tension \times 0.01$$
  Isso fazia uma live a 120 FPS desgastar as linhas 4 vezes mais rápido do que a 30 FPS.
* **Depois:** Introduzida a normalização por tempo decorrido ($\Delta t$):
  ```javascript
  const isNew = !previous || previous.phase === 'RELEASE';
  const dtSeconds = isNew
    ? 0
    : (previous && Number.isFinite(previous.lastSeenAt) && now > previous.lastSeenAt
        ? Math.min(0.2, (now - previous.lastSeenAt) / 1000)
        : (1 / 60));
  const dtFactor = dtSeconds * 60; // 1.0 a 60 FPS

  const frictionRate = 0.018 + angle * 0.012 + relative * 0.0015 + tension * 0.01;
  const friction = clamp(state.friction + frictionRate * dtFactor, 0, 1.5);
  ```
  Agora, 0,5s de combate contínuo acumula exatamente a mesma fricção em 30, 60 e 120 FPS.

---

### 2.2 Velocidade Relativa Vetorial
* **Antes:**
  ```javascript
  const relative = Math.abs((a.contactSpeed || 0) - (b.contactSpeed || 0));
  ```
  Duas pipas a 15 m/s em rota de colisão frontal resultavam em $|15 - 15| = 0$.
* **Depois:**
  ```javascript
  const vxA = Number.isFinite(a.vx) ? a.vx : 0;
  const vyA = Number.isFinite(a.vy) ? a.vy : 0;
  const vxB = Number.isFinite(b.vx) ? b.vx : 0;
  const vyB = Number.isFinite(b.vy) ? b.vy : 0;
  const rvx = vxA - vxB;
  const rvy = vyA - vyB;
  const vectorRel = Math.hypot(rvx, rvy);
  const csA = Number.isFinite(a.contactSpeed) ? Math.abs(a.contactSpeed) : 0;
  const csB = Number.isFinite(b.contactSpeed) ? Math.abs(b.contactSpeed) : 0;
  const relative = Math.max(vectorRel, csA + csB);
  ```
  No choque frontal, a velocidade relativa é computada como 30 m/s, e choques perpendiculares utilizam $\sqrt{v_x^2 + v_y^2}$.

---

### 2.3 Broad-Phase AABB dos Segmentos de Linha em `App.js`
* **Antes:** Descartava se `distance(kA, kB) > 220px`.
* **Depois:** Substituído por teste de sobreposição de caixas delimitadoras (AABB) dos segmentos mão $\to$ pipa:
  ```javascript
  const minAx = Math.min(kA.baseX, kA.x), maxAx = Math.max(kA.baseX, kA.x);
  const minAy = Math.min(kA.baseY, kA.y), maxAy = Math.max(kA.baseY, kA.y);
  const minBx = Math.min(kB.baseX, kB.x), maxBx = Math.max(kB.baseX, kB.x);
  const minBy = Math.min(kB.baseY, kB.y), maxBy = Math.max(kB.baseY, kB.y);

  if (minAx > maxBx || maxAx < minBx || minAy > maxBy || maxAy < minBy) continue;
  ```
  Isso elimina pares não colidentes em $O(1)$ sem descartar linhas que se cruzam mesmo quando as pipas estão a mais de 800px de distância.

---

### 2.4 Blindagem de Ruptura Simultânea e Escudo em `Physics.finalizeCut`
* **Antes:** Se ambos rompiam no mesmo frame e o perdedor tinha escudo, o método retornava antes de executar `winner.lineHP = Math.max(1, winner.lineHP)`, deixando o vencedor com HP negativo no jogo.
* **Depois:**
  ```javascript
  static finalizeCut(winner, loser, intersectionPoint) {
    if (winner) {
      winner.lineHP = Math.max(1, winner.lineHP);
      winner.updateHPBar?.();
    }

    if (loser && loser.shieldCount > 0) {
      loser.shieldCount--;
      loser.lineHP = loser.maxLineHP;
      loser.updateHPBar?.();
      loser.triggerShieldAbsorb();
      return {
        tied: true,
        absorbedByShield: true,
        shieldUserId: loser.userId,
        remainingShields: loser.shieldCount,
        winner: null,
        loser: null,
        cutX: intersectionPoint.x,
        cutY: intersectionPoint.y
      };
    }
    // ...
  }
  ```

---

### 2.5 Barra de HP 3D no `ThreeSkyScene.js`
* **Antes:** Lia `kite.health`, que era `undefined` em todas as pipas, forçando a barra a ficar invisível ou fixa em 100%.
* **Depois:**
  ```javascript
  const maxHp = Number(kite.maxLineHP) > 0 ? Number(kite.maxLineHP) : 100;
  const currentHp = Number(kite.lineHP !== undefined ? kite.lineHP : (kite.health !== undefined ? kite.health : maxHp));
  const hpFraction = Math.max(0, Math.min(1, currentHp / maxHp));
  const hp = hpFraction * 100;
  ```
  Agora a barra de HP 3D reflete dinamicamente a vida da linha e muda de verde $\to$ amarelo $\to$ vermelho.

---

## 3. Testes Automatizados Determinísticos (`tests/physics-p0-stability.test.cjs`)

Adicionados 5 novos testes à suíte oficial:
1. `P0.1 - evolveRelinhoContact`: Fricção acumulada em 0,5s idêntica em 30, 60 e 120 FPS.
2. `P0.2 - evolveRelinhoContact`: Choque frontal ($+15$ e $-15$) resulta em velocidade relativa $30$, e perpendicular em $\sqrt{10^2+10^2} \approx 14.14$.
3. `P0.3 - Physics.finalizeCut`: Ruptura simultânea com escudo do perdedor preserva o vencedor com HP $\ge 1$.
4. `P0.4 - Broad-phase de linhas cruzadas`: Detecta colisão entre linhas mesmo com pipas a 880px de distância.
5. `P0.5 - ThreeSkyScene`: Validação estática de leitura de `lineHP` e `maxLineHP`.

**Resultado:** **193/193 testes passando com 100% de sucesso**.

---

## 4. Roadmap das Fases Seguintes (P1 a P6 - Rope Physics)

```text
P0 [CONCLUÍDO] — Estabilização da física atual (FPS, vetores, escudo, HP 3D, AABB de linha)
P1 [A SEGUIR]  — RopePhysics XPBD com Verlet (10-14 nós por linha, restrições de comprimento, elasticidade e vento)
P2             — Colisão contínua de cápsulas de segmento (narrow-phase por espessura de linha)
P3             — Relinho com desgaste localizado por nó (segmentWear) e atrito abrasivo real
P4             — Manobras aerodinâmicas (Retão = reel-in impulsivo; Despicada = release + vento)
P5             — Unificação da verdade geométrica: RopePhysics alimenta simultaneamente PixiJS e Three.js
P6             — Validação compacta de estado e checkpoints pelo backend
```
