# Regra vigente do jogo

**Comente para subir a pipa. O vento provoca os relinhos. Presentes dão vantagens.**

- [Vento automático e presentes: implementação atual e testes](08_vento_automatico_e_presentes.md)
- Os planos abaixo são histórico de concepção. Em caso de divergência sobre comandos, resgate ou presentes, prevalece o documento atual acima.

# 🪁 Documentação do Jogo: Rei da Laje

Toda a documentação e planos do projeto estão organizados na pasta `docs/`:

### 📚 Especificações Conceituais e Pesquisa
1. 📐 [01_arquitetura_e_conceito.md](01_arquitetura_e_conceito.md)
   - Visão geral, WebSockets, PixiJS, OBS e Ciclo de Vida do Jogador.
2. 🎁 [02_regras_e_presentes_tiktok.md](02_regras_e_presentes_tiktok.md)
   - Tabela de Presentes (Gifts), upgrades de linhas e engajamento (`#pegar`, Rei da Laje).
3. ⚔️ [03_fisica_relinho_e_audios.md](03_fisica_relinho_e_audios.md)
   - Algoritmo híbrido (Proximidade + Interseção Geométrica 2D), faíscas e efeitos de som sintetizados.
4. 📅 [04_etapas_de_implementacao.md](04_etapas_de_implementacao.md)
   - Roteiro geral das 4 etapas de desenvolvimento, checkpoints e matriz de entregáveis.
5. 🛠️ [05_plano_de_desenvolvimento_pratico.md](05_plano_de_desenvolvimento_pratico.md)
   - Guia de execução prática, comandos e workflow.
6. 🔍 [06_pesquisa_mercado_como_fazem.md](06_pesquisa_mercado_como_fazem.md)
   - Benchmarking de mercado, como plataformas e criadores estruturam as lives de pipa.

---

### 🏗️ Planos de Execução por Etapa
1. 📋 [plano_arquitetura.md](plano_arquitetura.md)
   - Plano técnico completo da Arquitetura, Monorepo, Schemas WebSocket e Painel `/admin`.
2. 🎁 [plano_regras_e_presentes.md](plano_regras_e_presentes.md)
   - Plano técnico completo de Regras do Jogo, Mapeamento de Presentes TikTok, Buff Stacking e Fila.
3. ⚔️ [plano_fisica_relinho_e_audios.md](plano_fisica_relinho_e_audios.md)
   - Plano técnico completo de Física Híbrida 2D, Faíscas PixiJS, Pipa Avoadora e Áudios Web Audio API.
4. 📅 [plano_etapas_de_implementacao.md](plano_etapas_de_implementacao.md)
   - Plano executivo de transição entre as 4 etapas, matriz de arquivos por fase e critérios de conclusão (DoD).
5. 🛠️ [plano_desenvolvimento_pratico.md](plano_desenvolvimento_pratico.md)
   - Plano prático de desenvolvimento com comando unificado `npm run dev`, ordem de escrita e setup no OBS Studio.
6. 🔍 [plano_pesquisa_mercado.md](plano_pesquisa_mercado.md)
   - Plano estratégico de benchmarking competitivo, monetização de presentes e conformidade anti-shadowban.

---

### Checkpoint atual
- [Auditoria Geral do Game: Runtime, Física Canônica, Integridade de Aparo e Estabilidade](85_auditoria_geral_do_game_runtime_e_estabilidade.md) (Auditoria concluída em 01/10/2026)
- [P15.2 Corte Canônico e Benchmark 40 Pipas](84_checkpoint_p15_2_corte_canonico_e_benchmark_40_pipas.md) (Implementado em 01/10/2026)
- [Restauração e Aprimoramento dos Efeitos de Linha e Barra de Sangue (HP) 3D e 2D](57_efeitos_linha_e_barra_de_sangue.md) (Implementado em 30/09/2026)
- [Remodelagem Orgânica e Cinematográfica do Cenário do Rio de Janeiro](56_remodelagem_organica_cenario_rio.md) (Implementado em 30/09/2026)
- [Aprimoramento Visual e Cinematográfico dos 27 Mapas 3D do Brasil](55_aprimoramento_visual_dos_mapas_3d.md) (Implementado em 29/09/2026)
- [Remoção de Código Morto, Consolidação do Render 3D e 27 Mapas Estaduais do Brasil](54_remocao_codigo_morto_e_27_mapas_estaduais.md) (Implementado em 29/09/2026)
- [Correção do Travamento das Pipas ao Disparar Manobras no Painel Admin](53_correcao_travamento_manobras_admin.md) (Implementado em 29/09/2026)
- [Auditoria Completa do Sistema: Estabilidade, Conexão, Memória, Segurança e Frontend](52_auditoria_completa_do_sistema.md) (Implementado em 29/09/2026)
- [Correção do Desaparecimento das Pipas após 600ms e Blindagem Numérica](51_correcao_desaparecimento_pipas_apos_600ms.md) (Implementado em 29/09/2026)
- [Diagnóstico e Correção da Sincronização Geral: Arena, Frontend, Admin e TikTok Live](50_correcao_sincronizacao_arena_admin_e_tiktok.md) (Implementado em 29/09/2026)
- [Aniquilação do Consumo de 5 GB de RAM, Pooling de Texturas e Otimização Total de GPU](49_aniquilacao_consumo_5gb_ram_e_pooling_texturas.md) (Implementado em 28/09/2026)
- [Otimização Máxima de GPU, Redução Drástica de RAM e Eliminação de Pipas sob a Laje](48_otimizacao_gpu_e_eliminacao_pipas_sob_laje.md) (Implementado em 28/09/2026)
- [Manobras Paulistas, Movimento por Presentes e Controles de Teclado (1, 2, 3)](47_manobras_paulistas_presentes_e_teclado.md) (Implementado em 28/09/2026)
- [Sonoplastia dos Presentes Épicos & Narração de Cortes por Voz (TTS)](46_sonoplastia_presentes_e_narrador_voz.md) (Implementado em 28/09/2026)
- [Checkpoint 45: Otimização de Memória WebGL e Estabilidade Operacional](45_checkpoint_aprovado_otimizacao_memoria_e_estabilidade.md) (Aprovado em 28/09/2026)
- [Checkpoint 40: Objetos 100% 3D e Manobras Autênticas de Relinho](40_checkpoint_aprovado_objetos_3d_e_manobras.md) (Aprovado em 27/09/2026)
- [Melhorias e validação — 24/09/2026](07_checkpoint_melhorias_2026-09-24.md)

## Ajustes e Entregas Recentes
- [Restauração e Aprimoramento dos Efeitos de Linha e Barra de Sangue (HP) 3D e 2D](57_efeitos_linha_e_barra_de_sangue.md). Restauração completa da Barra de Sangue e dos efeitos de linha: modelagem tridimensional de HP bar (`hpGroup`) com cápsula escura, borda metálica, preenchimento dinâmico de vida (`hpFill`) e ícone de sangue (`hpIcon`) pulsante em combate, estabilizada por billboard horizontal antirrotação. Linhas 3D atualizadas com renderização dual-pass aditiva (`glowLine`), núcleos e auras coloridas específicas para cada linha (Cerol, Chilena, Kevlar, Tornado, Mestre do Céu), vibração harmônica de atrito no contato e emissor 3D de faíscas incandescentes (`emitSpark3D`) e explosão estelar no corte (`emitCut3D`).
- [Remodelagem Orgânica e Cinematográfica do Cenário do Rio de Janeiro](56_remodelagem_organica_cenario_rio.md). Reconstrução visual completa do RJ: Pão de Açúcar e Morro da Urca modelados como dois monólitos graníticos orgânicos interligados com estações e cabos do Bondinho aéreo com cabine vermelha; Morro Dois Irmãos com pico duplo autêntico (Irmão Maior e Irmão Menor); Corcovado com cordilheira natural, falésia de sustentação, platô belvedere e o Cristo Redentor em posição triunfal; orla curva com praia de areia dourada e arrebentação de espuma branca; preenchimento urbano do "asfalto" ligando os morros com edifícios da Zona Sul e palmeiras imperiais; nuvens altas (Y=260-380) e achatadas com emissão solar suave sem sombras escuras na base; piso de cerâmica terracota 128x128 com rejunte realista, pingadeira de concreto na mureta e latinhas na laje.
- [Aprimoramento Visual e Cinematográfico dos 27 Mapas 3D do Brasil](55_aprimoramento_visual_dos_mapas_3d.md). Reconstrução estética dos 27 estados do país: topografia dinâmica procedural moldada por bioma (`computeMorroHeight`), aerogeradores eólicos com 3 pás girando em tempo real com o vento (`rotatingWindTurbines` em CE, RN, RS), faróis costeiros com feixe de luz giratório (`rotatingLighthouses` em BA e PB), ondulação natural de rios e baías (`waterMeshes`), vitórias-régias flutuantes na Amazônia (`waterLilies`), Cristo Redentor no topo do Corcovado e Bondinho no RJ, Ponte Estaiada com cabos dourados e helipontos em SP, Congresso Nacional completo, Catedral de Brasília e Ponte JK no DF, Elevador Lacerda na Bahia, Jardim Botânico de Curitiba e Cataratas do Iguaçu no PR, ninhos pantaneiros de Tuiuiú em MT e deques flutuantes em Bonito (MS).
- [Remoção de Código Morto, Consolidação do Render 3D e 27 Mapas Estaduais do Brasil](54_remocao_codigo_morto_e_27_mapas_estaduais.md). Eliminação da execução inútil de comandos de chat zumbis no loop do PixiJS (`applyChatAction`), desativação de renderização dupla no PixiJS (`renderable = !is3D`) deixando-o focado no HUD, e implementação tridimensional completa dos 27 estados do Brasil no Three.js, onde cada estado possui iluminação geográfica própria, silhuetas de cordilheiras e marcos 3D autênticos (arranha-céus em SP, Pelourinho em BA, Araucárias em PR/RS, Dunas e Lençóis em CE/RN/MA, Cerrado em DF/GO, Jalapão em TO, Ouro Preto em MG, Amazônia e rios no Norte, Pantanal em MT/MS e falésias no litoral).
- [Correção do Travamento das Pipas ao Disparar Manobras no Painel Admin](53_correcao_travamento_manobras_admin.md). Resolução do travamento causado pelo disparo de manobras especiais pelo `/admin.html`: eliminação do erro fatal `TypeError: null.startsWith` que quebrava o ticker do PixiJS, mapeamento completo de identificadores diretos de manobras paulistas (`retao`, `mergulho`, `despicada`, `relo_lateral`, `voadora`), persistência de direção cinemática para evitar armadilhas de oscilação de 1px e trajetória em curva U no mergulho.
- [Aniquilação do Consumo de 5 GB de RAM, Pooling de Texturas e Otimização Total de GPU](49_aniquilacao_consumo_5gb_ram_e_pooling_texturas.md). Resolução definitiva do consumo de 5 GB de RAM em transmissões contínuas sob utilização máxima: descarte atômico de texturas no PixiJS (`PIXI.Texture.removeFromCache` e `texture.destroy(true)` em `Kite.destroy()`, `RooftopPlayer.destroy()` e `GiftShowcase.removeEffect()`), cache unificado de decalques no Three.js (`_kiteDecalTextureCache`) compartilhando a mesma CanvasTexture entre pipa e boneco, desativação de sombras em mais de 600 malhas estáticas do cenário (mantendo `castShadow = true` apenas em bonecos e pipas ativas), bloqueio de processamento 2D invisível em `Line.js`, `Tail.js` e `SparkEmitter.js` em modo 3D, pooling de ruído no Web Audio API (`getNoiseBuffer`) e garbage collection preventiva periódica com `textureGC.run()`.
- [Otimização Máxima de GPU, Redução Drástica de RAM e Eliminação de Pipas sob a Laje](48_otimizacao_gpu_e_eliminacao_pipas_sob_laje.md). Forçamento de GPU dedicada via WebGL (`powerPreference: 'high-performance'`, `preserveDrawingBuffer: false`, `stencil: false`), eliminação do render Three.js duplicado que executava duas vezes por frame, aceleração direta por camadas de hardware CSS nos canvas (`transform: translateZ(0)`), correção do spawn de pipas para nascer no céu acima da laje, clamp vertical nas teclas `2` e `3`, e descarte imediato de pipas cortadas ao tocarem o horizonte da laje com vida reduzida para 3.5s.
- [Manobras Paulistas, Movimento por Presentes e Controles de Teclado (1, 2, 3)](47_manobras_paulistas_presentes_e_teclado.md). Alinhamento com a gíria paulista (Retão na Rosa, Mergulho de bico pro chão no Donut, Relo Lateral na Capivara, Despicada no Sentido do Vento com Perfume e Mestre do Céu no Leão). Exclusividade de movimentação por presentes na live (chat desativado para movimento), e controles de teclado `1` (Puxar), `2` (Soltar) e `3` (Despicada no Vento) com seleção de pipa por clique do mouse no canvas.
- [Sonoplastia dos Presentes Épicos & Narração de Cortes por Voz (TTS)](46_sonoplastia_presentes_e_narrador_voz.md). Síntese procedural de áudio Web Audio API para todos os presentes (Rosa/Cerol, Donut/Chilena, Capivara/Escudo, Perfume/Tornado, Leão/Mestre do Céu e Decolagem/Subida), somada a um motor inteligente de narração ao vivo por voz em pt-BR com rotação de bordões autênticos de pipa, anúncios prioritários e controle independente `#btnVoice` na interface.
- [Otimização de Memória WebGL e Correção de Vazamentos de RAM](44_otimizacao_memoria_webgl_e_correcao_leaks.md). Eliminação da causa-raiz do consumo de 4 GB de RAM: identificador imutável em `FallingKite`, descarte estrutural de recursos Three.js (`disposeHierarchy` e `disposeMaterial`), pools e caches de geometrias compartilhadas para pipas e bonecos, limitação de `pixelRatio` a 1.25, redução de sombras no casario e método `destroy()`.
- [Correção de Botões Sobrepostos e Alinhamento do Design UI](43_correcao_botoes_sobrepostos_e_alinhamento_ui.md). Reposicionamento dos controles de transmissão no header, desobstrução total do rodapé com todos os 6 presentes visíveis sem reticências, alinhamento do boost de agilidade e supressão de tags no chão da laje.
- [Dispersão 3D Orgânica, Variedade de Modelos e Cenografia da Laje](42_dispersao_3d_variedade_pipas_e_cenografia.md). Eliminação do grid com 3 faixas de profundidade aérea Z, micro-deriva de vento, modelos 3D de Pipa Raia e Peixinho, hierarquia de opacidade das linhas em combate, fumaça de churrasqueira e cadeiras de praia na laje.
- [Refinamento Visual 3D e Detalhes Culturais no Three.js](41_refinamento_visual_3d_e_detalhes_culturais.md). Modelagem de diedro nas pipas, estampas tradicionais cariocas (corte e recorte), bonecos chibi com diversidade de pele, bermudas e bonés, head-tracking dinâmico olhando para o céu, óculos Juliet espelhados para o Rei e líderes, subwoofer pulsante e bando de andorinhas no horizonte.
- [Manobras Reais de Relinho de Pipa e Objetos 100% 3D no Three.js](39_manobras_reais_pipa_e_ambiente_3d.md). Arquitetura de pipas 3D, bonecos chibi com carretilha giratória na laje e física das manobras tradicionais brasileiras.
- [Auditoria geral do projeto e Painel de Reset da Arena](32_painel_de_reset_e_auditoria.md). Sistema mestre de reset e limpeza da arena para OBS e painel dev.
