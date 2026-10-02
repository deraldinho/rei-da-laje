# 00. Arquitetura vigente — Competição de Pipa TikTok Live

**Data:** 02/10/2026
**Status:** fonte resumida vigente para gameplay, física e integração da live

## Regra central

> **O vento cria o PvP normal. Comentários influenciam a pipa. Presentes pilotam a pipa. A física decide o resultado.**

O jogo combina três responsabilidades sem misturá-las:

1. **Live 2D automática:** o vento reorganiza o céu e cria oportunidades de cruzamento.
2. **Mecânica 3D de pipa:** atitude, vento aparente, spool, folga, tensão, inércia e corda determinam o movimento.
3. **Física experimental de linha:** apenas contato 3D verdadeiro produz relinho, abrasão, fadiga e ruptura.

Não existe alvo fixo, perseguição automática, duelo obrigatório, trajetória roteirizada ou dano direto por comentário/gift.

## Fluxo normal

`SkyWindDirector -> WindField -> KiteDynamics -> RopePhysics -> contato 3D -> abrasão/fadiga -> ruptura`

O vento é o diretor do PvP comum. Ele nunca escolhe um oponente específico.
## Comentários

`comment -> anti-spam/engagement -> CommentGestureEngine -> PlayerIntentController -> física`

Comentários comuns não exigem comandos secretos. Eles geram intervenções físicas curtas e limitadas.

## Presentes

`gift -> valor em moedas -> buff/material -> GiftManeuverAI -> PlayerIntentController -> física`

A IA de gift procura corredores espaciais com alta densidade de linhas; nunca escolhe um jogador-alvo e nunca aplica dano diretamente.

## Autoridade física

- `KiteDynamics`: posição, velocidade e atitude.
- `SpoolController`/`RopePhysics`: comprimento, folga, tensão e geometria da corda.
- broad/narrow phase: contato real em X/Y/Z.
- `LineAbrasionModel`: desgaste por contato.
- `LineStructuralModel`: fadiga/sobrecarga.
- `LineBreakSystem`: ruptura localizada.

## Fontes formais

- [`superpowers/specs/2026-10-02-hybrid-live-kite-combat-design.md`](superpowers/specs/2026-10-02-hybrid-live-kite-combat-design.md)
- [`superpowers/specs/2026-10-01-relinho-abrasion-physics-design.md`](superpowers/specs/2026-10-01-relinho-abrasion-physics-design.md)
- [`superpowers/specs/2026-10-02-persistence-economy-design.md`](superpowers/specs/2026-10-02-persistence-economy-design.md)
