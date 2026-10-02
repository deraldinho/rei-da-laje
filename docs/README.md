# Documentação — Competição de Pipa TikTok Live

## Regra vigente do projeto

> **O vento cria o PvP normal. Comentários influenciam a pipa. Presentes pilotam a pipa. A física decide o resultado.**

O jogo atual é um free-for-all vertical para TikTok Live com até 40 pipas simultâneas. Não existe seleção normal de alvo, perseguição automática, duelo obrigatório ou dano direto por comentário/presente.

A movimentação visual deve emergir da física 3D existente: vento, atitude, inércia, carretilha, folga, tensão e corda XPBD. Um cruzamento visual 2D só vira relinho quando o narrow phase confirma proximidade real em X/Y/Z.

## Leia primeiro

1. [`00_arquitetura_vigente.md`](00_arquitetura_vigente.md) — resumo operacional da arquitetura atual.
2. [`01_arquitetura_e_conceito.md`](01_arquitetura_e_conceito.md) — componentes e fluxo de dados atualizados.
3. [`02_regras_e_presentes_tiktok.md`](02_regras_e_presentes_tiktok.md) — regras atuais de comentários, gifts, buffs e manobras.
4. [`08_vento_automatico_e_presentes.md`](08_vento_automatico_e_presentes.md) — comportamento do vento, comentário e presente.
5. [`superpowers/specs/2026-10-02-hybrid-live-kite-combat-design.md`](superpowers/specs/2026-10-02-hybrid-live-kite-combat-design.md) — especificação arquitetural completa.
6. [88_arquitetura_hibrida_vento_comentarios_presentes.md](88_arquitetura_hibrida_vento_comentarios_presentes.md) — checkpoint cronológico da mudança de arquitetura.

## Física atual preservada

A nova arquitetura não remove o trabalho já validado de física:

- `WindField` e vento suave/coerente;
- `KiteAttitude` e `KiteAerodynamics`;
- `SpoolController` e `RopePhysics` XPBD;
- autoridade 3D de `KiteDynamics`;
- broad phase/narrow phase de linhas;
- `LineContactManager` com orçamento limitado;
- `LineAbrasionModel` e materiais virtuais;
- fadiga estrutural e ruptura localizada;
- pipa voada, linha rompida e fluxo canônico de corte.
## Interação vigente

### Comentários
Comentários não exigem comandos mágicos. O objetivo da nova arquitetura é transformar texto/engajamento em uma intenção física curta via `CommentGestureEngine`, com anti-spam e limites.

### Presentes
A economia é resolvida por valor total em moedas. O gift pode conceder material/buff temporário e habilitar `GiftManeuverAI`, que planeja controles físicos — nunca dano direto.

### Vento
O comportamento normal da arena é governado pelo `SkyWindDirector`: mudanças suaves de direção, rajadas e variação local reorganizam o céu e criam cruzamentos de linha sem escolher adversários.

## Documentos históricos

Os documentos numerados registram checkpoints reais do desenvolvimento. Eles **não devem ser usados isoladamente como regra atual** quando entrarem em conflito com os cinco documentos da seção “Leia primeiro”.

Exemplos de mecânicas históricas substituídas:

- comandos obrigatórios `1/2/3`, `puxar`, `soltar`, `embicar` para espectadores;
- perseguição/seleção de alvo por distância;
- manobras que escreviam X/Y diretamente;
- cruzamento 2D suficiente para dano;
- gift com dano/corte automático;
- `LiveCombatDirector` aproximando pares específicos.

Esses arquivos são preservados como histórico de implementação e diagnóstico, não como contrato vigente.

## Especificações e planos Superpowers

- **Vigente:** `superpowers/specs/2026-10-02-hybrid-live-kite-combat-design.md`.
- **Vigente para contato/abrasão:** `superpowers/specs/2026-10-01-relinho-abrasion-physics-design.md`.
- **Parcialmente vigente:** `superpowers/specs/2026-10-01-live-assisted-kite-progression-design.md` apenas para economia, identidade, persistência e marketplace; sua parte de controle/LiveCombatDirector foi substituída.
- `superpowers/plans/2026-10-01-physical-kite-line-system.md` documenta Tasks 1–7 implementadas e o Task 8 antigo; o Task 8 deve ser substituído no próximo plano pela arquitetura híbrida.

## Gate técnico permanente

- até 40 pipas;
- física fixa a 60 Hz;
- `maxTracked <= 12`;
- `maxSolved <= 3`;
- sem varredura ingênua todos-contra-todos de segmentos por frame;
- sem I/O de banco/rede dentro do loop físico;
- sem relaxar benchmark para fazer feature passar.
