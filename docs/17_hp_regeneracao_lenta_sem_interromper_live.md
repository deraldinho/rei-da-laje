# Checkpoint — regeneração muito lenta de HP para favorecer cortes

Data: 24/09/2026. Sintoma relatado: relinhos sem vencedores, HP recupera entre encontros.

- `frontend/src/entities/Kite.js`: regeneração fora de combate reduzida de 0,3 para 0,008 HP por delta (aprox. 18 → 0,48 HP por segundo a 60 FPS; 37,5 vezes mais lenta). Durante o combate permanece suspensa; máximo de HP mantido. Atraso após contato continua 2 segundos.
- `tests/hp-regeneration.test.cjs`: verifica taxa exata de regeneração, consistência entre 30 e 60 FPS, ausência durante combate e limite máximo.
- `npm test`: 28/28 aprovados; Vite compilou em `frontend/dist-preview` sem modificar o build de produção em `frontend/dist`. Avisos de Vite CJS e bundle >500 KB persistem.
- O código de física também prevê empate técnico em rompimento simultâneo. Regeneração menor não garante vencedor nesse caso específico; observar o combate em Live para decidir correção adicional sem favorecimento da ordem de entrada.

IMPORTANTE: transmissão ativa não foi reiniciada, fonte OBS não foi recarregada e arquivos da versão servida não foram substituídos. A nova taxa ainda NÃO foi aplicada ao navegador da Live em execução; para troca sem reset de pipas será preciso mecanismo de configuração runtime ou snapshot/hidratação de arena e validação em ensaio. Não prometer atualização imediata sem esse mecanismo.
