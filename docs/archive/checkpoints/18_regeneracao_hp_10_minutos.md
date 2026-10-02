> **ARQUIVADO / HISTÓRICO.** Este documento registra uma etapa anterior e não define a regra vigente. Consulte [`docs/README.md`](../../README.md) e [`00_arquitetura_vigente.md`](../../00_arquitetura_vigente.md).

# Checkpoint — regeneração de HP em minutos

Data: 24/09/2026. Pedido: recuperar HP muito lentamente, em minutos.

- `frontend/src/entities/Kite.js`: regeneração fora de combate reduzida para `delta / 360` HP por frame lógico, equivalente a 1/6 HP por segundo (aproximadamente 100 HP em 10 minutos; 50 HP em 5 minutos). Anterior: 0,48 HP/s. Durante relinho não há recuperação; espera inicial de 2 segundos permanece.
- `tests/hp-regeneration.test.cjs`: expectativa da taxa atualizada, invariância entre 30/60 FPS, limite máximo de HP e bloqueio em combate.
- Validação: 28/28 testes aprovados; build de prévia em `frontend/dist-preview` aprovado. Não alterada a pasta de build de produção, nem reiniciado servidor/OBS da live corrente.
- Importante: aplicar a taxa no navegador já em execução requer mecanismo de configuração em tempo real ou atualização controlada da fonte; apenas editar arquivos não altera a lógica do cliente carregado.
