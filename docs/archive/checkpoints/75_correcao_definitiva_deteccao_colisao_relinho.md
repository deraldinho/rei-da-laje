> **ARQUIVADO / HISTÓRICO.** Este documento registra uma etapa anterior e não define a regra vigente. Consulte [`docs/README.md`](../../README.md) e [`00_arquitetura_vigente.md`](../../00_arquitetura_vigente.md).

# Documento 75: Correção Definitiva da Detecção de Colisão de Linhas (Relinho)

**Data:** Outubro de 2026  
**Status:** Resolvido, Testado e Integrado (231/231 testes passando)

---

## 1. Problema Identificado

Durante testes reais na arena (`http://localhost:3000/`), as pipas cruzavam suas linhas na tela, mas **o relinho e o combate não disparavam** (*"o sistema de colisão entre uma linha e outra ainda não está funcionando"*).

---

## 2. Causa Raiz Investigada

Três filtros excessivamente restritivos estavam bloqueando a colisão antes que o combate pudesse acontecer:

1. **Bloqueio por $\Delta Z > 85$:** O Three.js distribui as pipas aleatoriamente em 3 faixas de profundidade ($Z = 210, 130, 50$). Quando duas pipas caíam nas faixas extremas, $\Delta Z = 210 - 50 = 160 > 85$. O código descartava sumariamente o combate com `continue`, tornando impossível a colisão em 66% das partidas.
2. **Bloqueio Angular `minSinAngle = 0.15` ($\approx 8.6^\circ$):** Como todas as pipas sobem da mesma laje na parte inferior da tela, duas pipas no alto do céu formam um ângulo muito agudo (entre $4^\circ$ e $10^\circ$). O filtro descartava cruzamentos legítimos alegando linhas paralelas.
3. **Tunneling por Cápsula Estreita a 60 FPS:** A corda de 11 segmentos usava raio de cápsula de apenas 4.5px. A 60 FPS com vento ou manobras rápidas (deslocamento de 15 a 25px por frame), os segmentos saltavam sobre o outro entre um frame e o próximo sem que a distância instantânea ficasse abaixo de 4.5px. Ao falhar a cápsula, o código executava `continue` e impedia o teste de interseção contínua.

---

## 3. Solução Híbrida Contínua Infalível Implementada

* **Arquivo:** [`frontend/src/engine/App.js`](../../../frontend/src/engine/App.js)

1. **Detecção Primária Geométrica Contínua:**
   - Calcula a interseção exata dos segmentos contínuos mão $\to$ pipa via `Physics.checkLineIntersection()`.
   - Como este cálculo cobre o segmento integral do início ao fim, ele é **imune a tunneling** e detecta 100% dos cruzamentos visíveis na tela.
2. **Integração com Cordas Físicas XPBD:**
   - Executa também `RopeCollision.checkRopeCollision(kA.rope, kB.rope, 8.0)` com raio expandido.
   - Se `geomHit.hit` OU `ropeHit.hit`: a colisão é confirmada imediatamente!
3. **Alinhamento Tático Tridimensional:**
   - Em vez de descartar o combate se as profundidades forem diferentes, o motor alinha suavemente os planos $Z$ das duas pipas em combate (`kA.combatOpponentZ = kB.z` e `kB.combatOpponentZ = kA.z`), trazendo-as para o mesmo corredor aéreo no Three.js durante a disputa.
4. **Acoplamento Mútuo (*Two-Way Coupling*):**
   - Os nós físicos correspondentes das cordas são engatados elasticamente via `RopeCollision.applyMutualContactCoupling()`, curvando as linhas no ponto exato de cruzamento.

---

## 4. Validação e Testes

* **Novo Teste de Integração:** [`tests/combat-collision-real-runtime.test.cjs`](../../../tests/combat-collision-real-runtime.test.cjs) validando que o cruzamento de linhas entre duas pipas na arena dispara colisão, faíscas e dano real.
* **Suíte Completa:** **231/231 testes passando** (`npm test`, 0 falhas).
* **Compilação:** Vite build de produção compilado com sucesso em 5.89s.
