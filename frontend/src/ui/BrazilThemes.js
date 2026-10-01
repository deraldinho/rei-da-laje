export const BRAZIL_THEMES=Object.freeze({
 AC:{name:'Acre',region:'Norte',sky:[0x187fc5,0x80d9ed],terrain:0x31775d,accent:0x7ccf76,feature:'floresta'},
 AL:{name:'Alagoas',region:'Nordeste',sky:[0x188fd0,0x8de3e8],terrain:0xd5ba76,accent:0x39a9a5,feature:'litoral'},
 AP:{name:'Amapá',region:'Norte',sky:[0x187cc1,0x86d7e6],terrain:0x286f59,accent:0x74c96c,feature:'amazonia'},
 AM:{name:'Amazonas',region:'Norte',sky:[0x176fae,0x76cbdc],terrain:0x286b50,accent:0x65bd63,feature:'rio'},
 BA:{name:'Bahia',region:'Nordeste',sky:[0x1c8bd0,0x91dceb],terrain:0xc99355,accent:0xffc857,feature:'casario'},
 CE:{name:'Ceará',region:'Nordeste',sky:[0x168bd0,0x9edee5],terrain:0xc6a05b,accent:0xe6bd49,feature:'dunas'},
 DF:{name:'Distrito Federal',region:'Centro-Oeste',sky:[0x328ccc,0xb6dce8],terrain:0x9a6848,accent:0xe5e0cf,feature:'cerrado'},
 ES:{name:'Espírito Santo',region:'Sudeste',sky:[0x278bc6,0x9fdbe3],terrain:0x537e69,accent:0x75b6c7,feature:'montanha'},
 GO:{name:'Goiás',region:'Centro-Oeste',sky:[0x338cc5,0xb3dce3],terrain:0x8a7548,accent:0xe0b84e,feature:'cerrado'},
 MA:{name:'Maranhão',region:'Nordeste',sky:[0x168bd0,0x9de5e7],terrain:0xd5c27c,accent:0x54a79a,feature:'lencois'},
 MT:{name:'Mato Grosso',region:'Centro-Oeste',sky:[0x3489be,0xaed7df],terrain:0x6c7445,accent:0xd3aa49,feature:'pantanal'},
 MS:{name:'Mato Grosso do Sul',region:'Centro-Oeste',sky:[0x328cc4,0xaedce3],terrain:0x65774e,accent:0x71a99a,feature:'pantanal'},
 MG:{name:'Minas Gerais',region:'Sudeste',sky:[0x2588c4,0xa8d8e2],terrain:0x77664d,accent:0xd09a53,feature:'serras'},
 PA:{name:'Pará',region:'Norte',sky:[0x177ebd,0x80d5df],terrain:0x2d7358,accent:0x65bd70,feature:'mangue'},
 PB:{name:'Paraíba',region:'Nordeste',sky:[0x168bd1,0x9ce1e8],terrain:0xc29a61,accent:0xe8c15a,feature:'sertao'},
 PR:{name:'Paraná',region:'Sul',sky:[0x3986b4,0xb8d6df],terrain:0x4f725b,accent:0x8fb071,feature:'araucarias'},
 PE:{name:'Pernambuco',region:'Nordeste',sky:[0x168fd2,0x9ce2e8],terrain:0xc88756,accent:0xf0c04e,feature:'recife'},
 PI:{name:'Piauí',region:'Nordeste',sky:[0x238cc8,0xa9dce1],terrain:0xb48c55,accent:0xd7aa45,feature:'sertao'},
 RJ:{name:'Rio de Janeiro',region:'Sudeste',sky:[0x168bd2,0x8edce9],terrain:0x3f725d,accent:0xf0b64c,feature:'morro'},
 RN:{name:'Rio Grande do Norte',region:'Nordeste',sky:[0x148ed4,0x9de5ea],terrain:0xd0b16c,accent:0xf1cf69,feature:'dunas'},
 RS:{name:'Rio Grande do Sul',region:'Sul',sky:[0x4a83aa,0xb8d0db],terrain:0x58704f,accent:0x9f8b68,feature:'pampa'},
 RO:{name:'Rondônia',region:'Norte',sky:[0x237db6,0x89d2df],terrain:0x347056,accent:0x74bd67,feature:'floresta'},
 RR:{name:'Roraima',region:'Norte',sky:[0x247fba,0x91d4df],terrain:0x55734f,accent:0x9abb6a,feature:'lavrado'},
 SC:{name:'Santa Catarina',region:'Sul',sky:[0x3a89b8,0xb9d9e0],terrain:0x4f745e,accent:0x87ad8b,feature:'serra'},
 SP:{name:'São Paulo',region:'Sudeste',sky:[0x2a86bc,0xa8d4df],terrain:0x53696b,accent:0xe09b4d,feature:'metropole'},
 SE:{name:'Sergipe',region:'Nordeste',sky:[0x198fcf,0x9ce1e7],terrain:0xc4a56a,accent:0x62aaa0,feature:'litoral'},
 TO:{name:'Tocantins',region:'Norte',sky:[0x2a89c1,0xa7d9df],terrain:0x7c754b,accent:0xd2b04d,feature:'jalapao'}
});
export const BRAZIL_THEME_CODES=Object.freeze(Object.keys(BRAZIL_THEMES));
export const STATE_ROTATION_MS=10*60*1000;
export function rotationThemeCode(startCode='RJ',elapsedMs=0){const start=BRAZIL_THEME_CODES.indexOf(String(startCode).toUpperCase());const base=start<0?BRAZIL_THEME_CODES.indexOf('RJ'):start;const hops=Math.floor(Math.max(0,Number(elapsedMs)||0)/STATE_ROTATION_MS);return BRAZIL_THEME_CODES[(base+hops)%BRAZIL_THEME_CODES.length];}
export function brazilTheme(code='RJ'){return BRAZIL_THEMES[String(code).toUpperCase()]||BRAZIL_THEMES.RJ;}
export function nextBrazilTheme(code='RJ'){const i=BRAZIL_THEME_CODES.indexOf(String(code).toUpperCase());return BRAZIL_THEME_CODES[(i+1+BRAZIL_THEME_CODES.length)%BRAZIL_THEME_CODES.length];}
