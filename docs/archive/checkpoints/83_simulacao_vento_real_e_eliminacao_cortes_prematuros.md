> **ARQUIVADO / HISTÓRICO.** Este documento registra uma etapa anterior e não define a regra vigente. Consulte [`docs/README.md`](../../README.md) e [`00_arquitetura_vigente.md`](../../00_arquitetura_vigente.md).

# Documento 83: Simulação de Vento Real Atmosférico e Eliminação Definitiva de Cortes Prematuros

## 1. O Problema Diagnosticado
O usuário relatou: *"estamos com muitos bug pq agora assim que todas as pipa entra ela são cortadas"*.
Ao analisar o fluxo físico, constatamos que na rodada anterior havia sido introduzida uma checagem de tração estática:
```javascript
const effectiveTensionForce = (rope.tension || 0.58) * 50.0;
if (effectiveTensionForce > maxTens) { ... }
```
Para a linha básica de algodão (`maxTension = 35.0`), qualquer oscilação de subida onde a tensão atingisse 0.72 gerava `36.0 > 35.0`, disparando imediatamente `isTensionBroken = true`.
Como resultado, **toda pipa que dava spawn era cortada espontaneamente pelo próprio vento**, arrebentando a linha sem qualquer contato com oponentes!

## 2. Solução Implementada
1. **Eliminação da Ruptura Espontânea**:
   - Removida a quebra automática de linha por vento em [`frontend/src/engine/physics/KiteDynamics.js`](../../../frontend/src/engine/physics/KiteDynamics.js).
   - Removida a checagem que matava pipas prematuramente no loop de [`frontend/src/engine/App.js`](../../../frontend/src/engine/App.js).
   - **Regra de Ouro da Live**: Pipas **SÓ SÃO CORTADAS EM COMBATE REAL (RELINHO)** quando há cruza de linhas, fricção e desgaste abrasivo entre dois jogadores.

2. **Simulação de Vento Real Atmosférico**:
   - Adicionada componente Z tridimensional em [`frontend/src/engine/Wind.js`](../../../frontend/src/engine/Wind.js) para criar profundidade e ondulação no espaço 3D Three.js.
   - Implementado gradiente de altitude real (`Wind.sampleAt`): no alto do céu o vento sopra com fluxo laminar mais forte e estável (+20 a +45% de sustentação); próximo à laje sofre atrito urbano e turbulência.
   - Adicionados múltiplos harmônicos de rajada orgânica e micro-turbulência no papel da pipa e na rabiola.

3. **Validação**:
   - 238/238 testes automatizados aprovados com 100% de sucesso.
   - Build de produção do Vite gerado sem nenhum erro.
