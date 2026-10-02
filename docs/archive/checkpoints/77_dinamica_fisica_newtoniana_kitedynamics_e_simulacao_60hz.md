> **ARQUIVADO / HISTÓRICO.** Este documento registra uma etapa anterior e não define a regra vigente. Consulte [`docs/README.md`](../../README.md) e [`00_arquitetura_vigente.md`](../../00_arquitetura_vigente.md).

# Documentação 77: Dinâmica Física Newtoniana (`KiteDynamics`), Acoplamento Completo e Passo Determinístico 60 Hz (P8/P9)

## 1. Visão Geral
Conforme as diretrizes arquiteturais consolidadas, foram eliminadas as atualizações puramente cinemáticas de posição e descompassos de taxa de atualização (120 Hz / 144 Hz). Todas as forças mecânicas e eventos de combate agora rodam rigorosamente dentro do relógio de física fixa de 60 Hz.

---

## 2. Componentes Implementados

### 2.1. `KiteDynamics` ([`frontend/src/engine/physics/KiteDynamics.js`](../../../frontend/src/engine/physics/KiteDynamics.js))
Substitui o deslocamento estático por integração newtoniana real:
- **Forças Aerodinâmicas:**
  - **Arrasto (Drag):** $\vec{F}_{\text{drag}} = (\vec{V}_{\text{vento}} - \vec{V}_{\text{pipa}}) \cdot C_d$.
  - **Sustentação (Lift):** $\vec{F}_{\text{lift}} = -|\vec{V}_{\text{aparente}}| \cdot C_l$ (força ascendente $-Y$).
- **Gravidade:** Proporcional à massa da pipa, rabiola e carga de linha.
- **Two-Way Coupling Pipa ↔ Corda:**
  - O último segmento da corda XPBD exerce tração $\vec{F}_{\text{tensão}}$ sobre o cabresto da pipa na direção da mão.
  - Linha esticada puxa a pipa acelerando manobras; linha solta (descarrego) zera a tensão, deixando o vento conduzir livremente.
- **Ruptura por Tração Máxima (`maxTension`):**
  - Se a tensão exceder a resistência física do material (`LINE_MATERIALS[type].maxTension`), a linha rompe instantaneamente por excesso de força.

### 2.2. Integração no `PhysicsClock` (P8)
Em [`frontend/src/engine/App.js`](../../../frontend/src/engine/App.js):
Todas as etapas físicas foram encapsuladas dentro do callback único de 60 Hz:
```text
_physicsClock.update(deltaSeconds, (fixedDt) => {
   1º Intenções de controle, mãos e manobras
   2º KiteDynamics + RopePhysics XPBD
   3º Vórtices e vento
   4º Colisão e atrito de relinho determinísticos
   5º Sistema de aparos de pipas voadas
});
```
Isso elimina qualquer descompasso entre monitores de 60 Hz, 120 Hz e 144 Hz.

---

## 3. Validação
- **Testes Unitários:** 232/232 testes passando sem falhas (`npm test`).
- **Verificação de Sintaxe:** `node --check` em 100% dos fontes JS.
- **Build Vite:** `npm run build` gerado com sucesso em `dist/`.
