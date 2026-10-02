> **ARQUIVADO / HISTÓRICO.** Este documento registra uma etapa anterior e não define a regra vigente. Consulte [`docs/README.md`](../../README.md) e [`00_arquitetura_vigente.md`](../../00_arquitetura_vigente.md).

# 88. Checkpoint — Arquitetura híbrida: vento, comentários, gifts e física 3D

**Data:** 02/10/2026
**Status:** conceito arquitetural aprovado; especificação formal aguardando revisão; implementação detalhada ainda será planejada

## Decisão arquitetural

O jogo deixa de tentar reproduzir integralmente um simulador controlável de pipa e passa a combinar três responsabilidades:

- **estilo live 2D:** muitas pipas automáticas e combate contínuo criado pelo vento;
- **mecânica de Pipa Combate 3D:** spool, tensão, folga, atitude, vento aparente e manobras físicas;
- **física experimental:** contato linha-linha real em 3D, abrasão, materiais, fadiga e ruptura localizada.

Regra permanente:

> **O vento cria o PvP normal. Comentários influenciam a pipa. Presentes pilotam a pipa. A física decide o resultado.**

## O que foi rejeitado

- duelo 1x1/fila como formato principal;
- seleção automática de alvo no combate normal;
- `LiveCombatDirector` empurrando pares específicos para encontro;
- comandos obrigatórios `1/2/3` para espectadores;
- animações que escrevem posição/velocidade;
- gift que causa dano ou corte sem contato físico.
## Novos limites de responsabilidade

### `SkyWindDirector`
Controla somente o estado global do vento e o ritmo do céu. Não conhece `targetId` nem inimigo preferencial.

### `CommentGestureEngine`
Transforma comentários arbitrários em intervenções físicas curtas e limitadas. O jogador não precisa decorar palavras de comando.

### `CrowdEnergy`
Resume engajamento coletivo em `[0,1]` e pode aumentar suavemente a atividade do vento, sem alterar dano/material.

### `GiftManeuverAI`
Planeja uma sequência física temporária usando vento, estado da pipa e densidade espacial das linhas. Procura corredores, não jogadores.

### `LineDensityField`
Mapa 3D barato e de baixa frequência usado apenas para planejamento. Nunca substitui broad/narrow phase nem confirma contato.

## Física preservada

Continuam vigentes `WindField`, `KiteAttitude`, `KiteAerodynamics`, `SpoolController`, `KiteDynamics`, `RopePhysics`, `LineBroadPhase`, narrow phase 3D, `LineContactManager`, `LineAbrasionModel`, materiais virtuais, fadiga estrutural e `LineBreakSystem`.

## Performance

O desenho continua obrigado a suportar 40 pipas, fixed step de 60 Hz e os budgets atuais de contato. Nenhum novo sistema pode reintroduzir loop ingênuo todos-contra-todos por frame.

## Fonte completa

Ver [`superpowers/specs/2026-10-02-hybrid-live-kite-combat-design.md`](../../superpowers/specs/2026-10-02-hybrid-live-kite-combat-design.md).
