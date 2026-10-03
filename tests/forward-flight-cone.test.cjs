const test=require('node:test');
const assert=require('node:assert/strict');
const load=file=>import('../frontend/src/engine/'+file);

test('all wind presets keep at least 30 km/h and flow toward the horizon, including altitude and vortices',async()=>{
  const {Wind}=await load('Wind.js');
  for(const windIntensity of ['calmo','fraco','moderado','forte','tempestade']){
    Wind.setSettings({windIntensity,windDirection:'auto'});
    let left=false,right=false,up=false,down=false;
    for(let t=0;t<600;t+=.5){
      const base=Wind.sample(t);
      const kite={x:530,y:1510,z:80};
      const source={x:500,y:1500,z:90,specials:{tornado:5}};
      for(const wind of [base,Wind.sampleAt(t,1900,1920),Wind.withLocalVortices(base,kite,[source,kite])]){
        const speed=Math.hypot(wind.x,wind.y,wind.z)*35*wind.gust;
        assert.ok(speed>=30-1e-8,`${windIntensity}: ${speed} km/h`);
        assert.ok(wind.z>0 && Math.abs(wind.x)<wind.z && Math.abs(wind.y)<wind.z,'forward component must dominate');
      }
      left ||= base.x<-.05;right ||=base.x>.05;up ||=base.y<-.01;down ||=base.y>.01;
    }
    assert.ok(left&&right&&up&&down,'wind must vary laterally and vertically');
  }
});

test('sustained flight stays in the visible sky from minimum wind to storms, with finite ropes and no added line',async()=>{
  const [{Wind},{KiteDynamics},{RopePhysics}]=await Promise.all([load('Wind.js'),load('physics/KiteDynamics.js'),load('physics/RopePhysics.js')]);
  for(const windIntensity of ['calmo','forte','tempestade'])for(const [w,h] of [[1080,1920],[1280,720],[390,844]]){
    Wind.setSettings({windIntensity,windDirection:'auto'});
    const kites=Array.from({length:8},(_,i)=>{
      const k={userId:String(i),x:w*(.16+i*.68/7),y:h*(.3+(i%3)*.05),z:80,
        baseX:w*(.13+i*.74/7),baseY:h*.90,baseZ:0,screenWidth:w,screenHeight:h,
        vx:0,vy:0,vz:0,mass:.85,aeroArea:.9,windPhase:i*.73,windInfluence:.8+i*.08,
        lineTension:.6,lineSlack:0,rooftopPlayer:{layoutIndex:i},rope:new RopePhysics({nodeCount:12})};
      k.rope.resetPositions({x:k.baseX,y:k.baseY,z:0},k);k.initialLine=k.rope.spoolLength;return k;
    });
    for(let f=0;f<3600;f++){
      KiteDynamics._stepFrame=f;
      const wind=Wind.sample(f/60);
      for(const k of kites){
        const old={x:k.x,y:k.y,z:k.z};
        KiteDynamics.step(k,1/60,wind,kites.length,kites);
        k.rope.step(1/60,{x:k.baseX,y:k.baseY,z:0},k,k._localPhysicsWind,{});
        assert.ok(Number.isFinite(k.x+k.y+k.z+k.rope.tension));
        assert.ok(Math.hypot(k.x-old.x,k.y-old.y,k.z-old.z)<35,'no teleport to reframe kite');
        assert.ok(k.x>w*.07&&k.x<w*.93&&k.y>h*.10&&k.y<h*.77,`${w}x${h}: kite left visible sky at frame ${f}: ${k.x},${k.y}`);
        assert.ok(Math.hypot(k._localPhysicsWind.x,k._localPhysicsWind.y,k._localPhysicsWind.z)*35*k._localPhysicsWind.gust>=30-1e-8);
        assert.equal(k.rope.spoolLength,k.initialLine,'cone cannot manufacture line');
      }
    }
    assert.ok(kites.every(k=>k.z>0),'kites stay in front of characters');
  }
});
