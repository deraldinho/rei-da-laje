# 05. Presentes, materiais virtuais e manobras

**Status:** vigente
**Data:** 02/10/2026

Presentes têm duas responsabilidades separadas:

1. resolver um efeito temporário por valor em moedas;
2. habilitar uma inteligência temporária de manobra física.

Presentes nunca causam dano/corte diretamente.

## Valor em moedas

`totalCoinValue = unitCoinValue * repeatCount`

O nome/ícone do gift é apresentação. O direito de gameplay vem do valor total resolvido de forma idempotente.

Pacotes equivalentes em moedas devem cair no mesmo tier, salvo promoção explicitamente configurada.

Uma sequência é consumida uma vez: promoção de tier não pode conceder de novo todos os tiers inferiores.

## Buff/material temporário

O tier define apenas coeficientes virtuais de gameplay, como atrito, abrasividade, resistência à abrasão, rigidez, massa linear e resistência estrutural.
Classes como algodão, cerol, cerol de lâmpada, cerol de acrílico, cerol de pedra, cerol de cristal e chilena são rótulos de jogo. O projeto não documenta receitas, preparação ou fabricação real.

## GiftManeuverAI

Ao receber um gift elegível, `GiftManeuverAI` pode pilotar temporariamente a pipa usando somente controles físicos existentes.

Ele lê:

- vento atual;
- atitude e velocidade;
- spool, folga e tensão;
- limites da arena;
- `LineDensityField` 3D de baixa resolução.

Ele não escolhe um usuário-alvo. Avalia um conjunto pequeno e fixo de corredores fisicamente alcançáveis e escolhe a melhor oportunidade espacial.

## Retão

Retão é uma sequência de controle, não uma animação:

`aliviar linha -> orientar com o vento -> recuperar tensão -> puxar -> deixar a física executar`

Se cruzar várias linhas em câmera, cada uma ainda precisa passar pelo narrow phase 3D. Apenas contatos reais recebem abrasão.
## Outras manobras

Mergulho, laçada, aparada e futuras manobras seguem a mesma regra: planejam intenções, nunca coordenadas nem dano.

Uma manobra pode atravessar duas, três ou mais linhas no mesmo passe; o resultado continua independente por contato físico.

## Concorrência de gifts

Uma pipa possui no máximo um controlador de manobra ativo. Gifts adicionais devem ser enfileirados/mesclados conforme a regra econômica, nunca criar controladores físicos paralelos.

Quando a manobra termina, a pipa volta automaticamente ao comportamento normal governado pelo vento, mantendo qualquer buff temporário ainda válido.

## LineDensityField

É um mapa espacial barato usado apenas para planejamento. Atualiza em frequência inferior a 60 Hz e reutiliza armazenamento.

Informação desatualizada pode tornar uma manobra menos eficiente, mas nunca pode produzir contato/corte falso.
