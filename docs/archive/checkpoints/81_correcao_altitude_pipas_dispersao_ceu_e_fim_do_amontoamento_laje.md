> **ARQUIVADO / HISTÓRICO.** Este documento registra uma etapa anterior e não define a regra vigente. Consulte [`docs/README.md`](../../README.md) e [`00_arquitetura_vigente.md`](../../00_arquitetura_vigente.md).

# Documentação 81: Correção da Altitude das Pipas no Céu, Dispersão Horizontal e Eliminação do Amontoamento sobre a Laje

## 1. Problema Identificado na Live
Na captura de tela enviada pelo usuário, foi observado:
1. **Pipas Amontoadas em Cima da Laje:** Todas as 6 pipas da arena estavam colapsadas em um único bolo visual, posicionadas exatamente atrás da cabeça do segundo boneco na laje.
2. **Céu Aberto Desocupado:** A faixa de 70% superior da tela (céu azul, nuvens, morros e baía) estava completamente vazia.

---

## 2. Causa Raiz Física e Matemática

### 2.1. Tração Vertical Invertida (`tensionFy`)
Em [`frontend/src/engine/physics/KiteDynamics.js`](../../../frontend/src/engine/physics/KiteDynamics.js), o vetor da linha que conecta a mão à pipa produzia um $\Delta Y = P_{\text{mão}}.y - P_{\text{pipa}}.y > 0$ positivo (para baixo na tela). A tensão multiplicada por esse vetor gerava uma força constante de mais de $+66.7\,\text{N}$ puxando a pipa para baixo em direção à mão, superando o `naturalLift`.

### 2.2. Falta de Restauração Aerodinâmica de Altitude
Uma pipa real presa na linha possui forte diedro e arqueamento. Se ela cai em direção ao chão, o ângulo de ataque contra o vento aumenta drasticamente, gerando uma força de sustentação ascendente (*restoring lift*) proporcional ao desvio de sua altitude de cruzeiro. Sem essa força, a gravidade acumulava velocidade vertical e arrastava todas as pipas até o chão da laje (`height * 0.65`).

### 2.3. Colapso Lateral no Eixo X
Sem um corredor aéreo individual para cada jogador, a tração da linha convergia todas as pipas para o mesmo centro horizontal.

---

## 3. Correções Aplicadas

### 3.1. Estabilidade de Altitude de Cruzeiro no Alto do Céu
Em [`frontend/src/engine/physics/KiteDynamics.js`](../../../frontend/src/engine/physics/KiteDynamics.js):
- **Altitude de Cruzeiro:** `cruiseY = height * 0.26` (faixa superior ideal do céu).
- **Sustentação Restauradora:**
  $$F_{\text{restoringLift}} = -(\text{kite.y} - \text{cruiseY}) \cdot 1.55$$
  Se a pipa tentar descer, a sustentação ascencional do vento contra a face inferior da pipa a empurra firmemente para cima ($-Y$), mantendo-a pairando no céu aberto.
- **Tensão Vertical Equilibrada:** A linha sustenta e orienta manobras sem afundar a pipa na laje (`balancedTensionFy = tensionFy * 0.12`).

### 3.2. Dispersão Horizontal por Setores e Corredores de Voo
- Cada jogador mantém um corredor lateral de cruzeiro no céu (`cruiseX = kite.targetX || width * 0.5`), com força elástica horizontal suave (`lateralCorridorFx = -(kite.x - cruiseX) * 0.35`).
- As pipas passam a ocupar toda a largura do céu ($15\% \dots 85\%$), disputando e cruzando linhas quando manobram ou quando o vento oscila, mas sem colapsar no mesmo ponto.

### 3.3. Posição Inicial e Limites Verticais de Segurança
- Em [`frontend/src/entities/Kite.js`](../../../frontend/src/entities/Kite.js):
  - `this.targetY = screenHeight * (0.18 + Math.random() * 0.16);`
  - Limite de segurança de voo: `kite.y = Math.max(height * 0.12, Math.min(height * 0.44, kite.y));`
- As pipas agora voam majestosamente no céu aberto, com linhas longas e curvas conectando até a mão dos bonequinhos na laje.

---

## 4. Validação
- **Testes Unitários:** 237/237 testes passando (`npm test`).
- **Verificação de Sintaxe:** `node --check` 100% limpo.
- **Build Vite:** `npm run build` gerado com sucesso.
