> **ARQUIVADO / HISTÓRICO.** Este documento registra uma etapa anterior e não define a regra vigente. Consulte [`docs/README.md`](../../README.md) e [`00_arquitetura_vigente.md`](../../00_arquitetura_vigente.md).

# 56 · Remodelagem Orgânica e Cinematográfica do Cenário do Rio de Janeiro

**Data:** 30/09/2026  
**Status:** Concluído, Integrado, Construído e 100% Validado (**178/178 testes aprovados**)  
**Módulos Atualizados:**
- `frontend/src/ui/ThreeSkyScene.js`
- `dist/` (Bundle Vite minificado de produção)
- `docs/` (Documentação arquitetural indexada)

---

## 1. Visão Geral da Entrega

A partir do diagnóstico visual da cena do Rio de Janeiro (RJ), foram implementados integralmente todos os 6 pilares de modernização estética solicitados pelo usuário ("todos"):

1. **Geometria Orgânica dos Monólitos e Montanhas Cariocas**:
   - **Pão de Açúcar & Morro da Urca**: Substituição do antigo esferóide isolado por dois monólitos graníticos interligados (*inselbergs* arredondados). O Morro da Urca (`(165, 32, -535)`) atua como patamar intermediário e o Pão de Açúcar monumental (`(255, 58, -570)`) ergue-se com topo de granito esculpido.
   - **O Bondinho Suspenso**: Cabos de sustentação aéreos em aço esticados entre as estações do Morro da Urca e o cume do Pão de Açúcar, com a clássica cabine vermelha suspensa no trajeto.
   - **Morro Dois Irmãos**: Substituição do antigo cone pontudo por dois picos graníticos autênticos em escala decrescente (**Irmão Maior** e **Irmão Menor**), contornados por saias de floresta tropical.
   - **Corcovado & Cristo Redentor**: Eliminação do cone piramidal em favor de uma cordilheira montanhosa natural do Maciço da Tijuca, encimada por um pilar de falésia granítica vertical, platô belvedere de observação panorâmica e o Cristo Redentor em posição triunfal de braços abertos sobre a cidade.
   - **Montanhas Distantes (`buildDistantMountains`)**: Troca de cones pontiagudos por cúpulas hemisféricas suaves (`SphereGeometry` com topo arredondado), reproduzindo a silhueta da Serra do Mar e Serra dos Órgãos.

2. **Perspectiva Atmosférica & Iluminação Carioca**:
   - Eliminação do cinza-carvão escuro (`rockMat` = `0x474a4d`) que causava aspecto recortado de papelão escuro contra o céu.
   - Criação de novos materiais compartilhados:
     - `rioGraniteMat`: Granito ardósia com dispersão azulada atmosférica (`0x6b8f9e`);
     - `rioSlopeJungleMat`: Manto verdejante de Mata Atlântica tropical úmida (`0x1d4d31`);
     - `distantTerrainMat`: Ajuste dinâmico em RJ para ardósia atmosférica (`0x5a8399`), integrando perfeitamente a linha do horizonte à `scene.fog`.

3. **Orla da Praia Curva & Espelho d'Água Vivo**:
   - **Praia em Meia-Lua**: Arco litorâneo de areia dourada quente (`rioSandMat` = `0xeedbb0`) margeando a enseada da Baía de Guanabara de ponta a ponta.
   - **Linha de Arrebentação**: Faixa branca de espuma do mar (`rioSurfMat`) onde as ondas encontram a areia.
   - **Embarcações na Baía**: Veleiro de regata com mastreação branca e escuna tradicional de passeio com toldo azul navegando em direções opostas na baía.

4. **Preenchimento do "Vão" Urbano entre os Morros ("O Asfalto")**:
   - Eliminação do vazio geométrico preto no centro da cena.
   - Inclusão de 18 blocos residenciais litorâneos da Zona Sul (Copacabana, Botafogo e Flamengo) em tons marfim e areia com janelas reflexivas e platibandas.
   - Coqueiros e palmeiras imperiais ao longo da orla marítima, conectando harmoniosamente as encostas da favela ao litoral.

5. **Nuvens Altas, Achatadas e com Luz Solar Quente**:
   - Elevação da altitude das nuvens para Y = 260 a 380, liberando integralmente a área de combate aéreo das pipas.
   - Modelagem de cúmulos autênticos (*cumulus humilis*) com bases horizontais achatadas (`scale(r * 2.1, r * 0.65, r * 1.35)`).
   - Inclusão de emissão luminosa quente solar (`emissive: 0xfff5e6, emissiveIntensity: 0.38`), eliminando as manchas acinzentadas e sujas na base das nuvens.

6. **Piso Cerâmico Terracota Genuíno na Laje**:
   - Textura procedimental em alta resolução (128x128) com grade 4x4 de lajotas cerâmicas terracota cozidas, rejunte de argamassa escura (`#3a322d`), chanfros de relevo com luz e sombra e porosidade cerâmica.
   - Adição de pingadeira lisa de concreto (`lajeParapetCap`) no topo da mureta da laje.
   - Latinhas de refrigerante/cerveja geladas pousadas na mureta da laje, enriquecendo o realismo cultural do ambiente.

---

## 2. Garantias Arquiteturais e Desempenho

- **Otimização de GPU & RAM**: Todos os novos elementos utilizam geometrias compartilhadas e materiais com `userData = { isShared: true }`.
- **Prevenção de Sombras Ociosas**: Todas as novas malhas estáticas declaram explicitamente `castShadow = false`, mantendo `castShadow = true` unicamente em bonecos e pipas ativas.
- **Taxa de Quadros Cravada em 60 FPS**: Zero alocações de vetores ou objetos no loop contínuo de `update()`.
- **Integridade dos Testes**: Preservação das 10 asserções estritas do teste de vazamento de memória (`tests/memory-leak-texture-cleanup.test.cjs`), aprovando 178 de 178 testes.

---

## 3. Validação Técnica

```bash
npm test
ℹ tests 178
ℹ suites 0
ℹ pass 178
ℹ fail 0
ℹ duration_ms 1360.4028

npm run build
✓ 525 modules transformed.
dist/index.html                     5.94 kB
dist/assets/index-CJHCwnNe.css     22.35 kB
dist/assets/index-BcPp01cj.js   1,310.83 kB
✓ built in 5.52s
```
