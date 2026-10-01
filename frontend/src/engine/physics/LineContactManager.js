import { sanitizeRelinhoPhysicsConfig } from './RelinhoPhysicsConfig.js';

function createContact(poolIndex) {
  return {
    _poolIndex: poolIndex, _everUsed: false, _inUse: false, _lastTouchedStep: -1, _distanceStep: -1,
    pairKey: '', lineAId: '', lineBId: '', kiteA: null, kiteB: null,
    x: 0, y: 0, z: 0, segmentIndexA: 0, segmentIndexB: 0, s: .5, t: .5,
    crossingAngle: 0, sinAngle: 0, tensionA: 0, tensionB: 0, effectiveTension: 0, normalForce: 0,
    relativeVx: 0, relativeVy: 0, vSlide: 0, slideA: 0, slideB: 0,
    contactTime: 0, slidingDistance: 0, abrasionA: 0, abrasionB: 0,
    abrasionRateA: 0, abrasionRateB: 0, wearDeltaA: 0, wearDeltaB: 0,
    startedAt: 0, lastSeenAt: 0, releasedAt: 0, active: false, phase: 'FREE',
    distance: Infinity, contactRadius: 0, overlapQuality: 0, score: 0
  };
}

function resetContact(c) {
  c.pairKey=''; c.lineAId=''; c.lineBId=''; c.kiteA=null; c.kiteB=null;
  c.x=0; c.y=0; c.z=0; c.segmentIndexA=0; c.segmentIndexB=0; c.s=.5; c.t=.5;
  c.crossingAngle=0; c.sinAngle=0; c.tensionA=0; c.tensionB=0; c.effectiveTension=0; c.normalForce=0;
  c.relativeVx=0; c.relativeVy=0; c.vSlide=0; c.slideA=0; c.slideB=0;
  c.contactTime=0; c.slidingDistance=0; c.abrasionA=0; c.abrasionB=0;
  c.abrasionRateA=0; c.abrasionRateB=0; c.wearDeltaA=0; c.wearDeltaB=0;
  c.startedAt=0; c.lastSeenAt=0; c.releasedAt=0; c.active=false; c.phase='FREE';
  c.distance=Infinity; c.contactRadius=0; c.overlapQuality=0; c.score=0;
  c._lastTouchedStep=-1; c._distanceStep=-1; c._inUse=false;
  return c;
}

export class LineContactManager {
  constructor(config = {}) {
    this.config = sanitizeRelinhoPhysicsConfig(config);
    this.contacts = new Map();
    this._pool = [];
    this._free = [];
    this._selection = [];
    this._selected = [];
    this._perRope = new Map();
    this._stepId = 0;
    this._nowMs = 0;
    this._dtSeconds = 1/60;
    this._rotationCursor = 0;
    this._metrics = { createdContacts:0, reusedContacts:0, droppedContacts:0, expiredContacts:0, activeContacts:0, selectedContacts:0 };
    this._ensurePool(this.config.maxTrackedContacts);
  }

  _ensurePool(count) {
    while (this._pool.length < count) this._pool.push(createContact(this._pool.length));
    this._rebuildFree();
  }

  _rebuildFree() {
    this._free.length = 0;
    const limit = Math.min(this._pool.length, this.config.maxTrackedContacts);
    for (let i = limit - 1; i >= 0; i--) if (!this._pool[i]._inUse) this._free.push(this._pool[i]);
  }

  setConfig(config = {}) {
    this.config = sanitizeRelinhoPhysicsConfig(config, this.config);
    this._ensurePool(this.config.maxTrackedContacts);
    return this.config;
  }

  beginStep(nowMs, dtSeconds) {
    this._stepId++;
    this._nowMs = Number.isFinite(nowMs) ? nowMs : this._nowMs + this._dtSeconds * 1000;
    this._dtSeconds = Math.max(0, Math.min(.25, Number(dtSeconds) || 0));
    return this;
  }

  _acquire() {
    const c = this._free.pop();
    if (!c) { this._metrics.droppedContacts++; return null; }
    const reused = c._everUsed;
    resetContact(c);
    c._inUse = true; c._everUsed = true;
    if (reused) this._metrics.reusedContacts++; else this._metrics.createdContacts++;
    return c;
  }

  _release(c) {
    this.contacts.delete(c.pairKey);
    resetContact(c);
    this._free.push(c);
    this._metrics.expiredContacts++;
  }

  touch(pairKey, kiteA, kiteB, hit = {}, physics = {}) {
    const key = String(pairKey || '');
    if (!key || !kiteA || !kiteB || !hit?.hit) return null;
    let c = this.contacts.get(key);
    if (!c) {
      c = this._acquire();
      if (!c) return null;
      c.pairKey=key; c.lineAId=String(kiteA.userId ?? ''); c.lineBId=String(kiteB.userId ?? '');
      c.kiteA=kiteA; c.kiteB=kiteB; c.startedAt=this._nowMs; c.phase='CONTACT'; c.active=true;
      this.contacts.set(key,c);
    } else if (c.phase === 'RELEASE') {
      c.contactTime=0; c.slidingDistance=0; c.abrasionA=0; c.abrasionB=0;
      c.abrasionRateA=0; c.abrasionRateB=0; c.wearDeltaA=0; c.wearDeltaB=0;
      c.startedAt=this._nowMs; c.releasedAt=0; c.phase='CONTACT'; c.active=true;
    }

    c.kiteA=kiteA; c.kiteB=kiteB;
    c.x=Number(hit.x)||0; c.y=Number(hit.y)||0; c.z=Number(hit.z)||0;
    c.segmentIndexA=Math.max(0,Math.floor(Number(hit.segmentIndexA)||0));
    c.segmentIndexB=Math.max(0,Math.floor(Number(hit.segmentIndexB)||0));
    c.s=Math.max(0,Math.min(1,Number.isFinite(hit.s)?hit.s:.5));
    c.t=Math.max(0,Math.min(1,Number.isFinite(hit.t)?hit.t:.5));
    c.distance=Number.isFinite(hit.distance)?hit.distance:Infinity;
    c.contactRadius=Math.max(0,Number(hit.contactRadius)||0);
    c.sinAngle=Math.max(0,Math.min(1,Number(physics.sinAngle ?? hit.sinAngle)||0));
    c.crossingAngle=Number.isFinite(physics.crossingAngle)?physics.crossingAngle:Math.asin(c.sinAngle);
    c.tensionA=Math.max(0,Number(physics.tensionA)||0); c.tensionB=Math.max(0,Number(physics.tensionB)||0);
    c.effectiveTension=Math.max(0,Number(physics.effectiveTension)||0); c.normalForce=Math.max(0,Number(physics.normalForce)||0);
    c.relativeVx=Number(physics.relativeVx ?? hit.relativeVx)||0; c.relativeVy=Number(physics.relativeVy ?? hit.relativeVy)||0;
    c.vSlide=Math.max(0,Number(physics.vSlide ?? hit.slidingSpeed)||0);
    c.slideA=Number(hit.slideA)||0; c.slideB=Number(hit.slideB)||0;
    c.overlapQuality=c.contactRadius>0?Math.max(0,Math.min(1,1-c.distance/c.contactRadius)):0;
    if(c._lastTouchedStep!==this._stepId){
      c.contactTime += this._dtSeconds;
      c.slidingDistance += c.vSlide * this._dtSeconds;
      c._distanceStep=this._stepId;
    }
    c._lastTouchedStep=this._stepId; c.lastSeenAt=this._nowMs; c.active=true;
    return c;
  }

  endStep(nowMs = this._nowMs) {
    const now=Number.isFinite(nowMs)?nowMs:this._nowMs;
    const graceMs=this.config.releaseGraceSec*1000;
    for(const c of [...this.contacts.values()]){
      if(c._lastTouchedStep===this._stepId) continue;
      if(now-c.lastSeenAt>graceMs){
        this._release(c);
      } else if(c.phase!=='RELEASE'){
        c.phase='RELEASE'; c.active=false; c.releasedAt=now;
      }
    }
    this._metrics.activeContacts=0;
    for(const c of this.contacts.values()) if(c.phase!=='RELEASE') this._metrics.activeContacts++;
    return this;
  }

  _score(c) {
    const slide=Math.min(1,c.vSlide/12);
    const normal=Math.min(1,c.normalForce/1.5);
    const age=Math.min(1,c.contactTime/.8);
    const hysteresis=c.active?.06:0;
    c.score=c.overlapQuality*.55+slide*1.2+normal*.9+age*.18+hysteresis;
    return c.score;
  }

  selectForSolve(out = this._selected) {
    out.length=0; this._selection.length=0; this._perRope.clear();
    for(const c of this.contacts.values()) if(c.phase!=='RELEASE'&&c.active){ this._score(c); this._selection.push(c); }
    const poolSize=Math.max(1,this._pool.length), cursor=this._rotationCursor%poolSize;
    this._selection.sort((a,b)=>{
      const diff=b.score-a.score;
      if(Math.abs(diff)>1e-9) return diff;
      const ra=(a._poolIndex-cursor+poolSize)%poolSize;
      const rb=(b._poolIndex-cursor+poolSize)%poolSize;
      return ra-rb;
    });
    for(const c of this._selection){
      if(out.length>=this.config.maxSolvedContacts) break;
      const ca=this._perRope.get(c.lineAId)||0, cb=this._perRope.get(c.lineBId)||0;
      if(ca>=this.config.maxContactsPerRope||cb>=this.config.maxContactsPerRope) continue;
      out.push(c); this._perRope.set(c.lineAId,ca+1); this._perRope.set(c.lineBId,cb+1);
    }
    this._rotationCursor=(this._rotationCursor+1)%poolSize;
    this._metrics.selectedContacts=out.length;
    return out;
  }

  snapshot(limit = 8) {
    const result=[];
    const max=Math.max(0,Math.floor(Number(limit)||0));
    for(const c of this.contacts.values()){
      if(result.length>=max) break;
      result.push({ pairKey:c.pairKey,lineAId:c.lineAId,lineBId:c.lineBId,x:c.x,y:c.y,z:c.z,
        segmentIndexA:c.segmentIndexA,segmentIndexB:c.segmentIndexB,s:c.s,t:c.t,
        crossingAngle:c.crossingAngle,sinAngle:c.sinAngle,tensionA:c.tensionA,tensionB:c.tensionB,
        effectiveTension:c.effectiveTension,normalForce:c.normalForce,vSlide:c.vSlide,
        contactTime:c.contactTime,slidingDistance:c.slidingDistance,abrasionA:c.abrasionA,abrasionB:c.abrasionB,
        abrasionRateA:c.abrasionRateA,abrasionRateB:c.abrasionRateB,phase:c.phase,active:c.active,score:c.score });
    }
    return result;
  }

  metrics() { return { ...this._metrics, trackedContacts:this.contacts.size, poolSize:this._pool.length }; }
}

