# 02. Regras atuais — TikTok, comentários e presentes

**Atualizado em 02/10/2026.** Este documento substitui as tabelas antigas baseadas principalmente no nome do gift e qualquer regra de dano/corte automático.

## Princípios

1. Qualquer comentário válido pode colocar o usuário na arena conforme capacidade/fila.
2. O combate normal acontece pelo vento e pela física, sem seleção automática de adversário.
3. Comentários influenciam a própria pipa através de gestos físicos curtos; não exigem `1/2/3` ou palavras mágicas.
4. Presentes concedem efeitos temporários resolvidos principalmente pelo **valor total em moedas** e podem ativar uma manobra física inteligente.
5. Comentário e gift nunca aplicam dano diretamente.
6. Desgaste/corte só acontece após contato real entre linhas confirmado em 3D.

## Valor de gift

O valor canônico do pacote é:

`totalCoinValue = unitCoinValue * repeatCount`

Exemplos:

- 1 Rosa de 1 moeda -> valor 1;
- 10 Rosas de 1 moeda -> valor 10;
- 30 Rosas de 1 moeda -> valor 30;
- 1 gift de 30 moedas -> mesmo direito de gameplay que um pacote total de 30 moedas, salvo regras promocionais explicitamente configuradas.

O nome/ícone do presente continua sendo usado para celebração e UI, mas não deve ser a unidade principal da economia.
## Promoção de tier e duração

A sequência é resolvida uma única vez. O sistema não pode conceder simultaneamente todos os buffs inferiores e mais um buff promovido pelo mesmo valor.

Exemplo:

- valor 1: tier base configurado;
- valor acumulado abaixo do próximo threshold: estende tempo conforme política do tier;
- valor que alcança um threshold superior: promove para o tier correspondente;
- o tempo do novo tier é calculado pela regra configurada, sem dupla contagem do valor já consumido.

Os thresholds e durações serão configuráveis. O código de física não deve conhecer preços de TikTok.

## Materiais virtuais

Os tiers de linha são classes de gameplay. Podem incluir:

- algodão;
- cerol;
- cerol de lâmpada;
- cerol de acrílico;
- cerol de pedra;
- cerol de cristal;
- chilena;
- outras classes virtuais aprovadas.

Cada classe só armazena coeficientes de simulação, como atrito, abrasividade, resistência à abrasão, rigidez, massa linear e resistência estrutural. O projeto não documenta receitas ou fabricação real.

## Gift + manobra

Um pacote de gift resolvido pode ativar `GiftManeuverAI`. O efeito de gift tem duas responsabilidades separadas:

1. aplicar o buff/material temporário correspondente ao valor;
2. solicitar uma manobra física, como retão, mergulho, laçada ou aparada.
A IA da manobra não escolhe uma vítima. Ela consulta vento, estado mecânico e `LineDensityField` para encontrar um corredor espacial fisicamente alcançável com alta oportunidade de cruzar linhas.

No retão, por exemplo:

`amostrar vento -> aliviar linha -> ganhar orientação -> recuperar tensão -> puxar -> deixar a física executar a passagem`

Se a trajetória cruzar cinco linhas na câmera, mas somente duas entrarem no raio real de contato 3D, apenas essas duas entram no pipeline de relinho.

## Comentários

Comentários comuns não são comandos rígidos. O texto, identidade, estado atual da pipa, vento e anti-spam alimentam o futuro `CommentGestureEngine`, que emite uma intervenção curta e limitada.

Um comentário pode produzir pequenas combinações de:

- spool/puxada/alívio;
- torque de desbico;
- trim de atitude;
- assistência limitada de tensão.

O comentário nunca define coordenadas nem escolhe adversário.

## CrowdEnergy

Comentários aceitos também podem aumentar um sinal global de engajamento limitado a `[0,1]`. Ele pode deixar o céu mais ativo alterando de forma segura rajadas e transições do vento, mas nunca aumenta dano/material nem força contato.

## Idempotência

Sequências de gifts do TikTok podem chegar com `repeatCount` acumulado. O backend deve finalizar e contabilizar cada sequência uma única vez, usando IDs/eventos canônicos quando disponíveis. Reconexão ou replay não pode duplicar buff, tempo, moeda virtual ou manobra.

## Autoridade do resultado

`Gift/Comment -> Intent -> KiteDynamics -> RopePhysics -> contato 3D -> abrasão/fadiga -> ruptura`

Nenhum estágio anterior ao contato físico pode declarar corte ou subtrair HP de outro jogador.
