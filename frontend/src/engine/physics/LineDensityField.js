const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number(v)||0));

export class LineDensityField{
  constructor(options={}){
    this.cellsX=Math.max(2,Math.floor(Number(options.cellsX)||8));
    this.cellsY=Math.max(2,Math.floor(Number(options.cellsY)||10));
    this.cellsZ=Math.max(2,Math.floor(Number(options.cellsZ)||4));
    this.width=Math.max(100,Number(options.width)||1080);
    this.height=Math.max(100,Number(options.height)||1920);
    this.depth=Math.max(50,Number(options.depth)||300);
    this.updateIntervalMs=Math.max(40,Number(options.updateIntervalMs)||120);
    this.cells=new Float32Array(this.cellsX*this.cellsY*this.cellsZ);
    this.updatedAt=-Infinity;
    this.segmentCount=0;
  }
  _index(x,y,z){
    const ix=clamp(Math.floor((Number(x)||0)/this.width*this.cellsX),0,this.cellsX-1);
    const iy=clamp(Math.floor((Number(y)||0)/this.height*this.cellsY),0,this.cellsY-1);
    const iz=clamp(Math.floor((Number(z)||0)/this.depth*this.cellsZ),0,this.cellsZ-1);
    return (iz*this.cellsY+iy)*this.cellsX+ix;
  }
  _add(x,y,z,weight=1){this.cells[this._index(x,y,z)]+=Math.max(0,Number(weight)||0);}
  update(kites,nowMs=Date.now()){
    const now=Number(nowMs)||Date.now();
    if(Number.isFinite(this.updatedAt)&&now-this.updatedAt<this.updateIntervalMs)return false;
    const list=Array.isArray(kites)?kites:[];
    const first=list.find(k=>Number(k?.screenWidth)>0&&Number(k?.screenHeight)>0);
    if(first){this.width=Number(first.screenWidth);this.height=Number(first.screenHeight);}
    this.cells.fill(0);this.segmentCount=0;
    for(const kite of list){
      if(!kite||kite.isAscending||Number(kite.spawnProtection)>0)continue;
      const nodes=kite.rope?.getNodes?.()||kite.rope?.nodes;
      if(!Array.isArray(nodes)||nodes.length<2)continue;
      const tension=.7+.6*clamp(Number(kite.lineTension)||.58,0,1);
      for(let i=0;i<nodes.length-1;i++){
        const a=nodes[i],b=nodes[i+1];if(!a||!b)continue;
        for(const t of [.2,.5,.8])this._add((a.x||0)+((b.x||0)-(a.x||0))*t,
          (a.y||0)+((b.y||0)-(a.y||0))*t,(a.z||0)+((b.z||0)-(a.z||0))*t,tension/3);
        this.segmentCount++;
      }
    }
    this.updatedAt=now;return true;
  }
  sample(x,y,z){
    if(!this.cells.length)return 0;
    return Number(this.cells[this._index(x,y,z)])||0;
  }
  scoreCorridor(origin={},heading={x:1,y:0,z:0},length=300){
    let dx,dy,dz;
    if(Number.isFinite(heading)){
      dx=Math.cos(heading);dy=0;dz=Math.sin(heading);
    }else{dx=Number(heading?.x)||0;dy=Number(heading?.y)||0;dz=Number(heading?.z)||0;}
    const mag=Math.hypot(dx,dy,dz)||1;dx/=mag;dy/=mag;dz/=mag;
    const reach=Math.max(0,Number(length)||0);if(!(reach>0))return 0;
    let score=0;const steps=10;
    for(let i=1;i<=steps;i++){
      const d=reach*i/steps;
      score+=this.sample((Number(origin.x)||0)+dx*d,(Number(origin.y)||0)+dy*d,(Number(origin.z)||0)+dz*d);
    }
    return score/steps;
  }
}
