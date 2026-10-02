# 08. Vento automático, comentários e presentes — regra vigente

**Atualizado em 02/10/2026.**

Este documento descreve a regra operacional atual da arena. Ele substitui a versão de 24/09/2026 que dizia que comentários repetidos não movimentavam a pipa e que não existia influência por chat.

## 1. Vento cria o PvP normal

O comportamento normal da arena não possui IA de perseguição. O vento global/coerente reorganiza o céu e faz as linhas entrarem em novas relações espaciais.

O futuro `SkyWindDirector` controla apenas:

- direção predominante;
- intensidade;
- envelopes de rajada;
- transições suaves;
- pequena variação vertical/local;
- turbulência global limitada por `CrowdEnergy`.

Ele nunca escolhe adversário, nunca empurra A especificamente contra B e nunca declara relinho.

## 2. Pipas respondem pela física 3D

As trajetórias emergem de:

`WindField + KiteAttitude + KiteAerodynamics + SpoolController + KiteDynamics + RopePhysics`

Não existe animação cinemática pré-pronta para voo normal. A mesma mudança de vento pode produzir respostas diferentes porque cada pipa possui posição, profundidade, velocidade, atitude, tensão, spool e fase distintos.
## 3. Comentários influenciam sem comandos fixos

Qualquer comentário válido pode gerar um gesto físico curto na pipa daquele usuário. O espectador não precisa decorar `1`, `2`, `3`, `puxar`, `soltar` ou `embicar`.

O `CommentGestureEngine` deverá considerar texto, identidade, vento, atitude, spool/tensão, novidade do comentário e densidade local de linhas para gerar apenas uma intenção limitada.

Exemplos de saída física:

- pequena liberação de linha;
- puxada curta;
- torque de desbico;
- trim de atitude;
- sequência curta de alívio + recuperação.

O comentário não define trajetória, não move coordenadas diretamente e não aplica dano.

## 4. CrowdEnergy

O conjunto dos comentários aceitos alimenta `CrowdEnergy`, limitado a `[0,1]`. Esse valor pode aumentar suavemente a atividade do céu, sem alterar regras de contato ou material.

Spam deve ser coalescido/rate-limited; 5.000 comentários não podem criar 5.000 jobs físicos no mesmo frame.

## 5. Presentes pilotam temporariamente

Depois da resolução econômica por valor em moedas, o gift pode ativar `GiftManeuverAI`.

A IA do presente pode:

- ler vento e estado mecânico da pipa;
- consultar `LineDensityField`;
- avaliar um conjunto pequeno/fixo de corredores alcançáveis;
- programar spool, torque, trim e tensão para executar a manobra.

Ela não escolhe usuário-alvo e não aplica dano direto.
## 6. Retão e outras manobras

Retão não é animação nem `damageArea()`.

A sequência é física:

`aliviar linha -> orientar com vento -> recuperar tensão -> puxar -> atravessar o espaço`

Mergulho, laçada, aparada e futuras manobras seguem a mesma regra: o sistema planeja controles e deixa a física determinar a trajetória.

## 7. Relinho verdadeiro em 3D

O combate só começa quando a geometria física da linha confirma proximidade real.

Um X na tela com separação grande em Z resulta em **zero contato e zero desgaste**.

Quando há contato válido:

`ângulo + vSlide + tensão + material + tempo de contato -> LineAbrasionModel -> desgaste localizado`

Sob sobrecarga estrutural sustentada, `LineStructuralModel` pode acumular fadiga independentemente da abrasão.

## 8. Performance

- até 40 pipas;
- fixed step a 60 Hz;
- `maxTracked <= 12`;
- `maxSolved <= 3`;
- `LineDensityField` em cadência inferior à física e armazenamento reutilizável;
- nenhuma busca ingênua por todos os pares/segmentos em cada frame.

A especificação completa está em [`superpowers/specs/2026-10-02-hybrid-live-kite-combat-design.md`](superpowers/specs/2026-10-02-hybrid-live-kite-combat-design.md).
