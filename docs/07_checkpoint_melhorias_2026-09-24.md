> **STATUS: HISTÓRICO / CHECKPOINT.** Este arquivo registra uma etapa real do desenvolvimento, mas não define sozinho a regra vigente. Em caso de conflito sobre vento, comentários, alvos, presentes, manobras, contato ou corte, prevalecem `00_arquitetura_vigente.md` e `superpowers/specs/2026-10-02-hybrid-live-kite-combat-design.md`.

# Checkpoint — melhorias do jogo de pipa
Data: 24/09/2026

## Entrega
Mantidos Node.js, Express, Socket.io, Vite e PixiJS. Não houve troca de engine.
- Nova interface Rei da Laje: placar Top 5, instruções, estado da conexão, contador e bônus de curtidas.
- Layout vertical e horizontal, controles de som, modo transparente por `?overlay=1` e controles ocultos por `?controls=0`.
- Cenário procedural com céu, sol, nuvens e casario; sem dependência de fontes externas.
- Dano de relinho proporcional ao tempo do frame (base 60 FPS); delta limitado para evitar saltos após suspensão.
- Combate exige proximidade de até 120 px e cruzamento das linhas. Proteção durante a subida e nos primeiros 3 segundos.
- Escudo restaura HP ao absorver derrota; dois Mestres do Céu não se cortam mutuamente.
- Fila sem usuários duplicados; cortes inválidos/repetidos não geram pontos nem liberam vaga.
- Presente inferior não substitui superior; combos somam duração e escudos (limites: 1000 unidades/evento e 24h de duração).
- Frontend utiliza o evento de buff com cor, espessura e escudos enviados pelo backend.
- Curtidas ativam 25% de agilidade de movimento por 30 segundos, com aviso visual.
- Redimensionamento atualiza pipas e âncoras após o resize do renderer.
- Limite de 350 partículas, descarte de filhos dos objetos removidos e limpeza dos cooldowns expirados.
- Nomes do chat tratados como texto no placar, feed e logs; logs limitados a 150.
- Painel admin remove da seleção os jogadores cortados.

## Arquivos
Backend: `server.js`, `tiktokService.js`, `rules/gameRules.js`, `rules/buffManager.js`, `views/admin.html`.
Frontend: `index.html`, `src/ui/game.css`, `HUD.js`, `SkyScene.js`, `engine/App.js`, `Physics.js`, `entities/Kite.js`, `SparkEmitter.js`.
Verificação: `package.json`, `tests/regression.test.cjs`, `tests/browser-smoke.mjs`.
Build atualizado em `frontend/dist`.

## Validação
- Antes da correção: 8 falhas reproduzidas em 9 testes.
- Depois: 9/9 testes aprovados em `npm test`.
- `npm run build`: aprovado. Avisos preexistentes de API CJS do Vite e bundle acima de 500 kB.
- Teste Edge headless em servidor isolado, porta 3107: carregamento, 40 pipas, proteção contra HTML em nomes, combo Capivara, curtidas, resize vertical, transparência e combate sem exceções.
- Evidências em `tests/evidence/`, incluindo `browser-report.json` e screenshots.
- Essa verificação não certifica 60 FPS sustentados no OBS: a medição headless é apenas uma amostra.
- Reexecutar o teste visual: `node tests/browser-smoke.mjs` (requer Edge no caminho padrão; portas 3107 e 9337 livres).

## Execução
O processo existente na porta 3000 foi preservado. Para carregar as alterações de backend, encerre a execução anterior no terminal correspondente e rode `npm start` na raiz do projeto.
Tela do jogo: http://localhost:3000/
Painel: http://localhost:3000/admin
OBS transparente sem botões: http://localhost:3000/?overlay=1&controls=0
Em desenvolvimento: `npm run dev`; abra o frontend em http://localhost:5173/ para HMR.
Ative o som pelo botão na tela; navegadores podem exigir interação antes de liberar áudio.

## Limitações e próximos trabalhos
Este checkpoint não representa conclusão de todas as etapas dos planos.
1. O motor continua local ao navegador: falta autoridade única, snapshot/reconexão e sincronização de múltiplas telas. Use uma única tela de jogo; admin é separado.
2. `#pegar` ainda é um efeito visual e não transfere pontuação no backend.
3. Perfume/Tornado e preservação da linha de base em habilidades especiais ainda precisam implementação conforme o plano.
4. Consumo de escudo é local; presentes posteriores podem restaurar escudos já consumidos porque o backend ainda não recebe esse consumo.
5. A implementação atual mantém dano contínuo por HP, divergindo da regra documental de corte instantâneo por diferença de 25%.
6. Falta teste em TikTok Live real, verificação dos IDs de presentes e teste prolongado no OBS.
7. Administração e eventos continuam sem autenticação; não publicar este servidor diretamente na internet.

## Recuperação
Backup pré-alteração: `backups/pipa-backup-20260924-183008.zip`.
Para restaurar: pare o servidor, extraia o backup na pasta do projeto e rode `npm run build`.
Novos arquivos exclusivos deste checkpoint podem permanecer sem uso após restauração.
A pasta não é um repositório Git; nenhum commit foi criado.
