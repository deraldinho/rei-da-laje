> **STATUS: HISTÓRICO / CHECKPOINT.** Este arquivo registra uma etapa real do desenvolvimento, mas não define sozinho a regra vigente. Em caso de conflito sobre vento, comentários, alvos, presentes, manobras, contato ou corte, prevalecem `00_arquitetura_vigente.md` e `superpowers/specs/2026-10-02-hybrid-live-kite-combat-design.md`.

# Documento 73: Implementação dos Itens 2, 3 e 4 da Física de Colisão

**Data:** Outubro de 2026  
**Status:** Implementado, Validado e Integrado (228/228 testes passando)

---

## 1. Visão Geral

Atendendo à solicitação do usuário (*"eu gostei do 2, 3 e 4"*), foram implementadas três evoluções cruciais no subsistema de colisão e combate de linhas:

1. **Item 2: Cruzamento Real em "X" (Incidência Angular Mínima)**
2. **Item 3: Profundidade 3D (Z-Aware Collision e Alinhamento Tático)**
3. **Item 4: Força Mútua (*Two-Way Coupling* / Engate Mecânico com Ação e Reação)**

Essas melhorias eliminam definitivamente o "relinho fantasma" (onde linhas paralelas ou pipas em planos de profundidade diferentes cortavam uma à outra) e criam o comportamento visual e mecânico autêntico de combate de pipas, onde os fios sob tensão engatam e se dobram no ponto de contato mútuo.

---

## 2. Detalhamento das Implementações

### 2.1. Item 2: Cruzamento Real em "X" (`minSinAngle`)
* **Arquivo:** [`frontend/src/engine/physics/RopeCollision.js`](file:///c:/Users/deral/Competição%20de%20pipa%20tiktok%20live/frontend/src/engine/physics/RopeCollision.js)
* **Conceito:** No combate real de pipas, fios que viajam paralelamente no ar roçam tangencialmente sem criar o ponto de apoio em "X" necessário para o atrito concentrado e o corte de cerol/linha chilena.
* **Modelo Matemático:**
  $$\sin\theta = \sqrt{1 - (\hat{t}_A \cdot \hat{t}_B)^2}$$
  - Onde $\hat{t}_A$ e $\hat{t}_B$ são os vetores tangentes unitários dos segmentos mais próximos.
  - Se $\sin\theta < 0.15$ ($\theta < \approx 8.6^\circ$), os fios são considerados paralelos/tangentes:
    $$\text{hit} = \text{false}, \quad \text{reason} = \text{'PARALLEL\_OR\_GLANCING'}$$
  - Apenas cruzamentos com $\sin\theta \ge 0.15$ avançam para a fase de relinho e combate.

---

### 2.2. Item 3: Profundidade 3D (`Z-Aware Collision`)
* **Arquivos:**
  - [`frontend/src/engine/physics/RopeCollision.js`](file:///c:/Users/deral/Competição%20de%20pipa%20tiktok%20live/frontend/src/engine/physics/RopeCollision.js)
  - [`frontend/src/ui/ThreeSkyScene.js`](file:///c:/Users/deral/Competição%20de%20pipa%20tiktok%20live/frontend/src/ui/ThreeSkyScene.js)
  - [`frontend/src/entities/Kite.js`](file:///c:/Users/deral/Competição%20de%20pipa%20tiktok%20live/frontend/src/entities/Kite.js)
  - [`frontend/src/engine/App.js`](file:///c:/Users/deral/Competição%20de%20pipa%20tiktok%20live/frontend/src/engine/App.js)
* **Conceito:** O cenário e as pipas possuem profundidade tridimensional real no Three.js dividida em camadas no céu ($Z \in [50, 245]$) e ancoragem das mãos na laje ($Z = 480$).
* **Mecanismos Implementados:**
  1. **Propagação de $Z$:** `ThreeSkyScene` atualiza `kite.z = k3d.position.z` e `kite.baseZ = 480`. `Kite.js` repassa $Z$ para os nós da corda física `RopePhysics` no `rope.step()`.
  2. **Filtro de Separação em $Z$:**
     $$\Delta Z = |z_A - z_B|$$
     - Se $\Delta Z > 85$ unidades 3D (ex: uma pipa no primeiro plano e outra no horizonte distante), a colisão é descartada:
       $$\text{hit} = \text{false}, \quad \text{reason} = \text{'Z\_SEPARATION'}$$
  3. **Convergência Tática de Combate (*Combat Depth Alignment*):** Quando duas pipas ativas entram em manobra ou combate próximas em $X, Y$, o `ThreeSkyScene` interpola suavemente a profundidade $Z$ de ambas em direção ao plano médio, permitindo que a disputa aérea aconteça no mesmo corredor tridimensional.

---

### 2.3. Item 4: Força Mútua (*Two-Way Coupling* / Engate Mecânico)
* **Arquivo:** [`frontend/src/engine/physics/RopeCollision.js`](file:///c:/Users/deral/Competição%20de%20pipa%20tiktok%20live/frontend/src/engine/physics/RopeCollision.js) (`applyMutualContactCoupling`)
* **Conceito:** Modela a 3ª Lei de Newton (Ação e Reação) no ponto de contato das cordas elásticas.
* **Modelo Físico:**
  - Quando as duas cordas se tocam no segmento $i$ de A e segmento $j$ de B, os nós livres intermediários sofrem atração elástica mútua em direção ao ponto de contato ponderado $(C_x, C_y, C_z)$:
    $$\vec{x}_{A1} \leftarrow \vec{x}_{A1} + (\vec{C} - \vec{x}_{A1}) \cdot (1 - s) \cdot k$$
    $$\vec{x}_{A2} \leftarrow \vec{x}_{A2} + (\vec{C} - \vec{x}_{A2}) \cdot s \cdot k$$
    $$\vec{x}_{B1} \leftarrow \vec{x}_{B1} + (\vec{C} - \vec{x}_{B1}) \cdot (1 - t) \cdot k$$
    $$\vec{x}_{B2} \leftarrow \vec{x}_{B2} + (\vec{C} - \vec{x}_{B2}) \cdot t \cdot k$$
  - **Condições de Contorno:** Nós fixos (`invMass = 0`, mão e cabresto da pipa) não sofrem deslocamento, preservando a estabilidade e a geometria das âncoras.
  - **Aderência:** Aplica-se amortecimento na velocidade relativa nos nós em contato ($\text{damp} = 0.88$), criando o efeito autêntico de fio engatado e dobrado em "X" sob tensão, até ocorrer o corte ou o desengate por manobra.

---

## 3. Validação e Testes Automatizados

* **Novo Teste:** [`tests/rope-collision-enhanced-p7.test.cjs`](file:///c:/Users/deral/Competição%20de%20pipa%20tiktok%20live/tests/rope-collision-enhanced-p7.test.cjs)
  - `Item 2: Cruzamento Real em "X"`: Passou (rejeição de paralelas e aceitação de X).
  - `Item 3: Profundidade 3D (Z-Aware Collision)`: Passou (descarte com $\Delta Z = 180 > 85$ e aceitação com $\Delta Z = 20 \le 85$).
  - `Item 4: Two-Way Coupling`: Passou (redução da distância entre nós em contato, preservação estrita de âncoras com `invMass = 0`).
* **Suíte Completa:**
  - `npm test`: **228/228 testes passando** (0 falhas).
  - `node --check`: 100% dos arquivos JavaScript do projeto verificados sem erro de sintaxe.
  - `npm run build`: Vite build compilado com sucesso (5.94s).
