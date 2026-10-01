# 86 · Convergência Dinâmica para Populações Baixas — Pipas que Finalmente se Encontram

**Data**: 01/10/2026  
**Status**: Corrigido e Validado (274/274 testes aprovados)  
**Arquivo Modificado**: `frontend/src/engine/physics/KiteDynamics.js`

---

## 1. Problema Reportado

Com 2 a 4 pipas no céu, elas ficavam estáticas em posições fixas e **nunca cruzavam linhas** (relinho). O jogo parecia "morto" — pipas flutuando cada uma no seu canto sem interação.

---

## 2. Causas Raiz Identificadas

### 2.1 Força Restauradora de Corredor Aéreo Muito Forte
Cada pipa tinha um `targetX`/`targetY` individual definido no spawn. Duas forças restauradoras (mola lateral `0.35` e mola vertical `1.55`) prendiam cada pipa no seu "corredor aéreo", impedindo deslocamentos suficientes para cruzar linhas.

### 2.2 Wind.move Não Mais Utilizado pelo KiteDynamics
Após o checkpoint P8 (física newtoniana real), o `Wind.move()` — que possuía lógica de convergência para `population <= 4` — foi substituído pelo `KiteDynamics.step()`, que **não tinha nenhum mecanismo de convergência**.

### 2.3 Sway Natural Insuficiente
O balanço aerodinâmico era de apenas ±18px lateral e ±12px vertical — totalmente insuficiente para pipas em corredores separados se encontrarem.

---

## 3. Solução Implementada

### 3.1 Convergência Dinâmica Orbital (Ponto de Encontro Migratório)
Com ≤4 pipas, um **ponto de encontro orbitante** percorre o centro do céu em elipse lenta. A intensidade de convergência oscila ciclicamente, criando janelas de ~4-8s onde as pipas se aproximam (gerando relinhos) e depois se dispersam naturalmente.

```javascript
if (sparse) {
  const meetX = width * (0.5 + Math.sin(t * 0.19) * 0.28);
  const meetY = height * (0.28 + Math.cos(t * 0.15) * 0.07);
  const convergePower = Math.pow((1 + Math.sin(t * 0.55 + phase)) / 2, 1.5);
  cruiseX += (meetX - cruiseX) * convergePower * 0.85;
  cruiseY += (meetY - cruiseY) * convergePower * 0.6;
}
```

### 3.2 Forças Restauradoras Reduzidas para Sparse
- **Mola vertical**: `1.55 → 0.9` (pipas livres para subir/descer mais)
- **Mola lateral**: `0.35 → 0.15` (pipas livres para cruzar corredores)

### 3.3 Sway Natural Amplificado
- **Lateral**: `±18px → ±55px` + harmônica secundária de `±30px`
- **Vertical**: `±12px → ±35px` + harmônica secundária de `±18px`

---

## 4. Comportamento Esperado Após a Correção

| Cenário | Antes | Depois |
| :--- | :--- | :--- |
| 2 pipas | Cada uma parada no seu canto | Orbitam e cruzam linhas a cada ~6s |
| 3-4 pipas | Presas em grade estática | Convergem periodicamente, gerando faíscas e cortes |
| 5+ pipas | Funcionava OK (dispersão natural) | Sem alteração (sparse=false) |
| 40 pipas | Benchmark 10.8M pares/s | Sem alteração (forças originais mantidas) |

---

## 5. Validação

- **274/274 testes unitários aprovados** ✅
- Teste de vento confirma cruzamentos reais e cortes sem ação do espectador ✅
- Benchmark de 40 pipas inalterado (mudança só ativa com `population ≤ 4`) ✅
