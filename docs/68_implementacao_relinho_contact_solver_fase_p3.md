> **STATUS: HISTÓRICO / CHECKPOINT.** Este arquivo registra uma etapa real do desenvolvimento, mas não define sozinho a regra vigente. Em caso de conflito sobre vento, comentários, alvos, presentes, manobras, contato ou corte, prevalecem `00_arquitetura_vigente.md` e `superpowers/specs/2026-10-02-hybrid-live-kite-combat-design.md`.

# 68. Implementação da Fase P3: Solucionador Físico de Atrito e Desgaste Abrasivo (`RelinhoContactSolver`)

**Data:** 30/09/2026  
**Status:** Implementado, Integrado e 100% Validado (**208/208 testes aprovados**)  
**Skills Utilizadas:** `/systematic-debugging`, `/test-driven-development`, `/senior-fullstack`

---

## 1. Visão Geral da Fase P3

Nas versões legadas, o dano do combate de relinho era aplicado de forma global e uniforme no HP da pipa através de uma taxa escalar arbitrária. Não havia conexão com:
1. A **tensão elástica real** da corda no ponto de cruzamento.
2. A **velocidade longitudinal de deslizamento** dos fios um contra o outro ($v_{\text{slide}}$).
3. As propriedades tribológicas reais dos materiais (ex: abrasividade de quartzo moído na linha chilena vs resistência à tração de aramida no Kevlar).
4. O **desgaste mecânico localizado**: em uma pipa real, a linha rompe no ponto onde foi serrada, não "em média".

A **Fase P3** entrega o `RelinhoContactSolver`, o motor tribológico responsável por transformar o contato geométrico da corda física de 12 nós em trabalho dissipativo, desgaste de segmentos e corte.

---

## 2. Fundamentação Física e Tribologia de Relinho

O solucionador implementa o modelo de desgaste abrasivo de Archard adaptado para fios flexíveis trançados em alta rotação:

### 2.1 Força Normal Efetiva ($N$)
Quando dois fios tracionados se cruzam formando um ângulo $\theta$:
$$N \approx (T_A + T_B) \times \sin(\theta)$$
- Fios quase paralelos ($\theta \to 0^\circ$) escorregam sem pressão normal mútua.
- Fios perpendiculares ou oblíquos bem esticados geram compressão máxima de contato.

### 2.2 Força de Atrito Cinético e Potência de Cisalhamento ($P$)
$$F_{\text{atrito}} = \mu_{\text{combinado}} \times N$$
$$P = F_{\text{atrito}} \times v_{\text{slide}}$$
Onde $v_{\text{slide}}$ é a projeção da velocidade relativa na direção tangente do fio opositor calculada na Fase P2 pelo `RopeCollision`.

### 2.3 Taxa de Dano Abrasivo Assimétrico
A taxa de corte de cada linha depende da razão entre a agressividade abrasiva do atacante e a resistência à abrasão do defensor:
$$\text{damageRate}_B = P \times \left(\frac{\text{abrasiveness}_A}{\text{abrasionResistance}_B}\right) \times \text{offense}_A \times \text{defense}_B$$
$$\text{damageRate}_A = P \times \left(\frac{\text{abrasiveness}_B}{\text{abrasionResistance}_A}\right) \times \text{offense}_B \times \text{defense}_A$$

#### Matriz de Comportamento dos Materiais:
- **Algodão vs Algodão:** Razão $1.0 / 1.0 = 1.0$ (paridade total e calibração 1:1 com a estabilidade P0).
- **Linha Chilena vs Algodão:** Razão $1.85 / 1.0 = 1.85$ (+85% de agressividade de corte, recompensando presentes de live).
- **Algodão vs Kevlar:** Razão $1.0 / 2.10 = 0.476$ (Kevlar absorve e reduz o dano de atrito em 52,4%).

---

## 3. Desgaste Localizado e Ruptura pelo Elo Mais Fraco

1. **Desgaste por Nó Físico:**
   O combate não reduz apenas o HP numérico global. Ele desgasta especificamente o segmento físico atingido na corda:
   ```javascript
   kiteA.rope.applySegmentWear(segmentIndexA, (damageA / maxHPA) * 0.6);
   kiteB.rope.applySegmentWear(segmentIndexB, (damageB / maxHPB) * 0.6);
   ```
2. **Ruptura Física Crítica:**
   A qualquer momento, se um segmento sofrer desgaste superior a 95% (integridade residual $\le 0.05$):
   ```javascript
   const weakest = kite.rope.getWeakestSegmentIntegrity();
   if (weakest <= 0.05) {
     kite.lineHP = 0;
     died = true;
   }
   ```
   A linha rompe instantaneamente no nó atingido, disparando o evento de corte físico e a física de pipa avoadora (`FallingKite`).

---

## 4. Integração Arquitetural e Fachada

- `frontend/src/engine/physics/RelinhoContactSolver.js`: Módulo com métodos estáticos puros `calculateFrictionalWork` e `resolveCombatStep`.
- `frontend/src/engine/Physics.js`: Mantido como API pública e fachada retrocompatível. O método `Physics.resolveRelinhoCombat` delega a resolução para o `RelinhoContactSolver`, garantindo preservação de escudos Kevlar (`triggerShieldAbsorb`), desempate geométrico e proteção contra HP negativo de vencedores.
- `frontend/src/engine/physics/RopePhysics.js`: Expandido com `getSegmentIntegrity(segmentIndex)` e sincronização de integridade.

---

## 5. Validação Automatizada (`tests/relinho-solver-p3.test.cjs`)

Adicionados 5 novos testes determinísticos:
- `P3.1`: Algodão vs Algodão preserva paridade 1.0 e simetria de dano em geometria idêntica.
- `P3.2`: Razão tribológica beneficia linha chilena (+85% dano) e protege o Kevlar (absorção > 50%).
- `P3.3`: Acúmulo de `segmentWear` concentrado no segmento colidido da corda física XPBD.
- `P3.4`: Ruptura física instantânea por elo mais fraco ao atingir limiar crítico ($\le 0.05$).
- `P3.5`: Validação através da fachada `Physics.resolveRelinhoCombat` com escudos e restauração total.

**Resultado da suíte:** **208/208 testes aprovados (100% verde)**.  
**Build de Produção:** Concluído com sucesso (5.88s) e sincronizado com `frontend/dist-preview/`.
