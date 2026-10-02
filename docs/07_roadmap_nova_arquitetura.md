# 07. Roadmap da nova arquitetura

**Status:** vigente para ordenação de trabalho; não substitui o plano TDD detalhado
**Data:** 02/10/2026

## Base já preservada

As Tasks 1–7 da evolução física continuam válidas:

1. vento suave/determinístico;
2. spool/comprimento/tensão físicos;
3. atitude e aerodinâmica;
4. `KiteDynamics` como autoridade 3D;
5. inputs/manobras por intenção física;
6. materiais e fadiga estrutural;
7. abrasão por propriedades do par.

O antigo Task 8 (`LiveCombatDirector` aproximando oportunidades entre pipas) foi rejeitado como direção de produto e deve ser substituído.

## Ordem nova

1. corrigir a normalização de carga estrutural identificada no benchmark;
2. substituir `LiveCombatDirector` por `SkyWindDirector` sem target/opponent;
3. validar que vento sozinho reorganiza 15/20/40 pipas e cria contatos reais;
4. implementar `CommentGestureEngine` e anti-spam;
5. implementar `CrowdEnergy`;
6. implementar `LineDensityField` barato;
7. implementar `GiftManeuverAI` por corredor espacial, sem vítima;
8. integrar gifts por valor em moedas e buffs temporários;
9. validar múltiplos contatos por manobra sem dano sintético;
10. concluir benchmark 40 pipas, build e smoke visual.

## Gates por etapa

Nenhuma etapa pode:

- remover física validada sem teste equivalente;
- reintroduzir escrita direta de `x/y/z` em manobras;
- usar screen-space X como contato;
- criar busca ingênua todos-contra-todos por frame;
- relaxar budget para tornar teste verde.

## Depois do núcleo físico

Persistência de perfil/avatar, inventário, marketplace e customização vêm depois do núcleo híbrido estabilizado. Esses sistemas usam snapshots em memória e não participam do fixed step.

O plano TDD detalhado deve ser derivado da especificação `superpowers/specs/2026-10-02-hybrid-live-kite-combat-design.md` após a revisão formal da spec.
