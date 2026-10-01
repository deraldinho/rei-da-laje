import { sanitizeRelinhoPhysicsConfig } from './RelinhoPhysicsConfig.js';
import { LineBroadPhase } from './LineBroadPhase.js';
import { LineContactManager } from './LineContactManager.js';
import { RopeCollision } from './RopeCollision.js';
import { computeLineContactPhysics } from './LineContactPhysics.js';
import { integrateLineAbrasion } from './LineAbrasionModel.js';
import { applyLineWearAndEvaluateBreak } from './LineBreakSystem.js';

export class LineContactSystem {
  constructor(config = {}) {
    this.config = sanitizeRelinhoPhysicsConfig(config);
    this.broadPhase = new LineBroadPhase(this.config);
    this.manager = new LineContactManager(this.config);
    this._eligible = [];
    this._eligibleById = new Map();
    this._fxContacts = [];
    this._couplingJobs = [];
    this._cuts = [];
    this._solved = [];
    this._narrowOut = { c1:{}, c2:{} };
    this._physicsOut = {};
    this._collisionOptions = { minSinAngle:0.05, hint:null };
    this._tick = 0;
    this._candidateCursor = 0;
    this._cutLosers = new Set();
    this._metrics = {};
    this._result = { contacts:this.manager.contacts, fxContacts:this._fxContacts, couplingJobs:this._couplingJobs, cuts:this._cuts, metrics:this._metrics };
  }

  get contacts(){ return this.manager.contacts; }

  setConfig(config = {}) {
    this.config = sanitizeRelinhoPhysicsConfig(config, this.config);
    this.broadPhase.setConfig(this.config);
    this.manager.setConfig(this.config);
    return this.config;
  }

  reset() {
    this.manager.reset?.();
    this._fxContacts.length=0; this._couplingJobs.length=0; this._cuts.length=0; this._solved.length=0;
    this._eligible.length=0; this._eligibleById.clear(); this._cutLosers.clear();
    this._tick=0; this._candidateCursor=0;
  }

  _prepareEligible(kites,pendingCutIds) {
    this._eligible.length=0; this._eligibleById.clear();
    for(const kite of (kites||[])){
      const id=String(kite?.userId??'');
      if(!id||!kite?.rope||kite.isAscending||Number(kite.spawnProtection)>0||pendingCutIds?.has?.(id)) continue;
      this._eligible.push(kite); this._eligibleById.set(id,kite);
    }
  }

  _touchFromHit(pairKey,kiteA,kiteB,hit) {
    const physics=computeLineContactPhysics(kiteA,kiteB,hit,this.config,this._physicsOut);
    return this.manager.touch(pairKey,kiteA,kiteB,hit,physics);
  }

  _revalidateTracked() {
    let checks=0;
    for(const contact of this.manager.contacts.values()){
      const a=this._eligibleById.get(contact.lineAId), b=this._eligibleById.get(contact.lineBId);
      if(!a||!b) continue;
      this._collisionOptions.hint={segmentIndexA:contact.segmentIndexA,segmentIndexB:contact.segmentIndexB};
      const hit=RopeCollision.checkRopeCollision(a.rope,b.rope,8,this._collisionOptions,this._narrowOut);
      checks++;
      if(hit.hit) this._touchFromHit(contact.pairKey,a,b,hit);
    }
    this._collisionOptions.hint=null;
    return checks;
  }

  _discoverNew() {
    const candidates=this.broadPhase.scan(this._eligible,16);
    const total=candidates.length;
    if(total===0) return {candidates:0,checks:0};
    const start=this._candidateCursor%total;
    let checks=0;
    const cap=this.config.maxDiscoveryChecksPerScan;
    for(let offset=0;offset<total&&checks<cap;offset++){
      const candidate=candidates[(start+offset)%total];
      if(this.manager.contacts.has(candidate.pairKey)) continue;
      const hit=RopeCollision.checkRopeCollision(candidate.kiteA.rope,candidate.kiteB.rope,8,this._collisionOptions,this._narrowOut);
      checks++;
      if(hit.hit) this._touchFromHit(candidate.pairKey,candidate.kiteA,candidate.kiteB,hit);
    }
    this._candidateCursor=(start+Math.max(1,checks))%total;
    return {candidates:total,checks};
  }

  step(kites,dtSeconds,nowMs,{allowWear=true,pendingCutIds=null}={}) {
    const dt=Math.max(0,Math.min(.25,Number(dtSeconds)||0));
    const now=Number.isFinite(nowMs)?nowMs:0;
    this._fxContacts.length=0; this._couplingJobs.length=0; this._cuts.length=0; this._solved.length=0; this._cutLosers.clear();
    this._prepareEligible(kites,pendingCutIds);
    this.manager.beginStep(now,dt);

    const revalidationChecks=this._revalidateTracked();
    const interval=Math.max(1,Math.round(60/Math.max(1,this.config.discoveryHz)));
    const discoveryRan=(this._tick%interval)===0;
    const discovery=discoveryRan?this._discoverNew():{candidates:0,checks:0};
    this.manager.endStep(now);
    this.manager.selectForSolve(this._solved);

    let abrasionUpdates=0;
    for(const contact of this._solved){
      this._fxContacts.push(contact);
      this._couplingJobs.push({pairKey:contact.pairKey,ropeA:contact.kiteA?.rope,ropeB:contact.kiteB?.rope,inter:contact});
      if(!allowWear||this._cutLosers.has(contact.lineAId)||this._cutLosers.has(contact.lineBId)) continue;
      integrateLineAbrasion(contact,contact.kiteA,contact.kiteB,dt,this.config);
      abrasionUpdates++;
      const cut=applyLineWearAndEvaluateBreak(contact,contact.kiteA,contact.kiteB,this.config);
      if(cut&&!this._cutLosers.has(String(cut.loser?.userId??''))){
        cut.pairKey=contact.pairKey; cut.contact=contact;
        this._cuts.push(cut); this._cutLosers.add(String(cut.loser.userId));
      }
    }

    const managerMetrics=this.manager.metrics();
    const broadMetrics=this.broadPhase.metrics();
    Object.assign(this._metrics,{
      discoveryRan,candidatePairs:discovery.candidates,coldNarrowChecks:discovery.checks,
      revalidationChecks,narrowChecks:revalidationChecks+discovery.checks,
      trackedContacts:managerMetrics.trackedContacts,activeContacts:managerMetrics.activeContacts,
      solvedContacts:this._solved.length,abrasionUpdates,cuts:this._cuts.length,
      createdContacts:managerMetrics.createdContacts,reusedContacts:managerMetrics.reusedContacts,
      droppedContacts:managerMetrics.droppedContacts,poolSize:managerMetrics.poolSize,
      broadInputLines:broadMetrics.inputLines,broadRejectedX:broadMetrics.rejectedX,broadRejectedY:broadMetrics.rejectedY
    });
    this._tick++;
    return this._result;
  }
}
