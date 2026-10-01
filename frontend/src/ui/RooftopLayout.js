/** Geometria visual da laje; não altera colisões nem âncora física da linha. */
export function rooftopHeight(width, height) {
  const portraitLive = height > width && width >= 700 && height >= 1200;
  return portraitLive ? Math.min(180, Math.max(110, width * 0.1)) * 1.65 : 58;
}

export function rooftopAnchorY(width, height) {
  const portraitLive = height > width && width >= 700 && height >= 1200;
  return height - rooftopHeight(width, height) + (portraitLive ? -24 : -4);
}

/** Ponto da mão direita do bonequinho, já transformado para coordenadas da arena. */
export function rooftopHandAnchor(x, y, scaleX = 1, scaleY = scaleX, rotation = 0) {
  const lx = 13 * scaleX, ly = -39 * scaleY;
  const cos = Math.cos(rotation || 0), sin = Math.sin(rotation || 0);
  return { x: x + lx * cos - ly * sin, y: y + lx * sin + ly * cos };
}

export function rooftopPlayerLayout(index, total, width, height) {
  const count=Math.max(1,Math.min(40,Math.floor(Number(total)||1)));
  const position=Math.max(0,Math.min(count-1,Math.floor(Number(index)||0)));
  const portrait=height>width && width>=700 && height>=1200;
  const maxPerRow=portrait ? 20 : Math.max(8,Math.min(20,Math.floor(width/52)));
  const rows=Math.max(1,Math.ceil(count/maxPerRow));
  const columns=Math.ceil(count/rows);
  const row=Math.min(rows-1,Math.floor(position/columns));
  const column=position-row*columns;
  const rowCount=Math.min(columns,count-row*columns);
  const margin=portrait ? width*0.07 : Math.max(22,width*0.05);
  const initialSpacing=rowCount>1?(width-2*margin)/(rowCount-1):0;
  const inset=rows>1 && row%2 ? Math.min(24,initialSpacing*0.35) : 0;
  const left=margin+inset,right=width-margin-inset;
  const spacing=rowCount>1?(right-left)/(rowCount-1):0;
  const rawScale=portrait ? Math.min(2.35,Math.max(1.35,(width/900)*1.35*1.18)) : 1;
  const scale=Math.max(portrait?0.95:0.62,Math.min(rawScale,rowCount>1?spacing/38:rawScale,portrait?1.95:1));
  const rowGap=Math.min(rooftopHeight(width,height)*(portrait?0.16:0.42),(portrait?38:58)*scale);
  return {
    x:rowCount===1?width/2:left+column*spacing,
    y:rooftopAnchorY(width,height)-(rows-1-row)*rowGap,
    scale, row, rows, showNickname:count<=20
  };
}

export function rooftopSlotOrder(total, width, height) {
  const count = Math.max(1, Math.min(40, Math.floor(Number(total) || 1)));
  const indices = Array.from({ length: count }, (_, i) => i);
  indices.sort((a, b) => {
    const slotA = rooftopPlayerLayout(a, count, width, height);
    const handA = rooftopHandAnchor(slotA.x, slotA.y, slotA.scale, slotA.scale, 0);
    const slotB = rooftopPlayerLayout(b, count, width, height);
    const handB = rooftopHandAnchor(slotB.x, slotB.y, slotB.scale, slotB.scale, 0);
    return handA.x - handB.x;
  });
  return indices;
}
