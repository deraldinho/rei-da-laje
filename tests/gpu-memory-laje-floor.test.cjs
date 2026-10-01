const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('Otimização de GPU e Eliminação de Bugs de Pipa sob a Laje', () => {
  const fkSource = fs.readFileSync(path.join(__dirname, '../frontend/src/entities/FallingKite.js'), 'utf8');
  const kiteSource = fs.readFileSync(path.join(__dirname, '../frontend/src/entities/Kite.js'), 'utf8');
  const appSource = fs.readFileSync(path.join(__dirname, '../frontend/src/engine/App.js'), 'utf8');
  const threeSource = fs.readFileSync(path.join(__dirname, '../frontend/src/ui/ThreeSkyScene.js'), 'utf8');
  const cssSource = fs.readFileSync(path.join(__dirname, '../frontend/src/ui/game.css'), 'utf8');

  // 1. FallingKite com vida reduzida e limite de solo na laje
  assert.match(fkSource, /this\.life\s*=\s*3\.5/, 'FallingKite deve ter vida ágil de 3.5s para não acumular memória');
  assert.match(fkSource, /if\s*\(this\.y\s*>=\s*floorLimit\)/, 'FallingKite deve ter limite de colisão na laje');
  assert.match(fkSource, /this\.life\s*=\s*0/, 'FallingKite deve encerrar ao tocar o horizonte da laje');

  // 2. Kite ativo nasce no ar e possui trava de solo da laje
  assert.match(kiteSource, /this\.y\s*=\s*Math\.min\(screenHeight\s*\*\s*0\.58,\s*this\.targetY\s*\+\s*45\)/, 'Kite deve nascer no céu acima da laje');
  assert.match(kiteSource, /this\.y\s*=\s*Math\.max\(35,\s*Math\.min\(this\.screenHeight\s*\*\s*0\.65,\s*this\.y\)\)/, 'Kite update deve travar y no céu');

  // 3. Controles locais de teclado limitam descida
  assert.match(appSource, /kite\.y\s*=\s*Math\.min\(maxKiteY,\s*kite\.y\s*\+\s*8\)/, 'Soltar linha deve travar no teto da laje');
  assert.match(appSource, /kite\.y\s*=\s*Math\.min\(maxKiteY,\s*kite\.y\s*\+\s*14\)/, 'Despicada deve travar no teto da laje');

  // 4. Renderização Three.js única por frame (sem render duplicado no Pixi)
  assert.doesNotMatch(appSource, /origRender\s*=\s*this\.app\.render\.bind[\s\S]*this\.threeScene\.render\(\)/, 'Não deve renderizar Three.js duas vezes por frame');

  // 5. Configurações de GPU e zero cópia de buffer
  assert.match(threeSource, /powerPreference:\s*'high-performance'/, 'Three.js deve exigir GPU de alta performance');
  assert.match(threeSource, /preserveDrawingBuffer:\s*false/, 'Three.js deve desativar preserveDrawingBuffer para poupar RAM');
  assert.match(appSource, /powerPreference:\s*'high-performance'/, 'PixiJS deve exigir GPU de alta performance');
  assert.match(appSource, /preserveDrawingBuffer:\s*false/, 'PixiJS deve desativar preserveDrawingBuffer para poupar RAM');

  // 6. Três dimensões: ThreeSkyScene descarta pipa cortada antes da laje
  assert.match(threeSource, /if\s*\(fkWorld\.y\s*<\s*maxLajeWorldY\)/, 'ThreeSkyScene deve descartar pipa que atinja a mureta da laje');

  // 7. Aceleração de hardware CSS nos Canvas
  assert.match(cssSource, /#threeCanvas[\s\S]*transform:\s*translateZ\(0\)/, '#threeCanvas deve ter camada de GPU dedicada');
  assert.match(cssSource, /#gameCanvas[\s\S]*transform:\s*translateZ\(0\)/, '#gameCanvas deve ter camada de GPU dedicada');
});
