> **Atualização de 24/09/2026:** o modelo vigente é comentário para entrar, vento automático para movimentar e provocar relinhos, e presentes para vantagens. Comandos manuais e captura por `#pegar` descritos abaixo pertencem ao planejamento anterior. Consulte [a regra atual e os efeitos implementados](08_vento_automatico_e_presentes.md). O combate atual utiliza dano contínuo por HP; a regra antiga de corte por diferença de 25% não foi implementada.

# 🎁 02. Regras do Jogo e Integração com Presentes (TikTok Gifts)

## Tabela Formal de Presentes e Recompensas

A monetização e o engajamento da Live são integrados diretamente ao desempenho das pipas no ar:

| Presente | Custo (Moedas) | ID TikTok Típico | Multiplicador de Poder | Duração (s) | Efeito Extra | Visual da Linha / Pipa |
|---|---|---|---|---|---|---|
| **Comentário** | 0 | - | `1.0x` | Até morrer | Entrada básica | Linha branca simples (1px) |
| **Rajada de Likes** | 0 | - | `1.0x` | `30s` | `+25%` agilidade de esquiva | Rabiola com rastro brilhante |
| **Rosa** | 1 | `5655` | `1.5x` | `60s` | Quebra linha de algodão com facilidade | Linha vermelha com faíscas (2px) |
| **Donut / Sorvete** | 30 | `5827` | `3.0x` | `120s` | Quebra instantânea de linha de algodão | Linha azul fluorescente neon (2px) |
| **Capivara / TikTok** | 100 | `6064` | `2.5x` | `180s` | Escudo: sobrevive a 2 derrotas de relinho | Linha dourada + aura protetora (3px) |
| **Perfume** | 500 | `5984` | `4.0x` | Instantâneo | Puxada violenta: atrai até 3 pipas próximas | Vórtice de vento cinza ao redor da pipa |
| **Leão / Universo** | 29999+ | `6267` | `99.0x` | `30s` | Invulnerabilidade total e corte em todas as pipas que tocar | Pipa gigante com raios e vinheta na tela |

---

## Política de Buffs (Stacking e Sobrescrita)
1. **Sobrescrita de Nível**: Um presente superior (ex: Donut/Chile) sempre substitui um presente inferior (ex: Rosa/Cerol), reiniciando o cronômetro para a duração do novo presente.
2. **Soma de Tempo**: Receber o mesmo presente antes de expirar soma o tempo de duração adicional.
3. **Poderes Instantâneos**: Presentes como Perfume ou Leão ativam sua ação de impacto imediato sem cancelar a linha ativa do jogador.

---

## Regras de Engajamento e Ciclo de Vida da Live

### 1. Eliminação e Re-entrada Obrigatória
- Ao ter a linha estourada ("Tlec!"), o jogador é eliminado da partida.
- Para subir uma nova pipa, o espectador **deve enviar um novo comentário no chat**.

### 2. Pipa Avoadora / Resgate (`#pegar` ou `#aparar`)
- Pipa cortada desce rodopiando por 8 segundos.
- Qualquer espectador que digitar `#pegar` ou `#aparar` resgata a pipa e herda sua pontuação.

### 3. Badge "Rei da Laje" (Streak de Cortes)
- O jogador que alcançar **5 cortes seguidos** sem ser cortado recebe a coroa dourada do Rei da Laje e destaque no topo do placar.
