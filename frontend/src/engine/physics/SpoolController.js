const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number(v)||0));

export class SpoolController {
  constructor(rope,options={}){
    this.rope=rope;
    this.pullSpeed=Math.max(1,Number(options.pullSpeed)||220);
    this.releaseSpeed=Math.max(1,Number(options.releaseSpeed)||280);
    this.command=0;
  }

  step(dt=1/60,spoolCommand=0){
    if(!this.rope?.adjustSpoolLength) return null;
    const seconds=Math.max(.001,Math.min(.1,Number(dt)||1/60));
    const command=clamp(spoolCommand,-1,1);
    this.command=command;
    if(Math.abs(command)<1e-4) return this.rope.spoolLength;
    const speed=command<0?this.pullSpeed:this.releaseSpeed;
    this.rope.adjustSpoolLength(command*speed*seconds);
    return this.rope.spoolLength;
  }
}
