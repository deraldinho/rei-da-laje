> **ARQUIVADO / HISTÓRICO.** Este documento registra uma etapa anterior e não define a regra vigente. Consulte [`docs/README.md`](../../README.md) e [`00_arquitetura_vigente.md`](../../00_arquitetura_vigente.md).

# Documento 74: Correção da Ancoragem da Linha na Mão do Boneco e Física de Curvatura

**Data:** Outubro de 2026  
**Status:** Resolvido e Validado (230/230 testes passando)

---

## 1. Problema Identificado

Após a introdução do eixo $Z$ na lógica de colisão, foram observados dois comportamentos anômalos relatados pelo usuário:
1. **Descolamento da Linha da Mão do Boneco:** A linha nascia fora da mão do personagem na laje (especialmente no espaço 3D do Three.js e no traçado 2D do PixiJS).
2. **Linha se Movendo em Bloco com a Pipa:** A linha comportava-se como uma haste ou vareta rígida colada à pipa (*"a linha movimenta tudo com a pipa"*), perdendo o efeito natural de corda flexível e ancorada na laje.

---

## 2. Causa Raiz

### 2.1. Deslocamento Incorreto de $Z$ no Three.js (`ThreeLines.js`)
* No cálculo dos vértices da linha 3D:
  $$\text{lz} = hZ + (kZ - hZ) \cdot t$$
  - Onde $hZ \approx 480$ é a posição real da mão do boneco na laje e $kZ \approx 100$ é a pipa no céu.
* O código somava `physSagZ = (ropeZ || 0) * 0.35` diretamente a $\text{lz}$.
* Como `ropeZ` no nó 0 (mão) continha 480, somava-se $480 \times 0.35 = 168$ unidades no vértice inicial:
  $$\text{finalZ} = 480 + 168 = 648$$
* **Efeito:** A linha 3D nascia 168 unidades flutuando para fora da mão do boneco.

### 2.2. Falta de Modulação de Borda com $\sin(t\pi)$ nos Desvios Físicos
* `physSagX` e `physSagY` não eram multiplicados pelo fator de arco $\text{arc} = \sin(t\pi)$.
* Qualquer diferença métrica nos nós extremos (nó 0 na mão e nó $N-1$ na pipa) deslocava as pontas da linha para fora da mão e da pipa.

### 2.3. Contaminação de Coordenadas 3D no Solver 2D XPBD (`Kite.js` & `RopePhysics.js`)
* Ao passar $Z = 480$ para os nós de `RopePhysics` (que opera no plano 2D de pixels $1080 \times 1920$), a distância euclidiana tridimensional $\sqrt{\Delta X^2 + \Delta Y^2 + \Delta Z^2}$ inflacionava o comprimento do segmento `restSegment` em 380 unidades.
* Isso travava a flexibilidade da corda no XPBD, fazendo com que a linha respondesse com rigidez excessiva e se movesse em bloco junto com a pipa.

---

## 3. Soluções Implementadas

### 3.1. Ancoragem Estrita no 3D (`ThreeLines.js`)
1. **Remoção do falso offset em $Z$:** $\text{finalZ} = \text{lz}$. O eixo $Z$ é governado estritamente pela interpolação linear contínua entre a mão do boneco ($hZ$) e a pipa ($kZ$).
2. **Multiplicação obrigatória por $\text{arc} = \sin(t\pi)$:**
   $$\text{physSagX} = (\text{ropeX} - \text{straight2DX}) \cdot 0.35 \cdot \text{arc}$$
   $$\text{physSagY} = -(\text{ropeY} - \text{straight2DY}) \cdot 0.35 \cdot \text{arc}$$
   - Em $t = 0$ (mão): $\text{arc} = \sin(0) = 0 \implies \text{desvios} = 0 \implies \text{final} = (hX, hY, hZ)$ (mão exata).
   - Em $t = 1$ (pipa): $\text{arc} = \sin(\pi) = 0 \implies \text{desvios} = 0 \implies \text{final} = (kX, \text{kiteAttachY}, kZ)$ (cabresto exato).
   - Em $t \in (0, 1)$: $\text{arc} > 0$, criando a curvatura elástica, barriga de vento e engate de combate no meio do céu.

### 3.2. Ancoragem Estrita no 2D (`Line.js` & `Kite.js`)
1. **Em [`Line.js`](../../../frontend/src/entities/Line.js):**
   - O traçado inicia obrigatoriamente com `this.moveTo(startX, startY)` (onde `startX = visualBaseX`, a mão do boneco).
   - Percorre os nós intermediários da corda física `this.lineTo(nodes[i].x, nodes[i].y)`.
   - Finaliza obrigatoriamente com `this.lineTo(kiteX, kiteY)` no cabresto da pipa.
2. **Em [`Kite.js`](../../../frontend/src/entities/Kite.js):**
   - `handPos` agora recebe `startX = this.line?.visualBaseX || this.baseX` e `startY = this.line?.visualBaseY || this.baseY` com $z = 0$.
   - A simulação de partículas XPBD opera com $z = 0$, preservando a métrica em pixels da arena e garantindo flexibilidade e maleabilidade orgânica da corda física.

### 3.3. Profundidade 3D Desacoplada e Preservada para o Combate (`App.js` & `RopeCollision.js`)
* As pipas mantêm sua profundidade $Z$ no Three.js (`kite.z`).
* No combate, `App.js` calcula $\Delta Z = |kA.z - kB.z|$. Se $\Delta Z > 85$, o relinho é descartado por separação em $Z$ (`reason = 'Z_SEPARATION'`), mantendo o Item 3 100% ativo sem contaminar os nós físicos da corda 2D.

---

## 4. Validação e Testes

* **Novo Teste Unitário:** [`tests/line-anchor-hand-verification.test.cjs`](../../../tests/line-anchor-hand-verification.test.cjs)
  - `Âncora 2D: Line.js drawPath deve ancorar estritamente na mão do boneco e no cabresto da pipa`: **Passou**.
  - `Âncora 3D: ThreeLines posArr em t=0 deve ser exatamente a mão do boneco e em t=1 a pipa`: **Passou**.
* **Suíte Completa:**
  - `npm test`: **230/230 testes passando** (0 falhas).
  - `node --check`: 100% dos arquivos JavaScript verificados sem erros de sintaxe.
  - `npm run build`: Compilação de produção com Vite gerada com sucesso em 5.91s.
