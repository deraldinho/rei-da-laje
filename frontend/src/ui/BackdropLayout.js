export function backdropLayout(width,height){
  const w=Math.max(320,Number(width)||320),h=Math.max(480,Number(height)||480),portrait=h>w;
  const rooftop=Math.max(58,Math.min(h*(portrait?.105:.075),w*.145));
  return {
    width:w,height:h,portrait,rooftop,
    horizonY:h*(portrait?.55:.61),
    leftHillWidth:w*(portrait?.39:.34),
    rightHillWidth:w*(portrait?.43:.37),
    leftTopY:h*(portrait?.48:.50),
    rightTopY:h*(portrait?.42:.47),
    leftFootY:h*(portrait?.73:.79),
    rightFootY:h*(portrait?.69:.77),
    skylineBase:h*(portrait?.76:.82),
    poleY:h-rooftop-8
  };
}
export function backdropHousePalette(){
  return [0xf2a13a,0xf5c75a,0xe66b50,0x55a7aa,0x78b8c7,0xf1deb0,0xc96c82,0x397d8b,0xe98d54,0x6f9c74];
}
