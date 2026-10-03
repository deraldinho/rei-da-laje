# Live Engagement Finalization — Design Specification

Date: 2026-10-03
Status: Ready for user review
Scope: Competição de Pipa TikTok Live

## 1. Goal

Finalizar o loop principal do jogo para que qualquer interação válida de um usuário na Live gere participação mecânica visível e imediata na própria pipa.

Regra-mãe:

> Interagiu = a pipa existe e reage. Presente = reação física normal + poder especial.

O jogo deve continuar sendo físico: vento, linha, tensão, carretel, contato 3D, abrasão e corte continuam autoridades. Eventos da Live geram intenções físicas; nunca escrevem coordenadas, HP ou cortes diretamente.

## 2. Eventos que criam a pipa

Se o usuário ainda não possui uma pipa ativa, qualquer um destes eventos deve criar a pipa dele:

- comentário;
- curtida / tap-tap;
- compartilhamento;
- follow;
- presente.

A criação precisa reutilizar o mesmo fluxo canônico de `GameRules` / `player:spawn`, preservando fila e limite de pipas já existentes.
## 3. Toda interação movimenta a pipa

Depois de existir, toda nova interação do usuário deve gerar uma intenção física curta e limitada na própria pipa.

A reação base pode combinar, em intensidade limitada:

- pequena subida;
- puxar ou soltar linha;
- ajuste de tensão;
- pequeno torque de direção;
- pequena alteração de trim/pitch;
- pulso de atividade visual.

Esses efeitos passam por `PlayerIntentController`, `SpoolController`, `KiteDynamics` e `RopePhysics`. Nenhum evento da Live altera `x/y/z`, nós da corda, HP da linha ou estado de corte diretamente.

Quando não há interação, a pipa continua viva apenas por vento, inércia, tensão e física já existentes. Ela não recebe ataques ou manobras gratuitas.

## 4. Semântica por tipo de interação

**Comentário:** gera uma reação física curta usando o gesto de comentário já existente.

**Curtida/tap-tap:** curtidas são coalescidas em pulsos por usuário para evitar um passo físico por like. O pulso aumenta atividade/movimento proporcionalmente, com saturação.

**Compartilhamento:** gera um pulso físico mais forte que uma curtida comum e feedback visual próprio.

**Follow:** cria a pipa se necessário e gera uma celebração + pulso físico curto.
**Presente:** sempre gera o pulso físico normal de interação e, quando houver mapeamento, ativa também a manobra/poder especial correspondente.

Poderes especiais continuam exclusivos de presente. Curtida, comentário, share e follow nunca concedem `retao`, `despicar`, `lacada`, `aparar`, `perseguir` ou equivalentes.

## 5. Prioridade de controle

Uma única pipa nunca terá dois controladores físicos competindo ao mesmo tempo.

Prioridade:

1. manobra especial de presente;
2. gesto explícito de interação;
3. voo normal por vento/física.

Quando uma manobra termina, a pipa retorna ao voo normal. Interações recebidas durante uma manobra são coalescidas/adiadas conforme o buffer existente, sem criar um segundo controlador paralelo.

## 6. Bots de teste

Bots devem representar usuários reais, não IA de combate.

O `SimulationBotPilot` que hoje dispara automaticamente retão/despicada/lacada deve deixar de gerar manobras gratuitas.

Para testar, o painel deve emitir os mesmos tipos de evento que a Live usa: comentário, like, share, follow e presente. O resultado físico deve passar pelo mesmo fluxo de produção.

## 7. Compartilhamento

`share` já aparece no transporte TikTok, mas hoje é tratado apenas como atividade de conexão. Ele deve ser encaminhado ao gameplay com identidade do usuário quando o conector fornecer esses dados.
## 8. Linha sempre funcionalmente tensionada pelo vento

Enquanto existir vento acima do mínimo operacional do jogo, a linha não pode entrar em estado funcionalmente morto/frouxo.

A corda pode manter barriga visual e deformação XPBD natural, mas deve transmitir carga contínua entre mão e pipa.

`RopePhysics` deve combinar:

- carga de vento transversal na linha;
- carga axial quando o vento empurra a pipa para longe da mão;
- tensão geométrica da distância versus comprimento liberado;
- um piso aerodinâmico mínimo somente enquanto houver vento operacional.

Esse piso não pode criar linha, teletransportar a pipa, alterar HP diretamente ou provocar corte sozinho. Ruptura continua dependendo de sobrecarga/abrasão pelos modelos existentes.

Critério de aceitação: sob vento normal de jogo, uma pipa ociosa mantém `tension` acima do piso operacional durante a simulação; reduzir o vento a praticamente zero permite relaxamento natural.
## 9. Performance e segurança

- manter fixed step em 60 Hz;
- manter até 40 pipas;
- preservar `maxTracked <= 12`, `maxSolved <= 3` e o broad phase atual;
- não criar loop por like individual em alta frequência;
- não adicionar busca O(N²) para interação;
- reutilizar buffers e mecanismos existentes quando possível;
- qualquer falha de evento deve degradar para voo normal, nunca travar a arena.

## 10. Testes obrigatórios

TDD é obrigatório para cada fronteira alterada.

Os testes devem provar que:

- comentário, like, share, follow e gift criam uma pipa ausente;
- os mesmos eventos movimentam uma pipa já ativa por intenção física;
- like/tap-tap é coalescido e saturado sob burst;
- share chega do worker ao gameplay com identidade quando disponível;
- follow movimenta sem conceder poder especial;
- gift movimenta e também pode conceder a manobra especial mapeada;
- eventos não escrevem posição, HP ou corte diretamente;
- bots não disparam manobras especiais sozinhos;
- bot e usuário real passam pelo mesmo fluxo de interação;
- vento normal mantém a linha funcionalmente tensionada;
- vento quase zero permite relaxamento natural sem tensão artificial permanente.
## 11. Critério de pronto para abrir a Live

Cenário de aceitação principal:

1. arena vazia;
2. cinco usuários distintos interagem por tipos diferentes de evento;
3. as cinco pipas entram sem exigir comentário prévio;
4. cada nova interação produz resposta física visível na própria pipa;
5. sem novas interações, as pipas continuam vivas apenas por vento/física;
6. nenhuma manobra especial aparece gratuitamente;
7. um presente mapeado executa o poder correspondente;
8. linhas em contato real entram em relinho e desgaste pelo pipeline existente;
9. um corte canônico atualiza voada, pontuação e ranking;
10. benchmark de 40 pipas continua dentro dos gates atuais, sem exceções.

O jogo só é considerado pronto para esta etapa quando esse fluxo passa de ponta a ponta sem debugger, sem comandos administrativos escondidos e sem depender de piloto automático de combate.

## 12. Fora de escopo desta finalização

Esta etapa não redesenha economia, skins, loja, câmera, ranking ou física de abrasão já validada, salvo correção necessária para preservar o novo loop de interação. Também não cria novos poderes: usa os poderes de presente já existentes.
