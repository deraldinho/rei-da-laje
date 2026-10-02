> **STATUS: HISTÓRICO / CHECKPOINT.** Este arquivo registra uma etapa real do desenvolvimento, mas não define sozinho a regra vigente. Em caso de conflito sobre vento, comentários, alvos, presentes, manobras, contato ou corte, prevalecem `00_arquitetura_vigente.md` e `superpowers/specs/2026-10-02-hybrid-live-kite-combat-design.md`.

# Ajuste de ritmo dos relinhos — 24/09/2026
## Problema observado
Com poucas pipas, a amplitude de voo separava os participantes e o raio fixo de 120 px dificultava encontros em telas grandes. O dano em contato já era rápido; o gargalo era encontrar e manter contato.
## Correção
- Com 2 a 4 pipas: correntes horizontais/verticais mais rápidas, resposta ao vento maior e rajadas periódicas que concentram o voo.
- Com 5 ou mais: preservada a movimentação anterior para não concentrar ainda mais uma arena cheia.
- Raio de contato proporcional à menor dimensão: 18%, limitado a 120–220 px.
- Mantidos cruzamento real das linhas, subida protegida, HP e vantagens dos presentes.
- Não houve mudança no backend. Recarregue a tela do jogo para carregar o novo build.
## Medição reproduzível
Teste em `tests/pace.test.cjs`: 12 sementes por combinação de resolução e quantidade (2, 6 e 20 pipas), 30 passos por segundo, janela de 60 segundos. Casos sem evento recebem 60 segundos no cálculo. Inclui regeneração aproximada; exclui subida/proteção e considera pipas sem presentes.
| Tela | Primeiro encontro antes/depois (2 pipas) | Primeiro corte antes/depois |
|---|---|---|
| 390×844 | 8,32 → 2,74 s | 26,39 → 9,77 s |
| 1080×1920 | 17,89 → 3,10 s | 50,49 → 10,99 s |
| 1920×1080 | 13,24 → 2,97 s | 49,93 → 15,19 s |
São médias simuladas, não prazo garantido para cada partida real.
## Validação
18 testes aprovados, build de produção aprovado e smoke test no Edge com 40 pipas.
Arquivos: `Wind.js`, `Kite.js`, `App.js`, `tests/pace.test.cjs`.
Backup prévio: `backups/pipa-before-pace-*.zip`.
A regra deste documento substitui o raio fixo descrito no checkpoint 08.

## Revisão solicitada: ritmo intermediário
O usuário considerou a versão anterior rápida demais. A evolução das correntes e o deslocamento passaram a 60% da velocidade anterior. Raio, geometria de contato, dano e proteção de subida foram preservados. Testes: 18 aprovados; build aprovado. Em duelos simulados, primeiro contato médio passou de aproximadamente 3 s para 4,6–5,2 s (sem subida). Primeiro corte: 10,2–16,3 s. Médias não são garantias de tempo por partida.
Nova direção para presentes recebida, ainda incompleta: presentes executam manobras (retão, dispicada, perseguir e aparar em retão/dispicada) com dano e quantidade de alvos conforme valor; Rosa deve atingir 1 pipa. A mensagem terminou em “se for”; aguarda complemento para fechar a tabela e implementar. Efeitos anteriores permanecem até essa definição.
