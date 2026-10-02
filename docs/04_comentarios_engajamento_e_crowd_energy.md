# 04. Comentários, engajamento e CrowdEnergy

**Status:** vigente
**Data:** 02/10/2026

Comentários não são comandos rígidos de pilotagem. O espectador não precisa decorar `1`, `2`, `3`, `puxar`, `soltar` ou `embicar`.

## CommentGestureEngine

Um comentário válido pode gerar uma intervenção física curta na pipa do autor.

Entradas consideradas:

- texto normalizado;
- identidade estável do usuário;
- vento atual;
- atitude/velocidade da pipa;
- spool, folga e tensão;
- densidade local de linhas em baixa resolução;
- novidade/qualidade de engajamento;
- estado anti-spam.

Saída permitida:

`spoolCommand`, `debicoTorque`, `trimPitch`, `tensionAssist`, intensidade e duração.

A duração normal deve ser curta e limitada. O comentário não escolhe adversário, não altera coordenadas diretamente e não causa dano.
## Qualidade de engajamento

“Comentário melhor” significa participação útil, não português formal. O score pode considerar comprimento útil, diversidade de palavras, novidade em relação às mensagens recentes, emojis/reação e repetição/spam.

Nenhum LLM externo é necessário no hot path. A transformação precisa ser determinística, barata e adequada para replay/teste.

## CrowdEnergy

Todo comentário aceito também pode alimentar um sinal global:

`CrowdEnergy ∈ [0,1]`

Ele sobe com participação válida e decai suavemente. Pode modular apenas elementos globais seguros, como amplitude de rajada, turbulência e ritmo de transição do vento.

CrowdEnergy não pode:

- aumentar dano;
- alterar material/tier;
- fabricar contato;
- criar milhares de jobs em uma rajada de chat.

Burst de comentários deve ser coalescido/rate-limited fora do fixed step de física.

## Regra de fallback

Se parsing/gesture falhar, a pipa continua normalmente sob vento e física. Falha de comentário nunca interrompe o jogo.
