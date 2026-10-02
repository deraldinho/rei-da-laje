> **ARQUIVADO / HISTÓRICO.** Este documento registra uma etapa anterior e não define a regra vigente. Consulte [`docs/README.md`](../../README.md) e [`00_arquitetura_vigente.md`](../../00_arquitetura_vigente.md).

# Checkpoint 45 · Aprovado: Otimização de Memória WebGL e Estabilidade Operacional

**Data de Aprovação**: 28/09/2026  
**Status**: Homologado e Aprovado pelo Usuário  
**Referência Técnica**: [`docs/44_otimizacao_memoria_webgl_e_correcao_leaks.md`](44_otimizacao_memoria_webgl_e_correcao_leaks.md)

---

## 1. Escopo Homologado e Validado

1. **Eliminação da Causa-Raiz do Consumo de 4 GB de RAM**:
   - Correção de identificador instável em `FallingKite.js`: `this.id` agora é imutável durante toda a vida da pipa avoadora, eliminando a multiplicação de 60 modelos 3D criados por segundo por corte de pipa.
   - Reutilização suave da mesma malha 3D durante toda a trajetória de queda até o chão.
   - Limpeza e destruição de timers internos (`catchInterval`) no método `destroy()`.

2. **Descarte Estrutural Profundo de Recursos WebGL (`disposeHierarchy` e `disposeMaterial`)**:
   - Implementação de rotinas universais de liberação de memória de GPU e heap C++ do Chromium.
   - Liberação explícita de `geometry.dispose()`, `material.dispose()` e `texture.dispose()` ao remover:
     - Pipas ativas cortadas (`kites3D`).
     - Bonecos de jogadores que saíram da laje (`players3D`).
     - Linhas 3D de combate desfeitas (`lines3D`).
     - Pipas avoadoras ao tocarem o solo ou expirarem (`fallingKites3D`).
     - Limpeza geral da arena ao acionar o painel de reset (`handleArenaReset`).

3. **Pools e Compartilhamento de Geometrias e Materiais (`userData.isShared: true`)**:
   - As formas das pipas (tradicional, raia e peixinho), varetas centrais de bambu, curvaturas de fibra de vidro, cabrestos, membros dos bonecos, bonés, óculos Juliet e carretilhas agora vêm de pools compartilhados em cache estático.
   - Redução de mais de 90% na taxa de alocação de novos buffers na GPU, mantendo a identidade visual autêntica.

4. **Limpeza Incondicional da Fila de Avoadoras**:
   - O ciclo de limpeza de `fallingKites3D` agora executa em todos os quadros, inclusive quando a lista esvazia completamente (`fallingKitesList.length === 0`), garantindo zero retenção órfã de objetos na cena.

5. **Teto de Pixel Ratio e Otimização de Sombras para OBS Studio**:
   - `pixelRatio` do Three.js e `resolution` do PixiJS limitados a no máximo `1.25`, prevenindo a explosão de alocação de framebuffers em monitores e transmissões 4K/HiDPI.
   - Supressão de `castShadow` em detalhes microscópicos da favela (pilares, caixas d'água, varais e folhas de palmeira), mantendo sombras nas grandes massas de alvenaria e nas pipas no céu, reduzindo significativamente a carga de GPU draw calls.

6. **Método `destroy()` na Classe `ThreeSkyScene`**:
   - Mecanismo completo para fechamento e liberação de contexto WebGL, texturas procedurais e renderizadores.

---

## 2. Indicadores de Qualidade e Conformidade

- **Testes Unitários Automatizados**: **133 de 133 testes aprovados** (`npm test`, 100% de sucesso em ~800ms).
- **Consumo de Memória**: Heap e buffers WebGL estabilizados na faixa de **~120 MB a 250 MB** mesmo após centenas de cortes sucessivos, eliminando o vazamento que atingia 4 GB.
- **Integridade Visual**: Cena 3D, morros, casario, iluminação solar dourada, manobras e animações dos bonecos funcionando com 60 FPS contínuos e sem quedas de performance.
