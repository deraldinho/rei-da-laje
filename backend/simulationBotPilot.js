const ACTIONS=Object.freeze([
  'retao','relo_lateral','retao','mergulho_parafuso',
  'tenteio','despicar','retao','lacada'
]);

class SimulationBotPilot {
  constructor(io,gameRules,options={}){
    this.io=io;
    this.gameRules=gameRules;
    const configuredAge=Number(options.minAgeMs);
    this.minAgeMs=Math.max(0,Number.isFinite(configuredAge)?configuredAge:3200);
    this.states=new Map();
  }

  tick(now=Date.now()){
    const bots=[...this.gameRules.activePlayers.values()].filter(player=>player?.isSimulation);
    const activeIds=new Set(bots.map(player=>String(player.userId||'')));
    let emitted=0;
    bots.forEach((player,index)=>{
      const id=String(player.userId||'');
      if(!id||now-(Number(player.joinedAt)||0)<this.minAgeMs)return;
      let step=this.states.get(id);
      if(!Number.isInteger(step))step=index%ACTIONS.length;
      const giftName=ACTIONS[step%ACTIONS.length];
      this.states.set(id,step+1);
      this.io.emit('competition:maneuver',{
        userId:id,giftName,giftCost:10,repeatCount:1,simulation:true
      });
      emitted++;
    });
    for(const id of this.states.keys())if(!activeIds.has(id))this.states.delete(id);
    return emitted;
  }
}

module.exports=SimulationBotPilot;
