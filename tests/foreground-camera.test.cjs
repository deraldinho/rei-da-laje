const test = require('node:test');
const assert = require('node:assert/strict');
const {pathToFileURL} = require('node:url');
const path = require('node:path');
const root = process.env.PIPA_CAMERA_ROOT || path.resolve(__dirname, '..');
const load = file => import(pathToFileURL(path.join(root, file)).href);

test('wind-follow keeps rooftop hands and bodies in frame in portrait and landscape', async () => {
  const THREE = await load('node_modules/three/build/three.module.js');
  const {BroadcastDirector} = await load('frontend/src/ui/three/BroadcastDirector.js');
  const {rooftopAnchorY} = await load('frontend/src/ui/RooftopLayout.js');
  for (const [width, height, z] of [[1080,1920,830], [1280,720,720], [390,844,830]]) {
    const camera = new THREE.PerspectiveCamera(height>width?50:46,width/height,1,3600);
    const base = new THREE.Vector3(0,height>width?10:0,z);
    const foregroundHeight = 2*Math.tan(camera.fov*Math.PI/360)*(z-480);
    const foregroundWidth = foregroundHeight*camera.aspect;
    const floorY = -foregroundHeight*.5+(height-rooftopAnchorY(width,height))/height*foregroundHeight*.95;
    for (const direction of [-1,1]) {
      camera.position.copy(base);
      const director = new BroadcastDirector(camera,base);
      director.resize(width,height);
      const kites = new Map([
        ['a',{x:width*.1,y:height*.15,screenWidth:width,screenHeight:height}],
        ['b',{x:width*.9,y:height*.3,screenWidth:width,screenHeight:height}]
      ]);
      for (let frame=0;frame<600;frame++) {
        director.update(1/60,kites,null,{x:direction*1.5,y:-.4,z:.3});
        camera.updateMatrixWorld(true);
        for (const x of [-foregroundWidth*.38,0,foregroundWidth*.38]) {
          for (const offset of [14,28]) {
            const point = new THREE.Vector3(x,floorY+offset,480).project(camera);
            assert.ok(Math.abs(point.x)<.98 && point.y>-.98 && point.y<-.33,
              `${width}x${height}, frame ${frame}: body/hand outside lower third (${point.x}, ${point.y})`);
          }
        }
        assert.ok(camera.position.z<=z*1.08,'zoom must preserve readable foreground characters');
      }
    }
  }
});
