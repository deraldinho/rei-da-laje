# 08. Persistência, perfil e economia

**Status:** arquitetura separada do núcleo físico
**Data:** 02/10/2026

Este sistema não participa do fixed step de 60 Hz.

## Identidade

- chave externa estável: TikTok `userId`;
- `uniqueId/@username` e nickname são mutáveis;
- avatar é cacheado localmente e atualizado de forma assíncrona;
- falha de avatar não impede entrada na arena.

## Persistência prevista

Backend local com SQLite (`node:sqlite`) e WAL, armazenando:

- usuários;
- avatares/cache;
- progressão;
- pipas/skins possuídas;
- loadout persistente;
- gift ledger;
- estatísticas relevantes.

A simulação recebe um snapshot em memória no spawn; nunca consulta SQLite por frame.
## Gift ledger

Cada sequência finalizada deve ser registrada de forma idempotente antes de conceder valor persistente/temporário. Reconexão, replay ou atualizações acumuladas de `repeatCount` não podem duplicar entitlement.

A unidade econômica canônica interna é `unitCoinValue/totalCoinValue`, não o nome do gift nem um campo externo interpretado fora do resolver.

## Permanência

Podem ser persistentes:

- skins;
- modelos de pipa aprovados;
- cosméticos;
- progressão;
- propriedade de pipa personalizada.

Buffs de combate por gift continuam temporários, salvo regra explícita em contrário.

## Mercado

O mercado é configurável e separado da física. Valor compra entitlement; a física continua usando um conjunto aprovado de parâmetros para evitar que visual/customização crie propriedades arbitrárias.

A especificação detalhada de economia/persistência está em [`superpowers/specs/2026-10-02-persistence-economy-design.md`](superpowers/specs/2026-10-02-persistence-economy-design.md).
