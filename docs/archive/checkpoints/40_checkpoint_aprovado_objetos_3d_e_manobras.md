> **ARQUIVADO / HISTÓRICO.** Este documento registra uma etapa anterior e não define a regra vigente. Consulte [`docs/README.md`](../../README.md) e [`00_arquitetura_vigente.md`](../../00_arquitetura_vigente.md).

# Checkpoint 40 · Aprovado: Objetos 100% 3D e Manobras Autênticas de Relinho

**Data de Aprovação**: 27/09/2026  
**Status**: Homologado e Aprovado pelo Usuário  
**Referência Técnica**: [`docs/39_manobras_reais_pipa_e_ambiente_3d.md`](39_manobras_reais_pipa_e_ambiente_3d.md)

---

## 1. Escopo Entregue e Validado

1. **Eliminação da Sobreposição 2D**:
   - Resolução definitiva do conflito gráfico entre PixiJS e Three.js via `sync3DDisplay()`.
   - Remoção dos bonecos de palitinho e losangos planos antigos no modo 3D.
   - Preservação da nitidez cristalina do HUD (Leaderboard TOP 5, avisos de corte, banners de liderança, contadores de HP e guia de presentes).

2. **Todos os Objetos em 3D Volumétrico Nativo (Three.js)**:
   - **Pipas 3D Cariocas**: Seda losango com bambu central, fibra arqueada transversal, cabresto tridimensional, decalque com foto de perfil e rabiola dinâmica ondulando em 12 nós com fitilhos coloridos.
   - **Bonecos Chibi da Laje 3D**: Modelados com pés, chinelos Havaianas na laje de madeira, bermuda, regata personalizada na cor da pipa, boné virado para trás, braço com carretilha giratória em tempo real, braço articulado puxando a linha em ritmo de manobra e pulo comemorativo nos cortes.
   - **Linhas Catenárias 3D**: Curvatura física catenária com 16 pontos de flexão conectando a mão/carretilha do boneco à pipa, com cores correspondentes ao tipo de linha (algodão, cerol, chilena, kevlar, tornado e mestre do céu).
   - **Efeitos Especiais 3D**: Escudo esférico holográfico para proteção e vórtice cilíndrico rotativo para tornado.
   - **Pipas Avoadoras e Faíscas 3D**: Queda helicoidal e centelhas incandescentes no ponto de contato.

3. **Manobras Tradicionais de Pipa Pesquisadas e Implementadas**:
   - *Retão Seco*, *Despique/Desbicar*, *Tenteio*, *Largada*, *Mergulho Parafuso*, *Aparada por Baixo*, *Aparada de Bico* e *Laçada de Cerol*.

---

## 2. Indicadores de Qualidade e Conformidade

- **Testes Unitários Automatizados**: 130 de 130 testes aprovados (`npm test`, 100% de sucesso).
- **Testes Visuais em Resolução Real (1440 × 2560 Vertical 2K)**:
  - Validado via headless browser em `tests/evidence/portrait-1440x2560.png`.
  - Ausência total de erros no console do navegador e zero alocações por frame (prevenção de GC pause).
- **Build de Produção e Servidor**: `npm run build` gerado e pronto para transmissão no OBS Studio.
