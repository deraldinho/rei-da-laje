class LiveActivityMonitor {
  constructor(now = () => Date.now()) {
    this.now = now;
    this.last = { chat:null, gift:null, like:null, follow:null, transport:null, any:null };
    this.counts = { chat:0, gift:0, like:0, follow:0, transport:0 };
    this.failures = [];
    this.reconnectStartedAt = null;
  }
  record(type, at = this.now()) {
    if (!(type in this.last)) return;
    this.last[type] = at; this.last.any = at;
    this.counts[type] = (this.counts[type] || 0) + 1;
  }
  transport(at = this.now()) { this.last.transport=at; this.counts.transport++; }
  failure(code='UNKNOWN', at=this.now()) {
    this.failures.push({code:String(code).slice(0,48),at});
    const cutoff=at-10*60*1000;
    this.failures=this.failures.filter(x=>x.at>=cutoff).slice(-100);
  }
  reconnecting(active, at=this.now()) {
    if(active && !this.reconnectStartedAt)this.reconnectStartedAt=at;
    if(!active)this.reconnectStartedAt=null;
  }
  snapshot({connected=false,eventsActive=false}={}, at=this.now()) {
    const age=v=>v ? Math.max(0,at-v) : null;
    const recentFailures=this.failures.filter(x=>at-x.at<=5*60*1000).length;
    const transportAgeMs=age(this.last.transport);
    const reconnectAgeMs=this.reconnectStartedAt ? at-this.reconnectStartedAt : 0;
    const reasons=[];
    if(!connected) reasons.push('DISCONNECTED');
    if(reconnectAgeMs>30000) reasons.push('RECONNECT_STUCK');
    if(connected && transportAgeMs!==null && transportAgeMs>30000) reasons.push('TRANSPORT_STALE');
    if(recentFailures>=3) reasons.push('FAILURE_GROWTH');
    return {healthy:reasons.length===0,reasons,last:{...this.last},counts:{...this.counts},
      transportAgeMs,reconnectAgeMs,recentFailures5m:recentFailures,eventsActive};
  }
}
module.exports=LiveActivityMonitor;
