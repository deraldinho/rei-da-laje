# 06. Operação TikTok, OBS e estabilidade

**Status:** vigente
**Data:** 02/10/2026

Este documento reúne as regras operacionais que antes estavam espalhadas por dezenas de checkpoints.

## TikTok

- conexão e reconexão pertencem ao backend;
- eventos devem passar pelo normalizador antes das regras de jogo;
- comentários, gifts, likes e identidade não entram diretamente no loop físico;
- reconnect/replay não pode duplicar gift, buff ou entrada de jogador;
- avatar/username são dados de apresentação; identidade persistente deve usar `userId` estável.

## Arena

- até 40 pipas ativas;
- fila mantém um único registro por usuário;
- a arena deve continuar funcionando se a live cair temporariamente;
- estados de sessão podem continuar usando snapshot local durante a migração;
- falha de TikTok não pode congelar Three.js/Pixi ou a física.

## OBS

O jogo é servido como fonte vertical de navegador. Deploys e reinícios de backend devem evitar reload desnecessário da fonte quando a sessão estiver saudável.
## Performance e degradação

Quando houver sobrecarga, degradar primeiro efeitos visuais e frequência de atualizações não críticas. Não reduzir a correção do contato físico para mascarar performance.

Gates permanentes:

- fixed step 60 Hz;
- benchmark real com 40 pipas;
- zero exceções não tratadas;
- `maxTracked <= 12`;
- `maxSolved <= 3`;
- sem alocação não limitada no hot path.

## Painel admin

Controles manuais `puxar`, `soltar`, `embicar`, teclas `1/2/3` e disparos diretos podem existir como **ferramentas de teste/admin**, mas não definem a experiência pública da live.

O admin deve usar a mesma interface física (`PlayerIntentController`) e nunca alterar posição ou dano diretamente.

## Falha segura

Se comentário, gift planner, CrowdEnergy, avatar ou catálogo falharem, o voo normal continua. Se o banco futuro falhar, não inventar recompensas persistentes; manter o combate em memória.
