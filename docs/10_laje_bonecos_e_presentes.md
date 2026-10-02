> **STATUS: HISTÓRICO / CHECKPOINT.** Este arquivo registra uma etapa real do desenvolvimento, mas não define sozinho a regra vigente. Em caso de conflito sobre vento, comentários, alvos, presentes, manobras, contato ou corte, prevalecem `00_arquitetura_vigente.md` e `superpowers/specs/2026-10-02-hybrid-live-kite-combat-design.md`.

# Checkpoint — laje elevada, participantes e legibilidade

Data: 24/09/2026.

- Laje frontal elevada para 58 px e âncora da linha movida para `altura - 62`, inclusive após resize.
- Cada pipa ativa recebe um boneco palito na própria âncora da linha. A cabeça exibe a foto TikTok quando a URL HTTP(S) está disponível, com inicial como alternativa visual.
- Ao eliminar uma pipa, o boneco correspondente é removido e destruído; os bonecos acompanham alterações de tamanho da tela.
- Feed dos presentes e cortes ampliado para 14–20 px com maior contraste, padding e largura.
- Mantido o motor de vento, os eventos atuais, a proteção de spawn e a regra de entrada por comentário.

Validação: `npm test` (18 testes aprovados); `npm run build` aprovado com avisos preexistentes do Vite sobre API CJS e bundle acima de 500 kB. A nova composição dos bonecos requer verificação visual no OBS com os rostos reais da Live. Reinicie o servidor se estiver executando uma versão anterior e recarregue a página para receber o novo build.
