import * as THREE from 'three';

/**
 * Utilitários de texturas procedurais ultraleves em Canvas (0 HTTP requests, 60fps)
 */
export function createBrickCanvas() {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#a34731';
  ctx.fillRect(0, 0, 64, 64);
  // Frisos de argamassa
  ctx.fillStyle = '#5c2317';
  for (let y = 0; y < 64; y += 16) {
    ctx.fillRect(0, y, 64, 2);
    const shift = (y / 16) % 2 === 0 ? 0 : 16;
    for (let x = shift; x < 64; x += 32) {
      ctx.fillRect(x, y, 2, 16);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function createRoofTileCanvas() {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#b85437';
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = '#82311b';
  for (let y = 0; y < 64; y += 8) {
    ctx.fillRect(0, y, 64, 2);
  }
  for (let x = 0; x < 64; x += 16) {
    ctx.fillRect(x, 0, 2, 64);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function createLajeFloorCanvas() {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const ctx = c.getContext('2d');

  // Base do rejunte de cimento escuro
  ctx.fillStyle = '#3a322d';
  ctx.fillRect(0, 0, 128, 128);

  // Paleta de variações térmicas de cerâmica terracota cozida brasileira
  const tileColors = ['#ad4e38', '#9e432c', '#b5543c', '#a34832', '#ac4d36', '#943b27', '#bc5a40', '#9f442e'];

  const tileSize = 32;
  const grout = 2.5;

  for (let ty = 0; ty < 4; ty++) {
    for (let tx = 0; tx < 4; tx++) {
      const x = tx * tileSize + grout;
      const y = ty * tileSize + grout;
      const w = tileSize - grout * 2;
      const h = tileSize - grout * 2;

      // Cor cerâmica única por lajota
      const colorIdx = (tx * 3 + ty * 5) % tileColors.length;
      ctx.fillStyle = tileColors[colorIdx];
      ctx.fillRect(x, y, w, h);

      // Chanfro/bisel suave de luz (borda superior e esquerda)
      ctx.fillStyle = 'rgba(255, 235, 220, 0.22)';
      ctx.fillRect(x, y, w, 2);
      ctx.fillRect(x, y, 2, h);

      // Chanfro de sombra (borda inferior e direita)
      ctx.fillStyle = 'rgba(25, 10, 5, 0.32)';
      ctx.fillRect(x, y + h - 2, w, 2);
      ctx.fillRect(x + w - 2, y, 2, h);

      // Textura microporosa natural da queima cerâmica
      ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.fillRect(x + 4, y + 5, 3, 2);
      ctx.fillRect(x + 16, y + 14, 2, 3);
      ctx.fillRect(x + 8, y + 20, 3, 2);

      ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
      ctx.fillRect(x + 12, y + 7, 2, 2);
      ctx.fillRect(x + 22, y + 18, 2, 2);
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function createHazeCanvas() {
  const c = document.createElement('canvas');
  c.width = 16; c.height = 128;
  const ctx = c.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, 128);
  grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
  grad.addColorStop(0.35, 'rgba(255, 255, 255, 0.45)');
  grad.addColorStop(0.65, 'rgba(255, 255, 255, 0.6)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 16, 128);
  const tex = new THREE.CanvasTexture(c);
  return tex;
}

export function createSolidMountainGeometry(Nu = 24, Nv = 18) {
  const geo = new THREE.BufferGeometry();
  const numSurfaceVerts = (Nu + 1) * (Nv + 1);
  const numSkirtVerts = (Nv + 1) * 2 + (Nu + 1) * 2;
  const totalVerts = numSurfaceVerts + numSkirtVerts;

  const positions = new Float32Array(totalVerts * 3);
  const indices = [];

  // 1. Superfície superior da encosta
  for (let j = 0; j < Nv; j++) {
    for (let i = 0; i < Nu; i++) {
      const a = j * (Nu + 1) + i;
      const b = j * (Nu + 1) + (i + 1);
      const c = (j + 1) * (Nu + 1) + i;
      const d = (j + 1) * (Nu + 1) + (i + 1);
      indices.push(a, c, b);
      indices.push(b, c, d);
    }
  }

  // 2. Saias de fechamento que descem até o chão da cena
  let skirtBaseIdx = numSurfaceVerts;

  // Skirt vale (i = Nu)
  const valleySkirtStart = skirtBaseIdx;
  skirtBaseIdx += (Nv + 1);
  for (let j = 0; j < Nv; j++) {
    const top1 = j * (Nu + 1) + Nu;
    const top2 = (j + 1) * (Nu + 1) + Nu;
    const bot1 = valleySkirtStart + j;
    const bot2 = valleySkirtStart + j + 1;
    indices.push(top1, bot1, top2);
    indices.push(top2, bot1, bot2);
  }

  // Skirt exterior (i = 0)
  const outerSkirtStart = skirtBaseIdx;
  skirtBaseIdx += (Nv + 1);
  for (let j = 0; j < Nv; j++) {
    const top1 = j * (Nu + 1);
    const top2 = (j + 1) * (Nu + 1);
    const bot1 = outerSkirtStart + j;
    const bot2 = outerSkirtStart + j + 1;
    indices.push(top1, top2, bot1);
    indices.push(top2, bot2, bot1);
  }

  // Skirt fundo (j = 0)
  const backSkirtStart = skirtBaseIdx;
  skirtBaseIdx += (Nu + 1);
  for (let i = 0; i < Nu; i++) {
    const top1 = i;
    const top2 = i + 1;
    const bot1 = backSkirtStart + i;
    const bot2 = backSkirtStart + i + 1;
    indices.push(top1, top2, bot1);
    indices.push(top2, bot2, bot1);
  }

  // Skirt frente (j = Nv)
  const frontSkirtStart = skirtBaseIdx;
  for (let i = 0; i < Nu; i++) {
    const top1 = Nv * (Nu + 1) + i;
    const top2 = Nv * (Nu + 1) + i + 1;
    const bot1 = frontSkirtStart + i;
    const bot2 = frontSkirtStart + i + 1;
    indices.push(top1, bot1, top2);
    indices.push(top2, bot1, bot2);
  }

  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setIndex(indices);
  return geo;
}

/**
 * Utilitários de Texturas, Geometrias e Modelagem 3D para Pipas, Linhas e Bonecos
 */
export function createKiteDecalCanvas(nickname, profileUrl, baseColorHex, isKing, isLeader) {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const ctx = c.getContext('2d');

  ctx.save();
  ctx.beginPath();
  ctx.arc(32, 32, 28, 0, Math.PI * 2);
  ctx.clip();

  ctx.fillStyle = typeof baseColorHex === 'number' ? '#' + baseColorHex.toString(16).padStart(6, '0') : (baseColorHex || '#1e88e5');
  ctx.fillRect(0, 0, 64, 64);

  // Padrão geométrico de pipa tradicional
  ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
  ctx.beginPath();
  ctx.moveTo(32, 4);
  ctx.lineTo(60, 32);
  ctx.lineTo(32, 60);
  ctx.lineTo(4, 32);
  ctx.closePath();
  ctx.fill();

  // Inicial em bold
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 24px Outfit, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const initial = String(nickname || 'P').slice(0, 1).toUpperCase();
  ctx.fillText(initial, 32, 33);
  ctx.restore();

  // Borda metálica dourada para rei/líder ou prateada para normal
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = isKing ? '#ffd700' : isLeader ? '#00e5ff' : '#ffffff';
  ctx.beginPath();
  ctx.arc(32, 32, 28, 0, Math.PI * 2);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;

  if (profileUrl && /^https:\/\/[^\s]+$/i.test(profileUrl)) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.referrerPolicy = 'no-referrer';
    img.onload = () => {
      ctx.clearRect(0, 0, 64, 64);
      ctx.save();
      ctx.beginPath();
      ctx.arc(32, 32, 28, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(img, 4, 4, 56, 56);
      ctx.restore();
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = isKing ? '#ffd700' : isLeader ? '#00e5ff' : '#ffffff';
      ctx.beginPath();
      ctx.arc(32, 32, 28, 0, Math.PI * 2);
      ctx.stroke();
      tex.needsUpdate = true;
    };
    img.src = profileUrl;
  }

  return tex;
}

export const _kiteDecalTextureCache = new Map();

export function getOrCreateKiteDecalTexture(nickname, profileUrl, baseColorHex, isKing, isLeader) {
  const normUrl = String(profileUrl || '').trim();
  const cacheKey = `${normUrl || nickname || 'p'}_${baseColorHex}_${isKing ? 1 : 0}_${isLeader ? 1 : 0}`;
  let cached = _kiteDecalTextureCache.get(cacheKey);
  if (cached) {
    if (cached.userData) cached.userData.lastUsed = Date.now();
    return cached;
  }
  const tex = createKiteDecalCanvas(nickname, profileUrl, baseColorHex, isKing, isLeader);
  tex.userData = { isShared: true, lastUsed: Date.now(), cacheKey };
  _kiteDecalTextureCache.set(cacheKey, tex);
  return tex;
}

export function drawKiteNameTagCanvas(canvas, nickname, isKing, isLeader) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const pillW = 236;
  const pillH = 46;
  const x = (canvas.width - pillW) / 2;
  const y = (canvas.height - pillH) / 2;
  const r = pillH / 2;

  ctx.save();
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, pillW, pillH, r);
  } else {
    ctx.arc(x + r, y + r, r, Math.PI * 0.5, Math.PI * 1.5);
    ctx.arc(x + pillW - r, y + r, r, Math.PI * 1.5, Math.PI * 0.5);
    ctx.closePath();
  }
  ctx.fillStyle = 'rgba(6, 21, 33, 0.88)';
  ctx.fill();

  ctx.lineWidth = 3;
  ctx.strokeStyle = isKing ? '#ffd700' : isLeader ? '#00e5ff' : 'rgba(255, 255, 255, 0.45)';
  ctx.stroke();

  ctx.fillStyle = isKing ? '#ffe07a' : '#ffffff';
  ctx.font = 'bold 22px "Outfit", "Arial", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const prefix = isLeader ? '⭐ ' : '';
  const cleanNick = String(nickname || 'Jogador');
  const shortNick = cleanNick.length > 12 ? cleanNick.slice(0, 11) + '…' : cleanNick;
  ctx.fillText(prefix + shortNick, canvas.width / 2, canvas.height / 2);
  ctx.restore();
}

export function createKiteNameTagSprite(nickname, isKing, isLeader, scale = 1.15) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  drawKiteNameTagCanvas(canvas, nickname, isKing, isLeader);

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;

  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    opacity: 0.96,
    depthTest: false,
    depthWrite: false
  });
  const sprite = new THREE.Sprite(mat);
  const s = Number(scale) || 1.15;
  sprite.scale.set(13.5 * s, 3.5 * s, 1);
  sprite.position.set(0, 20.5 + (s - 1) * 3, 2);
  sprite.userData = { canvas, tex, mat, scale: s };
  return sprite;
}

export function updateKiteNameTagSprite(sprite, nickname, isKing, isLeader) {
  if (!sprite || !sprite.userData || !sprite.userData.canvas) return;
  drawKiteNameTagCanvas(sprite.userData.canvas, nickname, isKing, isLeader);
  sprite.userData.tex.needsUpdate = true;
}

export function hashStringToInt(str) {
  let hash = 0;
  const s = String(str || '');
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) - hash) + s.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

/**
 * Utilitários de Gerenciamento de Memória WebGL e Descarte Seguro de Recursos Three.js
 */
export function disposeMaterial(mat) {
  if (!mat || mat.userData?.isShared) return;
  const textures = [
    mat.map, mat.lightMap, mat.bumpMap, mat.normalMap,
    mat.specularMap, mat.envMap, mat.alphaMap, mat.roughnessMap,
    mat.metalnessMap
  ];
  for (const tex of textures) {
    if (tex && !tex.userData?.isShared && typeof tex.dispose === 'function') {
      tex.dispose();
    }
  }
  if (typeof mat.dispose === 'function') {
    mat.dispose();
  }
}

export function disposeHierarchy(obj) {
  if (!obj) return;
  obj.traverse((child) => {
    if (child.geometry && !child.geometry.userData?.isShared && typeof child.geometry.dispose === 'function') {
      child.geometry.dispose();
    }
    if (child.material) {
      if (Array.isArray(child.material)) {
        child.material.forEach(m => disposeMaterial(m));
      } else {
        disposeMaterial(child.material);
      }
    }
  });
}

export const _kitePaperTextureCache = new Map();

export function createKitePaperCanvas(primaryColorHex, secondaryColorHex, patternIndex = 0) {
  const c1 = typeof primaryColorHex === 'number' ? '#' + primaryColorHex.toString(16).padStart(6, '0') : (primaryColorHex || '#00f0ff');
  const c2 = typeof secondaryColorHex === 'number' ? '#' + secondaryColorHex.toString(16).padStart(6, '0') : (secondaryColorHex || '#ff0055');
  const cacheKey = `${c1}_${c2}_${patternIndex % 4}`;
  if (_kitePaperTextureCache.has(cacheKey)) return _kitePaperTextureCache.get(cacheKey);

  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d');

  ctx.fillStyle = c1;
  ctx.fillRect(0, 0, 128, 128);

  const pat = patternIndex % 4;
  ctx.fillStyle = c2;

  if (pat === 0) {
    // 0: Meio a Meio Carioca (Corte diagonal tradicional)
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(128, 128);
    ctx.lineTo(0, 128);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(128, 128);
    ctx.stroke();
  } else if (pat === 1) {
    // 1: Faixa Central / Listra Carioca
    ctx.fillRect(44, 0, 40, 128);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 2;
    ctx.strokeRect(44, 0, 40, 128);
  } else if (pat === 2) {
    // 2: Quatro Cortes / Xadrez Cruzado
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillRect(64, 64, 64, 64);
    ctx.fillStyle = c1;
    ctx.fillRect(64, 0, 64, 64);
    ctx.fillRect(0, 64, 64, 64);
  } else {
    // 3: Raio / Vangolô
    ctx.beginPath();
    ctx.moveTo(64, 0);
    ctx.lineTo(128, 64);
    ctx.lineTo(64, 128);
    ctx.lineTo(0, 64);
    ctx.closePath();
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.userData = { isShared: true };
  _kitePaperTextureCache.set(cacheKey, tex);
  return tex;
}

export function createDynamicLine3D(numPoints = 20) {
  const lineGroup = new THREE.Group();

  const geom = new THREE.BufferGeometry();
  const positions = new Float32Array(numPoints * 3);
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const mat = new THREE.LineBasicMaterial({
    color: 0xf8f9fa,
    transparent: true,
    opacity: 0.88,
    linewidth: 1.5,
    depthWrite: false
  });

  const coreLine = new THREE.Line(geom, mat);
  // Geometria muda a cada frame; desabilitar frustum culling evita recalcular
  // bounding sphere continuamente no hot path de múltiplos relinhos.
  coreLine.frustumCulled = false;
  coreLine.renderOrder = 9;
  lineGroup.add(coreLine);

  const glowMat = new THREE.LineBasicMaterial({
    color: 0xf8f9fa,
    transparent: true,
    opacity: 0.38,
    linewidth: 3.5,
    depthWrite: false
  });
  const glowLine = new THREE.Line(geom, glowMat);
  glowLine.frustumCulled = false;
  glowLine.renderOrder = 8;
  lineGroup.add(glowLine);

  lineGroup.userData = {
    geom,
    mat,
    glowMat,
    coreLine,
    glowLine,
    numPoints,
    positions
  };

  return lineGroup;
}

export const LINE_COLORS = Object.freeze({
  algodao: 0xf8f9fa,
  cerol: 0xff0055,
  chile: 0x00e5ff,
  kevlar: 0xffd700,
  tornado: 0xa855f7,
  mestre_do_ceu: 0xffd700
});
