class SimulationBotPilot {
  constructor(io,gameRules,options={}){
    this.io=io;
    this.gameRules=gameRules;
    const configuredAge=Number(options.minAgeMs);
    this.minAgeMs=Math.max(0,Number.isFinite(configuredAge)?configuredAge:3200);
    this.states=new Map();
  }

  tick(){
    const bots=[...this.gameRules.activePlayers.values()].filter(player=>player?.isSimulation);
    const activeIds=new Set(bots.map(player=>String(player.userId||'')));
    for(const id of this.states.keys())if(!activeIds.has(id))this.states.delete(id);
    return 0;
  }
}

module.exports=SimulationBotPilot;
