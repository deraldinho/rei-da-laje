import fs from 'node:fs';
import path from 'node:path';

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  const results = {
    threeAlloc: [],
    canvasAlloc: [],
    disposes: [],
    setIntervals: [],
    eventListeners: [],
    pixiAlloc: []
  };

  lines.forEach((line, idx) => {
    const l = line.trim();
    const num = idx + 1;
    if (/new THREE\./.test(l)) results.threeAlloc.push({ num, line: l });
    if (/createElement\(["']canvas["']\)/.test(l)) results.canvasAlloc.push({ num, line: l });
    if (/\.dispose\(/.test(l)) results.disposes.push({ num, line: l });
    if (/setInterval\(/.test(l)) results.setIntervals.push({ num, line: l });
    if (/addEventListener\(/.test(l)) results.eventListeners.push({ num, line: l });
    if (/new PIXI\./.test(l)) results.pixiAlloc.push({ num, line: l });
  });

  return results;
}

function scanDir(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanDir(full);
    } else if (entry.name.endsWith('.js')) {
      const res = scanFile(full);
      console.log(`\n========================================`);
      console.log(`FILE: ${full}`);
      console.log(`Three allocations: ${res.threeAlloc.length}`);
      console.log(`Canvas allocations: ${res.canvasAlloc.length}`);
      console.log(`Dispose calls: ${res.disposes.length}`);
      console.log(`PIXI allocations: ${res.pixiAlloc.length}`);
      console.log(`setInterval calls: ${res.setIntervals.length}`);

      if (res.canvasAlloc.length > 0) {
        console.log(`  --- Canvas created:`);
        res.canvasAlloc.forEach(c => console.log(`    L${c.num}: ${c.line.slice(0, 100)}`));
      }
      if (res.disposes.length > 0) {
        console.log(`  --- Disposes:`);
        res.disposes.forEach(d => console.log(`    L${d.num}: ${d.line.slice(0, 100)}`));
      }
    }
  }
}

console.log('--- SCANNING FRONTEND SRC ---');
scanDir('frontend/src');
