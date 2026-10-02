> **STATUS: HISTÓRICO / CHECKPOINT.** Este arquivo registra uma etapa real do desenvolvimento, mas não define sozinho a regra vigente. Em caso de conflito sobre vento, comentários, alvos, presentes, manobras, contato ou corte, prevalecem `00_arquitetura_vigente.md` e `superpowers/specs/2026-10-02-hybrid-live-kite-combat-design.md`.

# Checkpoint — equilíbrio competitivo e troca de liderança

Data: 24/09/2026. Problema relatado: a mesma pipa frequentemente ganhava e o primeiro lugar não possuía destaque.

- `Physics.js`: removido desempate por ordem A/B quando ambas as linhas rompem no mesmo frame. O excedente relativo de dano define vitória quando diferente; em igualdade, a posição geométrica da ponta em relação ao cruzamento decide, ou há empate técnico. Preservados presentes, invulnerabilidade e escudos.
- `App.js`: rotação da prioridade de verificação dos pares por frame; remoção do bônus automático de 25 HP por vitória que alimentava sequência de vitórias. Não foi implementado sorteio ou alternância artificial de vencedores.
- `gameRules.js`/`server.js`: liderança exclusiva por maior quantidade de cortes entre pipas ativas; sem líder único em empate. Mudança anunciada somente após `recordCut` confirmado pelo backend.
- `index.html`, `HUD.js`, `Kite.js`, `game.css`: anúncio grande na tela, destaque do líder no ranking, brilho dourado na pipa, faíscas e fanfarra. A coroa de cinco cortes consecutivos permanece como conquista independente.
- Os efeitos não concedem imunidade ou poder de ataque; a liderança por pontuação não altera as chances do relinho.

Validação: `npm test` com 24 testes aprovados, incluindo regressões de ruptura simultânea, desempate geométrico invertendo ordem e liderança em empate; build aprovado na rodada anterior com 23 testes, antes da adição do último teste de geometria. É necessário testar o fluxo visual no navegador/OBS e observar dezenas de cortes reais para medir a distribuição de vitórias. O conjunto de testes não garante, por si, equilíbrio estatístico em toda configuração de presentes.

Não reiniciar a sessão da porta 3000 durante a Live: a atualização do frontend requer recarregamento da fonte OBS e as mudanças de backend exigem reinício quando a transmissão puder ser interrompida. Estado em memória (pipas/ranking) é reinicializado ao reiniciar o servidor.
