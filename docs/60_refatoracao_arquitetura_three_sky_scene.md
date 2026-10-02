> **STATUS: HISTÓRICO / CHECKPOINT.** Este arquivo registra uma etapa real do desenvolvimento, mas não define sozinho a regra vigente. Em caso de conflito sobre vento, comentários, alvos, presentes, manobras, contato ou corte, prevalecem `00_arquitetura_vigente.md` e `superpowers/specs/2026-10-02-hybrid-live-kite-combat-design.md`.

# Documento 60: Refatoração Modular e Arquitetura Limpa da ThreeSkyScene

## 1. Visão Geral
A cena 3D WebGL do jogo (`ThreeSkyScene.js`), que anteriormente concentrava mais de **6.640 linhas de código monolítico**, foi integralmente refatorada e decomposta em uma arquitetura modular orientada a domínios de responsabilidade única dentro de `frontend/src/ui/three/`.

Adicionalmente, atendendo ao requisito explícito de modularização geográfica, **cada um dos 27 estados do Brasil possui agora seu próprio arquivo de cenário isolado**, eliminando aglomerações e permitindo personalização independente de relevos, monumentos e adereços culturais.

---

## 2. Estrutura Modular Implementada

```
frontend/src/ui/
├── ThreeSkyScene.js                      <- Fachada / Orquestrador Central limpo
└── three/
    ├── ThreeMaterials.js                 <- Texturas Canvas, Materiais e Descarte WebGL
    ├── ThreeLaje.js                      <- Laje frontal, piso cerâmico, caixas e churrasqueira
    ├── ThreeCharacters.js                <- 40 bonecos 3D, head-tracking, óculos, carretilha
    ├── ThreeKites.js                     <- Modelos 3D de pipas, rabiola Verlet, barra HP, queda
    ├── ThreeLines.js                     <- Linhas 3D dinâmicas, tensão, faíscas e corte
    └── themes/
        ├── ThemeLandmarks.js             <- Monumentos 3D reutilizáveis (Cristo, Ponte, etc.)
        ├── ThemeRegistry.js              <- Registro mapeando UF aos 27 construtores
        ├── ThreeThemeManager.js          <- Domo celeste, sol, névoa, relevo e iluminação
        └── states/                       <- 27 ARQUIVOS SEPARADOS (1 POR ESTADO)
            ├── ThemeAC.js                <- Acre (Seringueiras, selva e pontes)
            ├── ThemeAL.js                <- Alagoas (Maragogi e falésias do Gunga)
            ├── ThemeAP.js                <- Amapá (Marco Zero do Equador e Rio Amazonas)
            ├── ThemeAM.js                <- Amazonas (Teatro Amazonas, vitórias-régias)
            ├── ThemeBA.js                <- Bahia (Farol da Barra, Elevador Lacerda)
            ├── ThemeCE.js                <- Ceará (Dunas de Jericoacoara, jangadas)
            ├── ThemeDF.js                <- Distrito Federal (Congresso, Catedral, Ponte JK)
            ├── ThemeES.js                <- Espírito Santo (Convento da Penha, baía)
            ├── ThemeGO.js                <- Goiás (Chapada dos Veadeiros, cerrado)
            ├── ThemeMA.js                <- Maranhão (Lençóis Maranhenses e lagoas)
            ├── ThemeMT.js                <- Mato Grosso (Pantanal Norte, tuiuiú)
            ├── ThemeMS.js                <- Mato Grosso do Sul (Bonito e deque)
            ├── ThemeMG.js                <- Minas Gerais (Ouro Preto barroca, ipês)
            ├── ThemePA.js                <- Pará (Baía do Guajará, barco gaiola)
            ├── ThemePB.js                <- Paraíba (Farol do Cabo Branco)
            ├── ThemePR.js                <- Paraná (Jardim Botânico de Curitiba, Cataratas)
            ├── ThemePE.js                <- Pernambuco (Olinda colonial, recifes)
            ├── ThemePI.js                <- Piauí (Serra da Capivara, Pedra Furada)
            ├── ThemeRJ.js                <- Rio de Janeiro (Cristo, Pão de Açúcar, Dois Irmãos)
            ├── ThemeRN.js                <- Rio Grande do Norte (Genipabu, aerogeradores)
            ├── ThemeRS.js                <- Rio Grande do Sul (Pampas, galpão, cata-vento)
            ├── ThemeRO.js                <- Rondônia (Forte Príncipe da Beira)
            ├── ThemeRR.js                <- Roraima (Monte Roraima tepui, savana)
            ├── ThemeSC.js                <- Santa Catarina (Serra do Rio do Rastro)
            ├── ThemeSP.js                <- São Paulo (Megalópole, Ponte Estaiada)
            ├── ThemeSE.js                <- Sergipe (Cânions do Xingó, Rio São Francisco)
            └── ThemeTO.js                <- Tocantins (Jalapão, fervedouro)
```

---

## 3. Principais Módulos e Responsabilidades

### 3.1. `ThreeMaterials.js`
- Texturas geradas proceduralmente em Canvas 2D sem consumo de requisições HTTP (piso de cerâmica 128x128 com variações térmicas, tijolos, telhas coloniais, névoa atmosférica, padrões de papel de seda de pipa).
- Cache unificado de texturas de decalque de avatar (`_kiteDecalTextureCache`) e sprites de nickname.
- Utilitários de desalocação profunda de memória GPU (`disposeMaterial`, `disposeHierarchy`) protegendo recursos marcados como `userData.isShared`.
- Tabela imutável de cores de linha (`LINE_COLORS`).

### 3.2. `ThreeLaje.js`
- Mureta frontal com beiral cerâmico e pingadeira de concreto.
- Caixas d'água 1000L nos cantos da laje com paletes e tampas salientes.
- Churrasqueira de alvenaria com emissor de partículas de fumaça animadas.
- Caixa de som potente com subwoofer pulsante sincronizado ao ritmo da música e configurável pelo painel admin (`setBoombox`).
- Adereços culturais dinâmicos de primeiro plano adaptados ao estado selecionado.

### 3.3. `ThreeCharacters.js`
- Gerenciamento de até 40 jogadores posicionados na laje sem sobreposição.
- *Head-tracking* cinemático em tempo real: o boneco direciona a cabeça e o olhar para a posição exata de sua pipa no céu.
- Braço direito animado puxando a linha dinamicamente em sincronia com manobras de retão e tenteio.
- Carretilha 3D em rotação proporcional à velocidade do vento e folga de linha.
- Óculos Juliet atribuídos aos detentores de sequência de vitórias (streak >= 2), líder ou rei.
- Coroa dourada em 3D e salto de comemoração ao registrar cortes de adversários.

### 3.4. `ThreeKites.js`
- Modelos 3D de pipas tradicionais, raias e peixinhos com curvatura diédrica realista.
- Vareta de bambu central e vareta transversal arqueada de fibra de vidro.
- Cabresto 3D e rabiola dinâmica simulada com física de Verlet em cadeia com fitilhos coloridos vibrando ao vento.
- Efeitos volumétricos especiais: Campo de força Kevlar translúcido, vórtice de Tornado e aura dourada de liderança.
- Barra de sangue (HP) tridimensional com transição cromática (verde -> amarelo -> vermelho) e pulsação em estado crítico.
- Gerenciador de pipas cortadas em queda livre com descarte imediato ao atingirem a linha da mureta da laje.

### 3.5. `ThreeLines.js`
- Curvas catenárias dinâmicas em 3D conectando a mão direita de cada boneco ao cabresto de sua respectiva pipa.
- Efeito de afrouxamento (slack) e vibração por atrito de relinho.
- Sistema de partículas de faíscas incandescentes em 3D com flash de corte estelar em alta velocidade.

### 3.6. `themes/ThemeLandmarks.js`
- Coleção centralizada de monumentos arquitetônicos e geográficos de destaque nacional:
  - Cristo Redentor e ombro rochoso do Corcovado.
  - Ponte Estaiada Octávio Frias de Oliveira.
  - Congresso Nacional e Catedral Metropolitana de Brasília.
  - Estufa de ferro e vidro do Jardim Botânico de Curitiba.
  - Elevador Lacerda Art-Déco e Farol da Barra com feixe de luz rotativo.
  - Vitórias-régias flutuantes na bacia amazônica.
  - Aerogeradores com pás giratórias sincronizadas à velocidade do vento.

### 3.7. `themes/states/*.js` (27 Arquivos Estaduais)
- Cada cenário estadual possui função dedicada `buildThemeXX(group, theme, ctx)` contendo topografia, vegetação nativa e monumentos autênticos daquela unidade federativa.
- `ThemeRegistry.js` orquestra a seleção instantânea sem redundância de código.

### 3.8. `ThreeSkyScene.js` (Fachada Concisa)
- Fachada ultraleve (~600 linhas) que implementa a API pública consumida pelo `App.js` e mantém conformidade com 100% dos testes automatizados.
- Sincronização limpa de entidades delegando as transformações espaciais aos subcomponentes correspondentes.

---

## 4. Validação e Qualidade de Código

1. **Suíte Completa de Testes**:
   ```bash
   npm test
   # ℹ tests 185
   # ℹ suites 0
   # ℹ pass 185
   # ℹ fail 0
   ```
2. **Compilação de Produção Vite**:
   ```bash
   npm run build
   # ✓ built in 5.39s (Zero erros ou warnings de resolução)
   ```
3. **Consumo de Memória e Ciclo de Vida**:
   - Destruição e recriação de temas não vazam *draw calls* ou *textures* GPU.
   - Recursos compartilhados (`isShared: true`) permanecem intactos nos pools de cache.
   - Texturas de avatares antigos são purgadas automaticamente pelo `purgeTextureCache`.
