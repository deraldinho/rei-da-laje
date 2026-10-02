> **ARQUIVADO / HISTÓRICO.** Este documento registra uma etapa anterior e não define a regra vigente. Consulte [`docs/README.md`](../../README.md) e [`00_arquitetura_vigente.md`](../../00_arquitetura_vigente.md).

# 66. Implementação da Fase P1: Motor Físico de Corda XPBD / Verlet (`RopePhysics`)

**Data:** 30/09/2026  
**Status:** Implementado, Integrado e 100% Validado (**199/199 testes aprovados**)  
**Skills Utilizadas:** `/systematic-debugging`, `/test-driven-development`, `/3d-web-experience`, `/senior-fullstack`

---

## 1. Visão Geral da Fase P1

A Fase P1 da nova arquitetura física substitui a aproximação de reta estática da linha por uma **simulação contínua de corda elástica baseada em XPBD (Extended Position-Based Dynamics) e integração de Verlet**.

Anteriormente, o sistema possuía uma dualidade incoerente:
- A lógica física tratava a linha como um segmento reto unidimensional entre mão e pipa: $\text{Mão} \to \text{Pipa}$.
- O renderizador Three.js sintetizava uma curva estética artificial de 20 pontos com funções trigonométricas.

Com a conclusão da Fase P1:
1. **O motor físico calcula a geometria real da corda** considerando nós, massa, gravidade, vento e carretel liberado.
2. **O renderizador 2D (PixiJS) e o renderizador 3D (Three.js) desenham a mesma geometria física**, unificando a verdade visual e lógica.

---

## 2. Módulos Criados na Arquitetura Física (`frontend/src/engine/physics/`)

### 2.1 `PhysicsClock.js` (Relógio Determinístico de Fixed Timestep)
* **Objetivo:** Isolar o passo de tempo da simulação da taxa de atualização do monitor (30, 60, 120, 144, 240 FPS).
* **Mecanismo:** Acumula $\Delta t$ real e dispara substeps fixos de $1/60\text{ s}$ ($\approx 16.67\text{ ms}$).
* **Proteção:** Inclui corte estrito de acumulador (`maxSubsteps = 4`) para evitar loops infinitos (*death spiral*) caso a aba do navegador seja minimizada ou suspensa.

### 2.2 `LineMaterial.js` (Propriedades Tribológicas e Mecânicas)
* **Objetivo:** Definir o comportamento físico de cada tipo de linha em jogo.
* **Propriedades Calibradas:**
  - `diameter`: espessura da linha (1.0mm a 1.5mm).
  - `linearDensity`: densidade linear de massa para influência do vento e gravidade.
  - `stiffness`: rigidez elástica contra estiramento.
  - `damping`: amortecimento de vibrações por passo.
  - `friction`: coeficiente de atrito de contato.
  - `abrasiveness`: poder abrasivo de corte no relinho.
  - `abrasionResistance`: resistência ao desgaste abrasivo sofrido.

### 2.3 `RopeConstraintSolver.js` (Solucionador de Restrições XPBD)
* **Objetivo:** Manter a restrição de distância entre nós vizinhos com relaxação Gauss-Seidel iterativa:
  $$C(p_1, p_2) = \|p_2 - p_1\| - L_{\text{repouso}} = 0$$
* **Comportamento:**
  - Nós extremos ($i = 0$ na mão e $i = N-1$ na pipa) possuem massa infinita ($w_i = 0$) e permanecem rigidamente ancorados.
  - Nós intermediários ($i = 1 \dots N-2$) possuem massa finita ($w_i = 1$) e convergem elasticamente.

### 2.4 `RopePhysics.js` (Simulador de Corda de 12 Nós)
* **Estrutura:** 12 partículas sequenciais ($p_0 \dots p_{11}$) contendo posição, posição anterior, velocidade e desgaste individual do segmento.
* **Gestão do Carretel (`spoolLength`):**
  - O parâmetro `lineSlack` (folga) agora determina o **comprimento físico real de linha desenrolada**.
  - Quando o jogador comanda `descarregar` ou recebe curtidas, o carretel libera comprimento extra, gerando barriga aerodinâmica natural com o vento.
  - Quando o jogador comanda `retão` ou puxada, o carretel recolhe bruscamente, esticando a linha em linha reta e elevando a tensão natural a 100%.
* **Desgaste Localizado (`segmentWear`):**
  - Cada segmento possui contador de desgaste independente $[0, 1]$.
  - A integridade do fio é governada pelo elo mais fraco (`getWeakestSegmentIntegrity()`).

---

## 3. Integração com a Cadeia Visual e Entidades

1. **`Kite.js`**:
   - Cada pipa instancia sua própria `RopePhysics`.
   - No loop `Kite.update()`, a simulação física avança um passo (`rope.step()`), sincronizando automaticamente com as rajadas do `Wind.js`.
2. **`Line.js` (2D PixiJS)**:
   - `drawPath` agora suporta desenho direto através do array de nós físicos da corda.
3. **`ThreeLines.js` (3D Three.js)**:
   - `syncLine()` realiza amostragem contínua dos nós da `RopePhysics`, mapeando a curvatura física tridimensional para o buffer de vértices WebGL sem síntese trigonométrica descolada da física.

---

## 4. Testes Automatizados Determinísticos (`tests/rope-physics-p1.test.cjs`)

Criada suíte completa para validação da Fase P1:
- `P1.1`: Fixed timestep determinístico e corte contra death spiral.
- `P1.2`: Calibração comparativa de materiais (abrasividade do Chile vs Cerol vs Kevlar).
- `P1.3`: XPBD restaura distância de nós esticados mantendo âncoras fixas.
- `P1.4`: Simulação de 12 nós, curvatura com vento e cálculo de AABB.
- `P1.5`: Desgaste localizado por segmento e identificação do ponto mais fraco.
- `P1.6`: Ciclo de vida integrado de `RopePhysics` dentro de `Kite.js`.

**Resultado da suíte:** **199/199 testes passando com 100% de sucesso**.
**Build de Produção:** Concluído e copiado para `dist-preview/` em 5.98s.
