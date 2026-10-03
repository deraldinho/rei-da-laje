const test=require('node:test');const assert=require('node:assert/strict');const path=require('node:path');const {pathToFileURL}=require('node:url');
const ropeUrl=pathToFileURL(path.resolve(__dirname,'../frontend/src/engine/physics/RopePhysics.js')).href;
const load=()=>import(ropeUrl+`?t=${Date.now()}-${Math.random()}`);

async function run(wind,{aligned=false}={}){
 const {RopePhysics}=await load();const rope=new RopePhysics({nodeCount:12,lineType:'algodao',totalLineLength:1800});
 const hand={x:0,y:1000,z:0},kite=aligned?{x:760,y:1000,z:0}:{x:100,y:220,z:80};
 rope.resetPositions(hand,kite);rope.adjustSpoolLength(420);
 for(let i=0;i<300;i++)rope.step(1/60,hand,kite,wind,{});
 return rope.getMechanicalState(hand,kite);
}

test('vento operacional mantém piso de tensão mesmo com barriga visível',async()=>{
 const st=await run({x:1.0,y:-.08,z:.18,gust:1});
 assert.ok(st.strain<.8,`pré-condição de barriga perdida: ${st.strain}`);
 assert.ok(st.tension>=.28,`linha ficou funcionalmente frouxa com vento: ${st.tension}`);
});

test('vento alinhado ao tirante também mantém tração operacional',async()=>{
 const st=await run({x:1.0,y:0,z:0,gust:1},{aligned:true});
 assert.ok(st.strain<.8);assert.ok(st.tension>=.28,`tirante alinhado sem tensão: ${st.tension}`);
});

test('vento praticamente zero permite relaxamento natural',async()=>{
 const st=await run({x:.01,y:0,z:0,gust:1});
 assert.ok(st.tension<.18,`piso de vento ficou ativo sem vento: ${st.tension}`);
});