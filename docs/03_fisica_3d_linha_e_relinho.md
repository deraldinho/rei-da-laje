# 03. Física 3D da pipa, linha e relinho

**Status:** vigente
**Data:** 02/10/2026

Este documento define a autoridade física do jogo. Nenhum sistema de live, comentário, presente, câmera ou efeito visual pode ignorar estas regras.

## Autoridade de movimento

A trajetória da pipa emerge de:

`WindField + KiteAttitude + KiteAerodynamics + PlayerIntentController + SpoolController + KiteDynamics + RopePhysics`

- `KiteDynamics` é autoridade de posição, velocidade e atitude.
- `SpoolController` controla recolhimento/liberação de linha.
- `RopePhysics` controla comprimento, folga, tensão e geometria XPBD.
- Three.js/Pixi apenas renderizam o estado físico.

Não existe animação pré-gravada alterando `x/y/z`, nem renderer devolvendo coordenadas para a simulação.

## Vento

O vento deve ser coerente, suave e com memória temporal. Mudanças de direção reorganizam a arena inteira e constituem o mecanismo normal de criação de PvP.
## Contato linha-linha

Um X visual na câmera não é contato. O narrow phase precisa confirmar distância tridimensional entre segmentos dentro do raio configurado.

`rope geometry -> broad phase -> narrow phase 3D -> LineContactManager`

Somente contatos confirmados entram em relinho.

## Abrasão e ruptura

O resultado físico depende de:

- velocidade relativa de deslizamento;
- tensão de cada linha;
- ângulo local de contato;
- propriedades virtuais do par de materiais;
- duração do contato;
- desgaste já acumulado no segmento.

`LineAbrasionModel` produz desgaste localizado. `LineStructuralModel` trata sobrecarga/fadiga sustentada separadamente. Ambos convergem em `LineBreakSystem`, que rompe um segmento físico específico.

Nenhum gift ou comentário pode chamar um equivalente a `damageEnemy()` ou `forceCut()`.

## Orçamento permanente

- até 40 pipas;
- fixed step 60 Hz;
- `maxTracked <= 12`;
- `maxSolved <= 3`;
- sem scan ingênuo de todos os segmentos contra todos os segmentos por frame.
