# Live Engagement Finalization â€” Design Specification

Date: 2026-10-03
Status: Approved
Scope: CompetiÃ§Ã£o de Pipa TikTok Live

## 1. Goal

Finalizar o loop principal do jogo para que qualquer interaÃ§Ã£o vÃ¡lida de um usuÃ¡rio na Live gere participaÃ§Ã£o mecÃ¢nica visÃ­vel e imediata na prÃ³pria pipa.

Regra-mÃ£e:

> Interagiu = a pipa existe e reage. Presente = reaÃ§Ã£o fÃ­sica normal + poder especial.

O jogo deve continuar sendo fÃ­sico: vento, linha, tensÃ£o, carretel, contato 3D, abrasÃ£o e corte continuam autoridades. Eventos da Live geram intenÃ§Ãµes fÃ­sicas; nunca escrevem coordenadas, HP ou cortes diretamente.

## 2. Eventos que criam a pipa

Se o usuÃ¡rio ainda nÃ£o possui uma pipa ativa, qualquer um destes eventos deve criar a pipa dele:

- comentÃ¡rio;
- curtida / tap-tap;
- compartilhamento;
- follow;
- presente.

A criaÃ§Ã£o precisa reutilizar o mesmo fluxo canÃ´nico de `GameRules` / `player:spawn`, preservando fila e limite de pipas jÃ¡ existentes.
## 3. Toda interaÃ§Ã£o movimenta a pipa

Depois de existir, toda nova interaÃ§Ã£o do usuÃ¡rio deve gerar uma intenÃ§Ã£o fÃ­sica curta e limitada na prÃ³pria pipa.

A reaÃ§Ã£o base pode combinar, em intensidade limitada:

- pequena subida;
- puxar ou soltar linha;
- ajuste de tensÃ£o;
- pequeno torque de direÃ§Ã£o;
- pequena alteraÃ§Ã£o de trim/pitch;
- pulso de atividade visual.

Esses efeitos passam por `PlayerIntentController`, `SpoolController`, `KiteDynamics` e `RopePhysics`. Nenhum evento da Live altera `x/y/z`, nÃ³s da corda, HP da linha ou estado de corte diretamente.

Quando nÃ£o hÃ¡ interaÃ§Ã£o, a pipa continua viva apenas por vento, inÃ©rcia, tensÃ£o e fÃ­sica jÃ¡ existentes. Ela nÃ£o recebe ataques ou manobras gratuitas.

## 4. SemÃ¢ntica por tipo de interaÃ§Ã£o

**ComentÃ¡rio:** gera uma reaÃ§Ã£o fÃ­sica curta usando o gesto de comentÃ¡rio jÃ¡ existente.

**Curtida/tap-tap:** curtidas sÃ£o coalescidas em pulsos por usuÃ¡rio para evitar um passo fÃ­sico por like. O pulso aumenta atividade/movimento proporcionalmente, com saturaÃ§Ã£o.

**Compartilhamento:** gera um pulso fÃ­sico mais forte que uma curtida comum e feedback visual prÃ³prio.

**Follow:** cria a pipa se necessÃ¡rio e gera uma celebraÃ§Ã£o + pulso fÃ­sico curto.
**Presente:** sempre gera o pulso fÃ­sico normal de interaÃ§Ã£o e, quando houver mapeamento, ativa tambÃ©m a manobra/poder especial correspondente.

Poderes especiais continuam exclusivos de presente. Curtida, comentÃ¡rio, share e follow nunca concedem `retao`, `despicar`, `lacada`, `aparar`, `perseguir` ou equivalentes.

## 5. Prioridade de controle

Uma Ãºnica pipa nunca terÃ¡ dois controladores fÃ­sicos competindo ao mesmo tempo.

Prioridade:

1. manobra especial de presente;
2. gesto explÃ­cito de interaÃ§Ã£o;
3. voo normal por vento/fÃ­sica.

Quando uma manobra termina, a pipa retorna ao voo normal. InteraÃ§Ãµes recebidas durante uma manobra sÃ£o coalescidas/adiadas conforme o buffer existente, sem criar um segundo controlador paralelo.

## 6. Bots de teste

Bots devem representar usuÃ¡rios reais, nÃ£o IA de combate.

O `SimulationBotPilot` que hoje dispara automaticamente retÃ£o/despicada/lacada deve deixar de gerar manobras gratuitas.

Para testar, o painel deve emitir os mesmos tipos de evento que a Live usa: comentÃ¡rio, like, share, follow e presente. O resultado fÃ­sico deve passar pelo mesmo fluxo de produÃ§Ã£o.

## 7. Compartilhamento

`share` jÃ¡ aparece no transporte TikTok, mas hoje Ã© tratado apenas como atividade de conexÃ£o. Ele deve ser encaminhado ao gameplay com identidade do usuÃ¡rio quando o conector fornecer esses dados.
## 8. Linha sempre funcionalmente tensionada pelo vento

Enquanto existir vento acima do mÃ­nimo operacional do jogo, a linha nÃ£o pode entrar em estado funcionalmente morto/frouxo.

A corda pode manter barriga visual e deformaÃ§Ã£o XPBD natural, mas deve transmitir carga contÃ­nua entre mÃ£o e pipa.

`RopePhysics` deve combinar:

- carga de vento transversal na linha;
- carga axial quando o vento empurra a pipa para longe da mÃ£o;
- tensÃ£o geomÃ©trica da distÃ¢ncia versus comprimento liberado;
- um piso aerodinÃ¢mico mÃ­nimo somente enquanto houver vento operacional.

Esse piso nÃ£o pode criar linha, teletransportar a pipa, alterar HP diretamente ou provocar corte sozinho. Ruptura continua dependendo de sobrecarga/abrasÃ£o pelos modelos existentes.

CritÃ©rio de aceitaÃ§Ã£o: sob vento normal de jogo, uma pipa ociosa mantÃ©m `tension` acima do piso operacional durante a simulaÃ§Ã£o; reduzir o vento a praticamente zero permite relaxamento natural.
## 9. Performance e seguranÃ§a

- manter fixed step em 60 Hz;
- manter atÃ© 40 pipas;
- preservar `maxTracked <= 12`, `maxSolved <= 3` e o broad phase atual;
- nÃ£o criar loop por like individual em alta frequÃªncia;
- nÃ£o adicionar busca O(NÂ²) para interaÃ§Ã£o;
- reutilizar buffers e mecanismos existentes quando possÃ­vel;
- qualquer falha de evento deve degradar para voo normal, nunca travar a arena.

## 10. Testes obrigatÃ³rios

TDD Ã© obrigatÃ³rio para cada fronteira alterada.

Os testes devem provar que:

- comentÃ¡rio, like, share, follow e gift criam uma pipa ausente;
- os mesmos eventos movimentam uma pipa jÃ¡ ativa por intenÃ§Ã£o fÃ­sica;
- like/tap-tap Ã© coalescido e saturado sob burst;
- share chega do worker ao gameplay com identidade quando disponÃ­vel;
- follow movimenta sem conceder poder especial;
- gift movimenta e tambÃ©m pode conceder a manobra especial mapeada;
- eventos nÃ£o escrevem posiÃ§Ã£o, HP ou corte diretamente;
- bots nÃ£o disparam manobras especiais sozinhos;
- bot e usuÃ¡rio real passam pelo mesmo fluxo de interaÃ§Ã£o;
- vento normal mantÃ©m a linha funcionalmente tensionada;
- vento quase zero permite relaxamento natural sem tensÃ£o artificial permanente.
## 11. CritÃ©rio de pronto para abrir a Live

CenÃ¡rio de aceitaÃ§Ã£o principal:

1. arena vazia;
2. cinco usuÃ¡rios distintos interagem por tipos diferentes de evento;
3. as cinco pipas entram sem exigir comentÃ¡rio prÃ©vio;
4. cada nova interaÃ§Ã£o produz resposta fÃ­sica visÃ­vel na prÃ³pria pipa;
5. sem novas interaÃ§Ãµes, as pipas continuam vivas apenas por vento/fÃ­sica;
6. nenhuma manobra especial aparece gratuitamente;
7. um presente mapeado executa o poder correspondente;
8. linhas em contato real entram em relinho e desgaste pelo pipeline existente;
9. um corte canÃ´nico atualiza voada, pontuaÃ§Ã£o e ranking;
10. benchmark de 40 pipas continua dentro dos gates atuais, sem exceÃ§Ãµes.

O jogo sÃ³ Ã© considerado pronto para esta etapa quando esse fluxo passa de ponta a ponta sem debugger, sem comandos administrativos escondidos e sem depender de piloto automÃ¡tico de combate.

## 12. Fora de escopo desta finalizaÃ§Ã£o

Esta etapa nÃ£o redesenha economia, skins, loja, cÃ¢mera, ranking ou fÃ­sica de abrasÃ£o jÃ¡ validada, salvo correÃ§Ã£o necessÃ¡ria para preservar o novo loop de interaÃ§Ã£o. TambÃ©m nÃ£o cria novos poderes: usa os poderes de presente jÃ¡ existentes.

## 11. Poderes sem efeito real ficam desativados

Nenhum poder, buff visual ou habilidade automÃ¡tica pode aparecer como gameplay ativo se nÃ£o produzir um efeito mecÃ¢nico real e testado.

- poderes nÃ£o mapeados para uma manobra fÃ­sica vÃ¡lida devem ser no-op no combate;
- efeitos legados sem impacto verificÃ¡vel nÃ£o devem ser anunciados como habilidade ativa;
- bots nÃ£o podem disparar esses poderes automaticamente;
- HUD/feedback sÃ³ pode anunciar poder quando a aÃ§Ã£o correspondente realmente entrar no controlador fÃ­sico;
- presentes sem poder especÃ­fico continuam gerando apenas o pulso fÃ­sico normal de interaÃ§Ã£o.

CritÃ©rio de aceitaÃ§Ã£o: todo poder exibido durante a Live deve ter teste que comprove uma alteraÃ§Ã£o fÃ­sica observÃ¡vel, ou entÃ£o permanecer desativado.
