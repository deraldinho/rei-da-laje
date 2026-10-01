/** Cada ID de presente mantém identidade visual determinística; desconhecidos também animam. */
export const GIFT_THEMES = Object.freeze({
  rosa:{symbol:'🌹',style:'petals',color:0xff426a,label:'CHUVA DE ROSAS'},
  flor:{symbol:'🌼',style:'petals',color:0xffd35b,label:'EXPLOSÃO DE FLORES'},
  donut:{symbol:'🍩',style:'rings',color:0xffb668,label:'GIRO DO DONUT'},
  capivara:{symbol:'🦫',style:'shield',color:0xffdd62,label:'ESCUDO DA CAPIVARA'},
  perfume:{symbol:'🌪',style:'spiral',color:0xba72ff,label:'FURACÃO PERFUMADO'},
  leao:{symbol:'🦁',style:'crown',color:0xffd45a,label:'RUGIDO DO LEÃO'},
  universo:{symbol:'🌌',style:'cosmos',color:0x8a8cff,label:'UNIVERSO ESTELAR'}
});
export function giftAnimation(gift={}) {
  const key=String(gift.giftName||'').trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const known=GIFT_THEMES[key];
  const id=String(gift.giftId||key||'presente');
  let seed=2166136261;
  for(let i=0;i<id.length;i++) seed=Math.imul(seed^id.charCodeAt(i),16777619)>>>0;
  const diamonds=Math.min(1000000,Math.max(0,Number(gift.diamondCount)||0));
  const count=Math.min(1000,Math.max(1,Math.floor(Number(gift.repeatCount)||1)));
  const tier=diamonds>=10000?'legendary':diamonds>=1000?'epic':diamonds>=100?'rare':diamonds>=10?'uncommon':'common';
  const styles=['stars','bursts','ribbons','comets','confetti','orbits'];
  const color=known?.color||[0x73edff,0xff8fa3,0xb28cff,0xffd36b,0x85f0b5,0xf996ff][seed%6];
  // A celebração é breve; o benefício permanece por 5, 10 ou 15 segundos.
  const duration=Math.min(3,1.1+Math.min(1.55,Math.log10(diamonds+1)*0.36)+Math.min(0.35,count/100));
  return {id,seed,style:known?.style||styles[seed%styles.length],symbol:known?.symbol||'🎁',
    color,label:known?.label||'PRESENTE ESPECIAL',tier,duration,count,diamonds,
    name:String(gift.giftName||'Presente TikTok').slice(0,90),
    nickname:String(gift.nickname||'Espectador').slice(0,60),
    userId:String(gift.userId||''),
    iconUrl:/^https:\/\/[^\s]+$/i.test(String(gift.iconUrl||'')) ? String(gift.iconUrl).slice(0,1000) : '',
    size:tier==='legendary'?2.0:tier==='epic'?1.7:tier==='rare'?1.4:1.2,
    particleCount:tier==='legendary'?22:tier==='epic'?18:tier==='rare'?14:10};
}
