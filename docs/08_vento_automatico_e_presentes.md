# Regra atual — comentário, vento e presentes
Atualizado em 24/09/2026 conforme orientação do usuário. Este documento substitui as instruções anteriores de combate por comandos.

## Ciclo de participação
1. Qualquer comentário cria uma pipa se o usuário não estiver ativo. Tela cheia: fila única por usuário.
2. Comentários repetidos não criam cópias e não concedem poder de combate.
3. Vento variável conduz as pipas. Não existem comandos de puxar, soltar ou embicar para espectadores.
4. Proximidade de até 120 px e cruzamento real das linhas iniciam o relinho.
5. Ao ser cortado, o jogador precisa comentar novamente para voltar.
6. Presente sem pipa não cria entrada: o efeito fica disponível até expirar e é aplicado se houver comentário nesse intervalo.
7. A antiga captura por #pegar foi retirada desta dinâmica. Esse texto agora vale como comentário normal.

## Presentes cadastrados
| Presente | Vantagem | Duração base |
|---|---|---|
| Rosa / Flor | Cerol, poder 1,5x | 60 s |
| Donut | Chile, poder 3x | 120 s |
| Capivara | Kevlar, poder 2,5x e 2 escudos | 180 s |
| Perfume | Redemoinho que atrai até 3 pipas em raio de 300 px; poder mínimo 4x durante efeito | 3 s |
| Leão | Invulnerabilidade e corte ao cruzar linha adversária elegível; pipa ampliada | 30 s |

Perfume e Leão são efeitos independentes, preservando a linha base. Dois jogadores invulneráveis não se cortam. O redemoinho aproxima, mas não sorteia nem concede cortes sem cruzamento. Escudos salvam da derrota normal e restauram a linha; Leão ignora escudos durante o corte especial.
Combos somam duração; Capivara soma escudos. O consumo é informado ao backend pelo cliente único e duplicatas com a mesma contagem são ignoradas.
Uma linha inferior não substitui uma superior; presentear com item inferior durante esse período não adiciona vantagem. Itens não cadastrados não recebem efeito inventado.
Os IDs permanecem os já existentes no projeto e precisam ser conferidos numa live real.

## Implementação e validação
- Voo em `frontend/src/engine/Wind.js`: correntes periódicas compartilhadas, fases individuais e rajadas; sem sorteio recorrente de destinos.
- `Kite.js` consome o vento e mantém os temporizadores dos efeitos visuais.
- `buffManager.js` mantém linha e efeitos especiais separados; fila também recebe os buffs válidos ao entrar.
- `tiktokService.js` transforma todo comentário em tentativa de entrada, sem emitir ações de combate.
- Tela e admin explicam o modelo automático e os presentes.
- Backup anterior em `backups/pipa-before-wind-*.zip`.
- 17 testes aprovados em `npm test`, incluindo vento gerando cruzamentos/cortes reais sem comandos e limite de 3 alvos no redemoinho.
- Build aprovado; avisos de API CJS do Vite e tamanho do bundle permanecem.
- Edge headless: 40 pipas, layout vertical, presentes, movimento sem comando, término do redemoinho, proteção independente, transparência e ausência de exceções.
- Evidências: `tests/evidence/`. O teste usa porta 3107, sem alterar a sessão da porta 3000.

## Ativação e limites
Reinicie o processo antigo com `npm start` na raiz e recarregue a tela para usar frontend e backend desta versão juntos.
A execução existente na porta 3000 foi preservada.
Ainda falta autoridade única no servidor para múltiplas telas/reconexão, além de validação no TikTok Live real e teste prolongado no OBS. Use uma única tela de jogo e o admin separado.
O backend ainda recebe resultados de combate do navegador e não constitui validação antitrapaça. Não publicar diretamente as rotas administrativas na internet.
