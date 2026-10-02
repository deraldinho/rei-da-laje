> **STATUS: HISTÓRICO / CHECKPOINT.** Este arquivo registra uma etapa real do desenvolvimento, mas não define sozinho a regra vigente. Em caso de conflito sobre vento, comentários, alvos, presentes, manobras, contato ou corte, prevalecem `00_arquitetura_vigente.md` e `superpowers/specs/2026-10-02-hybrid-live-kite-combat-design.md`.

# 67. Implementação da Fase P2: Colisão Real de Cordas por Cápsula de Segmentos (`RopeCollision`)

**Data:** 30/09/2026  
**Status:** Implementado, Integrado e 100% Validado (**203/203 testes aprovados**)  
**Skills Utilizadas:** `/systematic-debugging`, `/test-driven-development`, `/senior-fullstack`

---

## 1. Visão Geral da Fase P2

Na física clássica simplificada, linhas de pipa eram modeladas como segmentos de espessura zero ($d = 0$), dependendo de um cruzamento matemático exato para que qualquer combate fosse registrado.

Isso causava dois problemas críticos em transmissões ao vivo:
1. **Passagens raspando sem contato:** Duas linhas fisicamente muito próximas (ex: a 2mm ou 5px uma da outra), que visualmente deveriam se cruzar e travar em relinho, eram descartadas porque os segmentos não tinham interseção matemática perfeita.
2. **Indeterminação do ponto de desgaste:** Como o contato era tratado como um evento escalar global da pipa, o jogo não sabia em qual parte da corda (perto da mão, no meio ou perto do cabresto) ocorreu o atrito.

A **Fase P2** introduz o `RopeCollision.js`, implementando a aproximação **Cápsula vs Cápsula** em cada par de segmentos da corda física de 12 nós.

---

## 2. Algoritmo e Geometria de Contato (`RopeCollision.js`)

### 2.1 Menor Distância entre Segmentos no Espaço 2D e 3D
Dado o segmento $S_1 = (P_1, Q_1)$ e o segmento $S_2 = (P_2, Q_2)$, parametrizados por:
$$C_1(s) = P_1 + s \mathbf{u}, \quad s \in [0, 1]$$
$$C_2(t) = P_2 + t \mathbf{v}, \quad t \in [0, 1]$$

O algoritmo calcula os parâmetros $(s, t)$ que minimizam a distância euclidiana $\|C_1(s) - C_2(t)\|$, tratando casos degenerados (pontos) e paralelas sem singularidades de divisão por zero.

### 2.2 Critério de Colisão de Cápsula
Cada linha possui um raio volumétrico baseado no seu material ($r_A = \text{diameter}_A \times \text{scale}$, $r_B = \text{diameter}_B \times \text{scale}$). O contato ocorre quando:
$$\text{distância}(S_{A_i}, S_{B_j}) \le r_A + r_B$$

### 2.3 Cinemática e Atrito de Deslizamento
No ponto de contato $(x, y, z)$, o algoritmo computa:
- **Vetores tangentes unitários** ($\mathbf{T}_A, \mathbf{T}_B$) e o ângulo relativo entre os fios ($\sin \theta$).
- **Velocidade relativa vetorial** $\mathbf{v}_{\text{rel}} = \mathbf{v}_A - \mathbf{v}_B$.
- **Velocidade de deslizamento longitudinal** ($v_{\text{slide}}$):
  $$v_{\text{slide}} = \max\left( |\mathbf{v}_{\text{rel}} \cdot \mathbf{T}_A|, \, |\mathbf{v}_{\text{rel}} \cdot \mathbf{T}_B|, \, \|\mathbf{v}_{\text{rel}}\| \sin \theta \right)$$
  Essa componente de cisalhamento longitudinal é o motor físico real do corte abrasivo com cerol e linha chilena.

---

## 3. Integração com o Loop de Combate (`App.js`)

1. **Prioridade para Cordas Físicas:**
   No método `checkRelinhos()`, se ambas as pipas possuem `rope`, o sistema executa:
   ```javascript
   const ropeHit = RopeCollision.checkRopeCollision(kA.rope, kB.rope, 4.5);
   ```
2. **Desgaste Localizado no Elo Atingido:**
   Quando há contato ativo, o dano desgasta especificamente o segmento físico atingido em cada pipa:
   ```javascript
   kA.rope.applySegmentWear(inter.segmentIndexA, 0.004 * delta);
   kB.rope.applySegmentWear(inter.segmentIndexB, 0.004 * delta);
   ```
3. **Fallback Seguro e Retrocompatibilidade:**
   Se as instâncias de corda física não estiverem presentes (ex: mocks parciais ou testes legados), o sistema recorre ao `Physics.checkLineIntersection` geométrico sem quebrar a execução.

---

## 4. Testes Automatizados Determinísticos (`tests/rope-collision-p2.test.cjs`)

Adicionados 4 testes unitários com cobertura total:
- `P2.1`: Cálculo da menor distância euclidiana e ponto de contato em 2D e 3D (perpendiculares, paralelas e reversas).
- `P2.2`: Detecção de colisão entre cordas físicas XPBD em X com velocidade relativa e deslizamento positivo.
- `P2.3`: Toque lateral por espessura de cápsula (fios paralelos a 6px de distância com Kevlar acusam colisão física real).
- `P2.4`: Descarte instantâneo via broad-phase AABB para cordas distantes na tela.

**Resultado da suíte:** **203/203 testes passando com 100% de sucesso**.  
**Build de Produção:** Concluído e copiado para `dist-preview/` em 5.92s.
