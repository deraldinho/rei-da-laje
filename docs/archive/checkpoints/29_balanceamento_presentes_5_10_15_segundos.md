> **ARQUIVADO / HISTÓRICO.** Este documento registra uma etapa anterior e não define a regra vigente. Consulte [`docs/README.md`](../../README.md) e [`00_arquitetura_vigente.md`](../../00_arquitetura_vigente.md).

# Checkpoint 29 — tabela final de benefícios por presentes (5, 10 e 15 segundos)

Data: 24/09/2026 — x99, projeto Rei da Laje. Pedido atualizado: benefícios curtos, tipo 5s/10s/15s; a orientação de no mínimo 1 minuto foi substituída.

| Presente | Vantagem | Duração por presente | Teto acumulado | Força/configuração atual |
| --- | --- | ---: | ---: | --- |
| Rosa / Flor | Cerol + retão | 5 s | 15 s | Cerol: multiplicador de corte 1,5x; retão: alcance base 140, dano adicional 1,12x |
| Donut | Linha chilena + despicada | 10 s | 20 s | Chilena: multiplicador de corte 3x; despicada: alcance base 165, dano adicional 1,16x |
| Capivara | Kevlar + aparada no retão | 15 s | 30 s | Kevlar: multiplicador 2,5x e 2 escudos por presente; aparada: defesa 0,65x |
| Perfume | Tornado + perseguição | 10 s | 20 s | Tornado atrai até 3 pipas elegíveis; perseguição com alcance base 230 |
| Leão / Universo | Proteção (invulnerabilidade temporária) + aparada na despicada | 15 s | 30 s | Aparada: defesa 0,6x; proteção especial com expiração independente da linha |

O teto vale para tempo restante do mesmo efeito, não para cada evento cumulativo individual: envio repetido soma até o máximo, sem acumular horas. A animação de celebração dura entre 1 e 3 segundos; a vantagem ativa e a pose da manobra permanecem pelos segundos acima. Presentes desconhecidos têm animação determinística, mas não recebem força ou duração de gameplay automaticamente.

## Alterações implementadas

- `backend/rules/giftConfig.js`: novos prazos, limites de combo e descrições; Flor reutiliza Rosa, Universo reutiliza Leão pelo nome (nenhum ID de Universo é presumido).
- `backend/rules/buffManager.js`: ambos os tipos de benefício (linha e especiais) passam a respeitar duração inicial e teto por presente, inclusive combos de grande repetição; restauração de checkpoint antigo restringe tempos legados para os limites atuais; mantidos os escudos existentes e a independência entre linha e especiais.
- `frontend/src/engine/Maneuvers.js` e `frontend/src/entities/Kite.js`: retão 5/15, despicada 10/20, aparada retão 15/30, perseguição 10/20, aparada despicada 15/30. Reenvio da mesma manobra acrescenta apenas tempo remanescente até o teto; outra manobra substitui a anterior, sem duração sem limite.
- `frontend/src/engine/GiftAnimations.js`: celebração de cada presente de 1 a 3 segundos, sem abreviar benefício.
- `backend/arenaLiveState.js`, `frontend/src/engine/ArenaCheckpoint.js`: snapshot limita manobras a 30 segundos e mantém expiração absoluta quando reconecta; sem renovar tempo por reload.
- Testes anteriores da regra abandonada de 60s atualizados; novos testes cobrem duração, repetição, alias Universo, teto de restauração, animação e visual da arena.

## Validações e deploy

- RED reproduzido antes de corrigir: testes falharam com 60s/120s/180s e ausência de Universo.
- `npm test`: 57/57 passaram após implementação.
- `node --check backend/server.js`: passou. Vite build de `frontend/dist-preview`: passou (`assets/index-CtKi5jL_.js`, `assets/index-Cfhll_NJ.css`; aviso não bloqueante de tamanho do bundle).
- `node tests/browser-smoke.mjs`: passou em navegador de teste independente na porta 3107, com autoconexão TikTok desativada: 40 pipas, cap de manobra Capivara, eventos de presentes, HP, ranking e recuperação sem exceções.

**Não houve deploy da nova duração para `frontend/dist`, reinício do backend principal na porta 3000 ou atualização da fonte OBS.** A versão publicada anteriormente permanece em execução até uma atualização controlada do usuário; backend e frontend devem ser ativados juntos para os novos tempos ficarem consistentes.
